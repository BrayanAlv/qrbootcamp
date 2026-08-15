import mongoose from 'mongoose';

// Registro de auditoría. NUNCA guarda passwords, tokens completos o secretos.
const auditLogSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, index: true }, // p.ej. login_failed, qr_used, invitation_accepted
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    email: { type: String, default: null },
    ip: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// Conservación: los logs de auditoría expiran tras N días.
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// Crea un log de auditoría de forma no bloqueante (nunca deriva del flujo principal).
export async function audit(event, { userId = null, email = null, ip = null, meta = {} } = {}) {
  try {
    await AuditLog.create({ event, userId, email, ip, meta });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[audit] no se pudo registrar:', error.message);
  }
}

export default { AuditLog, audit };