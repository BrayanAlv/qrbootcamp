import { z } from 'zod';
import { INVITATION_STATUS } from '../models/Invitation.model.js';

// Validación normalizada de una fila del Excel de invitados.
// Recibe un objeto con claves normalizadas (guests normalizan mayúsculas/espacios).
const optionalEmail = z.string().trim().email().optional().or(z.literal(''));

export const guestRowSchema = z.object({
  region: z.string().trim().optional().default(''),
  crmId: z.string().trim().min(1, 'Falta el ID CRM').regex(/^\d+$/, 'ID CRM debe ser numérico'),
  nombre: z.string().trim().min(1, 'Falta el nombre'),
  sede: z.string().trim().optional().default(''),
  asiste: z.string().trim().optional().default(''),
  email: z.string().trim().email('Email inválido'),
  emailCc: optionalEmail,
});

export const ROW_COLUMNS = [
  'region',
  'crmId',
  'nombre',
  'sede',
  'asiste',
  'email',
  'emailCc',
];

// Un ObjectId de Mongo. Sin esta validación, un id malformado revienta en Mongoose con un 500.
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'id inválido');

export const acceptSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    token: z.string().min(1, 'token requerido'),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: objectId }),
});

// `sin_enviar` no es un estado de la invitación: filtra por correo aún no enviado.
export const LIST_STATUS_FILTERS = [...INVITATION_STATUS, 'sin_enviar'];

export const listSentSchema = z.object({
  query: z.object({
    status: z.enum(LIST_STATUS_FILTERS).optional().or(z.literal('')),
    q: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  }),
});

export default {
  guestRowSchema,
  ROW_COLUMNS,
  acceptSchema,
  idParamSchema,
  listSentSchema,
  LIST_STATUS_FILTERS,
};