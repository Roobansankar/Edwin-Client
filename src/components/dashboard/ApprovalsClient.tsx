'use client';

import { useMemo, useState, useTransition } from 'react';
import { App, Button, Card, Col, DatePicker, Flex, Input, Row, Select, Space, Statistic, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CalendarOutlined, CameraOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, EyeOutlined, FileDoneOutlined, FilePdfOutlined, FileExcelOutlined, FileTextOutlined, FileUnknownOutlined, DownloadOutlined, FilterOutlined, SearchOutlined, TeamOutlined, WalletOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { SubcontractWorkOrderPdf } from './SubcontractWorkOrderPdf';
import { getApiBaseUrl, getApiOrigin } from '@/lib/api-url';
import dayjs from 'dayjs';
import { updateBillStatus } from '@/actions/invoices';
import { updateExpenseStatus } from '@/actions/expenses';
import { updateSubcontractWorkOrderStatus } from '@/actions/subcontract-work-orders';
import { updateDailyLabourReportStatus } from '@/actions/daily-labour';
import { verifyTimesheet, approveTimesheet, rejectTimesheet } from '@/actions/timesheet-approval';
import type { PurchaseBill, Expense, SubcontractWorkOrder, DailyLabourReport, WeeklyTimesheet, TimesheetStatus } from '@/types/erp';
import {
  StatusTag,
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

const { Title } = Typography;

const APPROVAL_STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Admin Approved', value: 'admin_approved' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const TIMESHEET_STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Verified', value: 'verified' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

type Props = {
  bills: PurchaseBill[];
  expenses: Expense[];
  subcontractWorkOrders: SubcontractWorkOrder[];
  dailyReports: DailyLabourReport[];
  timesheets: WeeklyTimesheet[];
};

export function ApprovalsClient({ bills, expenses, subcontractWorkOrders, dailyReports, timesheets }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState('expenses');
  const { message } = App.useApp();

  const filteredExpenses = useMemo(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    return expenses.filter((e) => {
      if (from && to) {
        const d = typeof e.expenseDate === 'string' ? e.expenseDate.split('T')[0] : '';
        if (d < from || d > to) return false;
      }
      if (statusFilter && e.status !== statusFilter) return false;
      if (searchText && !e.description?.toLowerCase().includes(searchText.toLowerCase()) && !e.category?.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [expenses, dateRange, searchText, statusFilter]);

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

  const filteredSwo = useMemo(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    return subcontractWorkOrders.filter((swo) => {
      if (from && to) {
        const d = typeof swo.createdAt === 'string' ? swo.createdAt.split('T')[0] : '';
        if (d < from || d > to) return false;
      }
      if (statusFilter && swo.status !== statusFilter) return false;
      if (searchText && !swo.woNumber?.toLowerCase().includes(searchText.toLowerCase()) && !swo.subcontractor?.name?.toLowerCase().includes(searchText.toLowerCase()) && !swo.description?.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [subcontractWorkOrders, dateRange, searchText, statusFilter]);

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

  const filteredTimesheets = useMemo(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    return timesheets.filter((ts) => {
      if (from && to) {
        const d = typeof ts.weekStart === 'string' ? ts.weekStart.split('T')[0] : '';
        if (d < from || d > to) return false;
      }
      if (statusFilter && ts.status !== statusFilter) return false;
      return true;
    });
  }, [timesheets, dateRange, searchText, statusFilter]);

  const handleExpenseStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      try { await updateExpenseStatus(id, status); message.success('Expense status updated'); }
      catch (error) { message.error(error instanceof Error ? error.message : 'Failed'); }
    });
  };

  const handleBillStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      try { await updateBillStatus(id, status); message.success('Bill status updated'); }
      catch (error) { message.error(error instanceof Error ? error.message : 'Failed'); }
    });
  };

  const handleSwoStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      try { await updateSubcontractWorkOrderStatus(id, status); message.success('SWO status updated'); }
      catch (error) { message.error(error instanceof Error ? error.message : 'Failed'); }
    });
  };

  const handleDailyStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      try { await updateDailyLabourReportStatus(id, status); message.success('Daily report status updated'); }
      catch (error) { message.error(error instanceof Error ? error.message : 'Failed'); }
    });
  };

  const handleTimesheetAction = (id: string, action: 'verify' | 'approve' | 'reject') => {
    startTransition(async () => {
      try {
        if (action === 'verify') { await verifyTimesheet(id); message.success('Timesheet verified'); }
        else if (action === 'approve') { await approveTimesheet(id); message.success('Timesheet approved & payment created'); }
        else { await rejectTimesheet(id); message.success('Timesheet rejected'); }
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed');
      }
    });
  };

  const tsCounts = useMemo(() => ({
    pending: filteredTimesheets.filter((ts) => ts.status === 'pending').length,
    verified: filteredTimesheets.filter((ts) => ts.status === 'verified').length,
    approved: filteredTimesheets.filter((ts) => ts.status === 'approved').length,
    rejected: filteredTimesheets.filter((ts) => ts.status === 'rejected').length,
  }), [filteredTimesheets]);

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

  const swoCounts = useMemo(() => ({
    pending: filteredSwo.filter((s) => s.status === 'pending').length,
    admin_approved: filteredSwo.filter((s) => s.status === 'admin_approved').length,
    approved: filteredSwo.filter((s) => s.status === 'approved').length,
    rejected: filteredSwo.filter((s) => s.status === 'rejected').length,
  }), [filteredSwo]);

  const dailyCounts = useMemo(() => ({
    pending: filteredDaily.filter((r) => r.status === 'pending').length,
    admin_approved: filteredDaily.filter((r) => r.status === 'admin_approved').length,
    approved: filteredDaily.filter((r) => r.status === 'approved').length,
    rejected: filteredDaily.filter((r) => r.status === 'rejected').length,
  }), [filteredDaily]);

  const calcCost = (ts: WeeklyTimesheet) =>
    ts.rows?.reduce((s, r) => s + Number(r.amount || 0), 0) || 0;

  const tsColumns: ColumnsType<WeeklyTimesheet> = [
    { title: '#', key: 'sno', width: 50, render: (_, __, i) => i + 1 },
    {
      title: 'Engineer',
      key: 'engineer',
      render: (_, record) => (record as any).siteEngineer?.name || (record as any).siteEngineer?.email || record.siteEngineerId || '-',
    },
    {
      title: 'Week',
      key: 'week',
      render: (_, record) => `${formatDate(record.weekStart)} - ${formatDate(record.weekEnd)}`,
    },
    {
      title: 'Total Hours',
      dataIndex: 'totalHours',
      align: 'right',
      render: (v) => Number(v || 0).toFixed(1),
    },
    {
      title: 'Total Cost',
      key: 'cost',
      align: 'right',
      render: (_, record) => formatCurrency(calcCost(record)),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const color: Record<string, string> = { pending: 'orange', submitted: 'blue', verified: 'purple', approved: 'green', rejected: 'red' };
        return <Tag color={color[record.status] || 'default'}>{record.status?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, record) => (
        <Flex gap={4} wrap="wrap">
          {(record.status === 'pending' || record.status === 'submitted') && (
            <Button size="small" type="primary" ghost onClick={() => handleTimesheetAction(record.id, 'verify')} loading={isPending}>
              Verify
            </Button>
          )}
          {record.status === 'verified' && (
            <>
              <Button size="small" type="primary" onClick={() => handleTimesheetAction(record.id, 'approve')} loading={isPending}>
                Approve & Pay
              </Button>
              <Button size="small" danger onClick={() => handleTimesheetAction(record.id, 'reject')} loading={isPending}>
                Reject
              </Button>
            </>
          )}
          {(record.status === 'pending' || record.status === 'submitted') && (
            <Button size="small" danger onClick={() => handleTimesheetAction(record.id, 'reject')} loading={isPending}>
              Reject
            </Button>
          )}
        </Flex>
      ),
    },
  ];

  const dailyColumns: ColumnsType<DailyLabourReport> = [
    { title: '#', key: 'sno', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Date', dataIndex: 'reportDate', render: formatDate },
    { title: 'Project', key: 'project', render: (_, record) => record.project?.name || '-' },
    {
      title: 'Headcount', key: 'headcount',
      render: (_, record) => record.workers?.reduce((s, w) => s + Number(w.count || 1), 0) || 0,
    },
    {
      title: 'Actions', key: 'actions', width: 80,
      render: (_, record) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/dashboard/daily-labour/${record.id}`)} title="View Details" />
      ),
    },
    {
      title: 'Status', key: 'status', width: 140,
      render: (_, record) => (
        <Select
          defaultValue={record.status || 'pending'} size="small" variant="borderless" className="w-full"
          onChange={(newStatus) => handleDailyStatusChange(record.id, newStatus)}
          options={APPROVAL_STATUS_OPTIONS} popupMatchSelectWidth={false} disabled={isPending}
        />
      ),
    },
  ];

  const expenseColumns: ColumnsType<Expense> = [
    { title: '#', key: 'sno', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Date', dataIndex: 'expenseDate', render: formatDate },
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
              <Button key={i} type="link" size="small" icon={<FilePdfOutlined />} href={`${getApiBaseUrl().replace('/api/v1', '')}${url}`} target="_blank" />
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
              <Button key={i} type="link" size="small" icon={<CameraOutlined />} href={`${getApiBaseUrl().replace('/api/v1', '')}${url}`} target="_blank" />
            ))}
          </Flex>
        ) : '-',
    },
    {
      title: 'Status', key: 'status', width: 140,
      render: (_, record) => (
        <Select
          defaultValue={record.status || 'pending'} size="small" variant="borderless" className="w-full"
          onChange={(newStatus) => handleExpenseStatusChange(record.id, newStatus)}
          options={APPROVAL_STATUS_OPTIONS} popupMatchSelectWidth={false} disabled={isPending}
        />
      ),
    },
  ];

  const billColumns: ColumnsType<PurchaseBill> = [
    { title: '#', key: 'sno', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Date', dataIndex: 'billDate', render: formatDate },
    { title: 'Bill No', dataIndex: 'billNumber' },
    { title: 'Vendor', key: 'vendor', render: (_, record) => record.vendor?.name || '-' },
    { title: 'Amount', dataIndex: 'amount', align: 'right', render: formatCurrency },
    {
      title: 'Actions', key: 'actions', width: 80,
      render: (_, record) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/dashboard/accounts/bills/${record.id}`)} title="View Details" />
      ),
    },
    {
      title: 'Status', key: 'status', width: 140,
      render: (_, record) => (
        <Select
          defaultValue={record.status || 'pending'} size="small" variant="borderless" className="w-full"
          onChange={(newStatus) => handleBillStatusChange(record.id, newStatus)}
          options={APPROVAL_STATUS_OPTIONS} popupMatchSelectWidth={false} disabled={isPending}
        />
      ),
    },
  ];

  const getFileIcon = (filename: string) => {
    const ext = filename?.toLowerCase() || '';
    if (ext.endsWith('.pdf')) return <FilePdfOutlined className="text-red-500" />;
    if (ext.endsWith('.xls') || ext.endsWith('.xlsx')) return <FileExcelOutlined className="text-green-500" />;
    if (ext.endsWith('.doc') || ext.endsWith('.docx')) return <FileTextOutlined className="text-blue-500" />;
    return <FileUnknownOutlined className="text-gray-500" />;
  };

  const swoColumns: ColumnsType<SubcontractWorkOrder> = [
    { title: '#', key: 'sno', width: 50, render: (_, __, i) => i + 1 },
    { title: 'WO Number', dataIndex: 'woNumber', width: 120, render: (value) => <span className="whitespace-nowrap">{value}</span> },
    { title: 'Subcontractor', key: 'subcontractor', width: 160, render: (_, record) => <span className="whitespace-nowrap">{record.subcontractor?.name || '-'}</span> },
    { title: 'Project', key: 'project', width: 160, render: (_, record) => <span className="whitespace-nowrap">{record.project?.name || '-'}</span> },
    { title: 'Description of Work', dataIndex: 'description', ellipsis: true, width: 200, render: (value) => <span className="whitespace-nowrap">{value || '-'}</span> },
    {
      title: 'Work Order', key: 'workorder', width: 120,
      render: (_, record) =>
        record.workorderUrl ? (
          <Space>
            {getFileIcon(record.workorderKey || '')}
            <Tooltip title="View">
              <Button type="link" size="small" icon={<FilePdfOutlined />} href={`${getApiOrigin()}${record.workorderUrl}`} target="_blank" />
            </Tooltip>
            <Tooltip title="Download">
              <Button type="link" size="small" icon={<DownloadOutlined />} href={`${getApiOrigin()}${record.workorderUrl}`} target="_blank" download />
            </Tooltip>
          </Space>
        ) : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'PDF', key: 'pdf', width: 60,
      render: (_, record) => (
        <PDFDownloadLink document={<SubcontractWorkOrderPdf workOrder={record} />} fileName={`${record.woNumber || record.id}.pdf`}>
          {({ loading }) => (
            <Button type="text" size="small" icon={<FilePdfOutlined className="text-red-500" />} loading={loading} title="Download PDF" />
          )}
        </PDFDownloadLink>
      ),
    },
    {
      title: 'Status', key: 'status', width: 140,
      render: (_, record) => (
        <Select
          defaultValue={record.status || 'pending'} size="small" variant="borderless" className="w-full whitespace-nowrap"
          onChange={(newStatus) => handleSwoStatusChange(record.id, newStatus)}
          options={APPROVAL_STATUS_OPTIONS} popupMatchSelectWidth={false} disabled={isPending}
        />
      ),
    },
  ];

  const renderContent = (
    counts: Record<string, number>,
    dataSource: any[],
    columns: ColumnsType<any>,
    emptyText: string,
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
          pagination={{ pageSize: 10 }} scroll={{ x: 1200 }}
          locale={{ emptyText }}
        />
      </div>
    </>
  );

  const renderTsContent = (
    counts: { pending: number; verified: number; approved: number; rejected: number },
    dataSource: WeeklyTimesheet[],
    columns: ColumnsType<WeeklyTimesheet>,
  ) => (
    <>
      <Row gutter={16} className="mb-4">
        <Col xs={12} sm={6} md={4} lg={3}>
          <Card size="small" className="border! border-amber-500/20! bg-amber-500/5!">
            <Statistic title={<Tag color="warning">Pending</Tag>} value={counts.pending} />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Card size="small" className="border! border-purple-500/20! bg-purple-500/5!">
            <Statistic title={<Tag color="purple">Verified</Tag>} value={counts.verified} />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Card size="small" className="border! border-emerald-500/20! bg-emerald-500/5!">
            <Statistic title={<Tag color="success">Approved</Tag>} value={counts.approved} />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4} lg={3}>
          <Card size="small" className="border! border-red-500/20! bg-red-500/5!">
            <Statistic title={<Tag color="error">Rejected</Tag>} value={counts.rejected} />
          </Card>
        </Col>
      </Row>
      <div className="flex flex-col gap-4">
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Input.Search
              placeholder="Search engineer..."
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
              options={TIMESHEET_STATUS_OPTIONS}
            />
          </Col>
        </Row>
        <Table
          dataSource={dataSource} columns={columns} rowKey="id"
          pagination={{ pageSize: 10 }} scroll={{ x: 1000 }}
          locale={{ emptyText: 'No timesheets pending approval' }}
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

      <Card className={cardClassName}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => { setActiveTab(key); setSearchText(''); setStatusFilter(''); }}
          items={[
            {
              key: 'expenses',
              label: <span><WalletOutlined /> Expenses</span>,
              children: renderContent(expenseCounts, filteredExpenses, expenseColumns, 'No expenses pending approval'),
            },
            {
              key: 'bills',
              label: <span><FileDoneOutlined /> Purchase Bills</span>,
              children: renderContent(billCounts, filteredBills, billColumns, 'No purchase bills'),
            },
            {
              key: 'swo',
              label: <span><FileDoneOutlined /> Subcontract Work Orders</span>,
              children: renderContent(swoCounts, filteredSwo, swoColumns, 'No subcontract work orders'),
            },
            {
              key: 'daily',
              label: <span><CalendarOutlined /> Daily Labour List</span>,
              children: renderContent(dailyCounts, filteredDaily, dailyColumns, 'No daily labour reports'),
            },
            {
              key: 'timesheet',
              label: <span><TeamOutlined /> Timesheet</span>,
              children: renderTsContent(tsCounts, filteredTimesheets, tsColumns),
            },
          ]}
        />
      </Card>
    </div>
  );
}
