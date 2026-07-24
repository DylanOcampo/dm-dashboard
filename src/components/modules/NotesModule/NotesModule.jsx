import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useApp } from '../../../context/AppContext';
import { usePersistedState } from '../../../hooks/usePersistedState';
import './NotesModule.css';

export default function NotesModule({ instanceId }) {
  const { syncOptions } = useApp();
  const [notes, setNotes] = usePersistedState(
    `notes:${instanceId}`,
    () => [{ id: uuid(), title: 'Nota 1', content: '' }],
    syncOptions
  );
  const [pageIndex, setPageIndex] = useState(0);

  const currentIndex = Math.min(pageIndex, notes.length - 1);
  const currentNote = notes[currentIndex];

  const goPrev = () => setPageIndex((i) => Math.max(0, i - 1));
  const goNext = () => setPageIndex((i) => Math.min(notes.length - 1, i + 1));

  const addNotePage = () => {
    setNotes((prev) => [...prev, { id: uuid(), title: `Nota ${prev.length + 1}`, content: '' }]);
  };

  const updateNotePage = (id, changes) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...changes } : n)));
  };

  const removeNotePage = (id) => {
    setNotes((prev) => (prev.length > 1 ? prev.filter((n) => n.id !== id) : prev));
  };

  const handleNewPage = () => {
    addNotePage();
    setPageIndex(notes.length);
  };

  const handleDeletePage = () => {
    if (notes.length <= 1) return;
    removeNotePage(currentNote.id);
    setPageIndex((i) => Math.max(0, i - 1));
  };

  return (
    <div className="notes-module">
      <div className="notes-module__page">
        <input
          type="text"
          className="notes-module__title"
          value={currentNote.title}
          onChange={(e) => updateNotePage(currentNote.id, { title: e.target.value })}
          placeholder="Título de la nota"
        />
        <textarea
          className="notes-module__content"
          value={currentNote.content}
          onChange={(e) => updateNotePage(currentNote.id, { content: e.target.value })}
          placeholder="Escribe aquí..."
        />
      </div>

      <div className="notes-module__footer">
        <button type="button" onClick={goPrev} disabled={currentIndex === 0}>
          ‹ Anterior
        </button>
        <span className="notes-module__page-indicator">
          Página {currentIndex + 1} / {notes.length}
        </span>
        <button type="button" onClick={goNext} disabled={currentIndex === notes.length - 1}>
          Siguiente ›
        </button>
        <button type="button" className="notes-module__new" onClick={handleNewPage}>
          + Nueva
        </button>
        <button
          type="button"
          className="notes-module__delete"
          onClick={handleDeletePage}
          disabled={notes.length <= 1}
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
