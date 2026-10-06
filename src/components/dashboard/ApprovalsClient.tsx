'use client';

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { App, Button, Card, Col, DatePicker, Flex, Input, Modal, Popconfirm, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CalendarOutlined, CameraOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, EyeOutlined, FileDoneOutlined, FilePdfOutlined, FilterOutlined, SearchOutlined, WalletOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

import dayjs from 'dayjs';
import { updateBillStatus } from '@/actions/invoices';
import { updateSubcontractorBillStatus } from '@/actions/subcontractor-bills';
import { updateExpenseStatus } from '@/actions/expenses';
import type { PurchaseBill, Expense, DailyLabourReport, DailyWorker, SubcontractorBill, VendorQuotation } from '@/types/erp';
import { clientApiFetch } from '@/lib/client-api';
import { BillDocumentsMenu, missingDocs } from './BillDocumentsMenu';
import {
  StatusTag,
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
  weekRangeLabel,
  weekStartOf,
} from './ui';

const { Title } = Typography;

// Remembers which tab was open so clicking "View Details" (which navigates
// away to a whole other page) and then coming back doesn't reset the tabs
// back to "Expenses" — session-scoped, so it only follows this browser tab.
const ACTIVE_TAB_STORAGE_KEY = 'approvals-active-tab';

const APPROVAL_STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Admin Approved', value: 'admin_approved' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

// One row of the weekly Daily Labour view: every report one site engineer
// raised for one project in one week.
type DailyWeekRow = {
  key: string;
  weekStart: string;
  name: string;
  projectName: string;
  reports: DailyLabourReport[];
};

// One trade entry, listed under its week when that week is expanded.
type DailyTradeRow = {
  key: string;
  reportId: string;
  reportDate: string;
  reportRemarks: string | null;
  worker: DailyWorker;
  // Report-level cells (date, overall remarks) show once, on the first trade
  // row of the report, and span that report's trade rows.
  first: boolean;
  span: number;
};

// Admin's choices, labelled as admin decisions. Pending and Accounts Approved
// are shown disabled so those trades still display their status.
const ADMIN_TRADE_STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending', disabled: true },
  { label: 'Admin Approved', value: 'admin_approved' },
  { label: 'Admin Rejected', value: 'rejected' },
  { label: 'Accounts Approved', value: 'approved', disabled: true },
];
// Accounts' choices are labelled as accounts decisions. Admin Approved is shown
// (disabled) so an admin-approved trade still displays its status.
const ACCOUNTS_TRADE_STATUS_OPTIONS = [
  { label: 'Accounts Pending', value: 'pending' },
  { label: 'Accounts Approved', value: 'approved' },
  { label: 'Accounts Rejected', value: 'rejected' },
  { label: 'Admin Approved', value: 'admin_approved', disabled: true },
];

