import { useEffect, useRef, useState } from 'react';
import './VolumeControl.css';

function volumeIcon(volume) {
  if (volume <= 0) return '🔇';
  if (volume < 50) return '🔉';
  return '🔊';
}

/**
 * Botón desplegable con un slider de volumen (0-100). Puramente controlado
 * — quien lo usa decide qué hacer con `onChange` (típicamente
 * `player.setVolume(value)` del IFrame Player de YouTube).
 */
export default function VolumeControl({ volume, onChange, label, sliderLabel }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="volume-control" ref={rootRef}>
      <button
        type="button"
        className="volume-control__toggle"
        onClick={() => setOpen((o) => !o)}
        title={label}
        aria-label={label}
      >
        {volumeIcon(volume)}
      </button>
      {open && (
        <div className="volume-control__popover">
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={sliderLabel}
          />
        </div>
      )}
    </div>
  );
}
