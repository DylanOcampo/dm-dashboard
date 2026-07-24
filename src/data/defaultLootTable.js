import { v4 as uuid } from 'uuid';

// Tabla de loot por defecto. El usuario puede editar, agregar o eliminar
// categorías e items desde el Loot Table Manager.
export const RARITY_ORDER = ['Común', 'Poco Común', 'Rara'];

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
