import { useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useApp } from '../../../context/AppContext';
import { RARITY_ORDER } from '../../../data/defaultLootTable';
import './LootGenerator.css';

const ANY_CATEGORY = 'Cualquiera';

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export default function LootGenerator() {
  const { lootTable } = useApp();
  const [category, setCategory] = useState(ANY_CATEGORY);
  const [quantity, setQuantity] = useState(3);
  const [results, setResults] = useState([]);

  const categories = useMemo(() => {
    const known = RARITY_ORDER.filter((r) => lootTable[r]?.length);
    const extra = Object.keys(lootTable).filter((k) => !RARITY_ORDER.includes(k) && lootTable[k]?.length);
    return [ANY_CATEGORY, ...known, ...extra];
  }, [lootTable]);

  const pool = useMemo(() => {
    if (category === ANY_CATEGORY) {
      return Object.entries(lootTable).flatMap(([rarity, items]) =>
        items.map((item) => ({ ...item, rarity }))
      );
    }
    return (lootTable[category] || []).map((item) => ({ ...item, rarity: category }));
  }, [lootTable, category]);

  const generate = () => {
    if (pool.length === 0) {
      setResults([]);
      return;
    }
    const generated = Array.from({ length: quantity }, () => ({ ...pickRandom(pool), resultId: uuid() }));
    setResults(generated);
  };

  const totalValue = results.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  return (
    <div className="loot-generator">
      <div className="loot-generator__form">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          max="20"
          value={quantity}
          onChange={(e) => setQuantity(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
        />
        <button type="button" onClick={generate} disabled={pool.length === 0}>
          Generar
        </button>
      </div>

      {pool.length === 0 && (
        <p className="loot-generator__empty">No hay items en esta categoría. Agrégalos en la Loot Table.</p>
      )}

      <ul className="loot-generator__results">
        {results.map((item) => (
          <li key={item.resultId} className="loot-generator__item">
            <div className="loot-generator__item-header">
              <span className="loot-generator__item-name">{item.name}</span>
              <span className="loot-generator__item-rarity">{item.rarity}</span>
            </div>
            <p className="loot-generator__item-description">{item.description}</p>
            <span className="loot-generator__item-value">{item.value} oro</span>
          </li>
        ))}
      </ul>

      {results.length > 0 && (
        <div className="loot-generator__total">Valor total: {totalValue} oro</div>
      )}
    </div>
  );
}
