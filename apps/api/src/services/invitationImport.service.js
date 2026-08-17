import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';
import { Invitation } from '../models/Invitation.model.js';
import { guestRowSchema } from '../validators/invitation.validators.js';
import AppError from '../utils/ApiError.js';

const HEADER_ALIASES = {
  region: ['region'],
  crmId: ['idcrm', 'crmid', 'crm'],
  nombre: ['nombrecompleto', 'nombre', 'name', 'fullname'],
  sede: ['sede'],
  asiste: ['asiste', 'asistencia'],
  email: ['correo1', 'correo', 'email', 'mail'],
  emailCc: ['correo2', 'cc', 'copia'],
};

function normalizeKey(key) {
  return String(key ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function mapHeaders(headerRow) {
  const map = {};
  headerRow.forEach((cellValue, idx) => {
    const key = normalizeKey(cellValue);
    Object.entries(HEADER_ALIASES).forEach(([canonical, aliases]) => {
      if (aliases.map(normalizeKey).includes(key)) map[canonical] = idx;
    });
  });
  return map;
}

// Excel autoconvierte celdas de correo en hipervínculos ({ text, hyperlink })
// y ExcelJS también puede devolver rich text ({ richText: [...] }) en vez de
// un string plano: sin esto, `String(v)` da "[object Object]".
function cellToString(v) {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (typeof v.text === 'string') return v.text;
    if (Array.isArray(v.richText)) return v.richText.map((frag) => frag.text ?? '').join('');
  }
  return String(v);
}

async function readRows(buffer, mimeType) {
  const wb = new ExcelJS.Workbook();
  const ext = mimeType === 'text/csv' ? 'csv' : 'xlsx';
  if (ext === 'csv') {
    // `csv.read` espera un stream legible, no un string: pasarle texto tumbaba el proceso.
    await wb.csv.read(Readable.from(buffer.toString('utf8')));
  } else {
    await wb.xlsx.load(buffer);
  }
  const ws = wb.worksheets[0];
  if (!ws) return { headerMap: {}, rows: [] };

  const headerRow = ws.getRow(1);
  const headerMap = mapHeaders(headerRow.values.map((v) => cellToString(v).trim()));
  const dataRowValues = (row) =>
    Array.isArray(row) ? row : row.values.map((v) => cellToString(v).trim());

  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 1) return; // saltar encabezado
    rows.push(dataRowValues(row));
  });

  return { headerMap, rows };
}

function rowToGuest(headerMap, rawRow) {
  const pick = (canonical) => rawRow[headerMap[canonical]] ?? '';
  return {
    region: pick('region'),
    crmId: pick('crmId'),
    nombre: pick('nombre'),
    sede: pick('sede'),
    asiste: pick('asiste'),
    email: pick('email'),
    emailCc: pick('emailCc'),
  };
}

export async function importInvitationsFromExcel({ buffer, mimeType, senderId }) {
  const { headerMap, rows } = await readRows(buffer, mimeType);

  if (!headerMap.nombre || !headerMap.email || !headerMap.crmId) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'El archivo debe tener columnas "ID CRM", "NOMBRE COMPLETO" y "CORREO 1".',
      httpStatus: 400,
    });
  }
  if (rows.length === 0) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'El archivo no contiene filas de invitados.',
      httpStatus: 400,
    });
  }

  const valid = [];
  const errors = [];
  const seenCrmIds = new Set();

  rows.forEach((rawRow, i) => {
    const guest = rowToGuest(headerMap, rawRow);
    const line = i + 2; // +2 por encabezado
    const parsed = guestRowSchema.safeParse(guest);
    if (!parsed.success) {
      errors.push({ fila: line, errores: parsed.error.issues.map((iss) => iss.message), row: guest });
      return;
    }
    if (seenCrmIds.has(parsed.data.crmId)) {
      errors.push({ fila: line, errores: [`ID CRM duplicado en el archivo: ${parsed.data.crmId}`], row: guest });
      return;
    }
    seenCrmIds.add(parsed.data.crmId);

    valid.push({
      sender: senderId,
      crmId: parsed.data.crmId,
      region: parsed.data.region,
      sede: parsed.data.sede,
      asiste: parsed.data.asiste,
      guest: { name: parsed.data.nombre, email: parsed.data.email },
      ccEmail: parsed.data.emailCc || null,
      status: 'pendiente',
      emailStatus: { attendee: false },
    });
  });

  let inserted = 0;
  if (valid.length) {
    // Insert masivo; si un ID CRM ya existe en BD se omite (unicidad).
    const ops = await Invitation.bulkWrite(
      valid.map((doc) => ({
        updateOne: {
          filter: { crmId: doc.crmId, sender: doc.sender },
          update: { $setOnInsert: doc },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    inserted = ops.upsertedCount;
  }

  return {
    total: rows.length,
    inserted,
    skippedExisting: valid.length - inserted,
    errors,
  };
}

export default importInvitationsFromExcel;