import "express";
import type { AuthenticatedUser } from "@modules/auth/auth.types";

declare module "express" {
  export interface Request {
    requestId?: string;
    user?: AuthenticatedUser;
    sessionId?: string;
  }
}
