import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().email();

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(8).max(128),
  }),
});

export const refreshSchema = z.object({
  cookies: z
    .object({
      refresh_token: z.string().min(1),
    })
    .passthrough(),
});

export default { loginSchema, refreshSchema };