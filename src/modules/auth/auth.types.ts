import { UserRole } from "@modules/users/user-role.enum";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type AuthSession = {
  sessionId: string;
  user: AuthenticatedUser;
  expiresAt: Date;
};

export type AuthContext = {
  userAgent?: string;
  ip?: string;
};
