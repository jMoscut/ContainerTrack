export interface ConsolidatedReportRequest {
  dateFrom: string;
  dateTo: string;
  shippingCompanyId?: string;
  status?: string;
  operatorId?: string;
}
