// CSV mínimo, sin dependencias: alcanza para exportar filas planas de texto.
function escapeCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows, headers) {
  const lines = [headers.map((h) => escapeCell(h.label)).join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => escapeCell(row[h.key])).join(','));
  });
  return lines.join('\r\n');
}

export function downloadCsv(filename, content) {
  // BOM para que Excel detecte UTF-8 y no rompa acentos/Ñ al abrir el archivo.
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
