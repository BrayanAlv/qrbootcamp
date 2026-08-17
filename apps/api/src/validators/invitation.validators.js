import { z } from 'zod';
import { INVITATION_STATUS } from '../models/Invitation.model.js';

// Validación normalizada de una fila del Excel de invitados.
// Recibe un objeto con claves normalizadas (guests normalizan mayúsculas/espacios).
const looseEmail = z.string().trim().optional().default('');
const isValidEmail = (value) => Boolean(value) && z.string().trim().email().safeParse(value).success;

// CORREO 1 y CORREO 2 no tienen roles fijos: alcanza con que uno de los dos sea
// un correo válido para aceptar la fila. Ese es el que recibe el QR; si los dos
// son válidos, CORREO 1 sigue siendo el principal y CORREO 2 va en copia.
export const guestRowSchema = z
  .object({
    region: z.string().trim().optional().default(''),
    crmId: z.string().trim().min(1, 'Falta el ID CRM'),
    nombre: z.string().trim().min(1, 'Falta el nombre'),
    sede: z.string().trim().optional().default(''),
    asiste: z.string().trim().optional().default(''),
    email: looseEmail,
    emailCc: looseEmail,
  })
  .superRefine((data, ctx) => {
    if (!isValidEmail(data.email) && !isValidEmail(data.emailCc)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'CORREO 1 y CORREO 2 inválidos: se necesita al menos un correo válido',
      });
    }
  })
  .transform((data) => {
    const emailOk = isValidEmail(data.email);
    const ccOk = isValidEmail(data.emailCc);
    const primary = emailOk ? data.email : data.emailCc;
    const cc = emailOk && ccOk ? data.emailCc : '';
    return { ...data, email: primary.toLowerCase(), emailCc: cc.toLowerCase() };
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

// `sin_enviar`/`fallido` no son estados de la invitación: filtran por el envío del correo.
export const LIST_STATUS_FILTERS = [...INVITATION_STATUS, 'sin_enviar', 'fallido'];

export const listSentSchema = z.object({
  query: z.object({
    status: z.enum(LIST_STATUS_FILTERS).optional().or(z.literal('')),
    q: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  }),
});

// Alta manual de un invitado: mismas reglas y misma normalización que una fila de Excel.
export const createInvitationSchema = z.object({ body: guestRowSchema });

export default {
  guestRowSchema,
  ROW_COLUMNS,
  acceptSchema,
  idParamSchema,
  listSentSchema,
  createInvitationSchema,
  LIST_STATUS_FILTERS,
};