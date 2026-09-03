import { axiosInstance } from "./axiosInstance";
import type { AdminSummary } from "../types/dashboard";

export const dashboardApi = {
  getAdminSummary: () => axiosInstance.get<AdminSummary>("/api/dashboard/admin-summary").then((r) => r.data),
};
