'use client';

import { useMemo, useState } from 'react';
import { Button, Card, Col, DatePicker, Flex, Row, Select, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import {
  CalendarOutlined,
  DollarOutlined,
  FileExcelOutlined,
  LeftOutlined,
  RightOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { Project, Expense, DailyLabourReport, Payment } from '@/types/erp';
import { exportToExcel } from '@/lib/excel';
import {
  StatusTag,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleCase,
  titleIconClassName,
} from './ui';

// Monday of the week containing `date` — the same Monday–Sunday week the
// weekly Expense Payments and Labour Payments pages work in.
function mondayOf(date: Dayjs) {
  return date.startOf('day').subtract((date.day() + 6) % 7, 'day');
}

function inWeek(dateStr: string | null | undefined, from: string, to: string) {
  if (!dateStr) return false;
  const d = dateStr.split('T')[0];
  return d >= from && d <= to;
}

// Money in is a payment received against a sales invoice — the same split
// the Master Ledger uses for its Inflow / Outflow tabs.
function isInflow(payment: Payment) {
  return Boolean(payment.salesInvoiceId || payment.salesInvoice);
}

type WeeklyReportClientProps = {
  projects: Project[];
  expenses: Expense[];
  dailyLabourReports: DailyLabourReport[];
  payments: Payment[];
};

export function WeeklyReportClient({ projects, expenses, dailyLabourReports, payments }: WeeklyReportClientProps) {
  const [weekStart, setWeekStart] = useState<Dayjs>(() => mondayOf(dayjs()));
  const [projectId, setProjectId] = useState<string | undefined>();

  const weekEnd = weekStart.add(6, 'day');
  const from = weekStart.format('YYYY-MM-DD');
  const to = weekEnd.format('YYYY-MM-DD');
  const weekLabel = `${weekStart.format('DD MMM')} – ${weekEnd.format('DD MMM YYYY')}`;

  const weekPayments = useMemo(
    () =>
      payments
        .filter((p) => inWeek(p.paymentDate, from, to) && (!projectId || p.projectId === projectId))
        .sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || '')),
    [payments, from, to, projectId],
  );

  const weekExpenses = useMemo(
    () =>
      expenses
        .filter((e) => inWeek(e.expenseDate, from, to) && (!projectId || e.projectId === projectId))
        .sort((a, b) => (b.expenseDate || '').localeCompare(a.expenseDate || '')),
    [expenses, from, to, projectId],
  );

  const weekDailyLabour = useMemo(
    () =>
      dailyLabourReports
        .filter((r) => inWeek(r.reportDate, from, to) && (!projectId || r.projectId === projectId))
        .sort((a, b) => (b.reportDate || '').localeCompare(a.reportDate || '')),
    [dailyLabourReports, from, to, projectId],
  );

  const summary = useMemo(() => {
    let received = 0;
    let paid = 0;
    for (const p of weekPayments) {
      if (isInflow(p)) received += Number(p.amount || 0);
      else paid += Number(p.amount || 0);
    }
    const expenseTotal = weekExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const headcount = weekDailyLabour.reduce(
      (s, r) => s + (r.workers || []).reduce((ws, w) => ws + (Number(w.count) || 1), 0),
      0,
    );
    return [
      { label: 'Payments Received', value: formatCurrency(received) },
      { label: 'Payments Made', value: formatCurrency(paid) },
      { label: `Expenses Submitted (${weekExpenses.length})`, value: formatCurrency(expenseTotal) },
      { label: `Labour Headcount (${weekDailyLabour.length} reports)`, value: headcount },
    ];
  }, [weekPayments, weekExpenses, weekDailyLabour]);

  const payeeOf = (p: Payment) => p.salesInvoice?.project?.clientName || p.vendor?.name || p.payeeName || '-';

  const paymentColumns: ColumnsType<Payment> = [
    { title: 'Date', dataIndex: 'paymentDate', width: 120, render: (v: string) => <Typography.Text strong>{formatDate(v)}</Typography.Text> },
    { title: 'Category', dataIndex: 'paymentType', width: 150, render: (v: string) => <StatusTag value={v} /> },
    { title: 'Payee / Vendor', key: 'payee', width: 200, render: (_, r) => payeeOf(r) },
    { title: 'Project', key: 'project', width: 220, render: (_, r) => r.project?.name || '-' },
    { title: 'Amount', dataIndex: 'amount', align: 'right' as const, width: 130, render: (v: number) => formatCurrency(v) },
    { title: 'Mode', dataIndex: 'paymentMode', width: 100, render: (v: string) => titleCase(v) },
    { title: 'Ref No', dataIndex: 'referenceNumber', width: 150, render: (v?: string | null) => v || '-' },
  ];

  const expenseColumns: ColumnsType<Expense> = [
    { title: 'Date', dataIndex: 'expenseDate', width: 120, render: (v: string) => <Typography.Text strong>{formatDate(v)}</Typography.Text> },
    { title: 'Added By', key: 'creator', width: 160, render: (_, r) => r.creator?.name || '-' },
    { title: 'Expense Type', key: 'expenseType', width: 150, render: (_, r) => r.expenseType?.name || (r.category ? titleCase(r.category) : '-') },
    { title: 'Project', key: 'project', width: 220, render: (_, r) => r.project?.name || '-' },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    { title: 'Amount', dataIndex: 'amount', align: 'right' as const, width: 130, render: (v: number) => formatCurrency(v) },
    { title: 'Status', dataIndex: 'status', width: 140, render: (v: string) => <StatusTag value={v || 'pending'} /> },
  ];

  const dailyLabourColumns: ColumnsType<DailyLabourReport> = [
    { title: 'Date', dataIndex: 'reportDate', width: 120, render: (v: string) => <Typography.Text strong>{formatDate(v)}</Typography.Text> },
    { title: 'Project', dataIndex: ['project', 'name'], width: 220, render: (v: string) => v || '-' },
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

  const exportWeek = () => {
    exportToExcel({
      filename: `Weekly-Report-${from}`,
      sheetName: 'Weekly Report',
      headers: ['Section', 'Date', 'Project', 'Party', 'Details', 'Amount', 'Status'],
      rows: [
        ...weekPayments.map((p) => [
          isInflow(p) ? 'Payment Received' : 'Payment Made',
          formatDate(p.paymentDate),
          p.project?.name || '-',
          payeeOf(p),
          `${titleCase(p.paymentType)}${p.referenceNumber ? ` / ${p.referenceNumber}` : ''}`,
          Number(p.amount || 0),
          titleCase(p.paymentMode),
        ]),
        ...weekExpenses.map((e) => [
          'Expense',
          formatDate(e.expenseDate),
          e.project?.name || '-',
          e.creator?.name || '-',
          e.description,
          Number(e.amount || 0),
          titleCase(e.status),
        ]),
        ...weekDailyLabour.map((r) => [
          'Daily Labour',
          formatDate(r.reportDate),
          r.project?.name || '-',
          r.createdBy?.name || '-',
          `Headcount ${(r.workers || []).reduce((s, w) => s + (Number(w.count) || 1), 0)}`,
          null,
          titleCase(r.status),
        ]),
      ],
    });
  };

  const hasData = weekPayments.length + weekExpenses.length + weekDailyLabour.length > 0;

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <CalendarOutlined className={titleIconClassName} /> Weekly Report
        </Typography.Title>
        <Button type="primary" icon={<FileExcelOutlined />} disabled={!hasData} onClick={exportWeek}>
          Export to Excel
        </Button>
      </Flex>

      <Flex gap={12} wrap="wrap" align="center" className="mb-4!">
        <Button icon={<LeftOutlined />} onClick={() => setWeekStart(weekStart.subtract(7, 'day'))} title="Previous week" />
        <DatePicker
          value={weekStart}
          allowClear={false}
          onChange={(date) => date && setWeekStart(mondayOf(date))}
          format={() => weekLabel}
          style={{ minWidth: 220 }}
        />
        <Button icon={<RightOutlined />} onClick={() => setWeekStart(weekStart.add(7, 'day'))} title="Next week" />
        <Button onClick={() => setWeekStart(mondayOf(dayjs()))}>This Week</Button>
        <Select
          showSearch
          placeholder="Filter by project"
          allowClear
          style={{ minWidth: 240 }}
          value={projectId}
          onChange={setProjectId}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          filterOption={(input, option) =>
            String(option?.label || '').toLowerCase().includes(input.toLowerCase())
          }
        />
      </Flex>

      <Row gutter={[16, 16]} className="mb-4">
        {summary.map((stat) => (
          <Col xs={24} sm={12} md={6} key={stat.label}>
            <Card
              className="rounded-xl! border! border-[var(--border)]!"
              styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}
            >
              <Flex vertical gap={10}>
                <Typography.Text className="text-sm text-[var(--text-muted)]!">{stat.label}</Typography.Text>
                <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">
                  {stat.value}
                </Typography.Title>
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!"
        styles={{ body: { padding: '8px 16px' } }}
      >
        <Tabs
          items={[
            {
              key: 'payments',
              label: <span><DollarOutlined className="mr-1" /> Payments ({weekPayments.length})</span>,
              children: (
                <Table
                  className="mantis-table"
                  dataSource={weekPayments}
                  columns={paymentColumns}
                  rowKey="id"
                  size="middle"
                  scroll={{ x: 1100 }}
                  pagination={{ pageSize: 15, showTotal: (total) => `${total} payments` }}
                  locale={{ emptyText: `No payments recorded for ${weekLabel}` }}
                />
              ),
            },
            {
              key: 'expenses',
              label: <span><WalletOutlined className="mr-1" /> Expenses ({weekExpenses.length})</span>,
              children: (
                <Table
                  className="mantis-table"
                  dataSource={weekExpenses}
                  columns={expenseColumns}
                  rowKey="id"
                  size="middle"
                  scroll={{ x: 1100 }}
                  pagination={{ pageSize: 15, showTotal: (total) => `${total} expenses` }}
                  locale={{ emptyText: `No expenses dated ${weekLabel}` }}
                />
              ),
            },
            {
              key: 'daily-labour',
              label: <span><TeamOutlined className="mr-1" /> Daily Labour ({weekDailyLabour.length})</span>,
              children: (
                <Table
                  className="mantis-table"
                  dataSource={weekDailyLabour}
                  columns={dailyLabourColumns}
                  rowKey="id"
                  size="middle"
                  scroll={{ x: 900 }}
                  pagination={{ pageSize: 15, showTotal: (total) => `${total} reports` }}
                  locale={{ emptyText: `No daily labour reports for ${weekLabel}` }}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
