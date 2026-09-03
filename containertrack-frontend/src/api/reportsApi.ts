import { axiosInstance } from "./axiosInstance";
import type { ConsolidatedReportRequest } from "../types/report";

export const reportsApi = {
  containerReport: (id: string) =>
    axiosInstance.get<Blob>(`/api/reports/container/${id}`, { responseType: "blob" }).then((r) => r.data),

  consolidatedReport: (payload: ConsolidatedReportRequest) =>
    axiosInstance
      .post<Blob>("/api/reports/consolidated", payload, { responseType: "blob" })
      .then((r) => r.data),
};

/** Triggers a browser download for a blob response (e.g. a PDF). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
