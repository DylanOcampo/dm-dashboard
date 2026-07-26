# DM Dashboard — Arquitectura y decisiones de diseño

Panel personalizable para Dungeon Masters de D&D: módulos arrastrables/redimensionables
(cronómetro, música, tracker de iniciativa, generador de loot, notas, etc.) que corre
como sitio web, y como app nativa de Android/iOS vía Capacitor.

Este documento explica **qué es cada pieza** y, más importante, **por qué está construida
así**, para que cualquiera (incluido tu yo del futuro) pueda retomar el proyecto sin tener
que releer todo el código primero.

---

## 1. Stack tecnológico

| Capa | Elección | Por qué |
|---|---|---|
| Framework | Create React App (react-scripts 5) + React 19 | Se prefirió explícitamente sobre Vite; es el punto de partida y no se migró. |
| Grid de widgets | `react-grid-layout` **v1.5.3** | La v2 reescribió toda su API (hooks internos, sin `WidthProvider`) y rompía props documentadas (`draggableHandle`, `compactType`). Se hizo downgrade deliberado a la línea 1.x, estable y ampliamente documentada. |
| Drag & drop de listas | `@hello-pangea/dnd` | Fork mantenido de `react-beautiful-dnd` (deprecado), usado para reordenar el Tracker de Iniciativa. |
| Persistencia local | `localStorage` + IndexedDB | Todo funciona sin cuenta ni internet. |
| Persistencia en la nube | Supabase (opcional) | Solo se activa si el usuario se autentica **y** está "suscrito" (mock, sin cobro real todavía). |
| Empaquetado multiplataforma | Capacitor (`@capacitor/core`, `@capacitor/android`) | Se eligió **no** adoptar los componentes visuales de Ionic — se mantiene toda la UI/CSS actual tal cual, y Capacitor solo envuelve el build web como app nativa. Menor esfuerzo, cero reescritura. |
| i18n | Diccionario propio en `src/i18n/language.js` | Español/inglés hoy, pensado para agregar idiomas copiando un bloque. |

---

## 2. Estructura de carpetas

```
src/
  context/AppContext.js        # Estado global único de la app (ver sección 3)
  hooks/
    usePersistedState.js       # localStorage + sync opcional a Supabase
    useLinkedFiles.js          # Vincular PDFs/imágenes locales (ver sección 6)
  services/
    storageService.js          # Lectura/escritura local y remota de bajo nivel
    supabaseClient.js           # Cliente Supabase (null si no hay variables de entorno)
    fileHandleStore.js          # IndexedDB para handles de archivo / blobs
    bulkImport.js               # Parseo de JSON/CSV para importar loot en bulk
    youtube.js                  # Loader del IFrame API de YouTube + extracción de videoId
  i18n/language.js               # Diccionario ES/EN + función translate()
  data/
    conditions.js                # Catálogo de condiciones (id + emoji; el label se traduce)
    defaultLootTable.js          # Semilla por defecto de la loot table
  components/
    Nav/, Dashboard/             # Navegación superior y el grid de widgets
    PlayerManager/, EnemyManager/, NPCManager/, LootTableManager/, Account/
                                  # Secciones de gestión (páginas completas, no widgets)
    modules/                     # Cada módulo del dashboard (ver sección 5)
```

---

## 3. `AppContext.js`: el estado global

Toda la app cuelga de un único `AppProvider`. No hay Redux ni librerías de estado externas
— se consideró innecesario dado el tamaño del proyecto. `useApp()` expone:

- **Datos compartidos entre todas las copias de módulos**: `players`, `enemies`, `npcs`,
  `lootTable`, `dashboardLayout`, `language`.
- **`combats`**: un diccionario `{ [instanceIdDelTrackerDeIniciativa]: { combatants, currentTurnIndex } }`.
  Este es el dato más importante del proyecto — ver sección 4.
- **`t(key, vars)`**: función de traducción, memoizada por idioma actual.
- Funciones CRUD para cada colección (`addPlayer`, `addEnemy`, `addNPC`, `addNPCToCombat`,
  `recordDeathSave`, `nextTurn`, `addModuleInstance`, etc.)

### Por qué un solo contexto y no varios
Con ~15 módulos que necesitan leerse y escribirse entre sí (ver sección 4), dividir el
estado en contextos separados habría significado mucho *prop drilling* o *context hell*.
Un solo `AppContext` con un `value` memoizado es más simple de razonar aquí, al costo de
que cualquier cambio de estado re-renderiza a todos los consumidores — aceptable para el
tamaño de esta app.

---

## 4. El patrón más importante: módulos vinculados vía `combats`

