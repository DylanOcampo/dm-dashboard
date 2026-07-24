import { v4 as uuid } from 'uuid';
import { useApp } from '../../../context/AppContext';
import { usePersistedState } from '../../../hooks/usePersistedState';
import './DiceRoller.css';

const DICE_TYPES = [4, 6, 8, 12, 20, 100];
const MAX_PER_DIE = 20;
const MAX_HISTORY = 50;

function createDefaultCounts() {
  return DICE_TYPES.reduce((acc, sides) => ({ ...acc, [sides]: 0 }), {});
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export default function DiceRoller({ instanceId }) {
  const { syncOptions, t } = useApp();
  const [state, setState] = usePersistedState(
    `diceRoller:${instanceId}`,
    () => ({ counts: createDefaultCounts(), history: [] }),
    syncOptions
  );

  const { counts, history } = state;
  const totalDiceSelected = Object.values(counts).reduce((sum, n) => sum + n, 0);

  const updateCount = (sides, delta) => {
    setState((prev) => ({
      ...prev,
      counts: { ...prev.counts, [sides]: Math.max(0, Math.min(MAX_PER_DIE, prev.counts[sides] + delta)) },
    }));
  };

  const roll = () => {
    const rollsByDie = [];
    let total = 0;
    DICE_TYPES.forEach((sides) => {
      const count = counts[sides];
      if (!count) return;
      const results = Array.from({ length: count }, () => rollDie(sides));
      total += results.reduce((sum, r) => sum + r, 0);
      rollsByDie.push({ sides, results });
    });
    if (rollsByDie.length === 0) return;
    const entry = { id: uuid(), timestamp: Date.now(), rollsByDie, total };
    setState((prev) => ({ ...prev, history: [entry, ...prev.history].slice(0, MAX_HISTORY) }));
  };

  const clearHistory = () => {
    setState((prev) => ({ ...prev, history: [] }));
  };

  return (
    <div className="dice-roller">
      <div className="dice-roller__selectors">
        {DICE_TYPES.map((sides) => (
          <div key={sides} className="dice-roller__die">
            <span className="dice-roller__die-label">d{sides}</span>
            <div className="dice-roller__stepper">
              <button type="button" onClick={() => updateCount(sides, -1)} disabled={counts[sides] === 0}>
                −
              </button>
              <span className="dice-roller__count">{counts[sides]}</span>
              <button type="button" onClick={() => updateCount(sides, 1)} disabled={counts[sides] === MAX_PER_DIE}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="dice-roller__roll-btn" onClick={roll} disabled={totalDiceSelected === 0}>
        {t('dice.rollButton')} {totalDiceSelected > 0 ? `(${totalDiceSelected})` : ''}
      </button>

      <div className="dice-roller__history">
        <div className="dice-roller__history-header">
          <span>{t('dice.historyTitle')}</span>
          {history.length > 0 && (
            <button type="button" className="dice-roller__clear" onClick={clearHistory}>
              {t('dice.clearButton')}
            </button>
          )}
        </div>
        {history.length === 0 && <p className="dice-roller__empty">{t('dice.emptyHistory')}</p>}
        <ul className="dice-roller__history-list">
          {history.map((entry) => (
            <li key={entry.id} className="dice-roller__history-item">
              <span className="dice-roller__history-detail">
                {entry.rollsByDie.map((r) => `${r.results.length}d${r.sides}[${r.results.join(',')}]`).join(' + ')}
              </span>
              <span className="dice-roller__history-total">= {entry.total}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
