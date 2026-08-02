import { useEffect, useRef } from 'react';
import { useApp } from '../../../context/AppContext';
import { usePersistedState } from '../../../hooks/usePersistedState';
import { sanitizeNoteHtml } from '../../../services/sanitizeHtml';
import './NotesModule.css';

const DEFAULT_TEXT_COLOR = '#e6e6e6';

export default function NotesModule({ instanceId }) {
  const { notesLibrary, addNote, updateNote, removeNote, syncOptions, t } = useApp();
  const [openNoteId, setOpenNoteId] = usePersistedState(`notesOpen:${instanceId}`, null, syncOptions);
  const bodyRef = useRef(null);
  const initRef = useRef(false);

  const currentNote = notesLibrary.find((n) => n.id === openNoteId) || null;

  // Al montar (una sola vez — el ref sobrevive el doble-invoke de efectos de
  // StrictMode en desarrollo, así que esto no crea notas duplicadas): si la
  // biblioteca está vacía se crea y abre una nota nueva; si ya hay notas
  // pero esta instancia no tenía una selección válida, cae a la biblioteca.
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const hasValidOpen = openNoteId && notesLibrary.some((n) => n.id === openNoteId);
    if (hasValidOpen) return;
    if (notesLibrary.length === 0) {
      const id = addNote();
      setOpenNoteId(id);
    } else {
      setOpenNoteId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El body es contentEditable: solo se reescribe su HTML al cambiar de
  // nota, nunca en cada tecla (si no, se pierde la posición del cursor).
  useEffect(() => {
    if (!bodyRef.current) return;
    const sanitized = sanitizeNoteHtml(currentNote?.content);
    if (bodyRef.current.innerHTML !== sanitized) {
      bodyRef.current.innerHTML = sanitized;
    }
  }, [currentNote?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBodyInput = () => {
    if (!currentNote || !bodyRef.current) return;
    updateNote(currentNote.id, { content: sanitizeNoteHtml(bodyRef.current.innerHTML) });
  };

  const applyFormat = (command, value) => {
    bodyRef.current?.focus();
    document.execCommand(command, false, value);
    handleBodyInput();
  };

  // Pegar HTML "de verdad" (Word, una página web, etc.) insertaría el
  // markup crudo en el DOM antes de que el sanitizador llegue a tocarlo —
  // un <img onerror> ya dispara en el momento del paste, no en el input
  // posterior. Por eso se fuerza siempre texto plano acá; el formato se
  // vuelve a aplicar a mano con la barra de herramientas si hace falta.
  const handlePaste = (e) => {
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    handleBodyInput();
  };

  const handleDrop = (e) => {
    e.preventDefault();
  };

  const handleNewNote = () => {
    const id = addNote();
    setOpenNoteId(id);
  };

  const handleDeleteNote = () => {
    if (!currentNote) return;
    if (!window.confirm(t('notes.deleteConfirm', { title: currentNote.title }))) return;
    const wasLastNote = notesLibrary.length <= 1;
    removeNote(currentNote.id);
    if (wasLastNote) {
      setOpenNoteId(addNote());
    } else {
      setOpenNoteId(null);
    }
  };

  if (!currentNote) {
    return (
      <div className="notes-module">
        <div className="notes-module__library">
          <div className="notes-module__library-toolbar">
            <button type="button" onClick={handleNewNote}>
              {t('notes.newButton')}
            </button>
          </div>
          {notesLibrary.length === 0 ? (
            <p className="notes-module__empty">{t('notes.emptyLibrary')}</p>
          ) : (
            <ul className="notes-module__library-list">
              {notesLibrary.map((note) => (
                <li key={note.id}>
                  <button
                    type="button"
                    className="notes-module__library-item"
                    style={{ borderLeftColor: note.color || 'var(--border)' }}
                    onClick={() => setOpenNoteId(note.id)}
                  >
                    {note.title || t('notes.untitled')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="notes-module">
      <div className="notes-module__toolbar">
        <button type="button" onClick={() => setOpenNoteId(null)}>
          {t('notes.libraryButton')}
        </button>
        <button type="button" onClick={handleNewNote}>
          {t('notes.newButton')}
        </button>
        <button type="button" className="notes-module__delete" onClick={handleDeleteNote}>
          {t('notes.deleteButton')}
        </button>
      </div>

      <div className="notes-module__page">
        <div className="notes-module__header">
          <input
            type="color"
            className="notes-module__color"
            value={currentNote.color || '#3a3a3a'}
            onChange={(e) => updateNote(currentNote.id, { color: e.target.value })}
            aria-label={t('notes.colorAria')}
            title={t('notes.colorAria')}
          />
          <input
            type="text"
            className="notes-module__title"
            value={currentNote.title}
            onChange={(e) => updateNote(currentNote.id, { title: e.target.value })}
            placeholder={t('notes.titlePlaceholder')}
          />
        </div>

        <div className="notes-module__format-bar">
          <button
            type="button"
            className="notes-module__bold-button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('bold')}
            title={t('notes.boldButton')}
            aria-label={t('notes.boldButton')}
          >
            B
          </button>
          <input
            type="color"
            className="notes-module__text-color"
            defaultValue={DEFAULT_TEXT_COLOR}
            onMouseDown={(e) => e.preventDefault()}
            onChange={(e) => applyFormat('foreColor', e.target.value)}
            title={t('notes.textColorAria')}
            aria-label={t('notes.textColorAria')}
          />
        </div>

        <div
          ref={bodyRef}
          className="notes-module__content"
          contentEditable
          suppressContentEditableWarning
          onInput={handleBodyInput}
          onPaste={handlePaste}
          onDrop={handleDrop}
          data-placeholder={t('notes.contentPlaceholder')}
        />
      </div>
    </div>
  );
}
