import mongoose from 'mongoose';

export const INVITATION_STATUS = ['pendiente', 'aceptada', 'rechazada', 'expirada'];
export const EMAIL_STATUS = ['pending', 'sent', 'failed'];

// Snapshot del operador que escaneó (se guarda con el nombre/email por si el
// usuario se borra después; el historial no debe perder quién escaneó).
const scanRefSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, default: null },
    email: { type: String, default: null },
  },
  { _id: false },
);

// Resumen denormalizado del escaneo, para el listado/Excel sin consultas N+1.
// Fuente de verdad del "primer escaneo válido" sigue siendo `usedAt` (la
// actualización atómica); esto es una copia optimizada para lectura.
const scanSnapshotSchema = new mongoose.Schema(
  {
    attempts: { type: Number, default: 0 }, // contador atómico vía $inc
    firstAt: { type: Date, default: null },
    firstBy: { type: scanRefSchema, default: null },
    lastAt: { type: Date, default: null },
    lastStatus: { type: String, default: null },
    lastBy: { type: scanRefSchema, default: null },
  },
  { _id: false },
);

// Subdocumento del destinatario principal (invitado)
const recipientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    emailSentAt: { type: Date, default: null },
    emailError: { type: String, default: null },
  },
  { _id: false },
);

const invitationSchema = new mongoose.Schema(
  {
    // Quién envía la invitación
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Destinatario principal
    guest: { type: recipientSchema, required: true },
    // Segundo correo (CORREO 2 del Excel): va en copia del mismo mensaje. Ya
    // no trae nombre propio (la fila solo trae un nombre completo).
    ccEmail: { type: String, default: null, trim: true, lowercase: true },

    // Identificador numérico del CRM: es la clave de deduplicación al importar.
    crmId: { type: String, required: true, trim: true },
    // Campos informativos del Excel, sin reglas de negocio asociadas todavía.
    region: { type: String, default: '', trim: true },
    sede: { type: String, default: '', trim: true },
    asiste: { type: String, default: '', trim: true },

    status: { type: String, enum: INVITATION_STATUS, default: 'pendiente', index: true },

    // QR de un solo uso: solo se guarda el hash SHA-256 del token
    qrTokenHash: { type: String, default: null },

    expiresAt: { type: Date, default: null, index: true },
    usedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },

    // Estado de envío del correo. Es uno solo: `ccEmail` viaja en copia del
    // mismo mensaje, así que no tiene un estado propio que seguir.
    emailStatus: {
      attendee: { type: Boolean, default: false },
    },

    // Resumen de escaneo (campos opcionales, aditivos; null para los que aún
    // no tienen historial). No rompe documentos ni índices existentes.
    scan: { type: scanSnapshotSchema, default: () => ({ attempts: 0 }) },
  },
  { timestamps: true },
);

// Índices para consultas frecuentes (sección 22 del plan)
// Unicidad de `crmId` SOLO cuando es numérico: un `crmId` de texto puede repetirse.
// `sparse` para omitir documentos sin `crmId`; el filtro parcial refuerza la regla.
invitationSchema.index(
  { crmId: 1, sender: 1 },
  { unique: true, sparse: true, partialFilterExpression: { crmId: { $regex: '^\\d+$' } } },
);
invitationSchema.index({ status: 1, sender: 1 });
invitationSchema.index({ qrTokenHash: 1 });
invitationSchema.index({ createdAt: -1 });

// toJSON: ocultar token hash y campos internos
invitationSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.qrTokenHash;
    delete ret.__v;
    return ret;
  },
});

export const Invitation = mongoose.model('Invitation', invitationSchema);

export default Invitation;