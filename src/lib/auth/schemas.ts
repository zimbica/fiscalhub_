import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email('Informe um e-mail válido.'));
export const passwordSchema = z.string().min(12, 'Use pelo menos 12 caracteres.').max(128, 'Use até 128 caracteres.');
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Informe sua senha.').max(128) });
export const signupSchema = z.object({
  fullName: z.string().trim().min(3, 'Informe seu nome completo.').max(100),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'As senhas precisam ser iguais.' });
export const recoverySchema = z.object({ email: emailSchema });
export const passwordUpdateSchema = z.object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'As senhas precisam ser iguais.' });
export const profileSchema = z.object({ fullName: z.string().trim().min(3, 'Informe seu nome completo.').max(100) });
export const settingsSchema = z.object({ theme: z.enum(['light', 'dark', 'system']), accent: z.enum(['blue', 'purple']) });
export const deletionSchema = z.object({ password: z.string().min(1).max(128), confirmation: z.literal('EXCLUIR', { error: 'Digite EXCLUIR para confirmar.' }) });
export type UserPreferences = z.infer<typeof settingsSchema>;
