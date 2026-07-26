# Setup: Stripe + Supabase (suscripciones y archivos en la nube)

Este runbook cubre los pasos que **solo vos podés hacer** (requieren tu login en Supabase/Stripe).
Todo el código (SQL, Edge Functions, frontend) ya está escrito — ver `ARCHITECTURE.md` para el
resumen de cómo encaja todo.

Project ref de Supabase: `nxulmvqxibhgelxsmxjg`.

## 1. Aplicar el esquema en Supabase

1. Abrí el [SQL Editor](https://supabase.com/dashboard/project/nxulmvqxibhgelxsmxjg/sql/new) de tu proyecto.
2. Pegá y corré **todo** el contenido de [`supabase/schema.sql`](supabase/schema.sql). Crea:
   `dashboard_data`, `subscriptions`, `user_files`, el bucket `user-files`, las policies de RLS,
   la función `has_active_subscription`, y el trigger de cuota. El bloque de `cron.schedule` al
   final está comentado a propósito — se activa en el paso 5.
3. Database → Extensions: activá **pg_cron** y **pg_net** (las necesita el cron de limpieza).

## 2. Configurar Auth

Authentication → URL Configuration:
- **Site URL**: `http://localhost:3000` en desarrollo (cambialo a tu dominio real cuando despliegues).
- **Redirect URLs**: agregá también `http://localhost:3000` (y tu dominio de producción).

Authentication → Providers → Email: dejá "Confirm email" activado en producción (es lo seguro);
en desarrollo local podés desactivarlo para no tener que revisar tu inbox en cada prueba.

## 3. Instalar Supabase CLI y conectar el proyecto

```bash
# Windows (con Scoop): https://scoop.sh
scoop install supabase

supabase login
```

Corré esto desde la carpeta `dm-dashboard/`:
```bash
supabase link --project-ref nxulmvqxibhgelxsmxjg
```

## 4. Completar `supabase/functions/.env`

Ese archivo ya tiene tu `STRIPE_SECRET_KEY`. Te falta:
- `SUPABASE_SERVICE_ROLE_KEY`: copiala de [Settings → API Keys](https://supabase.com/dashboard/project/nxulmvqxibhgelxsmxjg/settings/api-keys) (la `service_role`, no la publishable).
- `STRIPE_WEBHOOK_SECRET`: lo conseguís en el paso 6, más abajo.

## 5. Desplegar las Edge Functions

```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy delete-account
supabase functions deploy cleanup-expired-files
supabase functions deploy stripe-webhook --no-verify-jwt
```

(`stripe-webhook` necesita `--no-verify-jwt` porque Stripe no manda un JWT de Supabase; también
está declarado en `supabase/config.toml` por si tu versión de la CLI ya lo respeta sola.)

Subí los secretos (Stripe key + lo que ya tengas de `service_role`, aunque `STRIPE_WEBHOOK_SECRET`
todavía sea el placeholder):
```bash
supabase secrets set --env-file supabase/functions/.env
```

## 6. Crear el webhook en Stripe

1. [Dashboard de Stripe](https://dashboard.stripe.com/test/webhooks) → Add endpoint.
2. URL: `https://nxulmvqxibhgelxsmxjg.supabase.co/functions/v1/stripe-webhook`
3. Eventos a escuchar: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`.
4. Copiá el **Signing secret** (`whsec_...`) y reemplazalo en `supabase/functions/.env`
   (`STRIPE_WEBHOOK_SECRET`).
5. Volvé a subir los secretos con el valor real:
   ```bash
   supabase secrets set --env-file supabase/functions/.env
   ```

## 7. Activar el cron de limpieza (borrado automático a los 30 días)

En el SQL Editor, corré el bloque que está comentado al final de `supabase/schema.sql`
("Borrado automático"), reemplazando `<PROJECT_REF>` por `nxulmvqxibhgelxsmxjg` y
`<SERVICE_ROLE_KEY>` por tu service_role key.

## 8. Probar todo el flujo

```bash
cd dm-dashboard
npm start
```

1. Creá una cuenta nueva (email + contraseña) en "Mi Cuenta".
2. Elegí un plan y suscribite con la tarjeta de test de Stripe: `4242 4242 4242 4242`,
   cualquier fecha futura, cualquier CVC.
3. Al volver a la app, la suscripción se refresca sola (por el `?checkout=success` en la URL).
   Confirmá en el [Table Editor](https://supabase.com/dashboard/project/nxulmvqxibhgelxsmxjg/editor)
   que `subscriptions` tiene tu fila con `status: active`.
4. Agregá un módulo de PDF o Imagen al dashboard y vinculá un archivo: debería subirse al bucket
   `user-files` y aparecer en "Mis Archivos" con la escena correcta.
5. Desde "Mi Cuenta" → "Administrar suscripción" → cancelá el plan. Confirmá que los archivos
   pasan a solo lectura (no se pueden borrar) tanto en el widget como en "Mis Archivos".
6. Probá "Eliminar mi cuenta" con un usuario de prueba y confirmá que desaparece de
   Authentication → Users, de `subscriptions`/`user_files`, y del bucket.

## Nota sobre modo test vs producción

Los Products/Prices de Stripe (`src/data/plans.js` y `supabase/functions/_shared/plans.ts`) se
crearon en **modo test** de tu cuenta ("Red Ocean Software sandbox"). Cuando quieras cobrar de
verdad, hay que recrear los mismos 2 productos / 4 precios en modo live, actualizar los `price_id`
en esos dos archivos, y repetir los pasos 4-6 con las claves live.
