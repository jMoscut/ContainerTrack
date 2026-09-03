import { axiosInstance } from "./axiosInstance";
import type { AuthUser, ChangePasswordRequest, LoginRequest, LoginResponse, RefreshResponse } from "../types/auth";

export const authApi = {
  login: (payload: LoginRequest) =>
    axiosInstance.post<LoginResponse>("/api/auth/login", payload).then((r) => r.data),

  refresh: (refreshToken: string) =>
    axiosInstance.post<RefreshResponse>("/api/auth/refresh", { refreshToken }).then((r) => r.data),

  me: () => axiosInstance.get<AuthUser>("/api/auth/me").then((r) => r.data),

  logout: (refreshToken: string) => axiosInstance.post<void>("/api/auth/logout", { refreshToken }),

  changePassword: (payload: ChangePasswordRequest) =>
    axiosInstance.post<void>("/api/auth/change-password", payload),
};
