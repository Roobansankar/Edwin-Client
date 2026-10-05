'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Flex,
  Row,
  Select,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  DollarOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  ProjectOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { Project, PurchaseBill, Expense, DailyLabourReport, SubcontractorBill, VendorQuotation } from '@/types/erp';
import { exportToExcel } from '@/lib/excel';
import {
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  StatusTag,
  titleCase,
  titleIconClassName,
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
type DailyLabourGroupRow = {
  key: string;
  groupSno: number;
  report: DailyLabourReport;
  category: string;
  totalShift: number;
  totalAmount: number;
  span: number;
  first: boolean;
};

// Monday-to-Sunday week that contains the report date, e.g. "Sep 7 to 13".
function reportWeekLabel(dateStr: string) {
  const d = dayjs(dateStr);
  if (!d.isValid()) return '-';
  const start = d.subtract((d.day() + 6) % 7, 'day');
  const end = start.add(6, 'day');
  return `${start.format('MMM D')} to ${end.format(start.month() === end.month() ? 'D' : 'MMM D')}`;
}

// Status filter options for the vendor / subcontractor bill tabs.
const REPORT_BILL_STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Admin Approved', value: 'admin_approved' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

// Sentinel value for the "All Projects" option in the Project Report dropdown.
const ALL_PROJECTS = '__all_projects__';

type ReportsClientProps = {
  projects: Project[];
  bills: PurchaseBill[];
  expenses: Expense[];
  dailyLabourReports: DailyLabourReport[];
  subcontractorBills: SubcontractorBill[];
  vendorQuotations: VendorQuotation[];
  role: string;
};

export function ReportsClient({
  projects = [],
  bills = [],
  expenses = [],
  dailyLabourReports = [],
  subcontractorBills = [],
  vendorQuotations = [],
  role,
}: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState('project');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(ALL_PROJECTS);
  const [expProjectId, setExpProjectId] = useState<string | undefined>(ALL_PROJECTS);
  const [expDateRange, setExpDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [dlProjectId, setDlProjectId] = useState<string | undefined>();
  const [projectDateRange, setProjectDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [dlDateRange, setDlDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [vbProjectId, setVbProjectId] = useState<string | undefined>(ALL_PROJECTS);
  const [vbDateRange, setVbDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [vbStatus, setVbStatus] = useState<string | undefined>();
  const [sbProjectId, setSbProjectId] = useState<string | undefined>(ALL_PROJECTS);
  const [sbDateRange, setSbDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [sbStatus, setSbStatus] = useState<string | undefined>();

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    return map;
  }, [projects]);

  const projectBills = useMemo(() => {
    if (!selectedProjectId) return [];
    return bills.filter((b) => (selectedProjectId === ALL_PROJECTS || b.projectId === selectedProjectId) && inRange(b.billDate, projectDateRange));
  }, [bills, selectedProjectId, projectDateRange]);

  const projectSummary = useMemo(() => {
    let totalAmount = 0;
    let totalPaid = 0;
    for (const b of projectBills) {
      totalAmount += Number(b.amount || 0);
      totalPaid += Number(b.paidAmount || 0);
    }
    return { count: projectBills.length, totalAmount, totalPaid, outstanding: totalAmount - totalPaid };
  }, [projectBills]);

  const projectExpenses = useMemo(() => {
    if (!expProjectId) return [];
    return expenses
      .filter((e) => (expProjectId === ALL_PROJECTS || e.projectId === expProjectId) && inRange(e.expenseDate, expDateRange))
      .sort((a, b) => (b.expenseDate || '').localeCompare(a.expenseDate || ''));
  }, [expenses, expProjectId, expDateRange]);

  const projectExpenseSummary = useMemo(() => {
    let total = 0;
    for (const e of projectExpenses) total += Number(e.amount || 0);
    return { count: projectExpenses.length, total };
  }, [projectExpenses]);

  const filteredDailyLabour = useMemo(() => {
    // Only reports that Accounts & Admin have fully approved (report status 'approved').
    return dailyLabourReports
      .filter((r) => r.status === 'approved')
      .filter((r) => (!dlProjectId || r.projectId === dlProjectId) && inRange(r.reportDate, dlDateRange))
      .sort((a, b) => (b.reportDate || '').localeCompare(a.reportDate || ''));
  }, [dailyLabourReports, dlProjectId, dlDateRange]);

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
      .filter((b) => !vbStatus || b.status === vbStatus)
      .sort((a, b) => (b.billDate || '').localeCompare(a.billDate || '')),
    [bills, vbProjectId, vbDateRange, vbStatus],
  );

  // Subcontractor bills for the Subcontractor Bills tab (dated by when they were raised).
  const subcontractorBillRows = useMemo(
    () => subcontractorBills
      .filter((b) => !sbProjectId || sbProjectId === ALL_PROJECTS || b.projectId === sbProjectId)
      .filter((b) => inRange(b.createdAt, sbDateRange))
      .filter((b) => !sbStatus || b.status === sbStatus)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [subcontractorBills, sbProjectId, sbDateRange, sbStatus],
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
      total += Number(b.amount || 0) + Number(b.gstAmount || 0);
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

  const dailyLabourRows = useMemo<DailyLabourGroupRow[]>(() => {
    return filteredDailyLabour.flatMap((report, index) => {
      const byCategory = new Map<string, { totalShift: number; totalAmount: number }>();
      for (const w of report.workers || []) {
        const category = w.trade || '-';
        const count = Number(w.count) || 1;
        const shift = Number(w.shift) || 0;
        const totals = byCategory.get(category) || { totalShift: 0, totalAmount: 0 };
        totals.totalShift += count * shift;
        totals.totalAmount += count * shift * (Number(w.shiftAmount) || 0);
        byCategory.set(category, totals);
      }
      const categories = [...byCategory.entries()];
      if (categories.length === 0) categories.push(['-', { totalShift: 0, totalAmount: 0 }]);
      return categories.map(([category, totals], i) => ({
        key: `${report.id}-${category}`,
        groupSno: index + 1,
        report,
        category,
        totalShift: totals.totalShift,
        totalAmount: totals.totalAmount,
        span: categories.length,
        first: i === 0,
      }));
    });
  }, [filteredDailyLabour]);

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
        titleCase(b.status),
        b.notes || '-',
      ]),
    });
  };

  const exportProjectExpenses = () => {
    exportToExcel({
      filename: `Project-Expenses-${expProjectId && expProjectId !== ALL_PROJECTS ? (projectNameById.get(expProjectId) || 'report') : 'all'}`,
      sheetName: 'Expenses',
      headers: [
        'Expense Date',
        'Category',
        'Expense Type',
        'Description',
        'Trade',
        'Amount',
        'Status',
        'Remarks',
      ],
      rows: projectExpenses.map((e) => [
        e.expenseDate ? formatDate(e.expenseDate) : '-',
        e.category ? titleCase(e.category) : '-',
        e.expenseType?.name || '-',
        e.description || '-',
        e.trade?.name || '-',
        Number(e.amount || 0),
        e.status ? titleCase(e.status) : '-',
        e.remarks || '-',
      ]),
    });
  };

  const exportDailyLabour = () => {
    exportToExcel({
      filename: 'Daily-Labour-List',
      sheetName: 'Daily Labour',
      headers: ['S.No', 'Date', 'Week', 'All Project', 'Trade', 'Team', 'Category', 'Total Shift', 'Total Amount', 'Status'],
      // Report-level cells are written on the first row of each report only, like the sheet layout.
      rows: dailyLabourRows.map((row) => {
        const r = row.report;
        const first = row.first;
        return [
          first ? row.groupSno : '',
          first ? formatDate(r.reportDate) : '',
          first ? reportWeekLabel(r.reportDate) : '',
          first ? r.project?.name || '-' : '',
          first ? r.project?.projectCategory?.name || '-' : '',
          first ? r.createdBy?.name || '-' : '',
          row.category,
          row.totalShift,
          row.totalAmount,
          first ? 'Account & Admin Approved' : '',
        ];
      }),
    });
  };

  const exportVendorBills = () => {
    exportToExcel({
      filename: 'Vendor-Bills-Report',
      sheetName: 'Vendor Bills',
      headers: ['Created Date', 'MR Ref', 'PO Number', 'Bill No', 'Vendor', 'Project', 'Status', 'GST', 'Total Amount', 'Paid Amount', 'Balance Amount', 'Bill Date'],
      rows: vendorBillRows.map((b) => [
        b.createdAt ? formatDate(b.createdAt) : '-',
        b.purchaseOrder?.materialRequirementNo || '-',
        b.purchaseOrder?.poNumber || '-',
        b.billNumber,
        b.vendor?.name || '-',
        b.project?.name || b.purchaseOrder?.project?.name || '-',
        titleCase(b.status),
        Number(b.gstAmount || 0),
        Number(b.amount || 0),
        Number(b.paidAmount || 0),
        Number(b.amount || 0) - Number(b.paidAmount || 0),
        b.billDate ? formatDate(b.billDate) : '-',
      ]),
    });
  };

  const exportSubcontractorBills = () => {
    exportToExcel({
      filename: 'Subcontractor-Bills-Report',
      sheetName: 'Subcontractor Bills',
      headers: ['Subcontractor', 'Project', 'WO Number', 'Requested Amount', 'WO Amount', 'Notes', 'Requested At', 'Status'],
      rows: subcontractorBillRows.map((b) => [
        b.subcontractor?.name || '-',
        b.project?.name || '-',
        b.subcontractWorkOrder?.woNumber || '-',
        Number(b.amount || 0) + Number(b.gstAmount || 0),
        b.subcontractWorkOrder ? Number(b.subcontractWorkOrder.totalAmount || 0) : '-',
        b.notes || '-',
        b.createdAt ? formatDate(b.createdAt) : '-',
        titleCase(b.status),
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
    { title: 'Status', dataIndex: 'status', width: 140, render: (v: string) => <Tag color="blue">{titleCase(v)}</Tag> },
  ];

  const expenseColumns: ColumnsType<Expense> = [
    { title: 'Expense Date', dataIndex: 'expenseDate', width: 120, render: (v: string) => (v ? formatDate(v) : '-') },
    { title: 'Category', dataIndex: 'category', width: 120, render: (v: string) => (v ? titleCase(v) : '-') },
    { title: 'Expense Type', dataIndex: ['expenseType', 'name'], width: 140, render: (v: string) => v || '-' },
    { title: 'Description', dataIndex: 'description', render: (v: string) => v || '-' },
    { title: 'Trade', dataIndex: ['trade', 'name'], width: 120, render: (v: string) => v || '-' },
    { title: 'Amount', dataIndex: 'amount', width: 120, align: 'right' as const, render: (v: number) => formatCurrency(v) },
    { title: 'Status', dataIndex: 'status', width: 130, render: (v: string) => <Tag color="blue">{titleCase(v)}</Tag> },
    { title: 'Remarks', dataIndex: 'remarks', width: 160, render: (v: string) => v || '-' },
  ];


  // Report-level cells span all of that report's category rows.
  const spanCell = (row: DailyLabourGroupRow, children: ReactNode) => ({
    children,
    props: { rowSpan: row.first ? row.span : 0 },
  });

  const dailyLabourColumns: ColumnsType<DailyLabourGroupRow> = [
    { title: 'S.No', key: 'sno', align: 'right' as const, width: 70, render: (_, row) => spanCell(row, row.groupSno) },
    { title: 'Date', key: 'date', width: 120, render: (_, row) => spanCell(row, <Typography.Text strong>{formatDate(row.report.reportDate)}</Typography.Text>) },
    { title: 'Week', key: 'week', width: 150, render: (_, row) => spanCell(row, reportWeekLabel(row.report.reportDate)) },
    { title: 'All Project', key: 'project', width: 200, render: (_, row) => spanCell(row, row.report.project?.name || '-') },
    { title: 'Trade', key: 'trade', width: 140, render: (_, row) => spanCell(row, row.report.project?.projectCategory?.name || '-') },
    { title: 'Team', key: 'team', width: 160, render: (_, row) => spanCell(row, row.report.createdBy?.name || '-') },
    { title: 'Category', key: 'category', width: 130, render: (_, row) => <Tag color="black">{row.category}</Tag> },
    { title: 'Total Shift', key: 'totalShift', align: 'right' as const, width: 120, render: (_, row) => row.totalShift },
    { title: 'Total Amount', key: 'totalAmount', align: 'right' as const, width: 140, render: (_, row) => formatCurrency(row.totalAmount) },
    { title: 'Status', key: 'status', width: 190, render: (_, row) => spanCell(row, <Tag color="success">Account &amp; Admin Approved</Tag>) },
  ];

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
    { title: 'Vendor', key: 'vendor', width: 160, render: (_, r) => r.vendor?.name || '-' },
    { title: 'Project', key: 'project', width: 160, render: (_, r) => r.project?.name || r.purchaseOrder?.project?.name || '-' },
    { title: 'Status', dataIndex: 'status', width: 150, render: (v: string) => <StatusTag value={v} /> },
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
    { title: 'Bill Date', dataIndex: 'billDate', width: 110, render: (v?: string) => formatDate(v) },
  ];

  const subcontractorBillColumns: ColumnsType<SubcontractorBill> = [
    { title: 'S.No', key: 'sno', width: 60, render: (_, __, i) => i + 1 },
    { title: 'Subcontractor', key: 'subcontractor', width: 170, render: (_, r) => r.subcontractor?.name || '-' },
    { title: 'Project', key: 'project', width: 170, render: (_, r) => r.project?.name || '-' },
    { title: 'WO Number', key: 'woNumber', width: 140, render: (_, r) => r.subcontractWorkOrder?.woNumber || '-' },
    {
      title: 'Requested Amount', key: 'requested', width: 150, align: 'right' as const,
      render: (_, r) => formatCurrency(Number(r.amount) + Number(r.gstAmount || 0)),
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
    { title: 'Notes', key: 'notes', width: 200, ellipsis: true, render: (_, r) => r.notes || '-' },
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
    { title: 'Requested At', key: 'requestedAt', width: 120, render: (_, r) => formatDate(r.createdAt) },
    { title: 'Status', dataIndex: 'status', width: 150, render: (v: string) => <StatusTag value={v} /> },
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
                dataSource={projectExpenses}
                columns={expenseColumns}
                rowKey="id"
                size="middle"
                scroll={{ x: 1100 }}
                pagination={{ pageSize: 10, showTotal: (total) => `${total} expenses` }}
                locale={{ emptyText: 'No expenses for this project yet' }}
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

        <Row gutter={[16, 16]} className="mb-4">
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
        </Row>

        <Card
          className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!"
          styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}
        >
          <Table
            className="mantis-table"
            dataSource={dailyLabourRows}
            columns={dailyLabourColumns}
            rowKey="key"
            size="middle"
            scroll={{ x: 1420 }}
            pagination={{ pageSize: 20, showTotal: (total) => `${total} rows` }}
            locale={{ emptyText: 'No daily labour reports for the selected filters' }}
          />
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
            <Select
              allowClear
              placeholder="Filter by status"
              style={{ minWidth: 180 }}
              value={vbStatus}
              onChange={(v) => setVbStatus(v || undefined)}
              options={REPORT_BILL_STATUS_OPTIONS}
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
            <Select
              allowClear
              placeholder="Filter by status"
              style={{ minWidth: 180 }}
              value={sbStatus}
              onChange={(v) => setSbStatus(v || undefined)}
              options={REPORT_BILL_STATUS_OPTIONS}
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


  const canSeeReportData = ['admin', 'accounts_manager', 'purchase_team'].includes(role);
  const tabItems = canSeeReportData
    ? [projectTabItems, expensesTabItems, dailyLabourTabItems, vendorBillsTabItems, subcontractorBillsTabItems]
    : [];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <FileTextOutlined className={titleIconClassName} /> Reports
        </Typography.Title>
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
    </div>
  );
}
