// Las etiquetas traducibles viven en src/i18n/language.js bajo la clave
// "conditions.<id>"; aquí solo se define el id (estable, usado como valor de
// datos) y el emoji (visual, no depende del idioma).
export const CONDITION_TYPES = [
  { id: 'poisoned', emoji: '🤢' },
  { id: 'charmed', emoji: '💞' },
  { id: 'stunned', emoji: '😵' },
  { id: 'invisible', emoji: '👻' },
  { id: 'exhaustion', emoji: '💤' },
];

export const CONDITION_BY_ID = CONDITION_TYPES.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