Varios módulos (Tracker de Iniciativa, Condition Tracker, HP Tracker, Monster Reference,
NPC Reference, Save Throw Tracker) necesitan ver y editar **los mismos combatientes en vivo**,
sin estar anidados entre sí en el árbol de componentes.

**Solución**: el combate vive en `AppContext` bajo `combats[instanceIdDelTracker]`, no dentro
del propio componente `InitiativeTracker`. Cualquier otro widget se "vincula" a un Tracker de
Iniciativa específico (persistiendo solo `{ linkedInstanceId }` en su propio storage), y desde
ahí lee/escribe el mismo array de `combatants` vía `getCombat(id)` / `updateCombatants(id, fn)`.

Esto permite:
- Múltiples copias de Tracker de Iniciativa (multi-mesa), cada una con su propio combate.
- Que HP Tracker, Condition Tracker, etc. se vinculen al que corresponda (auto-detectan si
  solo hay un Tracker; si hay varios, muestran un selector).
- Que **eliminar un combatiente desde cualquiera de estos widgets** (no solo desde el propio
  Tracker) lo quite de todos a la vez, porque todos leen la misma fuente.

### Cada combatiente (`combatant`) puede tener
```js
{
  id, name, color, type: 'player' | 'enemy' | 'npc', initiative,
  playerId / sourceEnemyId / sourceNpcId,   // referencia al roster de origen
  hp: { current, max },
  ac, notes,
  conditions: [{ id, type, remainingRounds }],
  deathSaves: { successes, failures },        // solo si hp.current <= 0
  isDead: boolean,
}
```

### Por qué las tiradas de salvación son "derivadas", no un evento
El Save Throw Tracker **no** escucha un evento de "HP llegó a 0". En cambio, en cada render
filtra `combatants` donde `hp.current <= 0`. Así, cualquier forma de bajar el HP a 0 (HP
Tracker, daño manual, lo que sea) hace que el combatiente aparezca ahí automáticamente, sin
acoplar componentes entre sí. Al llegar a 3 éxitos, `recordDeathSave` pone `hp.current = 1`
(deja de cumplir la condición de filtro y desaparece solo); al llegar a 3 fallos, marca
`isDead: true` y ahí sí queda fijo hasta que el DM lo reinicia manualmente (por si hay un
Revivify narrativo).

---

## 5. Catálogo de módulos del dashboard

Cada módulo es una carpeta en `src/components/modules/` con su propio `.jsx` + `.css`.
Todos reciben un prop `instanceId` (el id único de esa copia en el grid).

| Módulo | Qué hace | Notas de diseño |
|---|---|---|
| **TimeModule** | Reloj / cronómetro / temporizador en pestañas | Fecha/hora usa el idioma elegido (`es-ES`/`en-US`), no el locale del navegador. |
| **MusicModule** | Playlist de YouTube | Si el widget es grande muestra el video; si es chico, colapsa a solo audio (usa `ResizeObserver`). |
| **Soundboard** | Clips cortos de YouTube con emoji | Un solo `<div>` oculto reproduce todos los clips; se recorta con `startSeconds`/polling a `end`. |
| **InitiativeTracker** | Orden de combate arrastrable | Dueño real de `combats[instanceId]`. Agrega jugadores/enemigos/NPCs desde sus rosters (dropdown que excluye a los ya agregados — el mismo mecanismo sirve como "ocultar/mostrar"). |
| **LootGenerator** | Tira loot random por rareza | Usa un sentinel interno (`__ANY__`) para "Cualquiera" en vez del texto traducido, para no acoplar lógica a idioma. |
| **NotesModule** | Notas paginadas estilo libro | Nombres por defecto (`Nota {n}`) también respetan el idioma. |
| **DiceRoller** | d4–d100 con historial | Historial persistido, tope de 50 tiradas. |
| **PDFViewer / ImageViewer** | Vincular archivos locales | Ver sección 6. |
| **ConditionTracker** | Condiciones con duración en rondas | El decremento ocurre en `nextTurn()` (AppContext), al completar una vuelta completa — no en este componente. |
| **HPTracker** | Barra de vida + botones ±1/±5 | Botón de eliminar combatiente completo (no solo el HP). |
| **MonsterReference** | CRUD de `enemies` + empujar a combate | Muestra estado en vivo (HP/condiciones) de las instancias de ese enemigo que estén en el combate vinculado. |
| **NPCReference** | Igual que Monster Reference, pero para `npcs` | Si `isCombat` es falso, solo se ve nombre + descripción (sin stats ni botón de combate). |
| **SaveThrowTracker** | Tiradas de salvación contra la muerte | Ver sección 4. Solo jugadores y NPCs (no enemigos), como en las reglas reales. |
| **Calculator** | Calculadora básica | Máquina de estados propia — **sin `eval()`** por seguridad. |