function dailyWeekTrades(reports: DailyLabourReport[]): DailyTradeRow[] {
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

function tradeStatus(worker: DailyWorker) {
  return worker.status || 'pending';
}

// Count x shift x rate for one trade entry. The rate is the amount saved on
// the entry, or the trade's shift amount when the entry has none (same rule
// the server uses for labour costs).
function tradeAmount(worker: DailyWorker) {
  const rate = Number(worker.shiftAmount) || Number(worker.tradeRel?.shiftWiseAmount) || 0;
  return (Number(worker.count) || 1) * (Number(worker.shift) || 0) * rate;
}

// Rejected trade entries are not part of the amount.
function dailyWeekAmount(reports: DailyLabourReport[]) {
  return dailyWeekTrades(reports)
    .filter((t) => tradeStatus(t.worker) !== 'rejected')
    .reduce((sum, t) => sum + tradeAmount(t.worker), 0);
}

// Total shifts for the week: count x shift per trade entry. Rejected trade
// entries are left out, like the amount.
function dailyWeekShifts(reports: DailyLabourReport[]) {
  return dailyWeekTrades(reports)
    .filter((t) => tradeStatus(t.worker) !== 'rejected')
    .reduce((sum, t) => sum + (Number(t.worker.count) || 1) * (Number(t.worker.shift) || 0), 0);
}

// The week's dropdown shows the one status all its trades share, or undefined
// (shown as "Mixed") when they differ.
function dailyWeekStatusValue(reports: DailyLabourReport[]): string | undefined {
  const statuses = Array.from(new Set(dailyWeekTrades(reports).map((t) => tradeStatus(t.worker))));
  return statuses.length === 1 ? statuses[0] : undefined;
}

// The status card a week is counted under: pending if any trade is pending,
// else rejected if any is rejected, else admin approved if all are, else approved.
function dailyWeekBucket(reports: DailyLabourReport[]): 'pending' | 'rejected' | 'admin_approved' | 'approved' {
  const statuses = dailyWeekTrades(reports).map((t) => tradeStatus(t.worker));
  if (statuses.includes('pending')) return 'pending';
  if (statuses.includes('rejected')) return 'rejected';
  if (statuses.length > 0 && statuses.every((s) => s === 'admin_approved')) return 'admin_approved';
  return 'approved';
}


// Sets one trade entry's status through the same route the detail page uses.
function setTradeStatus(reportId: string, workerId: string, status: string, remarks?: string) {
  const body: { status: string; remarks?: string } = { status };
  if (remarks !== undefined) body.remarks = remarks;
  return clientApiFetch(`/daily-labour/${reportId}/workers/${workerId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// Accounts verifies each expense, but only admin can give the final Admin Approved.
const EXPENSE_VERIFY_STATUS_OPTIONS = APPROVAL_STATUS_OPTIONS.filter((o) => o.value !== 'admin_approved');

// Purchase bills on this page: only Pending, Accounts Approved and Accounts
// Rejected. Plain Approved is shown disabled so older approved bills still display.
const BILL_DECISION_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Accounts Approved', value: 'admin_approved' },
  { label: 'Accounts Rejected', value: 'rejected' },
  { label: 'Approved', value: 'approved', disabled: true },
];

type Props = {
  bills: PurchaseBill[];
  subcontractorBills: SubcontractorBill[];
  vendorQuotations: VendorQuotation[];
  expenses: Expense[];
  dailyReports: DailyLabourReport[];
};

// One row of the weekly Expenses view: everything one person raised in one
// week for one project.
type ExpenseWeekRow = {
  key: string;
  weekStart: string;
  name: string;
  role: string;
  projectName: string;
  expenses: Expense[];
};

// Expenses a week-level approval changes. Admin approves the week once, so
// it also covers expenses accounts already approved; accounts only approves
// what is still pending. Rejected expenses are never changed by this.
function weekApprovalTargets(expenses: Expense[], isAdminUser: boolean) {
  return expenses.filter((e) =>
    isAdminUser ? e.status === 'pending' || e.status === 'approved' : e.status === 'pending',
  );
}

// Rejected expenses are not part of what gets paid.
function expenseWeekAmount(expenses: Expense[]) {
  return expenses
    .filter((e) => e.status !== 'rejected')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

// Payment is tracked by expensePaymentId: an admin-approved expense without one
// is still waiting to be paid.
function expenseWeekStatus(expenses: Expense[]): { label: string; color: string } {
  if (expenses.some((e) => e.status === 'pending')) return { label: 'Pending Approval', color: 'warning' };
  if (expenses.some((e) => e.status === 'admin_approved' && !e.expensePaymentId)) return { label: 'Payment Pending', color: 'gold' };
  if (expenses.every((e) => e.status === 'rejected')) return { label: 'Rejected', color: 'error' };
  if (expenses.every((e) => e.status === 'rejected' || e.expensePaymentId)) return { label: 'Paid', color: 'success' };
  return { label: 'Approved', color: 'processing' };
}

export function ApprovalsClient({ bills, subcontractorBills, vendorQuotations, expenses, dailyReports }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [activeTab, setActiveTabState] = useState('expenses');
  const [rejectExpenseId, setRejectExpenseId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  // Only the expense being updated is locked, so one slow update cannot
  // disable every status dropdown on the page.
  const [updatingExpenseId, setUpdatingExpenseId] = useState<string | null>(null);
  // Week rows currently expanded in the Expenses tab.
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);
  // Week row whose "Approve Week" is running.
  const [updatingWeekKey, setUpdatingWeekKey] = useState<string | null>(null);
  // Daily labour weeks currently expanded, the trade entry being updated,
  // and the trade entry being rejected (its remark is collected first).
  const [expandedDailyWeeks, setExpandedDailyWeeks] = useState<string[]>([]);
  const [updatingTradeId, setUpdatingTradeId] = useState<string | null>(null);
  const [rejectTrade, setRejectTrade] = useState<{ reportId: string; workerId: string; trade: string } | null>(null);
  const [rejectTradeReason, setRejectTradeReason] = useState('');
  // Week being rejected from its status dropdown, and the remark for it.
  const [rejectWeek, setRejectWeek] = useState<DailyWeekRow | null>(null);
  const [rejectWeekReason, setRejectWeekReason] = useState('');
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  // Only admin / accounts can tick a bill's documents or approve it.
  const canApproveBill = user?.role === 'admin' || user?.role === 'accounts_manager';

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
      if (saved) setActiveTabState(saved);
    } catch { /* sessionStorage unavailable — fall back to default tab */ }
  }, []);

  const setActiveTab = (key: string) => {
    setActiveTabState(key);
    try { sessionStorage.setItem(ACTIVE_TAB_STORAGE_KEY, key); } catch { /* ignore */ }
  };

  const filteredExpenses = useMemo(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    return expenses.filter((e) => {
      if (from && to) {
        const d = typeof e.expenseDate === 'string' ? e.expenseDate.split('T')[0] : '';
        if (d < from || d > to) return false;
      }
      if (statusFilter && e.status !== statusFilter) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const haystack = [e.description, e.category, e.creator?.name, e.expenseType?.name, e.trade?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, dateRange, searchText, statusFilter]);

  // Expenses grouped by week (Monday to Sunday), person and project, newest week first.
  const expenseWeekRows = useMemo<ExpenseWeekRow[]>(() => {
    const groups = new Map<string, ExpenseWeekRow>();
    for (const e of filteredExpenses) {
      const weekStart = weekStartOf(e.expenseDate)?.format('YYYY-MM-DD') || '';
      const name = e.creator?.name || '-';
      const projectName = e.project?.name || '-';
      const key = `${weekStart}|${e.createdBy || e.creator?.id || name}|${e.projectId || projectName}`;
      const group = groups.get(key);
      if (group) {
        group.expenses.push(e);
      } else {
        groups.set(key, { key, weekStart, name, role: e.creator?.role || '', projectName, expenses: [e] });
      }
    }
    return [...groups.values()].sort(
      (a, b) => b.weekStart.localeCompare(a.weekStart) || a.name.localeCompare(b.name),
    );
  }, [filteredExpenses]);

  const filteredBills = useMemo(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    return bills.filter((b) => {
      if (from && to) {
        const d = typeof b.billDate === 'string' ? b.billDate.split('T')[0] : '';
        if (d < from || d > to) return false;
      }
      if (statusFilter && b.status !== statusFilter) return false;
      if (searchText && !b.billNumber?.toLowerCase().includes(searchText.toLowerCase()) && !b.vendor?.name?.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [bills, dateRange, searchText, statusFilter]);

  const filteredSubcontractorBills = useMemo(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    const q = searchText.toLowerCase();
    return subcontractorBills.filter((b) => {
      if (from && to) {
        const d = typeof b.billDate === 'string' ? b.billDate.split('T')[0] : '';
        if (d < from || d > to) return false;
      }
      if (statusFilter && b.status !== statusFilter) return false;
      if (q && !b.billNumber?.toLowerCase().includes(q) && !b.subcontractor?.name?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [subcontractorBills, dateRange, searchText, statusFilter]);

  const filteredDaily = useMemo(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    return dailyReports.filter((r) => {
      if (from && to) {
        const d = typeof r.reportDate === 'string' ? r.reportDate.split('T')[0] : '';
        if (d < from || d > to) return false;
      }
      if (statusFilter && r.status !== statusFilter) return false;
      if (searchText && !r.project?.name?.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [dailyReports, dateRange, searchText, statusFilter]);

  const handleExpenseStatusChange = (id: string, status: string, reason?: string) => {
    setUpdatingExpenseId(id);
    startTransition(async () => {
      try { await updateExpenseStatus(id, status, reason); message.success('Expense status updated'); }
      catch (error) { message.error(error instanceof Error ? error.message : 'Failed'); }
      finally { setUpdatingExpenseId(null); }
    });
  };

  // Approves every eligible expense in one week. Each expense is updated on
  // its own, so one failure does not stop the rest of the week.
  const approveExpenseWeek = (row: ExpenseWeekRow) => {
    const targetStatus = isAdmin ? 'admin_approved' : 'approved';
    const targets = weekApprovalTargets(row.expenses, isAdmin);
    if (targets.length === 0) return;
    setUpdatingWeekKey(row.key);
    startTransition(async () => {
      try {
        const results = await Promise.allSettled(targets.map((e) => updateExpenseStatus(e.id, targetStatus)));
        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed === 0) {
          message.success(`${targets.length} expense${targets.length > 1 ? 's' : ''} approved for ${weekRangeLabel(row.weekStart)}`);
        } else {
          message.error(`${failed} of ${targets.length} expenses could not be approved`);
        }
      } finally {
        setUpdatingWeekKey(null);
      }
    });
  };

  // Picking "Rejected" opens a small modal to capture why, so the person
  // who submitted the expense gets a specific reason instead of a bare
  // status flip.
  const handleExpenseStatusSelect = (id: string, newStatus: string) => {
    if (newStatus === 'rejected') {
      setRejectReason('');
      setRejectExpenseId(id);
      return;
    }
    // Moving off rejected clears any earlier reason so it doesn't linger.
    handleExpenseStatusChange(id, newStatus, '');
  };

  const submitExpenseRejection = () => {
    if (!rejectExpenseId) return;
    handleExpenseStatusChange(rejectExpenseId, 'rejected', rejectReason.trim());
    setRejectExpenseId(null);
  };

  // Latest vendor quotation per (vendor, MR ref) - the Purchase Enquiry a
  // bill's PO was raised from.
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

  // Moving to Accounts Approved is blocked until all three documents are
  // checked (the server enforces the same rule).
  const handleBillStatusChange = (bill: PurchaseBill, newStatus: string) => {
    if (newStatus === 'admin_approved') {
      const missing = missingDocs(bill);
      if (missing.length) {
        message.error(`Open and check all three documents first. Still to check: ${missing.join(', ')}`);
        return;
      }
    }
    startTransition(async () => {
      try {
        await updateBillStatus(bill.id, newStatus);
        message.success('Bill status updated');
        router.refresh();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed');
      }
    });
  };

  const handleSubcontractorBillStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      try { await updateSubcontractorBillStatus(id, status); message.success('Subcontractor bill status updated'); }
      catch (error) { message.error(error instanceof Error ? error.message : 'Failed'); }
    });
  };

  const expenseCounts = useMemo(() => ({
    pending: filteredExpenses.filter((e) => e.status === 'pending').length,
    admin_approved: filteredExpenses.filter((e) => e.status === 'admin_approved').length,
    approved: filteredExpenses.filter((e) => e.status === 'approved').length,
    rejected: filteredExpenses.filter((e) => e.status === 'rejected').length,
  }), [filteredExpenses]);

  const billCounts = useMemo(() => ({
    pending: filteredBills.filter((b) => b.status === 'pending').length,
    admin_approved: filteredBills.filter((b) => b.status === 'admin_approved').length,
    approved: filteredBills.filter((b) => b.status === 'approved').length,
    rejected: filteredBills.filter((b) => b.status === 'rejected').length,
  }), [filteredBills]);

  const subcontractorBillCounts = useMemo(() => ({
    pending: filteredSubcontractorBills.filter((b) => b.status === 'pending').length,
    admin_approved: filteredSubcontractorBills.filter((b) => b.status === 'admin_approved').length,
    approved: filteredSubcontractorBills.filter((b) => b.status === 'approved').length,
    rejected: filteredSubcontractorBills.filter((b) => b.status === 'rejected').length,
  }), [filteredSubcontractorBills]);

  // Daily labour reports grouped by week, site engineer (Team) and project.
  const dailyWeekRows = useMemo<DailyWeekRow[]>(() => {
    const groups = new Map<string, DailyWeekRow>();
    for (const r of filteredDaily) {
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
  }, [filteredDaily]);

  const updateTradeStatus = (reportId: string, workerId: string, status: string, remarks?: string) => {
    setUpdatingTradeId(workerId);
    startTransition(async () => {
      try {
        await setTradeStatus(reportId, workerId, status, remarks);
        message.success(`Trade entry ${status}`);
        router.refresh();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to update trade entry');
      } finally {
        setUpdatingTradeId(null);
      }
    });
  };

  // Rejecting a trade opens a small modal to capture why, so the site
  // engineer who submitted it gets a specific reason.
  const handleTradeStatusSelect = (t: DailyTradeRow, status: string) => {
    if (status === 'rejected') {
      setRejectTradeReason('');
      setRejectTrade({ reportId: t.reportId, workerId: t.worker.id, trade: t.worker.trade });
      return;
    }
    updateTradeStatus(t.reportId, t.worker.id, status, '');
  };

  const submitTradeRejection = () => {
    if (!rejectTrade) return;
    updateTradeStatus(rejectTrade.reportId, rejectTrade.workerId, 'rejected', rejectTradeReason.trim());
    setRejectTrade(null);
  };

  // Sets every eligible trade entry in one week to one status. Accounts never
  // changes an admin approval, and paid entries are never reopened or
  // rejected. Updates run one after another because each one recalculates the
  // report status on the server.
  const setDailyWeekStatus = (row: DailyWeekRow, status: string, remarks = '') => {
    const week = weekRangeLabel(row.weekStart);
    setUpdatingWeekKey(row.key);
    startTransition(async () => {
      try {
        // The server applies the per-trade rules and notifies the other role.
        const result = await clientApiFetch<{ changed: number }>('/daily-labour/week-status', {
          method: 'PATCH',
          body: JSON.stringify({
            reportIds: row.reports.map((r) => r.id),
            status,
            remarks,
            weekLabel: week,
          }),
          headers: { 'Content-Type': 'application/json' },
        });
        if (result.changed === 0) {
          message.info(`Nothing to change in ${week}`);
        } else {
          const label = status.replace('_', ' ');
          message.success(`${result.changed} trade entr${result.changed === 1 ? 'y' : 'ies'} set to ${label} for ${week}`);
        }
        router.refresh();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to update the week');
      } finally {
        setUpdatingWeekKey(null);
      }
    });
  };

  // Picking Rejected for a week asks for one remark, applied to each trade.
  const handleDailyWeekSelect = (row: DailyWeekRow, status: string) => {
    if (status === 'rejected') {
      setRejectWeekReason('');
      setRejectWeek(row);
      return;
    }
    setDailyWeekStatus(row, status);
  };

  const submitWeekRejection = () => {
    if (!rejectWeek) return;
    setDailyWeekStatus(rejectWeek, 'rejected', rejectWeekReason.trim());
    setRejectWeek(null);
  };

  // Status cards count weeks, so they match the weekly rows in the table.
  const dailyCounts = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0, admin_approved: 0 };
    for (const week of dailyWeekRows) counts[dailyWeekBucket(week.reports)] += 1;
    return counts;
  }, [dailyWeekRows]);

  const dailyWeekColumns: ColumnsType<DailyWeekRow> = [
    { title: 'S.No', key: 'sno', width: 70, render: (_, __, i) => i + 1 },
    { title: 'Week', key: 'week', width: 150, render: (_, r) => weekRangeLabel(r.weekStart) },
    { title: 'Team', key: 'team', width: 200, render: (_, r) => <Typography.Text strong>{r.name}</Typography.Text> },
    { title: 'Project', key: 'project', width: 200, render: (_, r) => r.projectName },
    { title: 'Reports', key: 'reports', width: 90, align: 'right', render: (_, r) => r.reports.length },
    { title: 'Total Shift', key: 'totalShift', width: 120, align: 'right', render: (_, r) => dailyWeekShifts(r.reports) },
    { title: 'Amount', key: 'amount', width: 140, align: 'right', render: (_, r) => formatCurrency(dailyWeekAmount(r.reports)) },
    {
      // Sets every trade in the week at once. Admin also gets Admin Approved.
      title: 'Status', key: 'status', width: 200,
      render: (_, r) => (
        <Select
          size="small"
          className="w-full"
          placeholder="Mixed"
          value={dailyWeekStatusValue(r.reports)}
          options={isAdmin ? ADMIN_TRADE_STATUS_OPTIONS : ACCOUNTS_TRADE_STATUS_OPTIONS}
          onChange={(value: string) => handleDailyWeekSelect(r, value)}
          loading={updatingWeekKey === r.key}
          disabled={updatingWeekKey !== null}
          popupMatchSelectWidth={false}
        />
      ),
    },
    {
      title: 'Action', key: 'action', width: 140,
      render: (_, r) => {
        const open = expandedDailyWeeks.includes(r.key);
        return (
          <Button
            size="small"
            type={open ? 'default' : 'primary'}
            ghost={!open}
            onClick={() => setExpandedDailyWeeks((keys) => (open ? keys.filter((k) => k !== r.key) : [...keys, r.key]))}
          >
            {open ? 'Hide trades' : `Review (${r.reports.length})`}
          </Button>
        );
      },
    },
  ];

  // Trade entries under an expanded week. Accounts changes each trade's
  // status; admin reviews them and approves the week once.
  // Report-level cells span all trade rows of their report.
  const reportSpanCell = (t: DailyTradeRow, children: ReactNode) => ({
    children,
    props: { rowSpan: t.first ? t.span : 0 },
  });

  const dailyTradeColumns: ColumnsType<DailyTradeRow> = [
    { title: 'Date', key: 'date', width: 110, render: (_, t) => reportSpanCell(t, formatDate(t.reportDate)) },
    { title: 'Trade', key: 'trade', width: 160, render: (_, t) => <Typography.Text strong>{t.worker.trade}</Typography.Text> },
    { title: 'Trade Team', key: 'tradeTeam', width: 160, render: (_, t) => t.worker.tradeRel?.team?.name || '-' },
    { title: 'Count', key: 'count', width: 80, align: 'right', render: (_, t) => Number(t.worker.count) || 1 },
    { title: 'Shift', key: 'shift', width: 80, align: 'right', render: (_, t) => t.worker.shift || '-' },
    {
      title: 'Total Shift', key: 'totalShift', width: 110, align: 'right',
      render: (_, t) => (tradeStatus(t.worker) === 'rejected' ? 0 : (Number(t.worker.count) || 1) * (Number(t.worker.shift) || 0)),
    },
    {
      title: 'Amount', key: 'amount', width: 130, align: 'right',
      render: (_, t) => formatCurrency(tradeStatus(t.worker) === 'rejected' ? 0 : tradeAmount(t.worker)),
    },
    {
      title: 'Status', key: 'status', width: 170,
      render: (_, t) => {
        const status = tradeStatus(t.worker);
        return (
          <Select
            value={status} size="small" variant="borderless" className="w-full"
            onChange={(newStatus) => handleTradeStatusSelect(t, newStatus)}
            options={isAdmin ? ADMIN_TRADE_STATUS_OPTIONS : ACCOUNTS_TRADE_STATUS_OPTIONS} popupMatchSelectWidth={false}
            loading={updatingTradeId === t.worker.id} disabled={updatingTradeId === t.worker.id}
          />
        );
      },
    },
    { title: 'Overall Remarks', key: 'overallRemarks', width: 220, ellipsis: true, render: (_, t) => reportSpanCell(t, t.reportRemarks || '-') },
    { title: 'Trade Remarks', key: 'tradeRemarks', width: 200, ellipsis: true, render: (_, t) => t.worker.reviewRemarks || '-' },
    {
      title: 'View', key: 'view', width: 70,
      render: (_, t) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/dashboard/daily-labour/${t.reportId}`)} title="View Details" />
      ),
    },
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
          dataSource={dailyWeekTrades(row.reports)}
          columns={dailyTradeColumns}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      ),
    },
  };

  const expenseColumns: ColumnsType<Expense> = [
    { title: '#', key: 'sno', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Date', dataIndex: 'expenseDate', render: formatDate },
    {
      title: 'Name', key: 'creator',
      render: (_, record) => record.creator ? (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{record.creator.name}</Typography.Text>
          <Typography.Text type="secondary" className="text-[10px] uppercase">
            {record.creator.role.replace('_', ' ')}
          </Typography.Text>
        </Space>
      ) : '-',
    },
    { title: 'Expense Type', key: 'expenseType', render: (_, record) => record.expenseType?.name || record.category || '-' },
    { title: 'Project', key: 'project', render: (_, record) => record.project?.name || '-' },
    { title: 'Trade', key: 'trade', render: (_, record) => record.trade?.name || '-' },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    { title: 'Amount', dataIndex: 'amount', align: 'right', render: formatCurrency },
    {
      title: 'Receipts', key: 'receipts', width: 90,
      render: (_, record) =>
        record.receiptUrls?.length ? (
          <Flex gap={4} wrap="wrap">
            {record.receiptUrls.map((url, i) => (
              <Button key={i} type="link" size="small" icon={<FilePdfOutlined />} href={url} target="_blank" />
            ))}
          </Flex>
        ) : '-',
    },
    {
      title: 'Site Photos', key: 'photos', width: 110,
      render: (_, record) =>
        record.sitePhotoUrls?.length ? (
          <Flex gap={4} wrap="wrap">
            {record.sitePhotoUrls.map((url, i) => (
              <Button key={i} type="link" size="small" icon={<CameraOutlined />} href={url} target="_blank" />
            ))}
          </Flex>
        ) : '-',
    },
    {
      // Rejected expenses show the rejection remarks; the rest show the
      // remarks the submitter entered.
      title: 'Overall Remarks', key: 'remarks', width: 220, ellipsis: true,
      render: (_, record) => (record.status === 'rejected' ? record.rejectionReason : record.remarks) || '-',
    },
    {
      title: 'Status', key: 'status', width: 140,
      render: (_, record) => (
        <Select
          value={record.status || 'pending'} size="small" variant="borderless" className="w-full"
          onChange={(newStatus) => handleExpenseStatusSelect(record.id, newStatus)}
          options={EXPENSE_VERIFY_STATUS_OPTIONS} popupMatchSelectWidth={false}
          loading={updatingExpenseId === record.id} disabled={updatingExpenseId === record.id}
        />
      ),
    },
  ];

  // Weekly view of the Expenses tab. Each week expands to its individual
  // expenses, which keep the status dropdown for approving / rejecting.
  const expenseWeekColumns: ColumnsType<ExpenseWeekRow> = [
    { title: 'S.No', key: 'sno', width: 70, render: (_, __, i) => i + 1 },
    { title: 'Week', key: 'week', width: 150, render: (_, r) => weekRangeLabel(r.weekStart) },
    {
      title: 'Name', key: 'name', width: 200,
      render: (_, r) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{r.name}</Typography.Text>
          {r.role && (
            <Typography.Text type="secondary" className="text-[10px] uppercase">
              {r.role.replace('_', ' ')}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    { title: 'Project', key: 'project', width: 200, render: (_, r) => r.projectName },
    { title: 'Amount', key: 'amount', width: 140, align: 'right', render: (_, r) => formatCurrency(expenseWeekAmount(r.expenses)) },
    {
      title: 'Status', key: 'status', width: 170,
      render: (_, r) => {
        const status = expenseWeekStatus(r.expenses);
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: 'Action', key: 'action', width: 280,
      render: (_, r) => {
        const open = expandedWeeks.includes(r.key);
        const targets = weekApprovalTargets(r.expenses, isAdmin);
        const weekLabelText = weekRangeLabel(r.weekStart);
        return (
          <Flex gap={6} wrap="wrap">
            <Button
              size="small"
              type={open ? 'default' : 'primary'}
              ghost={!open}
              onClick={() => setExpandedWeeks((keys) => (open ? keys.filter((k) => k !== r.key) : [...keys, r.key]))}
            >
              {open ? 'Hide expenses' : `Review (${r.expenses.length})`}
            </Button>
            <Popconfirm
              title={`Approve all expenses for ${weekLabelText}?`}
              description={
                isAdmin
                  ? `Sets ${targets.length} expense${targets.length === 1 ? '' : 's'} to Admin Approved. Rejected expenses are left out.`
                  : `Sets ${targets.length} pending expense${targets.length === 1 ? '' : 's'} to Approved. Rejected expenses are left out.`
              }
              onConfirm={() => approveExpenseWeek(r)}
              okText="Yes, approve"
              cancelText="No"
              disabled={targets.length === 0}
            >
              <Button
                size="small"
                type="primary"
                disabled={targets.length === 0 || updatingWeekKey !== null}
                loading={updatingWeekKey === r.key}
              >
                {targets.length === 0 ? 'Nothing to approve' : 'Approve Week'}
              </Button>
            </Popconfirm>
          </Flex>
        );
      },
    },
  ];

  // Admin only approves the whole week, so each expense shows its status
  // read-only for admin. Accounts verifies each one and cannot give the
  // final Admin Approved, so that option is left out for accounts.
  const expenseDetailColumns = expenseColumns
    .filter((c) => c.key !== 'sno' && c.key !== 'creator' && c.key !== 'project')
    .map((c) => (c.key === 'status' && isAdmin
      ? {
          ...c,
          render: (_: unknown, record: Expense) => {
            const option = APPROVAL_STATUS_OPTIONS.find((o) => o.value === (record.status || 'pending'));
            return <Tag color={record.status === 'rejected' ? 'error' : record.status === 'admin_approved' ? 'purple' : record.status === 'approved' ? 'success' : 'warning'}>{option?.label || 'Pending'}</Tag>;
          },
        }
      : c));

  const expenseWeekTableProps = {
    rowKey: 'key',
    expandable: {
      expandedRowKeys: expandedWeeks,
      onExpand: (expanded: boolean, row: ExpenseWeekRow) =>
        setExpandedWeeks((keys) => (expanded ? [...keys, row.key] : keys.filter((k) => k !== row.key))),
      expandedRowRender: (row: ExpenseWeekRow) => (
        <Table
          size="small"
          rowKey="id"
          dataSource={row.expenses}
          columns={expenseDetailColumns}
          pagination={false}
          scroll={{ x: 1100 }}
        />
      ),
    },
  };

  // Work-order view: what was requested against the WO, with its payments.
  const subcontractorBillColumns: ColumnsType<SubcontractorBill> = [
    { title: 'S.No', key: 'sno', width: 60, render: (_, __, i) => i + 1 },
    { title: 'Subcontractor', key: 'subcontractor', width: 170, render: (_, r) => r.subcontractor?.name || '-' },
    { title: 'Project', key: 'project', width: 170, render: (_, r) => r.project?.name || '-' },
    { title: 'WO Number', key: 'woNumber', width: 140, render: (_, r) => r.subcontractWorkOrder?.woNumber || '-' },
    {
      title: 'Requested Amount', key: 'requestedAmount', width: 150, align: 'right',
      render: (_, r) => formatCurrency(Number(r.amount) + Number(r.gstAmount || 0)),
    },
    {
      title: 'WO Amount', key: 'woAmount', width: 140, align: 'right',
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
    {
      title: 'Notes', key: 'notes', width: 200, ellipsis: true,
      render: (_, r) => r.notes || '-',
    },
    {
      title: 'History', key: 'history', width: 220,
      render: (_, r) => {
        const payments = [...(r.payments || [])].sort(
          (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime(),
        );
        const woValue = r.subcontractWorkOrder?.totalAmount;
        const requested = Number(r.amount) + Number(r.gstAmount || 0);
        const balance = requested - Number(r.paidAmount || 0);
        const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);
        return (
          <Flex vertical gap={0}>
            <Typography.Text className="text-xs">WO Value: {woValue != null ? formatCurrency(woValue) : '-'}</Typography.Text>
            {payments.length === 0 ? (
              <Typography.Text type="secondary" className="text-xs">No payments yet</Typography.Text>
            ) : (
              payments.slice(0, 2).map((p, i) => (
                <Typography.Text key={p.id} className="text-xs">{ordinal(i + 1)} Payment: {formatCurrency(p.amount)}</Typography.Text>
              ))
            )}
            <Typography.Text strong className="text-xs">Balance Payment: {formatCurrency(balance)}</Typography.Text>
          </Flex>
        );
      },
    },
    {
      title: 'Requested At', key: 'requestedAt', width: 120,
      render: (_, r) => formatDate(r.createdAt),
    },
    {
      title: 'Status', dataIndex: 'status', width: 170,
      render: (value, record) => (
        <Select
          value={value}
          size="small"
          variant="borderless"
          className="w-full"
          popupMatchSelectWidth={false}
          disabled={isPending}
          options={APPROVAL_STATUS_OPTIONS}
          onChange={(newStatus) => handleSubcontractorBillStatusChange(record.id, newStatus)}
        />
      ),
    },
  ];

  // Same column layout as the Bills page.
  const billColumns: ColumnsType<PurchaseBill> = [
    { title: 'S.No', key: 'sno', width: 60, render: (_, __, i) => i + 1 },
    { title: 'Created Date', dataIndex: 'createdAt', width: 110, render: (v?: string) => formatDate(v) },
    { title: 'MR Ref', key: 'mrRef', width: 130, render: (_, r) => r.purchaseOrder?.materialRequirementNo || '-' },
    {
      title: 'Purchase Enquiry', key: 'purchaseEnquiry', width: 150,
      render: (_, r) => {
        const vq = enquiryFor(r);
        if (!vq) return <Typography.Text type="secondary">-</Typography.Text>;
        return (
          <Flex vertical gap={0}>
            <Typography.Text className="text-xs">{formatDate(vq.createdAt)}</Typography.Text>
            {vq.quotationUrl && (
              <Button type="link" size="small" className="px-0! h-auto!" icon={<FilePdfOutlined />} href={vq.quotationUrl} target="_blank">
                Quotation
              </Button>
            )}
          </Flex>
        );
      },
    },
    { title: 'PO Number', key: 'purchaseOrder', width: 130, render: (_, r) => r.purchaseOrder?.poNumber || '-' },
    { title: 'Bill No', dataIndex: 'billNumber', width: 130, render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'Vendor', key: 'vendor', width: 160, render: (_, r) => r.vendor?.name || '-' },
    { title: 'Project', key: 'project', width: 160, render: (_, r) => r.project?.name || r.purchaseOrder?.project?.name || '-' },
    {
      title: 'Status', dataIndex: 'status', width: 170,
      render: (value, record) => canApproveBill ? (
        <Select
          value={value}
          size="small"
          variant="borderless"
          className="w-full"
          popupMatchSelectWidth={false}
          disabled={isPending}
          options={BILL_DECISION_OPTIONS}
          onChange={(newStatus) => handleBillStatusChange(record, newStatus)}
        />
      ) : (
        <StatusTag value={value} />
      ),
    },
    {
      title: 'GST', dataIndex: 'gstAmount', align: 'right', width: 110,
      render: (value) => Number(value) > 0 ? formatCurrency(value) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      // The bill amount already carries GST (copied from the PO total).
      title: 'Total Amount', dataIndex: 'amount', align: 'right', width: 130,
      render: (value) => <Typography.Text strong>{formatCurrency(value)}</Typography.Text>,
    },
    {
      title: 'Paid Amount', dataIndex: 'paidAmount', align: 'right', width: 120,
      render: (value) => Number(value) > 0 ? formatCurrency(value) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'Balance Amount', key: 'balanceAmount', align: 'right', width: 130,
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
        const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);
        return (
          <Flex vertical gap={0}>
            <Typography.Text className="text-xs">PO Value: {formatCurrency(poValue)}</Typography.Text>
            {payments.length === 0 ? (
              <Typography.Text type="secondary" className="text-xs">No payments yet</Typography.Text>
            ) : (
              payments.slice(0, 2).map((p, i) => (
                <Typography.Text key={p.id} className="text-xs">{ordinal(i + 1)} Payment: {formatCurrency(p.amount)}</Typography.Text>
              ))
            )}
            <Typography.Text strong className="text-xs">Balance Payment: {formatCurrency(balance)}</Typography.Text>
          </Flex>
        );
      },
    },
    {
      title: 'Action', key: 'actions', width: 170,
      render: (_, record) => <BillDocumentsMenu bill={record} canApprove={canApproveBill} />,
    },
    { title: 'Bill Date', dataIndex: 'billDate', width: 110, render: formatDate },
  ];

  const renderContent = <T extends object>(
    counts: Record<string, number>,
    dataSource: T[],
    columns: ColumnsType<T>,
    emptyText: string,
    scrollX = 1300,
    tableProps: { rowKey?: string; expandable?: TableProps<T>['expandable'] } = {},
  ) => (
    <>
      <Row gutter={16} className="mb-4">
        {Object.entries(counts).map(([key, val]) => {
          const cfg: Record<string, { color: string; label: string; bg: string; border: string }> = {
            pending: { color: 'warning', label: 'Pending', bg: 'bg-amber-500/5!', border: 'border-amber-500/20!' },
            verified: { color: 'purple', label: 'Verified', bg: 'bg-purple-500/5!', border: 'border-purple-500/20!' },
            admin_approved: { color: 'purple', label: 'Admin Approved', bg: 'bg-purple-500/5!', border: 'border-purple-500/20!' },
            approved: { color: 'success', label: 'Approved', bg: 'bg-emerald-500/5!', border: 'border-emerald-500/20!' },
            rejected: { color: 'error', label: 'Rejected', bg: 'bg-red-500/5!', border: 'border-red-500/20!' },
          };
          const c = cfg[key] || { color: 'default', label: key, bg: '', border: '' };
          return (
            <Col key={key} xs={12} sm={6} md={4} lg={3}>
              <Card size="small" className={`border! ${c.border} ${c.bg}`}>
                <Statistic title={<Tag color={c.color}>{c.label}</Tag>} value={val} />
              </Card>
            </Col>
          );
        })}
      </Row>
      <div className="flex flex-col gap-4">
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Input.Search
              placeholder="Search..."
              allowClear value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              allowClear placeholder="Filter by status" className="w-full"
              value={statusFilter || undefined}
              onChange={(val) => setStatusFilter(val || '')}
              options={APPROVAL_STATUS_OPTIONS}
            />
          </Col>
        </Row>
        <Table
          dataSource={dataSource} columns={columns} rowKey="id"
          pagination={{ pageSize: 10 }} scroll={{ x: scrollX }}
          locale={{ emptyText }}
          {...tableProps}
        />
      </div>
    </>
  );

  return (
    <div style={{ marginBottom: 80 }}>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Title level={3} className={pageTitleClassName}>
          <CheckCircleOutlined className={titleIconClassName} /> Approvals
        </Title>
        <DatePicker.RangePicker
          value={dateRange[0] || dateRange[1] ? dateRange : [null, null]}
          onChange={(dates) => setDateRange(dates ? [dates[0], dates[1]] : [null, null])}
          allowClear placeholder={['From date', 'To date']}
        />
      </Flex>

      <Modal
        title={rejectWeek ? `Reject all trades for ${weekRangeLabel(rejectWeek.weekStart)}` : 'Reject trades'}
        open={!!rejectWeek}
        onCancel={() => setRejectWeek(null)}
        onOk={submitWeekRejection}
        okText="Reject"
        okButtonProps={{ danger: true, disabled: !rejectWeekReason.trim() }}
        destroyOnHidden
      >
        <Typography.Text className="mb-2 block">
          Every trade in this week that is not already in a labour payment will be rejected with this remark.
        </Typography.Text>
        <Input.TextArea
          rows={3}
          value={rejectWeekReason}
          onChange={(e) => setRejectWeekReason(e.target.value)}
          placeholder="Reason for rejection"
        />
      </Modal>

      <Modal
        title={rejectTrade ? `Reject ${rejectTrade.trade} entry` : 'Reject trade entry'}
        open={!!rejectTrade}
        onCancel={() => setRejectTrade(null)}
        onOk={submitTradeRejection}
        okText="Reject"
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Typography.Text className="mb-2 block">
          The site engineer who submitted this entry will be notified — add a remark so they know why.
        </Typography.Text>
        <Input.TextArea
          rows={3}
          value={rejectTradeReason}
          onChange={(e) => setRejectTradeReason(e.target.value)}
          placeholder="Reason for rejection"
        />
      </Modal>

      <Card className={cardClassName}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => { setActiveTab(key); setSearchText(''); setStatusFilter(''); }}
          items={[
            {
              key: 'daily',
              label: <span><CalendarOutlined /> Daily Labour List</span>,
              children: renderContent(dailyCounts, dailyWeekRows, dailyWeekColumns, 'No daily labour reports', 1200, dailyWeekTableProps),
            },
            {
              key: 'bills',
              label: <span><FileDoneOutlined /> Purchase Bills (Material)</span>,
              children: renderContent(billCounts, filteredBills, billColumns, 'No purchase bills', 2210),
            },
            {
              key: 'subBills',
              label: <span><FileDoneOutlined /> Subcontractor Bills</span>,
              children: renderContent(subcontractorBillCounts, filteredSubcontractorBills, subcontractorBillColumns, 'No subcontractor bills', 1650),
            },
            {
              key: 'expenses',
              label: <span><WalletOutlined /> Expenses</span>,
              children: renderContent(expenseCounts, expenseWeekRows, expenseWeekColumns, 'No expenses found', 900, expenseWeekTableProps),
            },
          ]}
        />
      </Card>

      <Modal
        title="Reject Expense — Remarks"
        open={!!rejectExpenseId}
        onCancel={() => setRejectExpenseId(null)}
        onOk={submitExpenseRejection}
        okText="Reject with remarks"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
      >
        <Typography.Paragraph>
          The person who submitted this expense will be notified and can read these remarks.
        </Typography.Paragraph>
        <Typography.Text strong className="mb-1 block">Overall Remarks</Typography.Text>
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Why is this expense rejected?"
        />
      </Modal>
    </div>
  );
}
