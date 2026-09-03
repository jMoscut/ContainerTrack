export type Role = "ADMIN" | "OPERATOR" | "WAREHOUSE";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface ApiError {
  error: string;
  message: string;
  lockedUntil?: string;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
}
