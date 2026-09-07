'use client';

import { useMemo, useState } from 'react';
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
import type { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  DollarOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  ProjectOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { Project, PurchaseBill, Expense, DailyLabourReport, Payment, AdvanceRequest } from '@/types/erp';
import { exportToExcel } from '@/lib/excel';
import {
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
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

type VendorPaymentRow = {
  key: string;
  date: string;
  projectId?: string | null;
  projectName: string;
  vendorName: string;
  amount: number;
  mode?: string | null;
  reference?: string | null;
  notes?: string | null;
  status: string;
};

const VENDOR_PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  accepted: 'blue',
  admin_approved: 'cyan',
  rejected: 'red',
  paid: 'success',
};

type ReportsClientProps = {
  projects: Project[];
  bills: PurchaseBill[];
  expenses: Expense[];
  dailyLabourReports: DailyLabourReport[];
  payments: Payment[];
  advanceRequests: AdvanceRequest[];
  role: string;
};

export function ReportsClient({ projects, bills, expenses, dailyLabourReports, payments, advanceRequests, role }: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState('project');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [dlProjectId, setDlProjectId] = useState<string | undefined>();
  const [vpProjectId, setVpProjectId] = useState<string | undefined>();
  const [spProjectId, setSpProjectId] = useState<string | undefined>();
  const [projectDateRange, setProjectDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [dlDateRange, setDlDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [vpDateRange, setVpDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [spDateRange, setSpDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    return map;
  }, [projects]);

  const projectBills = useMemo(() => {
    if (!selectedProjectId) return [];
    return bills.filter((b) => b.projectId === selectedProjectId && inRange(b.billDate, projectDateRange));
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
    if (!selectedProjectId) return [];
    return expenses
      .filter((e) => e.projectId === selectedProjectId && inRange(e.expenseDate, projectDateRange))
      .sort((a, b) => (b.expenseDate || '').localeCompare(a.expenseDate || ''));
  }, [expenses, selectedProjectId, projectDateRange]);

  const projectExpenseSummary = useMemo(() => {
    let total = 0;
    for (const e of projectExpenses) total += Number(e.amount || 0);
    return { count: projectExpenses.length, total };
  }, [projectExpenses]);

  const filteredDailyLabour = useMemo(() => {
    return dailyLabourReports
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
  const paidAdvanceRequestIds = useMemo(
    () => new Set(payments.filter((p) => p.advanceRequestId).map((p) => p.advanceRequestId as string)),
    [payments],
  );

  const vendorPayments = useMemo(() => {
    const fromPayments: VendorPaymentRow[] = payments
      .filter((p) => Boolean(p.vendorId || p.purchaseBillId || p.purchaseOrderId || p.advanceRequestId))
      .map((p) => ({
        key: `payment-${p.id}`,
        date: p.paymentDate,
        projectId: p.projectId,
        projectName: p.project?.name || '-',
        vendorName: p.vendor?.name || p.payeeName || '-',
        amount: Number(p.amount || 0),
        mode: p.paymentMode,
        reference: p.referenceNumber,
        notes: p.notes,
        status: 'paid',
      }));

    // A request already turned into a Payment shows as that payment's row
    // above (status "paid") — don't also list the original request, or the
    // same money would appear twice.
    const fromRequests: VendorPaymentRow[] = advanceRequests
      .filter((r) => !paidAdvanceRequestIds.has(r.id))
      .map((r) => ({
        key: `request-${r.id}`,
        date: r.createdAt || '',
        projectId: r.projectId,
        projectName: r.project?.name || '-',
        vendorName: r.vendor?.name || '-',
        amount: Number(r.amount || 0),
        notes: r.notes,
        status: r.status,
      }));

    return [...fromPayments, ...fromRequests]
      .filter((row) => (!vpProjectId || row.projectId === vpProjectId) && inRange(row.date, vpDateRange))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [payments, advanceRequests, paidAdvanceRequestIds, vpProjectId, vpDateRange]);

  const subcontractorPayments = useMemo(() => {
    return payments
      .filter((p) => Boolean(p.subcontractWorkOrderId || p.subcontractorPaymentRequestId))
      .filter((p) => (!spProjectId || p.projectId === spProjectId) && inRange(p.paymentDate, spDateRange))
      .sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));
  }, [payments, spProjectId, spDateRange]);

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

  const vendorPaymentsSummary = useMemo(
    () => ({ count: vendorPayments.length, total: vendorPayments.reduce((s, p) => s + Number(p.amount || 0), 0) }),
    [vendorPayments],
  );

  const subcontractorPaymentsSummary = useMemo(
    () => ({ count: subcontractorPayments.length, total: subcontractorPayments.reduce((s, p) => s + Number(p.amount || 0), 0) }),
    [subcontractorPayments],
  );

  const exportProjectBills = () => {
    exportToExcel({
      filename: `Project-Bills-${selectedProjectId ? (projectNameById.get(selectedProjectId) || 'report') : 'all'}`,
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
      filename: `Project-Expenses-${selectedProjectId ? (projectNameById.get(selectedProjectId) || 'report') : 'all'}`,
      sheetName: 'Expenses',
      headers: [
        'Expense Date',
        'Category',
        'Expense Type',
        'Description',
        'Trade',
        'Amount',
        'Paid By',
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
        e.paidBy || '-',
        e.status ? titleCase(e.status) : '-',
        e.remarks || '-',
      ]),
    });
  };

  const exportDailyLabour = () => {
    exportToExcel({
      filename: 'Daily-Labour-List',
      sheetName: 'Daily Labour',
      headers: ['Date', 'Project', 'Site Engineer', 'Headcount', 'Total Shift', 'Status'],
      rows: filteredDailyLabour.map((r) => {
        const headcount = (r.workers || []).reduce((s, w) => s + (Number(w.count) || 1), 0);
        const totalShift = (r.workers || []).reduce((s, w) => s + (Number(w.count) || 1) * (Number(w.shift) || 0), 0);
        return [
          formatDate(r.reportDate),
          r.project?.name || '-',
          r.createdBy?.name || '-',
          headcount,
          totalShift,
          titleCase(r.status),
        ];
      }),
    });
  };

  const exportVendorPayments = () => {
    exportToExcel({
      filename: 'Vendor-Payments',
      sheetName: 'Vendor Payments',
      headers: ['Date', 'Project', 'Vendor', 'Amount', 'Mode', 'Reference', 'Status', 'Notes'],
      rows: vendorPayments.map((row) => [
        row.date ? formatDate(row.date) : '-',
        row.projectName,
        row.vendorName,
        row.amount,
        row.mode ? titleCase(row.mode) : '-',
        row.reference || '-',
        titleCase(row.status),
        row.notes || '-',
      ]),
    });
  };

  const exportSubcontractorPayments = () => {
    exportToExcel({
      filename: 'Subcontractor-Payments',
      sheetName: 'Subcontractor Payments',
      headers: ['Date', 'Project', 'Subcontractor', 'Amount', 'Mode', 'Reference', 'Notes'],
      rows: subcontractorPayments.map((p) => [
        formatDate(p.paymentDate),
        p.project?.name || '-',
        p.subcontractWorkOrder?.subcontractor?.name || p.payeeName || '-',
        Number(p.amount || 0),
        titleCase(p.paymentMode),
        p.referenceNumber || '-',
        p.notes || '-',
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
    { title: 'Paid By', dataIndex: 'paidBy', width: 120, render: (v: string) => v || '-' },
    { title: 'Status', dataIndex: 'status', width: 130, render: (v: string) => <Tag color="blue">{titleCase(v)}</Tag> },
    { title: 'Remarks', dataIndex: 'remarks', width: 160, render: (v: string) => v || '-' },
  ];


  const dailyLabourColumns: ColumnsType<DailyLabourReport> = [
    { title: 'Date', dataIndex: 'reportDate', width: 120, render: (v: string) => <Typography.Text strong>{formatDate(v)}</Typography.Text> },
    { title: 'Project', dataIndex: ['project', 'name'], width: 200, render: (v: string) => v || '-' },
    { title: 'Site Engineer', key: 'creator', width: 180, render: (_, r) => r.createdBy?.name || '-' },
    {
      title: 'Headcount',
      key: 'headcount',
      align: 'right' as const,
      width: 110,
      render: (_, r) => (r.workers || []).reduce((s, w) => s + (Number(w.count) || 1), 0),
    },
    {
      title: 'Total Shift',
      key: 'totalShift',
      align: 'right' as const,
      width: 110,
      render: (_, r) => (r.workers || []).reduce((s, w) => s + (Number(w.count) || 1) * (Number(w.shift) || 0), 0),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (v: string) => (
        <Tag color={v === 'approved' ? 'success' : v === 'rejected' ? 'error' : 'warning'}>{titleCase(v)}</Tag>
      ),
    },
  ];

  const vendorPaymentColumns: ColumnsType<VendorPaymentRow> = [
    { title: 'Date', dataIndex: 'date', width: 120, render: (v: string) => <Typography.Text strong>{v ? formatDate(v) : '-'}</Typography.Text> },
    {
      title: 'Project',
      dataIndex: 'projectName',
      width: 220,
      render: (v: string) => <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{v}</span>,
    },
    {
      title: 'Vendor',
      dataIndex: 'vendorName',
      width: 200,
      render: (v: string) => <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{v}</span>,
    },
    { title: 'Amount', dataIndex: 'amount', align: 'right' as const, width: 130, render: (v: number) => formatCurrency(v) },
    { title: 'Mode', dataIndex: 'mode', width: 100, render: (v?: string | null) => (v ? titleCase(v) : '-') },
    { title: 'Reference', dataIndex: 'reference', width: 140, render: (v?: string | null) => v || '-' },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 150,
      render: (v: string) => <Tag color={VENDOR_PAYMENT_STATUS_COLORS[v] || 'default'}>{v === 'admin_approved' ? 'ADMIN APPROVED' : v.toUpperCase()}</Tag>,
    },
    { title: 'Notes', dataIndex: 'notes', ellipsis: true, render: (v?: string | null) => v || '-' },
  ];

  const subcontractorPaymentColumns: ColumnsType<Payment> = [
    { title: 'Date', dataIndex: 'paymentDate', width: 120, render: (v: string) => <Typography.Text strong>{formatDate(v)}</Typography.Text> },
    {
      title: 'Project',
      dataIndex: ['project', 'name'],
      width: 220,
      render: (v: string) => <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{v || '-'}</span>,
    },
    {
      title: 'Subcontractor',
      key: 'subcontractor',
      width: 200,
      render: (_, p) => (
        <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {p.subcontractWorkOrder?.subcontractor?.name || p.payeeName || '-'}
        </span>
      ),
    },
    { title: 'Amount', dataIndex: 'amount', align: 'right' as const, width: 130, render: (v: number) => formatCurrency(v) },
    { title: 'Mode', dataIndex: 'paymentMode', width: 100, render: (v: string) => titleCase(v) },
    { title: 'Reference', dataIndex: 'referenceNumber', width: 140, render: (v?: string | null) => v || '-' },
    { title: 'Notes', dataIndex: 'notes', ellipsis: true, render: (v?: string | null) => v || '-' },
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
              placeholder="Select a project to see its purchase bills"
              style={{ minWidth: 320 }}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
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

            <Flex justify="space-between" align="center" gap={16} wrap="wrap" className="mt-8! mb-4!">
              <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">
                Expenses
              </Typography.Title>
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
          </>
        )}
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
            dataSource={filteredDailyLabour}
            columns={dailyLabourColumns}
            rowKey="id"
            size="middle"
            scroll={{ x: 900 }}
            pagination={{ pageSize: 15, showTotal: (total) => `${total} reports` }}
            locale={{ emptyText: 'No daily labour reports for the selected filters' }}
          />
        </Card>
      </div>
    ),
  };

  const vendorPaymentsTabItems = {
    key: 'vendor-payments',
    label: (
      <span>
        <DollarOutlined className="mr-1" /> Vendor Payments
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
              value={vpProjectId}
              onChange={setVpProjectId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <DatePicker.RangePicker
              value={vpDateRange[0] || vpDateRange[1] ? vpDateRange : [null, null]}
              onChange={(dates) => setVpDateRange(dates ? [dates[0], dates[1]] : [null, null])}
              allowClear
              placeholder={['From', 'To']}
            />
          </Flex>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            disabled={vendorPayments.length === 0}
            onClick={exportVendorPayments}
          >
            Export to Excel
          </Button>
        </Flex>

        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={12} sm={6}>
            <Card className="rounded-xl! border! border-[var(--border)]!" styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}>
              <Flex vertical gap={10}>
                <Typography.Text className="text-sm text-[var(--text-muted)]!">Payments</Typography.Text>
                <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">{vendorPaymentsSummary.count}</Typography.Title>
              </Flex>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="rounded-xl! border! border-[var(--border)]!" styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}>
              <Flex vertical gap={10}>
                <Typography.Text className="text-sm text-[var(--text-muted)]!">Total Amount</Typography.Text>
                <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">{formatCurrency(vendorPaymentsSummary.total)}</Typography.Title>
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
            dataSource={vendorPayments}
            columns={vendorPaymentColumns}
            rowKey="key"
            size="middle"
            scroll={{ x: 1190 }}
            pagination={{ pageSize: 15, showTotal: (total) => `${total} payments` }}
            locale={{ emptyText: 'No vendor payments for the selected filters' }}
          />
        </Card>
      </div>
    ),
  };

  const subcontractorPaymentsTabItems = {
    key: 'subcontractor-payments',
    label: (
      <span>
        <DollarOutlined className="mr-1" /> Subcontractor Payments
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
              value={spProjectId}
              onChange={setSpProjectId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <DatePicker.RangePicker
              value={spDateRange[0] || spDateRange[1] ? spDateRange : [null, null]}
              onChange={(dates) => setSpDateRange(dates ? [dates[0], dates[1]] : [null, null])}
              allowClear
              placeholder={['From', 'To']}
            />
          </Flex>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            disabled={subcontractorPayments.length === 0}
            onClick={exportSubcontractorPayments}
          >
            Export to Excel
          </Button>
        </Flex>

        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={12} sm={6}>
            <Card className="rounded-xl! border! border-[var(--border)]!" styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}>
              <Flex vertical gap={10}>
                <Typography.Text className="text-sm text-[var(--text-muted)]!">Payments</Typography.Text>
                <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">{subcontractorPaymentsSummary.count}</Typography.Title>
              </Flex>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="rounded-xl! border! border-[var(--border)]!" styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}>
              <Flex vertical gap={10}>
                <Typography.Text className="text-sm text-[var(--text-muted)]!">Total Amount</Typography.Text>
                <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">{formatCurrency(subcontractorPaymentsSummary.total)}</Typography.Title>
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
            dataSource={subcontractorPayments}
            columns={subcontractorPaymentColumns}
            rowKey="id"
            size="middle"
            scroll={{ x: 1040 }}
            pagination={{ pageSize: 15, showTotal: (total) => `${total} payments` }}
            locale={{ emptyText: 'No subcontractor payments for the selected filters' }}
          />
        </Card>
      </div>
    ),
  };

  const canSeeReportData = ['admin', 'accounts_manager', 'purchase_team'].includes(role);
  const tabItems = canSeeReportData
    ? [projectTabItems, dailyLabourTabItems, vendorPaymentsTabItems, subcontractorPaymentsTabItems]
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
