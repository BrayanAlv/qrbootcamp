import ExcelJS from 'exceljs';
import { Invitation } from '../models/Invitation.model.js';
import { QrScanAttempt, SCAN_STATUS } from '../models/QrScanAttempt.model.js';

// Etiquetas en español para los estados (tanto de invitación como de intento).
export const QR_STATUS_LABELS = {
  [SCAN_STATUS.VALID]: 'Válido',
  [SCAN_STATUS.ALREADY_USED]: 'Ya utilizado',
  [SCAN_STATUS.EXPIRED]: 'Expirado',
  [SCAN_STATUS.INVALID]: 'Inválido',
  [SCAN_STATUS.ERROR]: 'Error',
};

const INV_STATUS_LABELS = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  expirada: 'Expirada',
};

// Formato determinista (hora local del servidor; la base guarda UTC).
const pad = (n) => String(n).padStart(2, '0');
export function fmtDate(d) {
  if (!d) return '';
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}
export function fmtTime(d) {
  if (!d) return '';
  const x = new Date(d);
  return `${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}`;
}

export const SUMMARY_HEADERS = [
  'Persona',
  'Email',
  'QR / CRM',
  'Estado',
  'Fecha primer escaneo',
  'Hora primer escaneo',
  'Usuario primer escaneo',
  'Nº de intentos',
  'Fecha último intento',
  'Hora último intento',
  'Resultado último intento',
  'Usuario último intento',
];

export const HISTORY_HEADERS = [
  'Fecha',
  'Hora',
  'Persona',
  'Email',
  'QR / CRM',
  'Usuario',
  'Intento',
  'Resultado',
];

export function summaryRow(inv) {
  const scan = inv?.scan ?? {};
  return [
    inv?.guest?.name ?? '',
    inv?.guest?.email ?? '',
    inv?.crmId ?? '',
    INV_STATUS_LABELS[inv?.status] ?? inv?.status ?? '',
    fmtDate(scan.firstAt),
    fmtTime(scan.firstAt),
    scan.firstBy?.name ?? '',
    scan.attempts ?? 0,
    fmtDate(scan.lastAt),
    fmtTime(scan.lastAt),
    QR_STATUS_LABELS[scan.lastStatus] ?? '',
    scan.lastBy?.name ?? '',
  ];
}

export function historyRow(attempt) {
  const s = attempt?.scanner ?? {};
  return [
    fmtDate(attempt?.scannedAt),
    fmtTime(attempt?.scannedAt),
    attempt?.invitationGuest?.name ?? '',
    attempt?.invitationGuest?.email ?? '',
    attempt?.crmId ?? '',
    s.name ?? '',
    attempt?.attemptNumber ?? '',
    QR_STATUS_LABELS[attempt?.status] ?? attempt?.status ?? '',
  ];
}

export function createExportWorkbook() {
  const workbook = new ExcelJS.Workbook();

  const summary = workbook.addWorksheet('Resumen');
  summary.columns = SUMMARY_HEADERS.map((h) => ({ header: h, width: 26 }));
  summary.getRow(1).font = { bold: true };

  const history = workbook.addWorksheet('Historial de escaneos');
  history.columns = HISTORY_HEADERS.map((h) => ({ header: h, width: 26 }));
  history.getRow(1).font = { bold: true };

  return { workbook, summary, history };
}

/**
 * Genera el Excel completo (Resumen + Historial) y devuelve el Buffer .xlsx.
 * Lectura con cursores en lotes para no cachear todo el padrón en memoria y
 * evitar consultas N+1 (una sola pasada por colección).
 */
export async function buildRegistryWorkbook({ includeHistory = true } = {}) {
  const { workbook, summary, history } = createExportWorkbook();

  const invCursor = Invitation.find({}, { guest: 1, crmId: 1, status: 1, scan: 1 }).lean().cursor();
  let batch = [];
  for await (const inv of invCursor) {
    batch.push(summaryRow(inv));
    if (batch.length >= 500) {
      summary.addRows(batch);
      batch = [];
    }
  }
  if (batch.length) summary.addRows(batch);

  if (includeHistory) {
    const attCursor = QrScanAttempt.find({}).sort({ scannedAt: 1 }).lean().cursor();
    let hbatch = [];
    for await (const att of attCursor) {
      hbatch.push(historyRow(att));
      if (hbatch.length >= 500) {
        history.addRows(hbatch);
        hbatch = [];
      }
    }
    if (hbatch.length) history.addRows(hbatch);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

export default {
  QR_STATUS_LABELS,
  SUMMARY_HEADERS,
  HISTORY_HEADERS,
  summaryRow,
  historyRow,
  fmtDate,
  fmtTime,
  createExportWorkbook,
  buildRegistryWorkbook,
};