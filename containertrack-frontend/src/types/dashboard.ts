export interface TopActiveUser {
  userId: string;
  fullName: string;
  changeCount: number;
}

/** Response shape for GET /api/dashboard/admin-summary (ADMIN only). */
export interface AdminSummary {
  activeUsersCount: number;
  activeShippingCompaniesCount: number;
  activePortsCount: number;
  topActiveUsers: TopActiveUser[];
}

export type DashboardEventType = "CREATED" | "STATUS_CHANGED" | "DISCHARGED";

/** Message shape broadcast on the /topic/dashboard STOMP channel. */
export interface DashboardRealtimeMessage {
  type: DashboardEventType;
  containerId: string;
  containerNumber: string;
  newStatus: string;
  timestamp: string;
}
