export interface Port {
  id: string;
  name: string;
  country: string;
  isGuatemalan: boolean;
  isActive: boolean;
}

export interface CreatePortRequest {
  name: string;
  country: string;
  isGuatemalan?: boolean;
}

export type UpdatePortRequest = Partial<CreatePortRequest>;

export interface UpdatePortStatusRequest {
  isActive: boolean;
}
