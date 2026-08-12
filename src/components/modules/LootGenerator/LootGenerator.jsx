import { useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useApp } from '../../../context/AppContext';
import { RARITY_ORDER, getRarityColor } from '../../../data/defaultLootTable';
import './LootGenerator.css';

const ANY_CATEGORY = '__ANY__';

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export default function LootGenerator() {
  const { lootTable, t } = useApp();
  const [category, setCategory] = useState(ANY_CATEGORY);
  const [quantity, setQuantity] = useState(3);
  const [results, setResults] = useState([]);
  const [openInfoId, setOpenInfoId] = useState(null);

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
    setOpenInfoId(null);
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
              {c === ANY_CATEGORY ? t('loot.categoryAny') : c}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          max="20"
          value={quantity}
          onChange={(e) => setQuantity(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
          aria-label={t('loot.quantityAria')}
        />
        <button type="button" onClick={generate} disabled={pool.length === 0}>
          {t('loot.generateButton')}
        </button>
      </div>

      {pool.length === 0 && <p className="loot-generator__empty">{t('loot.emptyCategory')}</p>}

      <div className="loot-generator__sheet">
        <ul className="loot-generator__results">
          {results.map((item) => (
            <li
              key={item.resultId}
              className="loot-generator__item"
              style={{ '--rarity-color': getRarityColor(item.rarity) }}
            >
              <div className="loot-generator__item-row">
                <span className="loot-generator__item-dot" />
                <span className="loot-generator__item-name">{item.name}</span>
                <span className="loot-generator__item-value">{t('loot.itemValue', { value: item.value })}</span>
                <span className="loot-generator__item-value">|</span>
                <button
                  type="button"
                  className="loot-generator__item-info"
                  onClick={() => setOpenInfoId((prev) => (prev === item.resultId ? null : item.resultId))}
                >
                  {t('loot.infoButton')}
                </button>
              </div>
              {openInfoId === item.resultId && (
                <p className="loot-generator__item-description">
                  {item.description || t('loot.noDescription')}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {results.length > 0 && (
        <div className="loot-generator__total">{t('loot.total', { total: totalValue })}</div>
      )}
    </div>
  );
}
