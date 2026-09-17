import { axiosInstance } from "./axiosInstance";
import type {
  PagedResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateUserStatusRequest,
  ResetUserPasswordRequest,
  User,
  UserOption,
} from "../types/user";

export const usersApi = {
  list: (params: { page?: number; size?: number; sort?: string }) =>
    axiosInstance.get<PagedResponse<User>>("/api/users", { params }).then((r) => r.data),

  // Open to any authenticated role, pre-filtered to ACTIVE users server-side.
  // Used for pickers (e.g. "operador responsable") that must show every active
  // user regardless of role, not just OPERATOR.
  listActive: () => axiosInstance.get<UserOption[]>("/api/users/active").then((r) => r.data),

  create: (payload: CreateUserRequest) =>
    axiosInstance.post<User>("/api/users", payload).then((r) => r.data),

  update: (id: string, payload: UpdateUserRequest) =>
    axiosInstance.patch<User>(`/api/users/${id}`, payload).then((r) => r.data),

  updateStatus: (id: string, payload: UpdateUserStatusRequest) =>
    axiosInstance.patch<User>(`/api/users/${id}/status`, payload).then((r) => r.data),

  resetPassword: (id: string, payload: ResetUserPasswordRequest) =>
    axiosInstance.patch<User>(`/api/users/${id}/password`, payload).then((r) => r.data),

  resendActivation: (id: string) => axiosInstance.post<void>(`/api/users/${id}/resend-activation`),
};
