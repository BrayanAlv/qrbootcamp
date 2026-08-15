import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';
import { Invitation } from '../models/Invitation.model.js';
import { guestRowSchema } from '../validators/invitation.validators.js';
import AppError from '../utils/ApiError.js';

const HEADER_ALIASES = {
  nombre: ['nombre', 'name', 'nombre_apellido', 'fullname', 'nombreyapellido'],
  email: ['email', 'correo', 'mail'],
  nombre_asistente: ['nombre_asistente', 'asistente', 'assistant', 'assistant_name', 'acompanante'],
  email_asistente: ['email_asistente', 'correo_asistente', 'assistant_email', 'acompanante_email'],
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
  const headerMap = mapHeaders(headerRow.values.map((v) => (v == null ? '' : String(v).trim())));
  const dataRowValues = (row) =>
    Array.isArray(row) ? row : row.values.map((v) => (v == null ? '' : String(v).trim()));

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
    nombre: pick('nombre'),
    email: pick('email'),
    nombre_asistente: pick('nombre_asistente'),
    email_asistente: pick('email_asistente'),
  };
}

export async function importInvitationsFromExcel({ buffer, mimeType, senderId }) {
  const { headerMap, rows } = await readRows(buffer, mimeType);

  if (!headerMap.nombre || !headerMap.email) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'El archivo debe tener columnas "nombre" y "email".',
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
  const seenEmails = new Set();

  rows.forEach((rawRow, i) => {
    const guest = rowToGuest(headerMap, rawRow);
    const line = i + 2; // +2 por encabezado
    const parsed = guestRowSchema.safeParse(guest);
    if (!parsed.success) {
      errors.push({ fila: line, errores: parsed.error.issues.map((iss) => iss.message) });
      return;
    }
    const email = parsed.data.email.toLowerCase();
    if (seenEmails.has(email)) {
      errors.push({ fila: line, errores: [`Email duplicado en el archivo: ${email}`] });
      return;
    }
    seenEmails.add(email);

    valid.push({
      sender: senderId,
      guest: { name: parsed.data.nombre, email },
      assistant: parsed.data.email_asistente
        ? { name: parsed.data.nombre_asistente || 'Asistente', email: parsed.data.email_asistente.toLowerCase() }
        : null,
      status: 'pendiente',
      emailStatus: { attendee: false, assistant: false },
    });
  });

  let inserted = 0;
  if (valid.length) {
    // Insert masivo; si un email ya existe en BD se omite (unicidad).
    const ops = await Invitation.bulkWrite(
      valid.map((doc) => ({
        updateOne: {
          filter: { 'guest.email': doc.guest.email, sender: doc.sender },
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