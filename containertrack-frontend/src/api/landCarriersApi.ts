import { axiosInstance } from "./axiosInstance";
import type { PagedResponse } from "../types/user";
import type {
  CreateLandCarrierRequest,
  LandCarrier,
  UpdateLandCarrierRequest,
  UpdateLandCarrierStatusRequest,
} from "../types/landCarrier";

export const landCarriersApi = {
  list: (includeInactive?: boolean) =>
    axiosInstance
      .get<PagedResponse<LandCarrier>>("/api/land-carriers", {
        params: { includeInactive, size: 500 },
      })
      .then((r) => r.data.content),

  create: (payload: CreateLandCarrierRequest) =>
    axiosInstance.post<LandCarrier>("/api/land-carriers", payload).then((r) => r.data),

  update: (id: string, payload: UpdateLandCarrierRequest) =>
    axiosInstance.patch<LandCarrier>(`/api/land-carriers/${id}`, payload).then((r) => r.data),

  updateStatus: (id: string, payload: UpdateLandCarrierStatusRequest) =>
    axiosInstance.patch<LandCarrier>(`/api/land-carriers/${id}/status`, payload).then((r) => r.data),
};
