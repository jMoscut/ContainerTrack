export interface ShippingCompany {
  id: string;
  name: string;
  shortCode: string;
  country: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  freeDaysLimit: number;
  isActive: boolean;
}

export interface ShippingCompanyRef {
  id: string;
  name: string;
  shortCode: string;
}

export interface CreateShippingCompanyRequest {
  name: string;
  shortCode: string;
  country: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  freeDaysLimit: number;
}

export type UpdateShippingCompanyRequest = Partial<CreateShippingCompanyRequest>;

export interface UpdateShippingCompanyStatusRequest {
  isActive: boolean;
}
