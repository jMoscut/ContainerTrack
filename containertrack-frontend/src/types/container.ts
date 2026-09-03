import type { ShippingCompanyRef } from "./shippingCompany";

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

export interface UserRef {
  id: string;
  fullName: string;
}

export interface Container {
  id: string;
  containerNumber: string;
  shippingCompany: ShippingCompanyRef;
  originPort: string;
  destinationPort: string;
  cargoDescription: string;
  responsibleOperator: UserRef;
  status: ContainerStatus;
  version: number;
  lastUpdatedBy: UserRef | null;
  lastUpdatedAt: string;
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
  shippingCompanyId: string;
  originPort: string;
  destinationPort: string;
  cargoDescription: string;
  responsibleOperatorId: string;
  estimatedDepartureDate: string;
  internalNotes?: string;
}

export type UpdateContainerRequest = Partial<
  Omit<CreateContainerRequest, "containerNumber" | "shippingCompanyId">
> & {
  shippingCompanyId?: string;
  version: number;
  // Additional editable estimate fields, not part of container creation but
  // patchable afterwards (e.g. from the calendar's inline date-edit modal).
  estimatedArrivalWarehouse?: string;
  freeDaysExpiry?: string;
};

export interface TransitionRequest {
  targetStatus: ContainerStatus;
  actualDepartureDate?: string;
  actualArrivalPort?: string;
  freeDaysLimit?: number;
  actualDeparturePort?: string;
  estimatedArrivalWarehouse?: string;
  actualArrivalWarehouse?: string;
}

export interface FieldChange {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  updatedBy: { fullName: string };
  updatedAt: string;
}

export interface StatusChange {
  oldValue: string;
  newValue: string;
  performedBy: { fullName: string };
  performedAt: string;
}

export interface ContainerHistory {
  fieldChanges: FieldChange[];
  statusChanges: StatusChange[];
}

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
  uploadedBy: { fullName: string };
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
