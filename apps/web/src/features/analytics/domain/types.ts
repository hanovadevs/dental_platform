/**
 * Executive Analytics & Reporting Domain Types
 * Per spec (01_PRODUCT_SCOPE_AND_REQUIREMENTS.md Section 3.12 & Phase 8)
 */

export type AnalyticsPeriod =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'ytd'
  | 'custom';

export interface DateRangeFilter {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  locationId?: string;
}

export interface KpiDeltas {
  productionChangePct: number;
  collectionsChangePct: number;
  appointmentsChangePct: number;
  acceptanceChangePct: number;
}

export interface ExecutiveKpiSummary {
  production: number;
  collections: number;
  collectionRate: number; // percentage
  outstandingBalance: number;
  totalAppointments: number;
  completedAppointments: number;
  noShowCount: number;
  noShowRate: number; // percentage
  cancelledCount: number;
  cancellationRate: number; // percentage
  treatmentAcceptanceRate: number; // percentage
  totalProposedAmount: number;
  totalAcceptedAmount: number;
  chairUtilizationRate: number; // percentage
  recoveredRevenue: number;
  deltas: KpiDeltas;
}

export interface DentistPerformance {
  dentistId: string;
  name: string;
  specialty: string;
  procedureCount: number;
  production: number;
  collections: number;
  appointmentCount: number;
  hoursWorked: number;
  productionPerHour: number;
  acceptanceRate: number;
}

export interface LocationPerformance {
  locationId: string;
  name: string;
  chairCount: number;
  production: number;
  collections: number;
  utilizationRate: number;
  appointmentCount: number;
}

export interface CategoryRevenueBreakdown {
  category: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface TimeSeriesPoint {
  label: string;
  date: string;
  production: number;
  collections: number;
  appointments: number;
}

export interface ExecutiveDashboardData {
  kpis: ExecutiveKpiSummary;
  dentists: DentistPerformance[];
  locations: LocationPerformance[];
  categories: CategoryRevenueBreakdown[];
  timeSeries: TimeSeriesPoint[];
  periodLabel: string;
}
