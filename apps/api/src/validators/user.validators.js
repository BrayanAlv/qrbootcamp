import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i);

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(128),
    role: z.enum(['admin', 'user']).default('user'),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      role: z.enum(['admin', 'user']).optional(),
      isActive: z.boolean().optional(),
      name: z.string().trim().min(1).max(120).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'Al menos un campo' }),
});

export default { createUserSchema, updateUserSchema };