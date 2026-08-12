import { v4 as uuid } from 'uuid';

// Tabla de loot por defecto. El usuario puede editar, agregar o eliminar
// categorías e items desde el Loot Table Manager.
export const RARITY_ORDER = ['Común', 'Poco Común', 'Rara', 'Mítica', 'Legendaria'];

// Color asociado a cada rareza estándar (usado en el Loot Generator y el
// Loot Table Manager para colorear items/categorías). Una categoría con
// nombre custom (fuera de RARITY_ORDER) cae al color por defecto.
export const RARITY_COLORS = {
  'Común': '#aab2bd',
  'Poco Común': '#7fc98f',
  'Rara': '#7aa7e0',
  'Mítica': '#b98fe0',
  'Legendaria': '#e2a33d',
};
export const DEFAULT_RARITY_COLOR = '#c9c2b3';

export function getRarityColor(rarity) {
  return RARITY_COLORS[rarity] || DEFAULT_RARITY_COLOR;
}

export function createDefaultLootTable() {
  return {
    'Común': [
      { id: uuid(), name: 'Objeto 1', description: 'Un objeto común sin propiedades especiales.', value: 5 },
      { id: uuid(), name: 'Objeto 2', description: 'Un objeto común sin propiedades especiales.', value: 8 },
      { id: uuid(), name: 'Objeto 3', description: 'Un objeto común sin propiedades especiales.', value: 12 },
    ],
    'Poco Común': [
      { id: uuid(), name: 'Objeto 4', description: 'Un objeto poco común con una leve propiedad mágica.', value: 50 },
      { id: uuid(), name: 'Objeto 5', description: 'Un objeto poco común con una leve propiedad mágica.', value: 75 },
    ],
    'Rara': [
      { id: uuid(), name: 'Objeto 6', description: 'Un objeto raro con una propiedad mágica notable.', value: 250 },
      { id: uuid(), name: 'Objeto 7', description: 'Un objeto raro con una propiedad mágica notable.', value: 400 },
    ],
  };
}
