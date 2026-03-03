import { z } from "zod";

export const swipeSchema = z
  .object({
    targetProfileId: z.string().uuid("Profil cible invalide."),
    isLike: z.boolean(),
  })
  .strict();

export type SwipeInput = z.infer<typeof swipeSchema>;
