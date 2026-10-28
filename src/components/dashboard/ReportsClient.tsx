'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Flex,
  Input,
  Modal,
  Row,
  Select,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  DollarOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  HistoryOutlined,
  ProjectOutlined,
  TeamOutlined,
  WalletOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import type { AdvanceRequest, SubcontractorPaymentRequest, Payment, LabourPayment, ExpensePayment, Project, PurchaseBill, Expense, DailyLabourReport, DailyWorker, SubcontractorBill, VendorQuotation } from '@/types/erp';
import { labourHistoryText, labourPaidRatio } from '@/lib/labour-payment-history';
import { AdvanceRequestsClient } from './AdvanceRequestsClient';
import { SubcontractorPaymentRequestsClient } from './SubcontractorPaymentRequestsClient';
import { LabourPaymentHistory } from './LabourPaymentHistory';
import { paymentStatus } from '@/lib/payment-status';
import { exportToExcel } from '@/lib/excel';
import {
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleCase,
  titleIconClassName,
  weekRangeLabel,
  weekStartOf,
} from './ui';

function inRange(dateStr: string | null | undefined, range: [Dayjs | null, Dayjs | null]) {
  if (!range[0] || !range[1] || !dateStr) return true;
  const from = range[0].format('YYYY-MM-DD');
  const to = range[1].format('YYYY-MM-DD');
  const d = dateStr.split('T')[0];
  return d >= from && d <= to;
}

// One row per (report, worker category). The report-level cells (S.No, Date,
// Week, Project, Trade, Team, Status) are shown once and span that report's rows.
// One row of the weekly Daily Labour view: every report one site engineer
// raised for one project in one week.
type DailyWeekRow = {
  key: string;
  weekStart: string;
  name: string;
  projectName: string;
  reports: DailyLabourReport[];
};

type DailySummaryRow = {
  key: string;
  serial: number;
  projectSpan: number;
  projectKey: string;
  span: number;
  weekStart: string;
  dateRange: string;
  projects: string;
  team: string;
  category: string;
  isTotal: boolean;
  totalShift: number;
  totalAmount: number;
  paidAmount: number;
  paymentIds: string[];
  status: string;
};

// One trade entry, listed under its week when that week is expanded.
type DailyTradeRow = {
  key: string;
  reportId: string;
  reportDate: string;
  reportRemarks: string | null;
  worker: DailyWorker;
  // Date and overall remarks show once per report, on its first trade row.
  first: boolean;
  span: number;
};

function dailyTradeRows(reports: DailyLabourReport[]): DailyTradeRow[] {
  return reports.flatMap((report) => {
    const workers = report.workers || [];
    return workers.map((worker, i) => ({
      key: worker.id,
      reportId: report.id,
      reportDate: report.reportDate,
      reportRemarks: report.remarks || null,
      worker,
      first: i === 0,
      span: workers.length,
    }));
  });
}

// Entry rate first, then the trade's shift amount (same rule as Approvals and the server).
function tradeAmount(worker: DailyWorker) {
  const rate = Number(worker.shiftAmount) || Number(worker.tradeRel?.shiftWiseAmount) || 0;
  return (Number(worker.count) || 1) * (Number(worker.shift) || 0) * rate;
}

function weekShiftTotal(reports: DailyLabourReport[]) {
  return dailyTradeRows(reports).reduce((sum, t) => sum + (Number(t.worker.count) || 1) * (Number(t.worker.shift) || 0), 0);
}

function weekAmountTotal(reports: DailyLabourReport[]) {
  return dailyTradeRows(reports).reduce((sum, t) => sum + tradeAmount(t.worker), 0);
}

// Report-level cells span all trade rows of their report.
function reportSpanCell(t: DailyTradeRow, children: ReactNode) {
  return { children, props: { rowSpan: t.first ? t.span : 0 } };
}

// Weekly reports include both Accounts and Admin approval stages.
// Expenses: admin_approved is the final admin step. Vendor and subcontractor
// bills: admin_approved is Accounts Approved; 'approved' is Admin Approved.
const ADMIN_APPROVED = 'admin_approved';
const BILL_ADMIN_APPROVED = 'approved';

function approvalLabel(status: string, bill = false) {
  if (status === 'admin_approved') return bill ? 'Approved by Accounts' : 'Approved by Admin';
  if (status === 'approved') return bill ? 'Approved by Admin' : 'Approved by Accounts';
  return titleCase(status);
}

function billApprovalTag(status: string) {
  if (status === 'admin_approved') {
    return (
      <Flex vertical gap={4} align="start">
        <Tag color="processing">Approved by Accounts</Tag>
        <Tag color="warning">Waiting for Admin Approval</Tag>
      </Flex>
    );
  }
  if (status === 'approved') {
    return (
      <Flex vertical gap={4} align="start">
        <Tag color="processing">Approved by Accounts</Tag>
        <Tag color="success">Approved by Admin</Tag>
      </Flex>
    );
  }
  return <Tag color={status === 'approved' ? 'success' : status === 'admin_approved' ? 'processing' : 'default'}>{approvalLabel(status, true)}</Tag>;
}

// Sentinel value for the "All Projects" option in the Project Report dropdown.
const ALL_PROJECTS = '__all_projects__';

type ReportsClientProps = {
  advanceRequests?: AdvanceRequest[];
  subcontractorPaymentRequests?: SubcontractorPaymentRequest[];
  payments?: Payment[];
  labourPayments?: LabourPayment[];
  expensePayments?: ExpensePayment[];
  projects: Project[];
  bills: PurchaseBill[];
  expenses: Expense[];
  dailyLabourReports: DailyLabourReport[];
  subcontractorBills: SubcontractorBill[];
  vendorQuotations: VendorQuotation[];
  role: string;
  // Report page: every record in any status (pending, approved, rejected),
  // with a status filter. Weekly Report (default) shows approved records only.
  allStatuses?: boolean;
  title?: string;
  hideProjectReport?: boolean;
};

// One row of the weekly Expenses tab: one person's expenses for one project in one week.
type ExpenseWeekRow = {
  key: string;
  weekStart: string;
  name: string;
  role: string;
  projectName: string;
  expenses: Expense[];
};

// Team filter on the Expenses tab, by the submitter's role.
const EXPENSE_ROLE_FILTERS: { label: string; value: string | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Site Engineer', value: 'site_engineer' },
  { label: 'Purchase Team', value: 'purchase_team' },
  { label: 'Office Team', value: 'office_staff' },
  { label: 'Accounts Team', value: 'accounts_manager' },
];

// One status for a week of expenses: rejected only if all are rejected,
// pending if any is still pending, admin approved once all are, else approved.
function expenseWeekStatus(expenses: Expense[]): { label: string; color: string } {
  const statuses = expenses.map((e) => e.status || 'pending');
  if (statuses.every((s) => s === 'rejected')) return { label: 'Rejected', color: 'error' };
  if (statuses.some((s) => s === 'pending')) return { label: 'Pending', color: 'warning' };
  if (statuses.every((s) => s === 'admin_approved' || s === 'rejected')) return { label: 'Approved by Admin', color: 'purple' };
  return { label: 'Approved by Accounts', color: 'success' };
}

// Status filter on the Report page. Daily labour uses pending / approved / rejected.
const REPORT_STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Accounts Approved', value: 'admin_approved' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

// Daily labour report status shown on the Report page.
const DAILY_STATUS_TAG: Record<string, { color: string; label: string }> = {
  pending: { color: 'warning', label: 'Pending' },
  approved: { color: 'processing', label: 'Approved by Accounts' },
  admin_approved: { color: 'success', label: 'Approved by Admin' },
  rejected: { color: 'error', label: 'Rejected' },
};

// One status for a week of daily labour reports: rejected if any is rejected,
// pending if any is pending; final admin approval lives on each trade entry.
function weekReportStatus(reports: DailyLabourReport[]) {
  if (reports.some((r) => r.status === 'rejected')) return 'rejected';
  if (reports.some((r) => r.status !== 'approved' && r.status !== 'admin_approved')) return 'pending';
  if (reports.length > 0 && reports.every((r) =>
    r.status === 'admin_approved' ||
    (r.workers.length > 0 && r.workers.every((worker) => worker.status === 'admin_approved')),
  )) return 'admin_approved';
  return 'approved';
}

