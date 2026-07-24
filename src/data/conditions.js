export const CONDITION_TYPES = [
  { id: 'poisoned', label: 'Envenenado', emoji: '🤢' },
  { id: 'charmed', label: 'Hechizado', emoji: '💞' },
  { id: 'stunned', label: 'Aturdido', emoji: '😵' },
  { id: 'invisible', label: 'Invisible', emoji: '👻' },
  { id: 'exhaustion', label: 'Exhausto', emoji: '💤' },
];

export const CONDITION_BY_ID = CONDITION_TYPES.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
