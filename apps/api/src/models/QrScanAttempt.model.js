import mongoose from 'mongoose';

// Estado de un intento de escaneo. Se guarda el código normalizado (no la
// palabra), para que la auditoría se pueda filtrar de forma estable.
export const SCAN_STATUS = {
  VALID: 'valid', // primer (y único) escaneo válido
  ALREADY_USED: 'already_used', // el QR ya se utilizó
  EXPIRED: 'expired', // QR expirado
  INVALID: 'invalid', // token malformado o invitación inexistente
  ERROR: 'error', // no disponible / error no clasificado
};

const SCAN_STATUS_VALUES = Object.values(SCAN_STATUS);

// Referencia a quien hizo el escaneo. Guardamos también un snapshot de
// name/email para que la auditoría sobreviva aunque el usuario se borre.
const scannerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, default: null },
    email: { type: String, default: null },
  },
  { _id: false },
);

// A diferencia de AuditLog (que expira a los 90 días con TTL), el historial de
// escaneos es permanente: el requisito es conservar todos los intentos.
const qrScanAttemptSchema = new mongoose.Schema(
  {
    // Invitación (persona) escaneada. null cuando el QR no corresponde a
    // ninguna invitación conocida.
    invitation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invitation',
      default: null,
    },
    // No guardamos el token QR crudo (solo su hash SHA-256, patrón del proyecto).
    qrTokenHash: { type: String, default: null },

    // Snapshot de la persona al momento del intento (la invitación podría
    // borrarse después si aún no fue utilizada; el historial no debe perderla).
    invitationGuest: {
      name: { type: String, default: null },
      email: { type: String, default: null },
    },
    // Identificador de negocio del invitado (columna "QR" en listado/Excel).
    crmId: { type: String, default: null },

    // Operador autenticado que hizo el escaneo. Fuente de verdad: req.user (JWT),
    // nunca un campo enviado por el cliente.
    scanner: { type: scannerSchema, default: null },

    status: { type: String, enum: SCAN_STATUS_VALUES, required: true, index: true },
    attemptNumber: { type: Number, default: 1 },
    isFirstValid: { type: Boolean, default: false },

    // Timestamp del servidor (UTC). Fecha/hora se derivan de aquí en la UI/Excel.
    scannedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// Consultas frecuentes: historial de una persona, y auditoría por hash (para
// QRs desconocidos).
qrScanAttemptSchema.index({ invitation: 1, scannedAt: -1 });
qrScanAttemptSchema.index({ qrTokenHash: 1, scannedAt: -1 });

// Doble seguro del "un solo escaneo válido": a nivel de base de datos, la
// aceptación atómica sobre Invitation.usedAt es la fuente de verdad; este
// índice evita que el registro de auditoría tenga más de un intento válido
// por invitación.
qrScanAttemptSchema.index(
  { invitation: 1 },
  { unique: true, partialFilterExpression: { isFirstValid: true } },
);

export const QrScanAttempt = mongoose.model('QrScanAttempt', qrScanAttemptSchema);

export default QrScanAttempt;