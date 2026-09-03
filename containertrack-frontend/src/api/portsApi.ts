import { axiosInstance } from "./axiosInstance";
import type { PagedResponse } from "../types/user";
import type { CreatePortRequest, Port, UpdatePortRequest, UpdatePortStatusRequest } from "../types/port";

export const portsApi = {
  // Backend paginates this endpoint (Page<T>); fetch a large page since the
  // UI treats ports as a small bounded catalog, not a paged list.
  list: (includeInactive?: boolean) =>
    axiosInstance
      .get<PagedResponse<Port>>("/api/ports", {
        params: { includeInactive, size: 500 },
      })
      .then((r) => r.data.content),

  create: (payload: CreatePortRequest) =>
    axiosInstance.post<Port>("/api/ports", payload).then((r) => r.data),

  update: (id: string, payload: UpdatePortRequest) =>
    axiosInstance.patch<Port>(`/api/ports/${id}`, payload).then((r) => r.data),

  updateStatus: (id: string, payload: UpdatePortStatusRequest) =>
    axiosInstance.patch<Port>(`/api/ports/${id}/status`, payload).then((r) => r.data),
};
