import mongoose from 'mongoose';
import { Invitation, INVITATION_STATUS } from '../models/Invitation.model.js';
import AppError from '../utils/ApiError.js';
import { hashToken } from './qr.service.js';
import { extractQrToken } from '../validators/qr.validators.js';

const now = () => new Date();

// Invitaciones recibidas por el usuario (su email es invitado o va en copia).
export async function listReceivedInvitations(userEmail) {
  return Invitation.find({
    $or: [{ 'guest.email': userEmail }, { ccEmail: userEmail }],
  })
    .select('-qrTokenHash')
    .sort({ createdAt: -1 });
}

// Escapa los metacaracteres para que la búsqueda libre no se interprete como regex.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildSentFilter(senderId, { status, q } = {}) {
  const filter = { sender: senderId };

  // `sin_enviar`/`fallido` no son estados de la invitación, sino del correo.
  if (status === 'sin_enviar') filter['emailStatus.attendee'] = { $ne: true };
  else if (status === 'fallido') {
    filter['emailStatus.attendee'] = { $ne: true };
    filter['guest.emailError'] = { $ne: null };
  } else if (status) filter.status = status;

  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ 'guest.name': rx }, { 'guest.email': rx }];
  }

  return filter;
}

// Invitaciones cargadas/enviadas por el admin (panel de administración), con filtros y paginación.
export async function listSentInvitations(senderId, { status, q, page = 1, limit = 25 } = {}) {
  const filter = buildSentFilter(senderId, { status, q });

  const [items, total] = await Promise.all([
    Invitation.find(filter)
      .select('-qrTokenHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Invitation.countDocuments(filter),
  ]);

  return { items, total, page, limit };
}

// Padrón global de invitados (para roles de escaneo/lectura): todas las
// invitaciones de todos los remitentes, con los campos útiles en puerta.
export async function listRegistry({ status, q, page = 1, limit = 25 } = {}) {
  const filter = {};
  if (status === 'sin_enviar') filter['emailStatus.attendee'] = { $ne: true };
  else if (status === 'fallido') {
    filter['emailStatus.attendee'] = { $ne: true };
    filter['guest.emailError'] = { $ne: null };
  } else if (status) filter.status = status;

  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ 'guest.name': rx }, { 'guest.email': rx }];
  }

  const [items, total] = await Promise.all([
    Invitation.find(filter)
      .select('guest.name guest.email region sede asiste crmId status scan')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Invitation.countDocuments(filter),
  ]);

  return { items, total, page, limit };
}

// Contadores del panel: totales por estado y correos aún sin enviar.
export async function getSentStats(senderId) {
  const [result] = await Invitation.aggregate([
    { $match: { sender: new mongoose.Types.ObjectId(senderId) } },
    {
      $facet: {
        total: [{ $count: 'n' }],
        porEstado: [{ $group: { _id: '$status', n: { $sum: 1 } } }],
        sinEnviar: [{ $match: { 'emailStatus.attendee': { $ne: true } } }, { $count: 'n' }],
      },
    },
  ]);

  const porEstado = Object.fromEntries(INVITATION_STATUS.map((s) => [s, 0]));
  result.porEstado.forEach(({ _id, n }) => {
    if (_id in porEstado) porEstado[_id] = n;
  });

  return {
    total: result.total[0]?.n ?? 0,
    sinEnviar: result.sinEnviar[0]?.n ?? 0,
    porEstado,
  };
}

/**
 * Elimina una invitación del admin que la cargó.
 * Una invitación ya utilizada es registro de asistencia: no se borra.
 */
export async function deleteInvitation({ invitationId, senderId }) {
  const inv = await Invitation.findOne({ _id: invitationId, sender: senderId });
  if (!inv) {
    throw new AppError({ code: 'NOT_FOUND', message: 'Invitación no encontrada', httpStatus: 404 });
  }
  if (inv.usedAt) {
    throw new AppError({
      code: 'INVITATION_NOT_AVAILABLE',
      message: 'La invitación ya fue utilizada y no puede eliminarse',
      httpStatus: 409,
    });
  }

  await Invitation.deleteOne({ _id: inv._id });
  return { id: inv._id, guest: inv.guest.email };
}

/**
 * Aceptación atómica de un QR de un solo uso.
 * Solo tiene éxito si el token corresponde a la invitación, aún no está usado ni expirado.
 * Requiere el token para demostrar posesión del QR (nunca se confía en un userId del cliente).
 */
export async function acceptInvitation({ invitationId, token }) {
  // El QR codifica la URL <APP_URL>/i/<token>: normalizamos igual que en la
  // validación para aceptar tanto la URL completa como el token suelto.
  const normalized = extractQrToken(token);
  if (!normalized) {
    throw new AppError({ code: 'INVALID_QR', message: 'Código QR inválido', httpStatus: 400 });
  }
  const tokenHash = hashToken(normalized);
  const updated = await Invitation.findOneAndUpdate(
    {
      _id: invitationId,
      qrTokenHash: tokenHash,
      usedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now() } }],
    },
    { $set: { usedAt: now(), acceptedAt: now(), status: 'aceptada' } },
    { new: true },
  );

  if (updated) return updated;

  // Determinar el motivo de rechazo para devolver el código preciso.
  const inv = await Invitation.findOne({ _id: invitationId, qrTokenHash: tokenHash });
  if (!inv) {
    throw new AppError({ code: 'INVALID_QR', message: 'Código QR inválido', httpStatus: 400 });
  }
  if (inv.usedAt) {
    throw new AppError({ code: 'QR_ALREADY_USED', message: 'Código QR ya utilizado', httpStatus: 409 });
  }
  if (inv.expiresAt && inv.expiresAt.getTime() < Date.now()) {
    throw new AppError({ code: 'QR_EXPIRED', message: 'Código QR expirado', httpStatus: 410 });
  }
  throw new AppError({ code: 'INVITATION_NOT_AVAILABLE', message: 'Invitación no disponible', httpStatus: 409 });
}

export default {
  listReceivedInvitations,
  listSentInvitations,
  getSentStats,
  deleteInvitation,
  acceptInvitation,
  listRegistry,
};