function dailyWeekApprovalLabel(reports: DailyLabourReport[]) {
  const status = weekReportStatus(reports);
  if (status === 'approved') return 'Approved by Accounts; Waiting for Admin Approval';
  if (status === 'admin_approved') return 'Approved by Accounts; Approved by Admin';
  return DAILY_STATUS_TAG[status].label;
}

export function ReportsClient({
  advanceRequests = [], subcontractorPaymentRequests = [], payments = [],
  labourPayments = [], expensePayments = [],
  projects = [],
  bills = [],
  expenses = [],
  dailyLabourReports = [],
  subcontractorBills = [],
  vendorQuotations = [],
  role,
  allStatuses = false,
  title = 'Weekly Report',
  hideProjectReport = false,
}: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState(hideProjectReport ? 'daily-labour' : 'project');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  // Payment History popup for a vendor / subcontractor bill row.
  const [history, setHistory] = useState<{
    title: string;
    valueLabel: string;
    value: number | string | null | undefined;
    paid: number;
    balance: number;
    payments: { id: string; paymentDate: string; amount: number | string; paymentMode?: string | null; referenceNumber?: string | null }[];
  } | null>(null);
  // Bills and expenses: approved-only on Weekly Report, any status (optionally
  // filtered) on Report.
  const billStatusOk = useCallback(
    (status?: string | null) => (allStatuses ? !statusFilter || status === statusFilter : status === ADMIN_APPROVED || status === 'approved'),
    [allStatuses, statusFilter],
  );
  const purchaseBillStatusOk = useCallback(
    (status?: string | null) => (allStatuses ? !statusFilter || status === statusFilter : status === BILL_ADMIN_APPROVED || status === ADMIN_APPROVED),
    [allStatuses, statusFilter],
  );
  const dailyStatusOk = useCallback(
    (status?: string | null) => (allStatuses ? !statusFilter || status === statusFilter : status === 'approved' || status === 'admin_approved'),
    [allStatuses, statusFilter],
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(ALL_PROJECTS);
  const [expProjectId, setExpProjectId] = useState<string | undefined>(ALL_PROJECTS);
  const [expDateRange, setExpDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [dlProjectId, setDlProjectId] = useState<string | undefined>();
  const [projectDateRange, setProjectDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [dlDateRange, setDlDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [vbProjectId, setVbProjectId] = useState<string | undefined>(ALL_PROJECTS);
  const [vbDateRange, setVbDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [sbProjectId, setSbProjectId] = useState<string | undefined>(ALL_PROJECTS);
  const [sbDateRange, setSbDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  // Daily labour weeks currently expanded to show their days.
  const [expandedDailyWeeks, setExpandedDailyWeeks] = useState<string[]>([]);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    return map;
  }, [projects]);

  const projectBills = useMemo(() => {
    if (!selectedProjectId) return [];
    return bills.filter((b) => purchaseBillStatusOk(b.status) && (selectedProjectId === ALL_PROJECTS || b.projectId === selectedProjectId) && inRange(b.billDate, projectDateRange));
  }, [bills, selectedProjectId, projectDateRange, purchaseBillStatusOk]);

  const projectSummary = useMemo(() => {
    let totalAmount = 0;
    let totalPaid = 0;
    for (const b of projectBills) {
      totalAmount += Number(b.amount || 0);
      totalPaid += Number(b.paidAmount || 0);
    }
    return { count: projectBills.length, totalAmount, totalPaid, outstanding: totalAmount - totalPaid };
  }, [projectBills]);

  // Expenses tab: team (submitter role) filter and expanded weeks.
  const [expRoleFilter, setExpRoleFilter] = useState<string | undefined>();
  const [expandedExpenseWeeks, setExpandedExpenseWeeks] = useState<string[]>([]);

  const projectExpenses = useMemo(() => {
    if (!expProjectId) return [];
    return expenses
      .filter((e) => billStatusOk(e.status) && (expProjectId === ALL_PROJECTS || e.projectId === expProjectId) && inRange(e.expenseDate, expDateRange))
      .filter((e) => !expRoleFilter || e.creator?.role === expRoleFilter)
      .sort((a, b) => (b.expenseDate || '').localeCompare(a.expenseDate || ''));
  }, [expenses, expProjectId, expDateRange, billStatusOk, expRoleFilter]);

  // Expenses grouped by week (Monday to Sunday), person and project, newest
  // week first, same as the Approvals page.
  const expenseWeekRows = useMemo<ExpenseWeekRow[]>(() => {
    const groups = new Map<string, ExpenseWeekRow>();
    for (const e of projectExpenses) {
      const weekStart = weekStartOf(e.expenseDate)?.format('YYYY-MM-DD') || '';
      const name = e.creator?.name || '-';
      const projectName = e.project?.name || '-';
      const key = `${weekStart}|${e.createdBy || e.creator?.id || name}|${e.projectId || projectName}`;
      const group = groups.get(key);
      if (group) group.expenses.push(e);
      else groups.set(key, { key, weekStart, name, role: e.creator?.role || '', projectName, expenses: [e] });
    }
    return [...groups.values()].sort((a, b) => b.weekStart.localeCompare(a.weekStart) || a.name.localeCompare(b.name));
  }, [projectExpenses]);

  const projectExpenseSummary = useMemo(() => {
    let total = 0;
    for (const e of projectExpenses) total += Number(e.amount || 0);
    return { count: projectExpenses.length, total };
  }, [projectExpenses]);

  const [dlSearch, setDlSearch] = useState('');

  const filteredDailyLabour = useMemo(() => {
    const q = dlSearch.trim().toLowerCase();
    // Weekly Report: approved reports only. Report: any status (optionally filtered).
    return dailyLabourReports
      .filter((r) => dailyStatusOk(r.status))
      .filter((r) => (!dlProjectId || r.projectId === dlProjectId) && inRange(r.reportDate, dlDateRange))
      .filter((r) => {
        if (!q) return true;
        // Site engineer, project, trade and remarks are all searchable.
        const haystack = [
          r.createdBy?.name,
          r.project?.name,
          r.project?.projectCode,
          r.remarks,
          ...(r.workers || []).flatMap((w) => [w.trade, w.tradeRel?.team?.name]),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => (b.reportDate || '').localeCompare(a.reportDate || ''));
  }, [dailyLabourReports, dlProjectId, dlDateRange, dailyStatusOk, dlSearch]);

  // The generic Payment ledger doesn't carry a "vendor" / "subcontractor"
  // category of its own — which bucket a row belongs to is inferred from
  // which relation it's actually attached to.
  //
  // Vendor Payments shows the whole lifecycle, not just money already paid:
  // every Vendor Payment Request (pending/accepted/admin-approved/rejected)
  // plus every actual Payment row, so a still-pending request is visible
  // here too — not just ones that made it all the way to a real payment.
  // Enquiry lookup for the Purchase Enquiry column (same rule as the Bills page).
  const enquiryByVendorAndMr = useMemo(() => {
    const map = new Map<string, VendorQuotation>();
    for (const vq of vendorQuotations) {
      const key = `${vq.vendorId}|${vq.materialRequirement?.enquiryNo || ''}`;
      if (!map.has(key)) map.set(key, vq);
    }
    return map;
  }, [vendorQuotations]);
  const enquiryFor = (bill: PurchaseBill) =>
    enquiryByVendorAndMr.get(`${bill.vendorId}|${bill.purchaseOrder?.materialRequirementNo || ''}`) || null;

  // Vendor bills for the Vendor Bills tab.
  const vendorBillRows = useMemo(
    () => bills
      .filter((b) => !vbProjectId || vbProjectId === ALL_PROJECTS || b.projectId === vbProjectId)
      .filter((b) => inRange(b.billDate, vbDateRange))
      .filter((b) => purchaseBillStatusOk(b.status))
      .sort((a, b) => (b.billDate || '').localeCompare(a.billDate || '')),
    [bills, vbProjectId, vbDateRange, purchaseBillStatusOk],
  );

  // Subcontractor bills for the Subcontractor Bills tab (dated by when they were raised).
  const subcontractorBillRows = useMemo(
    () => subcontractorBills
      .filter((b) => !sbProjectId || sbProjectId === ALL_PROJECTS || b.projectId === sbProjectId)
      .filter((b) => inRange(b.createdAt, sbDateRange))
      .filter((b) => purchaseBillStatusOk(b.status))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [subcontractorBills, sbProjectId, sbDateRange, purchaseBillStatusOk],
  );

  const vendorBillsSummary = useMemo(() => {
    let total = 0;
    let paid = 0;
    for (const b of vendorBillRows) {
      total += Number(b.amount || 0);
      paid += Number(b.paidAmount || 0);
    }
    return { count: vendorBillRows.length, total, paid, balance: total - paid };
  }, [vendorBillRows]);

  const subcontractorBillsSummary = useMemo(() => {
    let total = 0;
    let paid = 0;
    for (const b of subcontractorBillRows) {
      // amount is the Total Bill Amount (as on the Subcontractor Bills page).
      total += Number(b.amount || 0);
      paid += Number(b.paidAmount || 0);
    }
    return { count: subcontractorBillRows.length, total, paid, balance: total - paid };
  }, [subcontractorBillRows]);

  const dailyLabourSummary = useMemo(() => {
    let headcount = 0;
    let totalShift = 0;
    for (const r of filteredDailyLabour) {
      for (const w of r.workers || []) {
        headcount += Number(w.count) || 1;
        totalShift += (Number(w.count) || 1) * (Number(w.shift) || 0);
      }
    }
    return { count: filteredDailyLabour.length, headcount, totalShift };
  }, [filteredDailyLabour]);

  // Daily labour reports grouped by week, site engineer (Team) and project.
  const dailyWeekRows = useMemo<DailyWeekRow[]>(() => {
    const groups = new Map<string, DailyWeekRow>();
    for (const r of filteredDailyLabour) {
      const weekStart = weekStartOf(r.reportDate)?.format('YYYY-MM-DD') || '';
      const name = r.createdBy?.name || '-';
      const projectName = r.project?.name || '-';
      const key = `${weekStart}|${r.createdById || r.createdBy?.id || name}|${r.projectId || projectName}`;
      const group = groups.get(key);
      if (group) {
        group.reports.push(r);
      } else {
        groups.set(key, { key, weekStart, name, projectName, reports: [r] });
      }
    }
    return [...groups.values()].sort(
      (a, b) => b.weekStart.localeCompare(a.weekStart) || a.name.localeCompare(b.name),
    );
  }, [filteredDailyLabour]);

  // Each weekly team total is followed by its individual trade totals.
  const dailySummaryRows = useMemo<DailySummaryRow[]>(() => {
    const groups = new Map<string, { weekStart: string; projectKey: string; team: string; reports: Map<string, DailyLabourReport>; categories: Map<string, { shift: number; amount: number }> }>();
    for (const report of filteredDailyLabour) {
      const weekStart = weekStartOf(report.reportDate)?.format('YYYY-MM-DD') || '';
      for (const worker of report.workers || []) {
        const team = worker.tradeRel?.team?.name || '-';
        const projectKey = JSON.stringify([weekStart, report.projectId || report.project?.name || '-']);
        const key = JSON.stringify([projectKey, worker.tradeRel?.teamId || team]);
        let group = groups.get(key);
        if (!group) {
          group = { weekStart, projectKey, team, reports: new Map(), categories: new Map() };
          groups.set(key, group);
        }
        group.reports.set(report.id, report);
        const category = worker.tradeRel?.name || worker.trade || '-';
        const totals = group.categories.get(category) || { shift: 0, amount: 0 };
        totals.shift += (Number(worker.count) || 1) * (Number(worker.shift) || 0);
        totals.amount += tradeAmount(worker);
        group.categories.set(category, totals);
      }
    }
    const rows = [...groups.entries()]
      .sort(([, a], [, b]) => b.weekStart.localeCompare(a.weekStart) || a.projectKey.localeCompare(b.projectKey) || a.team.localeCompare(b.team))
      .flatMap(([key, group], index) => {
        const reports = [...group.reports.values()];
        const dates = reports.map((report) => report.reportDate.split('T')[0]).sort();
        const projects = [...new Set(reports.map((report) => report.project?.name || '-'))].join(', ');
        const totals = [...group.categories.values()].reduce(
          (sum, category) => ({ shift: sum.shift + category.shift, amount: sum.amount + category.amount }),
          { shift: 0, amount: 0 },
        );
        const summary: DailySummaryRow = {
          key, serial: index + 1, projectSpan: 0, projectKey: group.projectKey, span: group.categories.size + 1, isTotal: true,
          weekStart: group.weekStart,
          dateRange: dates[0] === dates[dates.length - 1] ? formatDate(dates[0]) : `${formatDate(dates[0])} ? ${formatDate(dates[dates.length - 1])}`,
          projects, team: group.team,
          category: 'Total',
          totalShift: totals.shift, totalAmount: totals.amount,
          paymentIds: [...new Set(reports.flatMap((report) => report.workers || [])
            .filter((worker) => JSON.stringify([group.projectKey, worker.tradeRel?.teamId || worker.tradeRel?.team?.name || '-']) === key)
            .map((worker) => worker.labourPaymentId).filter((id): id is string => !!id))],
          paidAmount: reports.reduce((sum, report) => sum + (report.workers || [])
            .filter((worker) => JSON.stringify([group.projectKey, worker.tradeRel?.teamId || worker.tradeRel?.team?.name || '-']) === key && labourPayments.some((payment) => payment.id === worker.labourPaymentId))
            .reduce((subtotal, worker) => subtotal + tradeAmount(worker) * labourPaidRatio(labourPayments.find((payment) => payment.id === worker.labourPaymentId)!), 0), 0),
          status: dailyWeekApprovalLabel(reports),
        };
        return [summary, ...[...group.categories.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, totals]): DailySummaryRow => ({
            ...summary,
            key: JSON.stringify([key, category]),
            span: 0,
            isTotal: false,
            category,
            totalShift: totals.shift,
            totalAmount: totals.amount,
          }))];
      });
    let serial = 0;
    for (let start = 0; start < rows.length;) {
      let end = start + 1;
      while (end < rows.length && rows[end].projectKey === rows[start].projectKey) end++;
      serial++;
      rows[start].projectSpan = end - start;
      for (let index = start; index < end; index++) rows[index].serial = serial;
      start = end;
    }
    return rows;
  }, [filteredDailyLabour, labourPayments]);

  const expensePaymentById = new Map(expensePayments.map((payment) => [payment.id, payment]));
  const expensePaymentTotals = (entries: Expense[]) => {
    const eligible = entries.filter((entry) => entry.status !== 'rejected');
    const total = eligible.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const paid = eligible.reduce((sum, entry) => {
      const payment = entry.expensePaymentId ? expensePaymentById.get(entry.expensePaymentId) : undefined;
      return sum + (payment ? Number(entry.amount || 0) * labourPaidRatio(payment) : 0);
    }, 0);
    return { paid, balance: Math.max(0, total - paid) };
  };
  const paymentTag = (paid: number, balance: number) => <Tag color={paid <= 0 ? 'default' : balance > 0.005 ? 'warning' : 'success'}>{paymentStatus(paid, balance)}</Tag>;

  const exportProjectBills = () => {
    exportToExcel({
      filename: `Project-Bills-${selectedProjectId && selectedProjectId !== ALL_PROJECTS ? (projectNameById.get(selectedProjectId) || 'report') : 'all'}`,
      sheetName: 'Purchase Bills',
      headers: [
        'Bill Number',
        'Vendor',
        'Bill Date',
        'Amount',
        'GST %',
        'GST Amount',
        'Total',
        'Paid Amount',
        'Outstanding',
        'Status',
        'Notes',
      ],
      rows: projectBills.map((b) => [
        b.billNumber,
        b.vendor?.name || '-',
        b.billDate ? formatDate(b.billDate) : '-',
        Number(b.amount || 0),
        b.gstPercent != null ? Number(b.gstPercent) : 0,
        Number(b.gstAmount || 0),
        Number(b.amount || 0) + Number(b.gstAmount || 0),
        Number(b.paidAmount || 0),
        Number(b.amount || 0) - Number(b.paidAmount || 0),
        approvalLabel(b.status, true),
        b.notes || '-',
      ]),
    });
  };

  const exportProjectExpenses = () => {
    exportToExcel({
      filename: `Project-Expenses-${expProjectId && expProjectId !== ALL_PROJECTS ? (projectNameById.get(expProjectId) || 'report') : 'all'}`,
      sheetName: 'Expenses',
      headers: [
        'Week',
        'Submitted By',
        'Team',
        'Project',
        'Expense Date',
        'Category',
        'Expense Type',
        'Description',
        'Trade',
        'Amount',
        'Status',
        'Remarks', 'Paid Amount', 'Balance', 'Payment Status',
      ],
      rows: projectExpenses.map((e) => [
        weekRangeLabel(e.expenseDate),
        e.creator?.name || '-',
        e.creator?.role ? titleCase(e.creator.role) : '-',
        e.project?.name || '-',
        e.expenseDate ? formatDate(e.expenseDate) : '-',
        e.category ? titleCase(e.category) : '-',
        e.expenseType?.name || '-',
        e.description || '-',
        e.trade?.name || '-',
        Number(e.amount || 0),
        e.status ? approvalLabel(e.status) : '-',
        e.remarks || '-',
        expensePaymentTotals([e]).paid, expensePaymentTotals([e]).balance,
        paymentStatus(expensePaymentTotals([e]).paid, expensePaymentTotals([e]).balance),
      ]),
    });
  };

  const exportDailyLabour = () => {
    exportToExcel({
      filename: 'Daily-Labour-List',
      sheetName: 'Daily Labour',
      headers: hideProjectReport
        ? ['S.No', 'Date', 'Week', 'All Project', 'Team', 'Trade', 'Total Shift', 'Total Amount', 'Paid Amount', 'Balance', 'Payment Status', 'Status', 'Payment History']
        : ['Week', 'Submitted By', 'Project', 'Date', 'Trade', 'Trade Team', 'Count', 'Shift', 'Total Shift', 'Amount', 'Overall Remarks', 'Trade Remarks', 'Status'],
      rows: hideProjectReport ? dailySummaryRows.map((row) => [
        row.projectSpan ? row.serial : '', row.span ? row.dateRange : '',
        row.projectSpan ? weekRangeLabel(row.weekStart) : '', row.projectSpan ? row.projects : '',
        row.span ? row.team : '', row.category,
        row.totalShift, row.totalAmount, row.isTotal ? row.paidAmount : '', row.isTotal ? Math.max(0, row.totalAmount - row.paidAmount) : '', row.isTotal ? paymentStatus(row.paidAmount, Math.max(0, row.totalAmount - row.paidAmount)) : '', row.span ? row.status : '', row.isTotal ? labourHistoryText(labourPayments.filter((payment) => row.paymentIds.includes(payment.id))) : '',
      ]) : dailyWeekRows.flatMap((week) =>
        dailyTradeRows(week.reports).map((t) => [
          weekRangeLabel(week.weekStart),
          week.name,
          week.projectName,
          formatDate(t.reportDate),
          t.worker.trade,
          t.worker.tradeRel?.team?.name || '-',
          Number(t.worker.count) || 1,
          Number(t.worker.shift) || 0,
          (Number(t.worker.count) || 1) * (Number(t.worker.shift) || 0),
          tradeAmount(t.worker),
          t.reportRemarks || '-',
          t.worker.reviewRemarks || '-',
          dailyWeekApprovalLabel(week.reports),
        ]),
      ),
    });
  };

  const exportVendorBills = () => {
    exportToExcel({
      filename: 'Vendor-Bills-Report',
      sheetName: 'Vendor Bills',
      headers: ['Created Date', 'MR Ref', 'PO Number', 'Bill No', 'Vendor', 'Project', 'Status', 'GST', 'Total Amount', 'Paid Amount', 'Balance Amount', 'Bill Date', 'Payment Status'],
      rows: vendorBillRows.map((b) => [
        b.createdAt ? formatDate(b.createdAt) : '-',
        b.purchaseOrder?.materialRequirementNo || '-',
        b.purchaseOrder?.poNumber || '-',
        b.billNumber,
        b.vendor?.name || '-',
        b.project?.name || b.purchaseOrder?.project?.name || '-',
        approvalLabel(b.status, true),
        Number(b.gstAmount || 0),
        Number(b.amount || 0),
        Number(b.paidAmount || 0),
        Number(b.amount || 0) - Number(b.paidAmount || 0),
        b.billDate ? formatDate(b.billDate) : '-',
        paymentStatus(Number(b.paidAmount || 0), Math.max(0, Number(b.amount || 0) - Number(b.paidAmount || 0))),
      ]),
    });
  };

  const exportSubcontractorBills = () => {
    exportToExcel({
      filename: 'Subcontractor-Bills-Report',
      sheetName: 'Subcontractor Bills',
      headers: ['Subcontractor', 'Project', 'WO Number', 'Total Amount', 'WO Amount', 'Notes', 'Requested At', 'Status', 'Paid Amount', 'Balance', 'Payment Status'],
      rows: subcontractorBillRows.map((b) => [
        b.subcontractor?.name || '-',
        b.project?.name || '-',
        b.subcontractWorkOrder?.woNumber || '-',
        Number(b.amount || 0),
        b.subcontractWorkOrder ? Number(b.subcontractWorkOrder.totalAmount || 0) : '-',
        b.notes || '-',
        b.createdAt ? formatDate(b.createdAt) : '-',
        approvalLabel(b.status, true),
        Number(b.paidAmount || 0), Math.max(0, Number(b.amount || 0) - Number(b.paidAmount || 0)),
        paymentStatus(Number(b.paidAmount || 0), Math.max(0, Number(b.amount || 0) - Number(b.paidAmount || 0))),
      ]),
    });
  };

  const billColumns: ColumnsType<PurchaseBill> = [
    { title: 'Bill Number', dataIndex: 'billNumber', width: 160, render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'Vendor', dataIndex: ['vendor', 'name'], width: 180, render: (v: string) => v || '-' },
    { title: 'Bill Date', dataIndex: 'billDate', width: 120, render: (v: string) => (v ? formatDate(v) : '-') },
    { title: 'Amount', dataIndex: 'amount', width: 120, align: 'right' as const, render: (v: number) => formatCurrency(v) },
    {
      title: 'GST',
      key: 'gst',
      width: 140,
      align: 'right' as const,
      render: (_, r) => (
        <span>
          {r.gstPercent != null ? `${Number(r.gstPercent)}%` : '0%'} ({formatCurrency(r.gstAmount)})
        </span>
      ),
    },
    {
      title: 'Total',
      key: 'total',
      width: 120,
      align: 'right' as const,
      render: (_, r) => formatCurrency(Number(r.amount || 0) + Number(r.gstAmount || 0)),
    },
    { title: 'Paid', dataIndex: 'paidAmount', width: 120, align: 'right' as const, render: (v: number) => formatCurrency(v) },
    {
      title: 'Outstanding',
      key: 'outstanding',
      width: 120,
      align: 'right' as const,
      render: (_, r) => formatCurrency(Number(r.amount || 0) - Number(r.paidAmount || 0)),
    },
    { title: 'Status', dataIndex: 'status', width: 140, render: (v: string) => billApprovalTag(v) },
  ];

  const expenseColumns: ColumnsType<Expense> = [
    { title: 'Expense Date', dataIndex: 'expenseDate', width: 120, render: (v: string) => (v ? formatDate(v) : '-') },
    { title: 'Category', dataIndex: 'category', width: 120, render: (v: string) => (v ? titleCase(v) : '-') },
    { title: 'Expense Type', dataIndex: ['expenseType', 'name'], width: 140, render: (v: string) => v || '-' },
    { title: 'Description', dataIndex: 'description', render: (v: string) => v || '-' },
    { title: 'Trade', dataIndex: ['trade', 'name'], width: 120, render: (v: string) => v || '-' },
    { title: 'Amount', dataIndex: 'amount', width: 120, align: 'right' as const, render: (v: number) => formatCurrency(v) },
    { title: 'Status', dataIndex: 'status', width: 200, render: (v: string) => (
      <Flex vertical gap={4} align="start">
        {v === 'admin_approved' && <Tag color="processing">Approved by Accounts</Tag>}
        <Tag color="blue">{approvalLabel(v)}</Tag>
        {v === 'approved' && <Tag color="warning">Waiting for Admin Approval</Tag>}
      </Flex>
    ) },
    { title: 'Remarks', dataIndex: 'remarks', width: 160, render: (v: string) => v || '-' },
  ];

  // Week row of the Expenses tab; "View" expands to that week's expenses.
  const expenseWeekColumns: ColumnsType<ExpenseWeekRow> = [
    { title: 'S.No', key: 'sno', align: 'right' as const, width: 70, render: (_, __, i) => i + 1 },
    { title: 'Week', key: 'week', width: 150, render: (_, r) => weekRangeLabel(r.weekStart) },
    {
      title: 'Name', key: 'name', width: 200,
      render: (_, r) => (
        <Flex vertical gap={0}>
          <Typography.Text strong>{r.name}</Typography.Text>
          {r.role && <Typography.Text type="secondary" className="text-[10px] uppercase">{r.role.replace('_', ' ')}</Typography.Text>}
        </Flex>
      ),
    },
    { title: 'Project', key: 'project', width: 200, render: (_, r) => r.projectName },
    { title: 'Paid Amount', key: 'paidAmount', width: 140, render: (_, row) => formatCurrency(expensePaymentTotals(row.expenses).paid) },
    { title: 'Balance', key: 'balance', width: 140, render: (_, row) => formatCurrency(expensePaymentTotals(row.expenses).balance) },
    { title: 'Payment Status', key: 'paymentStatus', width: 160, render: (_, row) => { const totals = expensePaymentTotals(row.expenses); return paymentTag(totals.paid, totals.balance); } },
    { title: 'Expenses', key: 'count', align: 'right' as const, width: 100, render: (_, r) => r.expenses.length },
    {
      title: 'Amount', key: 'amount', align: 'right' as const, width: 140,
      render: (_, r) => formatCurrency(r.expenses.filter((e) => e.status !== 'rejected').reduce((s, e) => s + Number(e.amount || 0), 0)),
    },
    {
      title: 'Status', key: 'status', width: 200,
      render: (_, r) => {
        const s = expenseWeekStatus(r.expenses);
        return (
          <Flex vertical gap={4} align="start">
            {s.label === 'Approved by Admin' && (
              <Tag color="processing">Approved by Accounts</Tag>
            )}
            <Tag color={s.color}>{s.label}</Tag>
            {r.expenses.some((e) => e.status === 'approved') && (
              <Tag color="warning">Waiting for Admin Approval</Tag>
            )}
          </Flex>
        );
      },
    },
    {
      title: 'Action', key: 'view', width: 180,
      render: (_, r) => {
        const open = expandedExpenseWeeks.includes(r.key);
        const first = r.expenses[0];
        // Same full-details page as the Approvals page's eye icon.
        const detailHref = `/dashboard/approvals/expenses-week?${new URLSearchParams({
          week: r.weekStart,
          user: first?.createdBy || first?.creator?.id || '',
          project: first?.projectId || 'none',
        }).toString()}`;
        return (
          <Flex gap={6}>
            <Link href={detailHref}>
              <Button size="small" icon={<EyeOutlined />} title="View full details" />
            </Link>
            <Button
              size="small"
              type={open ? 'default' : 'primary'}
              ghost={!open}
              onClick={() => setExpandedExpenseWeeks((keys) => (open ? keys.filter((k) => k !== r.key) : [...keys, r.key]))}
            >
              {open ? 'Hide' : `View (${r.expenses.length})`}
            </Button>
          </Flex>
        );
      },
    },
  ];


  const projectSpan = (row: DailySummaryRow) => ({ rowSpan: row.projectSpan });
  const summarySpan = (row: DailySummaryRow) => ({ rowSpan: row.span });
  const dailySummaryColumns: ColumnsType<DailySummaryRow> = [
    { title: 'S.No', dataIndex: 'serial', width: 60, onCell: projectSpan },
    { title: 'Date', dataIndex: 'dateRange', width: 190, onCell: summarySpan },
    { title: 'Week', key: 'week', width: 160, render: (_, row) => weekRangeLabel(row.weekStart), onCell: projectSpan },
    { title: 'All Project', dataIndex: 'projects', width: 180, onCell: projectSpan },
    { title: 'Team', dataIndex: 'team', width: 140, onCell: summarySpan },
    { title: 'Trade', dataIndex: 'category', width: 120, render: (value: string, row) => <Typography.Text strong={row.isTotal}>{value}</Typography.Text> },
    { title: 'Total Shift', dataIndex: 'totalShift', width: 110, align: 'right', render: (value: number, row) => <Typography.Text strong={row.isTotal}>{value}</Typography.Text> },
    { title: 'Total Amount', dataIndex: 'totalAmount', width: 140, align: 'right', render: (amount: number, row) => <Typography.Text strong={row.isTotal}>{formatCurrency(amount)}</Typography.Text> },
    { title: 'Paid Amount', dataIndex: 'paidAmount', width: 140, align: 'right', onCell: summarySpan, render: (amount: number) => formatCurrency(amount) },
    { title: 'Balance', key: 'balance', width: 140, align: 'right', onCell: summarySpan, render: (_, row) => formatCurrency(Math.max(0, row.totalAmount - row.paidAmount)) },
    { title: 'Payment Status', key: 'paymentStatus', width: 160, onCell: summarySpan, render: (_, row) => paymentTag(row.paidAmount, Math.max(0, row.totalAmount - row.paidAmount)) },
    { title: 'History', key: 'history', width: 140, onCell: summarySpan, render: (_, row) => <LabourPaymentHistory payments={labourPayments.filter((payment) => row.paymentIds.includes(payment.id))} /> },
    { title: 'Status', dataIndex: 'status', width: 250, onCell: summarySpan },
  ];

  // Week row: the same summary as Approvals, read-only here. "View" expands to its days.
  const dailyWeekColumns: ColumnsType<DailyWeekRow> = [
    { title: 'S.No', key: 'sno', align: 'right' as const, width: 70, render: (_, __, i) => i + 1 },
    { title: 'Week', key: 'week', width: 150, render: (_, r) => weekRangeLabel(r.weekStart) },
    { title: 'Team', key: 'team', width: 200, render: (_, r) => <Typography.Text strong>{r.name}</Typography.Text> },
    { title: 'Project', key: 'project', width: 220, render: (_, r) => r.projectName },
    { title: 'Reports', key: 'reports', align: 'right' as const, width: 90, render: (_, r) => r.reports.length },
    { title: 'Total Shift', key: 'totalShift', align: 'right' as const, width: 120, render: (_, r) => weekShiftTotal(r.reports) },
    { title: 'Amount', key: 'amount', align: 'right' as const, width: 140, render: (_, r) => formatCurrency(weekAmountTotal(r.reports)) },
    {
      title: 'Status', key: 'status', width: 220,
      render: (_, r) => {
        const status = weekReportStatus(r.reports);
        const tag = DAILY_STATUS_TAG[status];
        if (status === 'approved' || status === 'admin_approved') {
          return (
            <Flex vertical gap={4} align="start">
              <Tag color="processing">Approved by Accounts</Tag>
              <Tag color={status === 'admin_approved' ? 'success' : 'warning'}>
                {status === 'admin_approved' ? 'Approved by Admin' : 'Waiting for Admin Approval'}
              </Tag>
            </Flex>
          );
        }
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Days', key: 'days', width: 130,
      render: (_, r) => {
        const open = expandedDailyWeeks.includes(r.key);
        return (
          <Button
            size="small"
            type={open ? 'default' : 'primary'}
            ghost={!open}
            onClick={() => setExpandedDailyWeeks((keys) => (open ? keys.filter((k) => k !== r.key) : [...keys, r.key]))}
          >
            {open ? 'Hide days' : `View (${r.reports.length})`}
          </Button>
        );
      },
    },
  ];

  // Trade entries under an expanded week. Each day's date and remarks show once.
  const dailyTradeColumns: ColumnsType<DailyTradeRow> = [
    { title: 'Date', key: 'date', width: 110, render: (_, t) => reportSpanCell(t, formatDate(t.reportDate)) },
    { title: 'Trade', key: 'trade', width: 160, render: (_, t) => <Typography.Text strong>{t.worker.trade}</Typography.Text> },
    { title: 'Trade Team', key: 'tradeTeam', width: 160, render: (_, t) => t.worker.tradeRel?.team?.name || '-' },
    { title: 'Count', key: 'count', align: 'right' as const, width: 80, render: (_, t) => Number(t.worker.count) || 1 },
    { title: 'Shift', key: 'shift', align: 'right' as const, width: 80, render: (_, t) => t.worker.shift || '-' },
    { title: 'Total Shift', key: 'totalShift', align: 'right' as const, width: 110, render: (_, t) => (Number(t.worker.count) || 1) * (Number(t.worker.shift) || 0) },
    { title: 'Amount', key: 'amount', align: 'right' as const, width: 130, render: (_, t) => formatCurrency(tradeAmount(t.worker)) },
    { title: 'Overall Remarks', key: 'overallRemarks', width: 220, ellipsis: true, render: (_, t) => reportSpanCell(t, t.reportRemarks || '-') },
    { title: 'Trade Remarks', key: 'tradeRemarks', width: 200, ellipsis: true, render: (_, t) => t.worker.reviewRemarks || '-' },
  ];

  const dailyWeekTableProps = {
    rowKey: 'key',
    expandable: {
      expandedRowKeys: expandedDailyWeeks,
      onExpand: (expanded: boolean, row: DailyWeekRow) =>
        setExpandedDailyWeeks((keys) => (expanded ? [...keys, row.key] : keys.filter((k) => k !== row.key))),
      expandedRowRender: (row: DailyWeekRow) => (
        <Table
          size="small"
          rowKey="key"
          dataSource={dailyTradeRows(row.reports)}
          columns={dailyTradeColumns}
          pagination={false}
          scroll={{ x: 1100 }}
        />
      ),
    },
  };

  // History cell: balance plus a button opening the payment history popup
  // (same as the Payments page's vendor tab).
  const historyCell = (payments: unknown[], balance: number, open: () => void) => (
    <Flex vertical gap={4}>
      {payments.length === 0 && <Typography.Text type="secondary" className="text-xs">No payments yet</Typography.Text>}
      <Typography.Text strong className="text-xs">Balance: {formatCurrency(Math.max(balance, 0))}</Typography.Text>
      {payments.length > 0 && (
        <Button size="small" icon={<HistoryOutlined />} onClick={open}>History</Button>
      )}
    </Flex>
  );

  // Same column layout as the Approvals / Bills pages, read-only here.
  const vendorBillColumns: ColumnsType<PurchaseBill> = [
    { title: 'S.No', key: 'sno', width: 60, render: (_, __, i) => i + 1 },
    { title: 'Created Date', dataIndex: 'createdAt', width: 110, render: (v?: string) => formatDate(v) },
    { title: 'MR Ref', key: 'mrRef', width: 130, render: (_, r) => r.purchaseOrder?.materialRequirementNo || '-' },
    {
      title: 'Purchase Enquiry', key: 'purchaseEnquiry', width: 150,
      render: (_, r) => {
        const vq = enquiryFor(r);
        return vq ? formatDate(vq.createdAt) : <Typography.Text type="secondary">-</Typography.Text>;
      },
    },
    { title: 'PO Number', key: 'poNumber', width: 130, render: (_, r) => r.purchaseOrder?.poNumber || '-' },
    { title: 'Bill No', dataIndex: 'billNumber', width: 130, render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'Vendor', key: 'vendor', width: 180, ellipsis: true, render: (_, r) => r.vendor?.name || '-' },
    { title: 'Project', key: 'project', width: 220, ellipsis: true, render: (_, r) => r.project?.name || r.purchaseOrder?.project?.name || '-' },
    { title: 'Status', dataIndex: 'status', width: 150, render: (v: string) => billApprovalTag(v) },
    { title: 'Payment Status', key: 'paymentStatus', width: 160, render: (_, r) => paymentTag(Number(r.paidAmount || 0), Math.max(0, Number(r.amount || 0) - Number(r.paidAmount || 0))) },
    {
      title: 'GST', dataIndex: 'gstAmount', align: 'right' as const, width: 110,
      render: (v) => Number(v) > 0 ? formatCurrency(v) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'Total Amount', dataIndex: 'amount', align: 'right' as const, width: 130,
      render: (v) => <Typography.Text strong>{formatCurrency(v)}</Typography.Text>,
    },
    {
      title: 'Paid Amount', dataIndex: 'paidAmount', align: 'right' as const, width: 120,
      render: (v) => Number(v) > 0 ? formatCurrency(v) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'Balance Amount', key: 'balance', align: 'right' as const, width: 130,
      render: (_, r) => {
        const balance = Number(r.amount) - Number(r.paidAmount || 0);
        return <Typography.Text strong={balance > 0}>{formatCurrency(balance)}</Typography.Text>;
      },
    },
    {
      title: 'History', key: 'history', width: 200,
      render: (_, r) => {
        const payments = [...(r.payments || [])].sort(
          (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime(),
        );
        const poValue = r.purchaseOrder ? (r.purchaseOrder.totalWithGst || r.purchaseOrder.totalAmount) : r.amount;
        const balance = Number(r.amount) - Number(r.paidAmount || 0);
        return historyCell(payments, balance, () => setHistory({
          title: `${r.billNumber}${r.vendor?.name ? ` — ${r.vendor.name}` : ''}`,
          valueLabel: 'PO Value',
          value: poValue,
          paid: Number(r.paidAmount || 0),
          balance,
          payments,
        }));
      },
    },
    { title: 'Bill Date', dataIndex: 'billDate', width: 110, render: (v?: string) => formatDate(v) },
  ];

  const subcontractorBillColumns: ColumnsType<SubcontractorBill> = [
    { title: 'S.No', key: 'sno', width: 60, render: (_, __, i) => i + 1 },
    { title: 'Subcontractor', key: 'subcontractor', width: 180, ellipsis: true, render: (_, r) => r.subcontractor?.name || '-' },
    { title: 'Project', key: 'project', width: 220, ellipsis: true, render: (_, r) => r.project?.name || '-' },
    { title: 'WO Number', key: 'woNumber', width: 150, ellipsis: true, render: (_, r) => r.subcontractWorkOrder?.woNumber || '-' },
    {
      title: 'Total Amount', key: 'requested', width: 150, align: 'right' as const,
      render: (_, r) => formatCurrency(r.amount),
    },
    {
      title: 'WO Amount', key: 'woAmount', width: 140, align: 'right' as const,
      render: (_, r) => r.subcontractWorkOrder
        ? formatCurrency(r.subcontractWorkOrder.totalAmount)
        : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'Work Order', key: 'workOrder', width: 110,
      render: (_, r) => r.subcontractWorkOrder?.workorderUrl ? (
        <Button type="link" size="small" icon={<FilePdfOutlined />} href={r.subcontractWorkOrder.workorderUrl} target="_blank">
          View
        </Button>
      ) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    { title: 'Paid Amount', key: 'paidAmount', width: 140, align: 'right', render: (_, r) => formatCurrency(r.paidAmount || 0) },
    { title: 'Balance', key: 'balance', width: 140, align: 'right', render: (_, r) => formatCurrency(Math.max(0, Number(r.amount || 0) - Number(r.paidAmount || 0))) },
    { title: 'Notes', key: 'notes', width: 200, ellipsis: true, render: (_, r) => r.notes || '-' },
    {
      title: 'History', key: 'history', width: 220,
      render: (_, r) => {
        const payments = [...(r.payments || [])].sort(
          (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime(),
        );
        const woValue = r.subcontractWorkOrder?.totalAmount;
        const balance = Number(r.amount) - Number(r.paidAmount || 0);
        return historyCell(payments, balance, () => setHistory({
          title: `${r.subcontractor?.name || 'Subcontractor bill'}${r.subcontractWorkOrder?.woNumber ? ` — ${r.subcontractWorkOrder.woNumber}` : ''}`,
          valueLabel: 'WO Value',
          value: woValue,
          paid: Number(r.paidAmount || 0),
          balance,
          payments,
        }));
      },
    },
    { title: 'Requested At', key: 'requestedAt', width: 120, render: (_, r) => formatDate(r.createdAt) },
    { title: 'Status', dataIndex: 'status', width: 150, render: (v: string) => billApprovalTag(v) },
    { title: 'Payment Status', key: 'paymentStatus', width: 160, render: (_, r) => paymentTag(Number(r.paidAmount || 0), Math.max(0, Number(r.amount || 0) - Number(r.paidAmount || 0))) },
  ];

  const projectTabItems = {
    key: 'project',
    label: (
      <span>
        <ProjectOutlined className="mr-1" /> Project Report
      </span>
    ),
    children: (
      <div>
        <Flex justify="space-between" align="center" gap={16} wrap="wrap" className="mb-4!">
          <Flex gap={12} wrap="wrap">
            <Select
              showSearch
              placeholder="Select a project"
              style={{ minWidth: 320 }}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              options={[
                { value: ALL_PROJECTS, label: 'All Projects' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <DatePicker
              picker="month"
              placeholder="Month"
              allowClear
              onChange={(month) => setProjectDateRange(month ? [month.startOf('month'), month.endOf('month')] : [null, null])}
            />
            <DatePicker.RangePicker
              value={projectDateRange[0] || projectDateRange[1] ? projectDateRange : [null, null]}
              onChange={(dates) => setProjectDateRange(dates ? [dates[0], dates[1]] : [null, null])}
              allowClear
              placeholder={['From', 'To']}
            />
          </Flex>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            disabled={projectBills.length === 0}
            onClick={exportProjectBills}
          >
            Export to Excel
          </Button>
        </Flex>

        {!selectedProjectId ? (
          <Empty description="Choose a project to view its purchase bills" />
        ) : (
          <>
            <Row gutter={[16, 16]} className="mb-4">
              <Col xs={12} sm={6}>
                <Card
                  className="rounded-xl! border! border-[var(--border)]!"
                  styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}
                >
                  <Flex vertical gap={10}>
                    <Typography.Text className="text-sm text-[var(--text-muted)]!">Bills</Typography.Text>
                    <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">
                      {projectSummary.count}
                    </Typography.Title>
                  </Flex>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card
                  className="rounded-xl! border! border-[var(--border)]!"
                  styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}
                >
                  <Flex vertical gap={10}>
                    <Typography.Text className="text-sm text-[var(--text-muted)]!">Total Amount</Typography.Text>
                    <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">
                      {formatCurrency(projectSummary.totalAmount)}
                    </Typography.Title>
                  </Flex>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card
                  className="rounded-xl! border! border-[var(--border)]!"
                  styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}
                >
                  <Flex vertical gap={10}>
                    <Typography.Text className="text-sm text-[var(--text-muted)]!">Paid</Typography.Text>
                    <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">
                      {formatCurrency(projectSummary.totalPaid)}
                    </Typography.Title>
                  </Flex>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card
                  className="rounded-xl! border! border-[var(--border)]!"
                  styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}
                >
                  <Flex vertical gap={10}>
                    <Typography.Text className="text-sm text-[var(--text-muted)]!">Outstanding</Typography.Text>
                    <Typography.Title
                      level={4}
                      className="m-0! text-[var(--text-primary)]!"
                      style={projectSummary.outstanding > 0 ? { color: '#cf1322' } : undefined}
                    >
                      {formatCurrency(projectSummary.outstanding)}
                    </Typography.Title>
                  </Flex>
                </Card>
              </Col>
            </Row>

            <Card
              className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!"
              styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}
            >
              <Table
                className="mantis-table"
                dataSource={projectBills}
                columns={billColumns}
                rowKey="id"
                size="middle"
                scroll={{ x: 1100 }}
                pagination={{ pageSize: 10, showTotal: (total) => `${total} bills` }}
                locale={{ emptyText: 'No purchase bills for this project yet' }}
              />
            </Card>

          </>
        )}
      </div>
    ),
  };

  const expensesTabItems = {
    key: 'expenses',
    label: (
      <span>
        <WalletOutlined /> Expenses
      </span>
    ),
    children: (
      <div>
            <Flex justify="space-between" align="center" gap={16} wrap="wrap" className="mt-8! mb-4!">
              <Flex align="center" gap={12} wrap="wrap">
                <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">
                  Expenses
                </Typography.Title>
                <Select
                  showSearch
                  placeholder="Filter by project"
                  style={{ minWidth: 220 }}
                  value={expProjectId}
                  onChange={setExpProjectId}
                  options={[
                    { value: ALL_PROJECTS, label: 'All Projects' },
                    ...projects.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                  filterOption={(input, option) =>
                    String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                  }
                />
                <DatePicker.RangePicker
                  value={expDateRange[0] || expDateRange[1] ? expDateRange : [null, null]}
                  onChange={(dates) => setExpDateRange(dates ? [dates[0], dates[1]] : [null, null])}
                  allowClear
                  placeholder={['From date', 'To date']}
                />
              </Flex>
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                disabled={projectExpenses.length === 0}
                onClick={exportProjectExpenses}
              >
                Export to Excel
              </Button>
            </Flex>

            <Flex gap={8} wrap="wrap" align="center" className="mb-4!">
              <Typography.Text type="secondary">Submitted by:</Typography.Text>
              {EXPENSE_ROLE_FILTERS.map((f) => (
                <Button
                  key={f.label}
                  size="small"
                  type={expRoleFilter === f.value ? 'primary' : 'default'}
                  onClick={() => setExpRoleFilter(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </Flex>

            <Row gutter={[16, 16]} className="mb-4">
              <Col xs={12} sm={6}>
                <Card
                  className="rounded-xl! border! border-[var(--border)]!"
                  styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}
                >
                  <Flex vertical gap={10}>
                    <Typography.Text className="text-sm text-[var(--text-muted)]!">Expenses</Typography.Text>
                    <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">
                      {projectExpenseSummary.count}
                    </Typography.Title>
                  </Flex>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card
                  className="rounded-xl! border! border-[var(--border)]!"
                  styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}
                >
                  <Flex vertical gap={10}>
                    <Typography.Text className="text-sm text-[var(--text-muted)]!">Total Expense Amount</Typography.Text>
                    <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">
                      {formatCurrency(projectExpenseSummary.total)}
                    </Typography.Title>
                  </Flex>
                </Card>
              </Col>
            </Row>

            <Card
              className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!"
              styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}
            >
              <Table
                className="mantis-table"
                dataSource={expenseWeekRows}
                columns={expenseWeekColumns}
                rowKey="key"
                size="middle"
                scroll={{ x: 1150 }}
                pagination={{ pageSize: 10, showTotal: (total) => `${total} weeks · ${projectExpenses.length} expenses` }}
                locale={{ emptyText: 'No expenses for the selected filters' }}
                expandable={{
                  expandedRowKeys: expandedExpenseWeeks,
                  onExpand: (expanded, r) =>
                    setExpandedExpenseWeeks((keys) => (expanded ? [...keys, r.key] : keys.filter((k) => k !== r.key))),
                  expandedRowRender: (r) => (
                    <Table
                      size="small"
                      rowKey="id"
                      dataSource={[...r.expenses].sort((a, b) => (a.expenseDate || '').localeCompare(b.expenseDate || ''))}
                      columns={expenseColumns}
                      pagination={false}
                      scroll={{ x: 1100 }}
                    />
                  ),
                }}
              />
            </Card>
      </div>
    ),
  };

  const dailyLabourTabItems = {
    key: 'daily-labour',
    label: (
      <span>
        <TeamOutlined className="mr-1" /> Daily Labour List
      </span>
    ),
    children: (
      <div>
        <Flex justify="space-between" align="center" gap={16} wrap="wrap" className="mb-4!">
          <Flex gap={12} wrap="wrap">
            <Select
              showSearch
              placeholder="Filter by project"
              allowClear
              style={{ minWidth: 220 }}
              value={dlProjectId}
              onChange={setDlProjectId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <DatePicker.RangePicker
              value={dlDateRange[0] || dlDateRange[1] ? dlDateRange : [null, null]}
              onChange={(dates) => setDlDateRange(dates ? [dates[0], dates[1]] : [null, null])}
              allowClear
              placeholder={['From', 'To']}
            />
            <Input.Search
              placeholder="Search site engineer, project, trade..."
              allowClear
              value={dlSearch}
              onChange={(e) => setDlSearch(e.target.value)}
              style={{ width: 280 }}
            />
          </Flex>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            disabled={filteredDailyLabour.length === 0}
            onClick={exportDailyLabour}
          >
            Export to Excel
          </Button>
        </Flex>

        {!hideProjectReport && <Row gutter={[16, 16]} className="mb-4">
          <Col xs={12} sm={8}>
            <Card className="rounded-xl! border! border-[var(--border)]!" styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}>
              <Flex vertical gap={10}>
                <Typography.Text className="text-sm text-[var(--text-muted)]!">Reports</Typography.Text>
                <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">{dailyLabourSummary.count}</Typography.Title>
              </Flex>
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card className="rounded-xl! border! border-[var(--border)]!" styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}>
              <Flex vertical gap={10}>
                <Typography.Text className="text-sm text-[var(--text-muted)]!">Headcount</Typography.Text>
                <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">{dailyLabourSummary.headcount}</Typography.Title>
              </Flex>
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card className="rounded-xl! border! border-[var(--border)]!" styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}>
              <Flex vertical gap={10}>
                <Typography.Text className="text-sm text-[var(--text-muted)]!">Total Shift</Typography.Text>
                <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">{dailyLabourSummary.totalShift}</Typography.Title>
              </Flex>
            </Card>
          </Col>
        </Row>}

        <Card
          className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!"
          styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}
        >
          {hideProjectReport ? (
            <Table<DailySummaryRow>
              className="mantis-table"
              rowKey="key"
              bordered
              size="small"
              dataSource={dailySummaryRows}
              columns={dailySummaryColumns}
              pagination={false}
              scroll={{ x: 1450 }}
              locale={{ emptyText: 'No daily labour reports for the selected filters' }}
            />
          ) : <Table
            className="mantis-table"
            dataSource={dailyWeekRows}
            columns={dailyWeekColumns}
            {...dailyWeekTableProps}
            size="middle"
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 15, showTotal: (total) => `${total} weeks` }}
            locale={{ emptyText: 'No daily labour reports for the selected filters' }}
          />}
        </Card>
      </div>
    ),
  };

  const vendorBillsTabItems = {
    key: 'vendor-bills',
    label: (
      <span>
        <DollarOutlined className="mr-1" /> Vendor Bills
      </span>
    ),
    children: (
      <div>
        <Flex justify="space-between" align="center" gap={16} wrap="wrap" className="mb-4!">
          <Flex gap={12} wrap="wrap">
            <Select
              showSearch
              placeholder="Filter by project"
              style={{ minWidth: 220 }}
              value={vbProjectId}
              onChange={setVbProjectId}
              options={[
                { value: ALL_PROJECTS, label: 'All Projects' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <DatePicker.RangePicker
              value={vbDateRange[0] || vbDateRange[1] ? vbDateRange : [null, null]}
              onChange={(dates) => setVbDateRange(dates ? [dates[0], dates[1]] : [null, null])}
              allowClear
              placeholder={['From', 'To']}
            />
          </Flex>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            disabled={vendorBillRows.length === 0}
            onClick={exportVendorBills}
          >
            Export to Excel
          </Button>
        </Flex>

        <Row gutter={[16, 16]} className="mb-4">
          {[
            { label: 'Bills', value: String(vendorBillsSummary.count) },
            { label: 'Total Amount', value: formatCurrency(vendorBillsSummary.total) },
            { label: 'Paid', value: formatCurrency(vendorBillsSummary.paid) },
            { label: 'Balance', value: formatCurrency(vendorBillsSummary.balance) },
          ].map((card) => (
            <Col key={card.label} xs={12} sm={6}>
              <Card
                className="rounded-xl! border! border-[var(--border)]!"
                styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}
              >
                <Flex vertical gap={10}>
                  <Typography.Text className="text-sm text-[var(--text-muted)]!">{card.label}</Typography.Text>
                  <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">{card.value}</Typography.Title>
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>

        <Card
          className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!"
          styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}
        >
          <Table
            className="mantis-table"
            dataSource={vendorBillRows}
            columns={vendorBillColumns}
            rowKey="id"
            size="middle"
            scroll={{ x: 1800 }}
            pagination={{ pageSize: 15, showTotal: (total) => `${total} bills` }}
            locale={{ emptyText: 'No vendor bills for the selected filters' }}
          />
        </Card>
      </div>
    ),
  };

  const subcontractorBillsTabItems = {
    key: 'subcontractor-bills',
    label: (
      <span>
        <TeamOutlined className="mr-1" /> Subcontractor Bills
      </span>
    ),
    children: (
      <div>
        <Flex justify="space-between" align="center" gap={16} wrap="wrap" className="mb-4!">
          <Flex gap={12} wrap="wrap">
            <Select
              showSearch
              placeholder="Filter by project"
              style={{ minWidth: 220 }}
              value={sbProjectId}
              onChange={setSbProjectId}
              options={[
                { value: ALL_PROJECTS, label: 'All Projects' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <DatePicker.RangePicker
              value={sbDateRange[0] || sbDateRange[1] ? sbDateRange : [null, null]}
              onChange={(dates) => setSbDateRange(dates ? [dates[0], dates[1]] : [null, null])}
              allowClear
              placeholder={['From', 'To']}
            />
          </Flex>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            disabled={subcontractorBillRows.length === 0}
            onClick={exportSubcontractorBills}
          >
            Export to Excel
          </Button>
        </Flex>

        <Row gutter={[16, 16]} className="mb-4">
          {[
            { label: 'Bills', value: String(subcontractorBillsSummary.count) },
            { label: 'Requested Total', value: formatCurrency(subcontractorBillsSummary.total) },
            { label: 'Paid', value: formatCurrency(subcontractorBillsSummary.paid) },
            { label: 'Balance', value: formatCurrency(subcontractorBillsSummary.balance) },
          ].map((card) => (
            <Col key={card.label} xs={12} sm={6}>
              <Card
                className="rounded-xl! border! border-[var(--border)]!"
                styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}
              >
                <Flex vertical gap={10}>
                  <Typography.Text className="text-sm text-[var(--text-muted)]!">{card.label}</Typography.Text>
                  <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">{card.value}</Typography.Title>
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>

        <Card
          className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!"
          styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}
        >
          <Table
            className="mantis-table"
            dataSource={subcontractorBillRows}
            columns={subcontractorBillColumns}
            rowKey="id"
            size="middle"
            scroll={{ x: 1650 }}
            pagination={{ pageSize: 15, showTotal: (total) => `${total} bills` }}
            locale={{ emptyText: 'No subcontractor bills for the selected filters' }}
          />
        </Card>
      </div>
    ),
  };


  const paymentTabs = [
    {
      key: 'vendor-payments',
      label: 'Vendor Payment',
      children: <AdvanceRequestsClient requests={advanceRequests.filter((request) => request.status === 'accepted' || request.status === 'admin_approved')} bills={bills} payments={payments} embedded mode="reports" />,
    },
    {
      key: 'subcontractor-payments',
      label: 'Subcontractor Payment',
      children: <SubcontractorPaymentRequestsClient requests={subcontractorPaymentRequests.filter((request) => request.status === 'accepted' || request.status === 'admin_approved')} payments={payments} embedded mode="reports" />,
    },
  ];

  const canSeeReportData = ['admin', 'accounts_manager', 'purchase_team'].includes(role);
  const tabItems = canSeeReportData
    ? (hideProjectReport
      ? [dailyLabourTabItems, ...paymentTabs, vendorBillsTabItems, subcontractorBillsTabItems, expensesTabItems]
      : [projectTabItems, expensesTabItems, dailyLabourTabItems, vendorBillsTabItems, subcontractorBillsTabItems])
    : [];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <FileTextOutlined className={titleIconClassName} /> {title}
        </Typography.Title>
        {allStatuses && (
          <Select
            allowClear
            placeholder="All statuses"
            style={{ width: 200 }}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v || undefined)}
            options={REPORT_STATUS_OPTIONS}
          />
        )}
      </Flex>

      <Card
        className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!"
        styles={{ body: { padding: '8px 8px' } }}
      >
        {tabItems.length === 0 ? (
          <Empty description="No reports available" className="py-10" />
        ) : (
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        )}
      </Card>

      <Modal
        title={`Payment History — ${history?.title || ''}`}
        open={!!history}
        onCancel={() => setHistory(null)}
        footer={[<Button key="close" onClick={() => setHistory(null)}>Close</Button>]}
        width={700}
      >
        {history && (
          <Flex vertical gap={12}>
            <Descriptions
              size="small"
              column={{ xs: 1, sm: 3 }}
              items={[
                { key: 'value', label: history.valueLabel, children: history.value != null ? formatCurrency(history.value) : '-' },
                { key: 'paid', label: 'Paid', children: formatCurrency(history.paid) },
                { key: 'balance', label: 'Balance', children: formatCurrency(Math.max(history.balance, 0)) },
              ]}
            />
            <Table
              dataSource={history.payments}
              pagination={false}
              size="small"
              rowKey="id"
              locale={{ emptyText: 'No payments recorded yet' }}
              columns={[
                { title: 'Date', dataIndex: 'paymentDate', render: (v: string) => formatDate(v) },
                { title: 'Amount', dataIndex: 'amount', align: 'right', render: (v: number | string) => formatCurrency(v) },
                { title: 'Mode', dataIndex: 'paymentMode', render: (v?: string | null) => v?.toUpperCase() || '-' },
                { title: 'Reference', dataIndex: 'referenceNumber', render: (v?: string | null) => v || '-' },
              ]}
            />
          </Flex>
        )}
      </Modal>
    </div>
  );
}
