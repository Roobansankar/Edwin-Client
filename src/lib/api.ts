import { cookies } from 'next/headers';
import type {
  DashboardData,
  Expense,
  ExpenseSummary,
  ItemDescription,
  PagedResponse,
  Project,
  SalesInvoice,
  Vendor,
  VendorQuotation,
  Subcontractor,
  SubcontractWorkOrder,
  SiteEngineer,
  AccountsManager,
  PurchaseTeamMember,
  DailyLabourReport,
  WorkCategory,
  Trade,
  Team,
  WorkOrder,
  Drawing,
  PurchaseOrder,
  PurchaseBill,
  PurchaseEnquiry,
  MaterialReceived,
  ProjectDetails,
  Salary,
  WeeklyTimesheet,
  ProjectCategory,
  AppUser,
  SchemaTable,
  EmployeeQuery,
  AdvanceRequest,
  SubcontractorPaymentRequest,
  SubcontractorWork,
  OfficeStaff,
  OfficeReport,
  StaffAccessEntry,
} from '@/types/erp';
import { getApiBaseUrl } from './api-url';

/**
 * Typed fetch wrapper for server-side API calls.
 * Reads JWT from httpOnly cookie and attaches Authorization header.
 */export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'API Error' }));
    throw new Error(error.message || `API Error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// Convenience helpers
export const fetchDashboard = () => apiFetch<DashboardData>('/dashboard/master');
export const fetchPurchaseDashboard = () => apiFetch<any>('/dashboard/purchase');
export const fetchProjects = () => apiFetch<Project[]>('/projects');
export const fetchProjectDashboard = (id: string) => apiFetch<any>(`/projects/${id}/dashboard`);
export const fetchProjectDetails = (id: string) => apiFetch<ProjectDetails>(`/projects/${id}/details`);
export const fetchWorkOrders = (params?: string) => apiFetch<PagedResponse<WorkOrder>>(`/work-orders${params ? `?${params}` : ''}`);
export const fetchSubcontractWorkOrders = (subcontractorId?: string) =>
  apiFetch<SubcontractWorkOrder[]>(`/subcontract-work-orders${subcontractorId ? `?subcontractorId=${subcontractorId}` : ''}`);
export const fetchVendors = () => apiFetch<Vendor[]>('/vendors');
export const fetchSubcontractors = () => apiFetch<Subcontractor[]>('/subcontractors');
export const fetchSubcontractorWorks = () => apiFetch<SubcontractorWork[]>('/subcontractor-work');
export const fetchSiteEngineers = () => apiFetch<SiteEngineer[]>('/site-engineers');
export const fetchOfficeStaff = () => apiFetch<OfficeStaff[]>('/office-staff');
export const fetchOfficeReports = () => apiFetch<OfficeReport[]>('/office-reports');
export const fetchOfficeReportCategories = () => apiFetch<string[]>('/office-reports/categories');
export const fetchAccountsManagers = () => apiFetch<AccountsManager[]>('/accounts-managers');
export const fetchPurchaseTeam = () => apiFetch<PurchaseTeamMember[]>('/purchase-team');
export const fetchSubcontractor = (id: string) => apiFetch<Subcontractor>(`/subcontractors/${id}`);
export const fetchItemDescriptions = () => apiFetch<ItemDescription[]>('/item-descriptions');
export const fetchWorkCategories = () => apiFetch<WorkCategory[]>('/work-categories');
export const fetchProjectCategories = () => apiFetch<ProjectCategory[]>('/project-categories');
export const fetchUsers = () => apiFetch<AppUser[]>('/users');
export const fetchTrades = () => apiFetch<Trade[]>('/trades');
export const fetchTeams = () => apiFetch<Team[]>('/teams');
export const fetchInvoices = (projectId?: string) =>
  apiFetch<SalesInvoice[]>(`/invoices${projectId ? `?projectId=${projectId}` : ''}`);
export const fetchInvoice = (id: string) => apiFetch<SalesInvoice>(`/invoices/${id}`);
export const fetchBills = () => apiFetch<PurchaseBill[]>('/bills');
export const fetchBill = (id: string) => apiFetch<PurchaseBill>(`/bills/${id}`);
export const fetchExpenses = (params?: string) => apiFetch<PagedResponse<Expense>>(`/expenses${params ? `?${params}` : ''}`);
export const fetchExpenseSummary = () => apiFetch<ExpenseSummary[]>('/expenses/summary');
export const fetchPayments = (params?: string) => apiFetch<PagedResponse<any>>(`/payments${params ? `?${params}` : ''}`);
export const fetchPaymentsSummary = () => apiFetch<any[]>('/payments/summary');
export const fetchDpr = (params?: string) => apiFetch<any>(`/dpr${params ? `?${params}` : ''}`);
export const fetchDailyLabourReports = (params?: string) => apiFetch<DailyLabourReport[]>(`/daily-labour${params ? `?${params}` : ''}`);
export const fetchDailyLabourReport = (id: string) => apiFetch<DailyLabourReport>(`/daily-labour/${id}`);
export const fetchDrawings = (params?: string) => apiFetch<Drawing[]>(`/drawings${params ? `?${params}` : ''}`);
export const fetchPurchaseOrders = () => apiFetch<PurchaseOrder[]>('/purchase-orders');
export const fetchPurchaseEnquiries = () => apiFetch<PurchaseEnquiry[]>('/purchase-enquiries');
export const fetchMaterialReceived = () => apiFetch<MaterialReceived[]>('/material-received');
export const fetchVendorQuotations = () => apiFetch<VendorQuotation[]>('/vendor-quotations');
export const fetchLedger = () => apiFetch<any[]>('/accounts/ledger');
export const fetchBalance = () => apiFetch<{ totalRevenue: number; totalCost: number }>('/accounts/balance');
export const fetchPayables = () => apiFetch<any[]>('/accounts/payables');
export const fetchReceivables = () => apiFetch<SalesInvoice[]>('/accounts/receivables');
export const fetchSalaries = () => apiFetch<Salary[]>('/salaries');
export const fetchMySalary = () => apiFetch<Salary | null>('/salaries/me');
export const fetchTimesheetByWeek = (weekStart: string) =>
  apiFetch<WeeklyTimesheet | null>(`/timesheet-attendance/current?weekStart=${weekStart}`);
export const fetchTimesheets = (params?: string) =>
  apiFetch<PagedResponse<WeeklyTimesheet>>(`/timesheet-attendance/all${params ? `?${params}` : ''}`);
export const fetchSchemas = () => apiFetch<SchemaTable[]>('/schemas');
export const fetchEmployeeQueries = (status?: string) =>
  apiFetch<EmployeeQuery[]>(`/employee-queries${status ? `?status=${status}` : ''}`);
export const fetchAdvanceRequests = (status?: string) =>
  apiFetch<AdvanceRequest[]>(`/advance-requests${status ? `?status=${status}` : ''}`);
export const fetchSubcontractorPaymentRequests = (status?: string) =>
  apiFetch<SubcontractorPaymentRequest[]>(`/subcontractor-payment-requests${status ? `?status=${status}` : ''}`);
export const fetchProjectAccessStaff = (projectId?: string) =>
  apiFetch<StaffAccessEntry[]>(`/project-access/staff${projectId ? `?projectId=${projectId}` : ''}`);
export const fetchProjectAccessRecords = () => apiFetch<any[]>('/project-access');
