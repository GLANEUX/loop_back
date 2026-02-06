import { z } from "zod";
import { UserRole } from "@modules/users/user-role.enum";

export const registerSchema = z.object({
  email: z.string().trim().email("Email invalide."),
  pseudo: z
    .string()
    .trim()
    .min(3, "Pseudo trop court (3 caracteres minimum).")
    .max(120, "Pseudo trop long."),
  password: z
    .string()
    .min(8, "Mot de passe trop court (8 caracteres minimum).")
    .max(64, "Mot de passe trop long (64 caracteres maximum).")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule, un chiffre et un caractere special.",
    ),
  role: z.enum(UserRole).default(UserRole.User),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Email invalide."),
  password: z
    .string()
    .min(8, "Mot de passe trop court (8 caracteres minimum).")
    .max(64, "Mot de passe trop long (64 caracteres maximum)."),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z
      .string()
      .min(8, "Mot de passe trop court (8 caracteres minimum).")
      .max(64, "Mot de passe trop long (64 caracteres maximum)."),
    newPassword: z
      .string()
      .min(8, "Mot de passe trop court (8 caracteres minimum).")
      .max(64, "Mot de passe trop long (64 caracteres maximum).")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        "Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule, un chiffre et un caractere special.",
      ),
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "Le nouveau mot de passe doit etre different de l'ancien.",
    path: ["newPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
