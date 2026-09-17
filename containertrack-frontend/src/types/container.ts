export type ContainerStatus =
  | "REGISTERED"
  | "DEPARTED_ORIGIN"
  | "ARRIVED_PORT"
  | "DEPARTED_PORT"
  | "ARRIVED_WAREHOUSE"
  | "DISCHARGED";

/** Pseudo-status used only in the UI to render the delay flag as an overlay badge. */
export const DELAY_FLAG_STATUS = "DELAY_FLAG" as const;

export const CONTAINER_STATUS_ORDER: ContainerStatus[] = [
  "REGISTERED",
  "DEPARTED_ORIGIN",
  "ARRIVED_PORT",
  "DEPARTED_PORT",
  "ARRIVED_WAREHOUSE",
  "DISCHARGED",
];

export interface Container {
  id: string;
  containerNumber: string;
  blNumber: string;
  // Backend ContainerDTO is flat (shippingCompanyId/shippingCompanyName etc), not
  // nested objects — matches the real wire contract, verified against the live API.
  shippingCompanyId: string;
  shippingCompanyName: string;
  landCarrierId: string | null;
  landCarrierName: string | null;
  warehouseAssigneeId: string | null;
  warehouseAssigneeName: string | null;
  originPort: string;
  destinationPort: string;
  cargoDescription: string;
  responsibleOperatorId: string;
  responsibleOperatorName: string;
  status: ContainerStatus;
  version: number;
  lastUpdatedBy: string | null;
  lastUpdatedByName: string | null;
  lastUpdatedAt: string | null;
  estimatedDepartureDate: string | null;
  actualDepartureDate: string | null;
  estimatedArrivalPort: string | null;
  actualArrivalPort: string | null;
  freeDaysLimit: number | null;
  freeDaysExpiry: string | null;
  estimatedDeparturePort: string | null;
  actualDeparturePort: string | null;
  estimatedArrivalWarehouse: string | null;
  actualArrivalWarehouse: string | null;
  dischargeStartAt: string | null;
  dischargeEndAt: string | null;
  dischargeNotes: string | null;
  delayFlag: boolean;
  internalNotes: string | null;
  createdAt: string;
}

export interface ContainerListParams {
  page?: number;
  size?: number;
  status?: ContainerStatus;
  shippingCompanyId?: string;
  dateFrom?: string;
  dateTo?: string;
  operatorId?: string;
  sort?: string;
}

export interface CreateContainerRequest {
  containerNumber: string;
  blNumber: string;
  // Backend expects these as Long (JSON number). React-hook-form/<select> values
  // are always strings — convert with Number(...) at the call site before sending.
  shippingCompanyId: number;
  // Optional at creation — filled in once the container reaches port.
  landCarrierId?: number;
  originPort: string;
  destinationPort: string;
  cargoDescription: string;
  responsibleOperatorId: number;
  estimatedDepartureDate: string;
  internalNotes?: string;
}

export type UpdateContainerRequest = Partial<
  Omit<CreateContainerRequest, "containerNumber" | "shippingCompanyId" | "responsibleOperatorId" | "landCarrierId">
> & {
  shippingCompanyId?: number;
  landCarrierId?: number;
  responsibleOperatorId?: number;
  version: number;
  // Additional editable estimate fields, not part of container creation but
  // patchable afterwards (e.g. from the calendar's inline date-edit modal).
  estimatedArrivalWarehouse?: string;
  freeDaysExpiry?: string;
};

export interface TransitionRequest {
  targetStatus: ContainerStatus;
  actualDepartureDate?: string;
  // Adjustable per CU-05.1 when registering departure from origin.
  estimatedArrivalPort?: string;
  actualArrivalPort?: string;
  // Field name must match backend exactly (TransitionRequest.freeDaysLimitOverride) —
  // sending "freeDaysLimit" here is silently dropped by Jackson (unknown property),
  // so the value the user enters never actually applies.
  freeDaysLimitOverride?: number;
  actualDeparturePort?: string;
  estimatedArrivalWarehouse?: string;
  actualArrivalWarehouse?: string;
}

// Backend GET /containers/{id}/history returns a single flat, chronologically-sorted
// array — not a {fieldChanges, statusChanges} wrapper object — with a `type` discriminant
// per entry. Matches the real FieldChangeDTO contract, verified against the live API.
export interface HistoryEntry {
  type: "FIELD_CHANGE" | "STATUS_CHANGE";
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  updatedById: string;
  updatedByName: string | null;
  updatedAt: string;
}

export type ContainerHistory = HistoryEntry[];

export interface UploadedPhoto {
  photoId: string;
  r2Key: string;
  presignedUrl: string;
}

export interface PhotoUploadFailure {
  filename: string;
  reason: string;
}

export interface PhotoUploadResponse {
  uploaded: UploadedPhoto[];
  failed: PhotoUploadFailure[];
}

export interface ContainerPhoto {
  photoId: string;
  presignedUrl: string;
  originalFilename: string;
  uploadedAt: string;
  // Backend PhotoDTO is flat (uploadedById/uploadedByName), not a nested object.
  uploadedById: string | null;
  uploadedByName: string | null;
  isValid: boolean;
}

export interface DischargeRequest {
  dischargeStartAt: string;
  dischargeEndAt: string;
  dischargeNotes: string;
}

export interface ContainerRealtimeMessage {
  containerId: string;
  changedFields: { fieldName: string; oldValue: string | null; newValue: string | null }[];
  updatedBy: string;
  updatedByName: string;
  updatedAt: string;
}
