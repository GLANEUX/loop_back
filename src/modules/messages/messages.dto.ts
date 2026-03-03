import { z } from "zod";

export const sendMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { message: "Le message ne peut pas etre vide." })
    .max(2000, { message: "Le message depasse 2000 caracteres." }),
});

export const markReadSchema = z.object({
  messageId: z.string().uuid(),
});
