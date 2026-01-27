import { z } from "zod";

export const registerSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8, "Mot de passe trop court (8 caracteres minimum).")
    .max(64, "Mot de passe trop long (64 caracteres maximum).")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule, un chiffre et un caractere special.",
    ),
});

export const loginSchema = registerSchema;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
