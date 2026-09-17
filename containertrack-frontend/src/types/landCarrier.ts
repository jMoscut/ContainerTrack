export interface LandCarrier {
  id: string;
  name: string;
  plateNumber: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface CreateLandCarrierRequest {
  name: string;
  plateNumber?: string;
  phone?: string;
  company?: string;
  notes?: string;
}

export type UpdateLandCarrierRequest = Partial<CreateLandCarrierRequest>;

export interface UpdateLandCarrierStatusRequest {
  isActive: boolean;
}
