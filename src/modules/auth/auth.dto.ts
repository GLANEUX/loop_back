import { z } from "zod";
import { UserRole } from "@modules/users/user-role.enum";

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
  firstName: z.string().trim().min(1, "Prenom requis.").max(120, "Prenom trop long."),
  lastName: z.string().trim().min(1, "Nom requis.").max(120, "Nom trop long."),
  role: z.enum(UserRole).default(UserRole.User),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(64),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
