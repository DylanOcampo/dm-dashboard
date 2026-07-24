function normalizeItem(rawCategory, rawName, rawDescription, rawValue, label) {
  const category = String(rawCategory ?? '').trim();
  const name = String(rawName ?? '').trim();
  if (!category) throw new Error(`${label}: falta el campo "category".`);
  if (!name) throw new Error(`${label}: falta el campo "name".`);
  const description = rawDescription != null ? String(rawDescription) : '';
  const value = Number(rawValue) || 0;
  return { category, name, description, value };
}

export function parseJSONItems(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`JSON inválido: ${err.message}`);
  }
  if (!Array.isArray(data)) {
    throw new Error('El JSON debe ser un array de items, ej. [{ "category": "...", "name": "..." }].');
  }
  return data.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`Item ${index + 1}: debe ser un objeto.`);
    }
    return normalizeItem(item.category, item.name, item.description, item.value, `Item ${index + 1}`);
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function parseCSVItems(text) {
  const lines = text.split(/\r\n|\r|\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('El CSV está vacío.');
  }
  const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  ['category', 'name'].forEach((col) => {
    if (!header.includes(col)) {
      throw new Error(`Falta la columna "${col}" en el encabezado del CSV.`);
    }
  });
  return lines.slice(1).map((line, index) => {
    const cells = parseCSVLine(line);
    const record = {};
    header.forEach((col, i) => {
      record[col] = cells[i];
    });
    return normalizeItem(record.category, record.name, record.description, record.value, `Fila ${index + 2}`);
  });
}
