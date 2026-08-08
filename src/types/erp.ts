export type PagedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed';
export type ProjectNature = 'brownfield' | 'greenfield';
export type JobType = 'contracting' | 'design_build' | 'design';
export type JobStatus = 'bidding' | 'awarded';
export type WorkOrderStatus = 'draft' | 'sent' | 'approved';
export type SubcontractWorkOrderStatus = 'pending' | 'admin_approved' | 'approved' | 'rejected';
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
export type BillStatus = 'pending' | 'admin_approved' | 'approved' | 'rejected';
export type PaymentMode = 'cash' | 'upi' | 'rtgs' | 'cheque';
export type ExpenseCategory = 'staff' | 'office' | 'transport' | 'travel';
export type ExpenseStatus = 'pending' | 'admin_approved' | 'approved' | 'rejected';

export type ExpenseType = {
  id: string;
  name: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PaymentType = 'material' | 'labour' | 'rent' | 'accommodation' | 'office_maintenance' | 'transport' | 'travel' | 'staff_expense';
export type TimesheetStatus = 'pending' | 'submitted' | 'verified' | 'admin_approved' | 'approved' | 'rejected';
export type ItemDescription = {
  id: string;
  name: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkCategory = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Trade = {
  id: string;
  name: string;
  shiftWiseAmount?: number | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectCategory = {
  id: string;
  name: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type Project = {
  id: string;
  name: string;
  projectCode: string;
  description?: string | null;
  location?: string | null;
  email?: string | null;
  phone1?: string | null;
  phone2?: string | null;
  clientName?: string | null;
  status: ProjectStatus;
  completionPct: number | string;
  estimatedBudget: number | string;
  startDate?: string | null;
  endDate?: string | null;
  projectCategoryId?: string | null;
  projectCategory?: ProjectCategory | null;
  projectNature?: ProjectNature | null;
  jobType?: JobType | null;
  jobStatus?: JobStatus;
  financialYear?: string | null;
  dateOfCreation?: string | null;
  resources?: AppUser[];
  createdAt?: string;
  updatedAt?: string;
};

export type Vendor = {
  id: string;
  name: string;
  address?: string | null;
  gstNumber?: string | null;
  state?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Subcontractor = {
  id: string;
  name: string;
  gstNumber?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  workCategory: WorkCategory;
  createdAt?: string;
  updatedAt?: string;
};

export type SubcontractWorkOrder = {
  id: string;
  woNumber: string;
  projectId: string;
  subcontractorId: string;
  workCategoryId: string;
  project?: Project;
  subcontractor?: Subcontractor;
  workCategory?: WorkCategory;
  description?: string | null;
  amount: number | string;
  gstPercentage: number | string;
  gstAmount: number | string;
  totalAmount: number | string;
  paidAmount?: number;
  workorderUrl?: string | null;
  workorderKey?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  status: SubcontractWorkOrderStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type SiteEngineer = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  employeeId?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  salaryGradeId?: string | null;
  salaryGrade?: Salary | null;
  projects?: Project[];
  createdAt?: string;
};

export const OFFICE_STAFF_TYPES = [
  'Architect',
  'Project Coordinator',
  'Engineer',
  'Research Associate',
] as const;

export type OfficeStaffType = (typeof OFFICE_STAFF_TYPES)[number];

export type OfficeStaff = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  employeeId?: string | null;
  phone?: string | null;
  address?: string | null;
  staffType?: OfficeStaffType | null;
  isActive: boolean;
  salaryGradeId?: string | null;
  salaryGrade?: Salary | null;
  projects?: Project[];
  createdAt?: string;
};

export type OfficeReport = {
  id: string;
  category: string;
  title: string;
  description?: string | null;
  projectId?: string | null;
  project?: Project | null;
  fileUrl: string;
  fileKey: string;
  uploadedBy?: string | null;
  createdAt?: string;
};

export type AccountsManager = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  employeeId?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  salaryGradeId?: string | null;
  salaryGrade?: Salary | null;
  projects?: Project[];
  createdAt?: string;
};

export type PurchaseTeamMember = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  employeeId?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  projects?: Project[];
  salaryGradeId?: string | null;
  salaryGrade?: Salary | null;
  createdAt?: string;
};

export type LineItem = {
  id?: string;
  description: string;
  quantity: number | string;
  unit: string;
  rate: number | string;
  amount?: number | string;
  billedQuantity?: number | string;
};

export type WorkOrder = {
  id: string;
  woNumber: string;
  vendorId: string;
  projectId: string;
  vendor?: Vendor;
  project?: Project;
  status: WorkOrderStatus;
  terms?: string | null;
  totalAmount: number | string;
  gstAmount: number | string;
  cgstAmount: number | string;
  sgstAmount: number | string;
  igstAmount: number | string;
  items?: LineItem[];
  createdAt?: string;
};

export type SalesInvoice = {
  id: string;
  invoiceNumber: string;
  projectId?: string | null;
  project?: Project;
  status: InvoiceStatus;
  totalAmount: number | string;
  paidAmount: number | string;
  gstAmount: number | string;
  dueDate?: string | null;
  paidAt?: string | null;
  items?: LineItem[];
  payments?: Payment[];
  createdAt?: string;
};

export type PurchaseOrderStatus = 'draft' | 'sent' | 'pending' | 'admin_approved' | 'approved' | 'rejected';

export type EnquiryItem = {
  description: string;
  quantity: number;
};

export type PurchaseEnquiry = {
  id: string;
  enquiryNo: string;
  vendorId?: string | null;
  projectId: string;
  vendor?: Vendor | null;
  project?: Project;
  createdBy?: string;
  creator?: { id: string; name: string } | null;
  notes?: string | null;
  items: EnquiryItem[];
  status: string;
  createdAt?: string;
};

export type MaterialReceived = {
  id: string;
  mrNumber: string;
  projectId: string;
  project?: Project;
  purchaseOrderId?: string | null;
  purchaseOrder?: PurchaseOrder;
  receivedDate?: string | null;
  notes?: string | null;
  items: EnquiryItem[];
  photoUrls: string[];
  photoKeys: string[];
  billUrl?: string | null;
  billKey?: string | null;
  status: string;
  createdBy?: string;
  creator?: { id: string; name: string } | null;
  createdAt?: string;
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  vendorId: string;
  projectId: string;
  materialRequirementNo?: string | null;
  vendor?: Vendor;
  project?: Project;
  status: PurchaseOrderStatus;
  totalAmount: number | string;
  gstPercent?: number | null;
  gstAmount?: number | null;
  totalWithGst?: number | null;
  advanceAmount?: number;
  paidAmount?: number;
  items?: LineItem[];
  billFileUrl?: string | null;
  billFileKey?: string | null;
  createdAt?: string;
};

export type Expense = {
  id: string;
  category?: ExpenseCategory | null;
  expenseTypeId?: string | null;
  expenseType?: ExpenseType | null;
  description: string;
  amount: number | string;
  expenseDate: string;
  paidBy?: string | null;
  projectId?: string | null;
  project?: Project;
  tradeId?: string | null;
  trade?: Trade;
  remarks?: string | null;
  receiptUrls?: string[] | null;
  sitePhotoUrls?: string[] | null;
  status?: ExpenseStatus;
  createdBy?: string | null;
  creator?: { id: string; name: string; role: string };
  createdAt?: string;
};

export type DashboardProject = {
  id: string;
  name: string;
  completionPct: number | string;
};

export type DashboardData = {
  totalProjects: number;
  projects: DashboardProject[];
  revenueVsCost: {
    totalRevenue: number;
    totalCost: number;
    totalInflow?: number;
  };
  weeklyLabour: Array<{
    weekStart: string;
    headcount: number;
  }>;
  criticalActions: unknown[];
  materialRequirementCounts?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  recentMaterialRequirements?: Array<{
    id: string;
    enquiryNo: string;
    projectName: string;
    status: string;
    createdAt: string;
  }>;
  timesheetCounts?: {
    approved: number;
    submitted: number;
    draft: number;
    total: number;
  };
};

export type AccountsDashboardData = {
  kpis: {
    totalReceivable: number;
    pendingInvoiceCount: number;
    totalPayable: number;
    pendingBillCount: number;
    monthInflow: number;
    monthOutflow: number;
  };
  recentPayments: Array<{
    id: string;
    amount: number | string;
    date: string;
    mode: string;
    type: string;
    party: string;
  }>;
};

export type ExpenseSummary = {
  category: ExpenseCategory;
  total: number | string;
};

export type DrawingCategory = 'structural' | 'as_built' | 'general_arrangement' | 'architectural' | 'hvac' | 'mep';

export type Drawing = {
  id: string;
  projectId: string;
  project?: Project;
  title: string;
  category: DrawingCategory;
  revision: string;
  fileUrl: string;
  fileKey: string;
  uploadedBy?: string | null;
  createdAt: string;
};

export type DprReport = {
  id: string;
  projectId: string;
  project?: Project;
  reportDate: string;
  fileUrl: string;
  fileType: string;
  fileKey: string;
  uploadedBy?: string | null;
  createdAt: string;
};

export type BillItem = {
  id: string;
  billId: string;
  poItemId: string;
  description: string;
  quantity: number | string;
  unit: string;
  rate: number | string;
  orderedQty: number | string;
  billedQty: number | string;
};

export type PurchaseBill = {
  id: string;
  billNumber: string;
  vendorId: string;
  vendor?: Vendor;
  purchaseOrderId?: string | null;
  purchaseOrder?: PurchaseOrder;
  projectId?: string | null;
  project?: Project;
  amount: number | string;
  gstPercent?: number | string | null;
  gstAmount?: number | string | null;
  status: BillStatus;
  paidAmount: number | string;
  billDate: string;
  dueDate?: string | null;
  billFileUrl?: string | null;
  billFileKey?: string | null;
  notes?: string | null;
  billItems?: BillItem[];
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
};

export type Payment = {
  id: string;
  paymentType: PaymentType;
  purchaseBillId?: string | null;
  purchaseBill?: PurchaseBill;
  purchaseOrderId?: string | null;
  purchaseOrder?: PurchaseOrder;
  subcontractWorkOrderId?: string | null;
  subcontractWorkOrder?: SubcontractWorkOrder;
  advanceRequestId?: string | null;
  advanceRequest?: AdvanceRequest;
  salesInvoiceId?: string | null;
  salesInvoice?: SalesInvoice;
  expenseId?: string | null;
  expense?: Expense;
  vendorId?: string | null;
  vendor?: Vendor;
  payeeName?: string | null;
  amount: number | string;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber?: string | null;
  projectId?: string | null;
  project?: Project;
  notes?: string | null;
  timesheetId?: string | null;
  createdAt: string;
};

export type DailyWorker = {
  id: string;
  reportId: string;
  tradeId?: string | null;
  trade: string;
  count: number;
  shift: string;
  shiftAmount?: number | null;
  inTime?: string | null;
  outTime?: string | null;
  remarks?: string | null;
  morningPhoto1Url?: string | null;
  morningPhoto2Url?: string | null;
  morningPhoto3Url?: string | null;
  morningPhoto4Url?: string | null;
  morningPhoto5Url?: string | null;
  eveningPhoto1Url?: string | null;
  eveningPhoto2Url?: string | null;
  eveningPhoto3Url?: string | null;
  eveningPhoto4Url?: string | null;
  eveningPhoto5Url?: string | null;
  status?: string;
};

export type DailyLabourReport = {
  id: string;
  projectId: string;
  project?: Project;
  reportDate: string;
  remarks?: string | null;
  workers: DailyWorker[];
  status: string;
  createdById: string;
  createdBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
};

export type TimesheetRow = {
  id?: string;
  projectId?: string | null;
  entryType: string;
  remark?: string | null;
  monHours: number;
  tueHours: number;
  wedHours: number;
  thuHours: number;
  friHours: number;
  satHours: number;
  sunHours: number;
  amount?: number;
};

export type WeeklyTimesheet = {
  id: string;
  siteEngineerId: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  status: TimesheetStatus;
  approvedById?: string | null;
  approvedAt?: string | null;
  rows: TimesheetRow[];
  createdAt?: string;
  updatedAt?: string;
  siteEngineer?: {
    id: string;
    name: string;
    email: string;
    employeeId?: string | null;
    phone?: string | null;
    role?: string;
    salaryGrade?: Salary | null;
  };
};

export type AdvanceRequestStatus = 'pending' | 'accepted' | 'admin_approved' | 'rejected';

export type AdvanceRequest = {
  id: string;
  vendorId: string;
  vendor?: Vendor;
  projectId: string;
  project?: Project;
  materialRequirementNo?: string | null;
  vendorQuotationId?: string | null;
  vendorQuotation?: VendorQuotation | null;
  amount: number | string;
  notes?: string | null;
  status: AdvanceRequestStatus;
  requestedById: string;
  respondedById?: string | null;
  respondedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SubcontractorPaymentRequestStatus = 'pending' | 'accepted' | 'admin_approved' | 'rejected';

export type SubcontractorPaymentRequest = {
  id: string;
  subcontractorId: string;
  subcontractor?: Subcontractor;
  projectId: string;
  project?: Project;
  subcontractWorkOrderId?: string | null;
  subcontractWorkOrder?: SubcontractWorkOrder | null;
  amount: number | string;
  notes?: string | null;
  status: SubcontractorPaymentRequestStatus;
  requestedById: string;
  respondedById?: string | null;
  respondedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SubcontractorWorkStatus = 'pending' | 'approved' | 'rejected';

export type SubcontractorWork = {
  id: string;
  projectId: string;
  project?: Project;
  subcontractorId: string;
  subcontractor?: Subcontractor;
  notes?: string | null;
  photoUrls?: string[] | null;
  status: SubcontractorWorkStatus;
  createdById: string;
  createdBy?: { id: string; name: string; email: string; role?: string };
  respondedById?: string | null;
  respondedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type EmployeeQueryStatus = 'pending' | 'approved' | 'rejected';

export type EmployeeQuery = {
  id: string;
  timesheetId: string;
  timesheet?: WeeklyTimesheet;
  siteEngineerId: string;
  siteEngineer?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
  reason: string;
  dayIndex: number | null;
  status: EmployeeQueryStatus;
  respondedById?: string | null;
  respondedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Salary = {
  id: string;
  grades: string;
  category?: string;
  role?: string;
  expInYears: string;
  monthlySalary: number;
  avgCostPerHr: number;
  bookingCost: number;
  createdAt?: string;
  updatedAt?: string;
};

export type VendorQuotation = {
  id: string;
  groupId: string;
  projectId: string;
  vendorId: string;
  project?: Project;
  vendor?: Vendor;
  materialRequirementId?: string | null;
  materialRequirement?: { id: string; enquiryNo: string; project?: Project; items?: { description: string; quantity: number }[] };
  items: { description: string; quantity: number }[];
  totalAmount?: number | null;
  quotationUrl?: string | null;
  quotationKey?: string | null;
  status: string;
  createdAt?: string;
};

export type ProjectTimesheetSummary = {
  userId: string;
  name: string;
  role: string;
  totalHours: number;
  totalAmount: number;
};

export type ProjectDailyLabourCost = {
  reportId: string;
  reportDate: string;
  trade: string;
  count: number;
  shift: number;
  rate: number;
  amount: number;
};

export type ProjectDetails = {
  project: Project;
  expenses: Expense[];
  subcontractWorkOrders: SubcontractWorkOrder[];
  purchaseBills: PurchaseBill[];
  invoices: SalesInvoice[];
  payments: Payment[];
  timesheetSummary: ProjectTimesheetSummary[];
  dailyLabourCost: ProjectDailyLabourCost[];
};

export type SchemaColumn = {
  column: string;
  type: string;
  nullable: string;
  default: string;
  description: string;
  isPrimary: boolean;
};

export type SchemaTable = {
  table: string;
  description: string;
  columns: SchemaColumn[];
  createSql?: string;
  alterSql?: string;
};

export type ProjectAccessStatus = 'active' | 'expired' | 'revoked';

export type ProjectAccess = {
  id: string;
  projectId: string;
  project?: Project;
  userId: string;
  user?: AppUser;
  approvedDays: number;
  approvedAt: string;
  expiresAt: string;
  status: ProjectAccessStatus;
  approvedById?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type StaffAccessEntry = AppUser & {
  employeeId?: string | null;
  phone?: string | null;
  staffType?: string | null;
  isActive: boolean;
  projects?: Project[];
  salaryGrade?: Salary | null;
  access?: {
    id: string;
    approvedDays: number;
    approvedAt: string;
    expiresAt: string;
    status: ProjectAccessStatus;
  } | null;
};
