import { useRef } from 'react';
import { fileToCompressedDataUrl } from '../../../services/imageUtils';
import './AvatarInput.css';

export default function AvatarInput({ value, onChange, label, ariaLabel }) {
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      onChange(dataUrl);
    } catch {
      // Imagen ilegible: no rompe el formulario, simplemente no se actualiza el avatar.
    }
  };

  return (
    <div className="avatar-input">
      <button
        type="button"
        className="avatar-input__preview"
        onClick={() => inputRef.current?.click()}
        aria-label={ariaLabel || label}
        title={label}
      >
        {value ? <img src={value} alt="" /> : <span className="avatar-input__placeholder">+</span>}
      </button>
      {value && (
        <button
          type="button"
          className="avatar-input__clear"
          onClick={() => onChange(null)}
          aria-label={label}
        >
          ×
        </button>
      )}
      <input
        type="file"
        accept="image/*"
        ref={inputRef}
        className="avatar-input__hidden"
        onChange={handleFile}
      />
    </div>
  );
}
