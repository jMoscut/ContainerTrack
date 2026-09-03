import { axiosInstance } from "./axiosInstance";
import type {
  Container,
  ContainerHistory,
  ContainerListParams,
  ContainerPhoto,
  CreateContainerRequest,
  DischargeRequest,
  PhotoUploadResponse,
  TransitionRequest,
  UpdateContainerRequest,
} from "../types/container";
import type { PagedResponse } from "../types/user";

export const containersApi = {
  list: (params: ContainerListParams) =>
    axiosInstance.get<PagedResponse<Container>>("/api/containers", { params }).then((r) => r.data),

  get: (id: string) => axiosInstance.get<Container>(`/api/containers/${id}`).then((r) => r.data),

  create: (payload: CreateContainerRequest) =>
    axiosInstance.post<Container>("/api/containers", payload).then((r) => r.data),

  update: (id: string, payload: UpdateContainerRequest) =>
    axiosInstance.patch<Container>(`/api/containers/${id}`, payload).then((r) => r.data),

  transition: (id: string, payload: TransitionRequest) =>
    axiosInstance.post<Container>(`/api/containers/${id}/transition`, payload).then((r) => r.data),

  history: (id: string) =>
    axiosInstance.get<ContainerHistory>(`/api/containers/${id}/history`).then((r) => r.data),

  uploadPhotos: (id: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return axiosInstance
      .post<PhotoUploadResponse>(`/api/containers/${id}/photos`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  listPhotos: (id: string) =>
    axiosInstance.get<ContainerPhoto[]>(`/api/containers/${id}/photos`).then((r) => r.data),

  discharge: (id: string, payload: DischargeRequest) =>
    axiosInstance.post<Container>(`/api/containers/${id}/discharge`, payload).then((r) => r.data),

  delete: (id: string) => axiosInstance.delete<void>(`/api/containers/${id}`).then((r) => r.data),
};
