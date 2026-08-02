import DOMPurify from 'dompurify';

// Notas enriquecidas: solo negrita y color de texto. Nada de scripts, links,
// imágenes ni estilos arbitrarios — el hook de abajo reduce cualquier
// `style` a, como mucho, la propiedad `color`.
const ALLOWED_TAGS = ['b', 'strong', 'span', 'font', 'br', 'div'];
const ALLOWED_ATTR = ['style', 'color'];

let hookInstalled = false;
function installColorOnlyStyleHook() {
  if (hookInstalled) return;
  hookInstalled = true;
  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    if (data.attrName !== 'style') return;
    const match = /color\s*:\s*(#[0-9a-fA-F]{3,8}|rgb\([^)]*\)|[a-zA-Z]+)/.exec(data.attrValue);
    data.attrValue = match ? `color:${match[1]}` : '';
  });
}

export function sanitizeNoteHtml(html) {
  installColorOnlyStyleHook();
  return DOMPurify.sanitize(html || '', { ALLOWED_TAGS, ALLOWED_ATTR });
}
