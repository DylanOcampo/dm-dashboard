import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useApp } from '../../context/AppContext';
import { parseJSONItems, parseCSVItems } from '../../services/bulkImport';
import './LootTableManager.css';

const JSON_PLACEHOLDER = `[
  { "category": "Común", "name": "Poción de curación", "description": "Restaura 2d4+2 puntos de golpe", "value": 50 },
  { "category": "Rara", "name": "Espada +1", "description": "Espada mágica que otorga +1 a los ataques", "value": 500 }
]`;

const CSV_PLACEHOLDER = `category,name,description,value
Común,Poción de curación,Restaura 2d4+2 puntos de golpe,50
Rara,Espada +1,Espada mágica que otorga +1 a los ataques,500`;

export default function LootTableManager() {
  const { lootTable, setLootTable } = useApp();
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
        { id: uuid(), name: `Objeto ${prev[category].length + 1}`, description: '', value: 0 },
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
      setBulkError('Pega primero los items a importar.');
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
      setBulkError('No se encontraron items para importar.');
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
    setBulkSuccess(`Se importaron ${items.length} item(s) correctamente.`);
    setBulkText('');
  };

  return (
    <section className="loot-table-manager">
      <header className="loot-table-manager__header">
        <h2>Loot Table</h2>
        <form className="loot-table-manager__add-category" onSubmit={addCategory}>
          <input
            type="text"
            placeholder="Nueva categoría (ej. Legendaria)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <button type="submit">+ Categoría</button>
        </form>
      </header>

      <div className="loot-table-manager__bulk">
        <div className="loot-table-manager__bulk-header">
          <h3>Importar en bulk</h3>
          <label className="loot-table-manager__bulk-format">
            Formato:
            <select value={bulkFormat} onChange={(e) => setBulkFormat(e.target.value)}>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </label>
        </div>
        <p className="loot-table-manager__bulk-hint">
          La categoría se crea automáticamente si no existe. Campos: category, name, description, value.
        </p>
        <textarea
          className="loot-table-manager__bulk-textarea"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={bulkFormat === 'json' ? JSON_PLACEHOLDER : CSV_PLACEHOLDER}
          rows={6}
        />
        {bulkError && <p className="loot-table-manager__bulk-error">{bulkError}</p>}
        {bulkSuccess && <p className="loot-table-manager__bulk-success">{bulkSuccess}</p>}
        <button type="button" className="loot-table-manager__bulk-submit" onClick={handleBulkImport}>
          Importar
        </button>
      </div>

      {Object.entries(lootTable).map(([category, items]) => (
        <div key={category} className="loot-table-manager__category">
          <div className="loot-table-manager__category-header">
            <h3>{category}</h3>
            <div className="loot-table-manager__category-actions">
              <button type="button" onClick={() => addItem(category)}>
                + Item
              </button>
              <button type="button" className="loot-table-manager__remove-category" onClick={() => removeCategory(category)}>
                Eliminar categoría
              </button>
            </div>
          </div>

          {items.length === 0 && <p className="loot-table-manager__empty">Sin items en esta categoría.</p>}

          <ul className="loot-table-manager__items">
            {items.map((item) => (
              <li key={item.id} className="loot-table-manager__item">
                <input
                  type="text"
                  className="loot-table-manager__item-name"
                  value={item.name}
                  onChange={(e) => updateItem(category, item.id, { name: e.target.value })}
                  placeholder="Nombre"
                />
                <input
                  type="text"
                  className="loot-table-manager__item-description"
                  value={item.description}
                  onChange={(e) => updateItem(category, item.id, { description: e.target.value })}
                  placeholder="Descripción"
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
                  aria-label={`Eliminar ${item.name}`}
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
