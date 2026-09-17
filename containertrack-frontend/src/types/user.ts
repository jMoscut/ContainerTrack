import type { Role } from "./auth";

export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING_ACTIVATION";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  role: Role;
}

export interface UpdateUserRequest {
  fullName: string;
  email: string;
  role: Role;
}

export interface UpdateUserStatusRequest {
  status: "ACTIVE" | "INACTIVE";
}

export interface ResetUserPasswordRequest {
  temporaryPassword: string;
}

export interface UserOption {
  id: string;
  fullName: string;
  role: Role;
}
