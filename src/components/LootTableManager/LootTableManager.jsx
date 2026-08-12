import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useApp } from '../../context/AppContext';
import { parseJSONItems, parseCSVItems } from '../../services/bulkImport';
import { RARITY_ORDER, getRarityColor } from '../../data/defaultLootTable';
import './LootTableManager.css';

export default function LootTableManager() {
  const { lootTable, setLootTable, t } = useApp();
  const [newCategoryName, setNewCategoryName] = useState('');

  const [bulkFormat, setBulkFormat] = useState('json');
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');

  const addCategory = (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name || lootTable[name]) return;
    setLootTable((prev) => ({ ...prev, [name]: [] }));
    setNewCategoryName('');
  };

  const removeCategory = (category) => {
    setLootTable((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  };

  const addItem = (category) => {
    setLootTable((prev) => ({
      ...prev,
      [category]: [
        ...prev[category],
        { id: uuid(), name: t('lootTable.defaultItemName', { n: prev[category].length + 1 }), description: '', value: 0 },
      ],
    }));
  };

  const updateItem = (category, itemId, changes) => {
    setLootTable((prev) => ({
      ...prev,
      [category]: prev[category].map((item) => (item.id === itemId ? { ...item, ...changes } : item)),
    }));
  };

  const removeItem = (category, itemId) => {
    setLootTable((prev) => ({
      ...prev,
      [category]: prev[category].filter((item) => item.id !== itemId),
    }));
  };

  const handleBulkImport = () => {
    setBulkSuccess('');
    setBulkError('');
    if (!bulkText.trim()) {
      setBulkError(t('lootTable.errorPasteFirst'));
      return;
    }
    let items;
    try {
      items = bulkFormat === 'json' ? parseJSONItems(bulkText) : parseCSVItems(bulkText);
    } catch (err) {
      setBulkError(err.message);
      return;
    }
    if (items.length === 0) {
      setBulkError(t('lootTable.errorNoItemsFound'));
      return;
    }
    setLootTable((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        const existing = next[item.category] || [];
        next[item.category] = [
          ...existing,
          { id: uuid(), name: item.name, description: item.description, value: item.value },
        ];
      });
      return next;
    });
    setBulkSuccess(t('lootTable.successImported', { count: items.length }));
    setBulkText('');
  };

  return (
    <section className="loot-table-manager">
      <header className="loot-table-manager__header">
        <h2>{t('lootTable.title')}</h2>
        <form className="loot-table-manager__add-category" onSubmit={addCategory}>
          <input
            type="text"
            list="loot-table-rarity-presets"
            placeholder={t('lootTable.newCategoryPlaceholder')}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <datalist id="loot-table-rarity-presets">
            {RARITY_ORDER.filter((r) => !lootTable[r]).map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          <button type="submit">{t('lootTable.addCategoryButton')}</button>
        </form>
      </header>

      <div className="loot-table-manager__bulk">
        <div className="loot-table-manager__bulk-header">
          <h3>{t('lootTable.bulkTitle')}</h3>
          <label className="loot-table-manager__bulk-format">
            {t('lootTable.formatLabel')}
            <select value={bulkFormat} onChange={(e) => setBulkFormat(e.target.value)}>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </label>
        </div>
        <p className="loot-table-manager__bulk-hint">{t('lootTable.bulkHint')}</p>
        <textarea
          className="loot-table-manager__bulk-textarea"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={bulkFormat === 'json' ? t('lootTable.jsonPlaceholder') : t('lootTable.csvPlaceholder')}
          rows={6}
        />
        {bulkError && <p className="loot-table-manager__bulk-error">{bulkError}</p>}
        {bulkSuccess && <p className="loot-table-manager__bulk-success">{bulkSuccess}</p>}
        <button type="button" className="loot-table-manager__bulk-submit" onClick={handleBulkImport}>
          {t('lootTable.importButton')}
        </button>
      </div>

      {Object.entries(lootTable).map(([category, items]) => (
        <div
          key={category}
          className="loot-table-manager__category"
          style={{ '--rarity-color': getRarityColor(category) }}
        >
          <div className="loot-table-manager__category-header">
            <span className="loot-table-manager__category-dot" />
            <h3>{category}</h3>
            <div className="loot-table-manager__category-actions">
              <button type="button" onClick={() => addItem(category)}>
                {t('lootTable.addItemButton')}
              </button>
              <button
                type="button"
                className="loot-table-manager__remove-category"
                onClick={() => removeCategory(category)}
              >
                {t('lootTable.removeCategoryButton')}
              </button>
            </div>
          </div>

          {items.length === 0 && <p className="loot-table-manager__empty">{t('lootTable.emptyCategory')}</p>}

          <ul className="loot-table-manager__items">
            {items.map((item) => (
              <li key={item.id} className="loot-table-manager__item">
                <input
                  type="text"
                  className="loot-table-manager__item-name"
                  value={item.name}
                  onChange={(e) => updateItem(category, item.id, { name: e.target.value })}
                  placeholder={t('lootTable.namePlaceholder')}
                />
                <input
                  type="text"
                  className="loot-table-manager__item-description"
                  value={item.description}
                  onChange={(e) => updateItem(category, item.id, { description: e.target.value })}
                  placeholder={t('lootTable.descriptionPlaceholder')}
                />
                <input
                  type="number"
                  min="0"
                  className="loot-table-manager__item-value"
                  value={item.value}
                  onChange={(e) => updateItem(category, item.id, { value: Math.max(0, Number(e.target.value) || 0) })}
                />
                <button
                  type="button"
                  className="loot-table-manager__remove-item"
                  onClick={() => removeItem(category, item.id)}
                  aria-label={t('lootTable.removeItemAria', { name: item.name })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
