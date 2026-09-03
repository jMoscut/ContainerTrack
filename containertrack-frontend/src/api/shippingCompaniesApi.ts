import { axiosInstance } from "./axiosInstance";
import type { PagedResponse } from "../types/user";
import type {
  CreateShippingCompanyRequest,
  ShippingCompany,
  UpdateShippingCompanyRequest,
  UpdateShippingCompanyStatusRequest,
} from "../types/shippingCompany";

export const shippingCompaniesApi = {
  // Backend paginates this endpoint (Page<T>); fetch a large page since the
  // UI treats shipping companies as a small bounded catalog, not a paged list.
  list: (includeInactive?: boolean) =>
    axiosInstance
      .get<PagedResponse<ShippingCompany>>("/api/shipping-companies", {
        params: { includeInactive, size: 500 },
      })
      .then((r) => r.data.content),

  create: (payload: CreateShippingCompanyRequest) =>
    axiosInstance.post<ShippingCompany>("/api/shipping-companies", payload).then((r) => r.data),

  update: (id: string, payload: UpdateShippingCompanyRequest) =>
    axiosInstance.patch<ShippingCompany>(`/api/shipping-companies/${id}`, payload).then((r) => r.data),

  updateStatus: (id: string, payload: UpdateShippingCompanyStatusRequest) =>
    axiosInstance.patch<ShippingCompany>(`/api/shipping-companies/${id}/status`, payload).then((r) => r.data),
};
