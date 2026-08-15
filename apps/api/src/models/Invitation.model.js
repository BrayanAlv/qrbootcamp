import mongoose from 'mongoose';

export const INVITATION_STATUS = ['pendiente', 'aceptada', 'rechazada', 'expirada'];
export const EMAIL_STATUS = ['pending', 'sent', 'failed'];

// Subdocumento de destinatario (invitado o asistente)
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
    // Asistente (opcional): si no hay email de asistente, no se envía su correo
    assistant: { type: recipientSchema, default: null },

    status: { type: String, enum: INVITATION_STATUS, default: 'pendiente', index: true },

    // QR de un solo uso: solo se guarda el hash SHA-256 del token
    qrTokenHash: { type: String, default: null },

    expiresAt: { type: Date, default: null, index: true },
    usedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },

    // Estado de envío del correo. Es uno solo: el asistente viaja en copia del
    // mismo mensaje, así que no tiene un estado propio que seguir.
    emailStatus: {
      attendee: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

// Índices para consultas frecuentes (sección 22 del plan)
invitationSchema.index({ guest: 1 });
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