### Secciones de gestión (no son widgets del grid)
`PlayerManager`, `EnemyManager`, `NPCManager`, `LootTableManager`, `Account` son páginas
completas accesibles desde el `Nav`, no módulos del dashboard. `EnemyManager`/`NPCManager`
administran los mismos rosters (`enemies`/`npcs`) que después se consumen desde
`InitiativeTracker` y `MonsterReference`/`NPCReference` — un solo dato, varias vistas.

---

## 6. Vinculación de archivos locales (PDF/Imagen)

`useLinkedFiles.js` intenta usar la **File System Access API**
(`window.showOpenFilePicker`) cuando está disponible (Chrome/Edge de escritorio): guarda un
*handle* que apunta al archivo real en disco, así que el usuario debe mantenerlo en el mismo
lugar. En cualquier otro navegador (Firefox, Safari, y **cualquier WebView móvil de
Capacitor**, ya que esta API no existe ahí) cae automáticamente a un `<input type="file">` y
guarda una copia del archivo como `Blob` en IndexedDB.

Solo el nombre/id de cada archivo se persiste como metadata (y se sincroniza a Supabase si
aplica); el contenido real nunca sale del navegador/dispositivo del usuario.

---

## 7. Sistema de idiomas

Un solo archivo, `src/i18n/language.js`, con dos bloques (`es`, `en`) y una función
`translate(lang, key, vars)` que:
1. Busca `key` (ruta con puntos, ej. `"initiative.addPlayerButton"`) en el idioma activo.
2. Si no existe, cae a español (`DEFAULT_LANGUAGE`).
3. Si tampoco existe, devuelve la clave tal cual (para notar strings faltantes en dev).
4. Reemplaza `{variable}` en el string con los valores de `vars`.

**Regla de diseño**: los datos que el usuario ya escribió (nombres de jugadores, categorías
de loot, contenido de notas) **nunca se traducen retroactivamente** — cambiar el idioma solo
afecta el texto de la interfaz y los valores por defecto de cosas *nuevas* que se creen después.

Para agregar un idioma: copiar el bloque `es` completo, traducirlo, y agregarlo a `LANGUAGES`.

---

## 8. Multiplataforma (Capacitor)

- `capacitor.config.ts`: `webDir: "build"`, `appId: com.dylanocampo.dmdashboard`.
- `package.json` → `"homepage": "."` (rutas relativas): necesario para que el mismo build
  sirva tanto en GitHub Pages (subruta) como dentro del WebView de Capacitor (que sirve
  desde la raíz). Antes apuntaba a una URL absoluta de GitHub Pages y rompía en Capacitor.
- **Android**: proyecto nativo generado (`android/`), pero no compilado — no hay Android
  Studio/SDK instalado en la máquina de desarrollo actual.
- **iOS**: deliberadamente no iniciado. Xcode solo corre en macOS y el desarrollo es en
  Windows; queda preparado para correr `npm install @capacitor/ios && npx cap add ios`
  el día que haya acceso a un Mac o un pipeline de CI (Codemagic, GitHub Actions macOS, etc.).
- Pendiente conocido: el botón físico "atrás" de Android no está interceptado (cierra la
  app en vez de volver al Dashboard) — arreglo chico con `@capacitor/app` si hace falta.

---

## 9. Otras decisiones de diseño notables

- **Multi-instancia de módulos**: cualquier módulo puede agregarse varias veces al dashboard
  (ej. dos Trackers de Iniciativa para dos mesas). Cada copia tiene un `instanceId` único y
  su propio storage (`notes:<instanceId>`, `hpTracker:<instanceId>`, etc.), excepto los datos
  deliberadamente globales (`players`, `enemies`, `npcs`, `lootTable`) que se comparten entre
  todas las copias.
- **`draggableCancel`**: el header de cada widget es la zona de arrastre
  (`draggableHandle=".widget__header"`), pero el botón de cerrar vive ahí dentro. Sin
  `draggableCancel=".widget__close"`, un clic con el más mínimo movimiento de mouse se
  interpretaba como inicio de arrastre y el clic no registraba — bug real encontrado y
  corregido en producción.
- **Sin suscripción/pago real**: `Account.jsx` es un mock — no hay Stripe ni cobro real
  todavía. `isPremium` es solo un flag que decide si `usePersistedState` también escribe a
  Supabase.
- **Sin backend propio**: Supabase es 100% opcional y el esquema sugerido vive en
  `supabase/schema.sql` (una sola tabla genérica `dashboard_data` con RLS por usuario).
