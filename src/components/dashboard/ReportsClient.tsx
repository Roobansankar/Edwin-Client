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
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  BarChartOutlined,
  CalendarOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import type { DprReport, Project, PurchaseBill, WeeklyTimesheet, Expense } from '@/types/erp';
import { exportToExcel } from '@/lib/excel';
import { getApiOrigin } from '@/lib/api-url';
import {
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleCase,
  titleIconClassName,
} from './ui';

const DAY_KEYS = ['monHours', 'tueHours', 'wedHours', 'thuHours', 'friHours', 'satHours', 'sunHours'] as const;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function inRange(dateStr: string | null | undefined, range: [Dayjs | null, Dayjs | null]) {
  if (!range[0] || !range[1] || !dateStr) return true;
  const from = range[0].format('YYYY-MM-DD');
  const to = range[1].format('YYYY-MM-DD');
  const d = dateStr.split('T')[0];
  return d >= from && d <= to;
}

type ReportsClientProps = {
  projects: Project[];
  bills: PurchaseBill[];
  timesheets: WeeklyTimesheet[];
  expenses: Expense[];
  dprReports: DprReport[];
  role: string;
};

type TimesheetReportRow = {
  key: string;
  engineer: string;
  engineerId: string;
  projectId?: string | null;
  projectName: string;
  weekStart: string;
  weekEnd: string;
  status: string;
  hours: Record<(typeof DAY_KEYS)[number], number>;
  totalHours: number;
  costPerHr: number;
  totalCost: number;
};

export function ReportsClient({ projects, bills, timesheets, expenses, dprReports, role }: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState('project');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [tsProjectId, setTsProjectId] = useState<string | undefined>();
  const [tsEngineerId, setTsEngineerId] = useState<string | undefined>();
  const [dprProjectId, setDprProjectId] = useState<string | undefined>();
  const [projectDateRange, setProjectDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [tsDateRange, setTsDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [dprDateRange, setDprDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    return map;
  }, [projects]);

  const engineerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const ts of timesheets) {
      if (ts.siteEngineer) map.set(ts.siteEngineer.id, ts.siteEngineer.name);
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [timesheets]);

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

  const timesheetRows: TimesheetReportRow[] = useMemo(() => {
    const rows: TimesheetReportRow[] = [];
    for (const ts of timesheets) {
      const engineerName = ts.siteEngineer?.name || ts.siteEngineerId;
      const costPerHr = Number(ts.siteEngineer?.salaryGrade?.avgCostPerHr || 0);
      for (const row of ts.rows || []) {
        if (!row.projectId) continue;
        if (tsProjectId && row.projectId !== tsProjectId) continue;
        if (tsEngineerId && ts.siteEngineerId !== tsEngineerId) continue;
        if (!inRange(ts.weekStart, tsDateRange)) continue;
        let totalHours = 0;
        for (const day of DAY_KEYS) totalHours += Number(row[day] || 0);
        if (totalHours === 0) continue;
        const hours = {} as TimesheetReportRow['hours'];
        for (const day of DAY_KEYS) hours[day] = Number(row[day] || 0);
        rows.push({
          key: `${ts.id}-${row.id}`,
          engineer: engineerName,
          engineerId: ts.siteEngineerId,
          projectId: row.projectId,
          projectName: projectNameById.get(row.projectId) || '-',
          weekStart: ts.weekStart,
          weekEnd: ts.weekEnd,
          status: ts.status,
          hours,
          totalHours,
          costPerHr,
          totalCost: totalHours * costPerHr,
        });
      }
    }
    return rows;
  }, [timesheets, tsProjectId, tsEngineerId, tsDateRange, projectNameById]);

  const timesheetSummary = useMemo(() => {
    const engineers = new Set<string>();
    let totalHours = 0;
    let totalCost = 0;
    for (const row of timesheetRows) {
      engineers.add(row.engineerId);
      totalHours += row.totalHours;
      totalCost += row.totalCost;
    }
    return { engineers: engineers.size, rows: timesheetRows.length, totalHours, totalCost };
  }, [timesheetRows]);

  const filteredDprReports = useMemo(() => {
    return dprReports
      .filter((d) => (!dprProjectId || d.projectId === dprProjectId) && inRange(d.reportDate, dprDateRange))
      .sort((a, b) => (b.reportDate || '').localeCompare(a.reportDate || ''));
  }, [dprReports, dprProjectId, dprDateRange]);

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

  const exportTimesheet = () => {
    exportToExcel({
      filename: 'Timesheet-Hours-Report',
      sheetName: 'Timesheet Hours',
      headers: [
        'Engineer',
        'Project',
        'Week Start',
        'Week End',
        ...DAY_LABELS,
        'Total Hours',
        'Cost / Hour',
        'Total Cost',
        'Status',
      ],
      rows: timesheetRows.map((r) => [
        r.engineer,
        r.projectName,
        formatDate(r.weekStart),
        formatDate(r.weekEnd),
        ...DAY_KEYS.map((d) => r.hours[d]),
        r.totalHours,
        r.costPerHr,
        r.totalCost,
        titleCase(r.status),
      ]),
    });
  };

  const exportDprReports = () => {
    exportToExcel({
      filename: 'DPR-Reports',
      sheetName: 'DPR Reports',
      headers: ['Report Date', 'Project', 'File', 'Uploaded At'],
      rows: filteredDprReports.map((d) => [
        formatDate(d.reportDate),
        d.project?.name || '-',
        d.fileKey || '-',
        formatDate(d.createdAt),
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

  const timesheetColumns: ColumnsType<TimesheetReportRow> = [
    { title: 'Engineer', dataIndex: 'engineer', width: 170, render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'Project', dataIndex: 'projectName', width: 180, render: (v: string) => v || '-' },
    { title: 'Week Start', dataIndex: 'weekStart', width: 120, render: (v: string) => formatDate(v) },
    { title: 'Week End', dataIndex: 'weekEnd', width: 120, render: (v: string) => formatDate(v) },
    ...DAY_KEYS.map((day, i) => ({
      title: DAY_LABELS[i],
      key: day,
      width: 70,
      align: 'right' as const,
      render: (_: unknown, r: TimesheetReportRow) => r.hours[day] || 0,
    })),
    { title: 'Total Hours', key: 'totalHours', width: 110, align: 'right' as const, render: (_, r) => <Typography.Text strong>{r.totalHours}</Typography.Text> },
    { title: 'Cost / Hr', key: 'costPerHr', width: 100, align: 'right' as const, render: (_, r) => (r.costPerHr ? formatCurrency(r.costPerHr) : '-') },
    { title: 'Total Cost', key: 'totalCost', width: 120, align: 'right' as const, render: (_, r) => (r.totalCost ? formatCurrency(r.totalCost) : '-') },
    { title: 'Status', dataIndex: 'status', width: 120, render: (v: string) => <Tag color="blue">{titleCase(v)}</Tag> },
  ];

  const dprColumns: ColumnsType<DprReport> = [
    { title: 'Report Date', dataIndex: 'reportDate', width: 130, render: (v: string) => <Typography.Text strong>{formatDate(v)}</Typography.Text> },
    { title: 'Project', dataIndex: ['project', 'name'], width: 200, render: (v: string) => v || '-' },
    {
      title: 'File',
      key: 'file',
      render: (_, r) => (
        <Typography.Link href={`${getApiOrigin()}${r.fileUrl}`} target="_blank">
          {r.fileKey || 'View File'}
        </Typography.Link>
      ),
    },
    { title: 'Uploaded At', dataIndex: 'createdAt', width: 140, render: (v: string) => <Typography.Text type="secondary">{formatDate(v)}</Typography.Text> },
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
                <Card className={cardClassName}>
                  <Statistic title="Bills" value={projectSummary.count} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card className={cardClassName}>
                  <Statistic title="Total Amount" value={projectSummary.totalAmount} precision={0} prefix="₹" />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card className={cardClassName}>
                  <Statistic title="Paid" value={projectSummary.totalPaid} precision={0} prefix="₹" />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card className={cardClassName}>
                  <Statistic
                    title="Outstanding"
                    value={projectSummary.outstanding}
                    precision={0}
                    prefix="₹"
                    valueStyle={projectSummary.outstanding > 0 ? { color: '#cf1322' } : undefined}
                  />
                </Card>
              </Col>
            </Row>

            <Table
              dataSource={projectBills}
              columns={billColumns}
              rowKey="id"
              size="middle"
              scroll={{ x: 1100 }}
              pagination={{ pageSize: 10, showTotal: (total) => `${total} bills` }}
              locale={{ emptyText: 'No purchase bills for this project yet' }}
            />

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
                <Card className={cardClassName}>
                  <Statistic title="Expenses" value={projectExpenseSummary.count} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card className={cardClassName}>
                  <Statistic title="Total Expense Amount" value={projectExpenseSummary.total} precision={0} prefix="₹" />
                </Card>
              </Col>
            </Row>

            <Table
              dataSource={projectExpenses}
              columns={expenseColumns}
              rowKey="id"
              size="middle"
              scroll={{ x: 1100 }}
              pagination={{ pageSize: 10, showTotal: (total) => `${total} expenses` }}
              locale={{ emptyText: 'No expenses for this project yet' }}
            />
          </>
        )}
      </div>
    ),
  };

  const timesheetTabItems = {
    key: 'timesheet',
    label: (
      <span>
        <BarChartOutlined className="mr-1" /> Timesheet Hours
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
              value={tsProjectId}
              onChange={setTsProjectId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <Select
              showSearch
              placeholder="Filter by engineer"
              allowClear
              style={{ minWidth: 200 }}
              value={tsEngineerId}
              onChange={setTsEngineerId}
              options={engineerOptions}
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <DatePicker
              picker="month"
              placeholder="Month"
              allowClear
              onChange={(month) => setTsDateRange(month ? [month.startOf('month'), month.endOf('month')] : [null, null])}
            />
            <DatePicker.RangePicker
              value={tsDateRange[0] || tsDateRange[1] ? tsDateRange : [null, null]}
              onChange={(dates) => setTsDateRange(dates ? [dates[0], dates[1]] : [null, null])}
              allowClear
              placeholder={['From', 'To']}
            />
          </Flex>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            disabled={timesheetRows.length === 0}
            onClick={exportTimesheet}
          >
            Export to Excel
          </Button>
        </Flex>

        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={12} sm={6}>
            <Card className={cardClassName}>
              <Statistic title="Engineers" value={timesheetSummary.engineers} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className={cardClassName}>
              <Statistic title="Work Entries" value={timesheetSummary.rows} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className={cardClassName}>
              <Statistic title="Total Hours" value={timesheetSummary.totalHours} precision={2} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className={cardClassName}>
              <Statistic title="Labour Cost" value={timesheetSummary.totalCost} precision={0} prefix="₹" />
            </Card>
          </Col>
        </Row>

        <Table
          dataSource={timesheetRows}
          columns={timesheetColumns}
          rowKey="key"
          size="middle"
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 15, showTotal: (total) => `${total} entries` }}
          locale={{ emptyText: 'No timesheet hours for the selected filters' }}
        />
      </div>
    ),
  };

  const dprTabItems = {
    key: 'dpr',
    label: (
      <span>
        <CalendarOutlined className="mr-1" /> DPR Reports
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
              value={dprProjectId}
              onChange={setDprProjectId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <DatePicker
              picker="month"
              placeholder="Month"
              allowClear
              onChange={(month) => setDprDateRange(month ? [month.startOf('month'), month.endOf('month')] : [null, null])}
            />
            <DatePicker.RangePicker
              value={dprDateRange[0] || dprDateRange[1] ? dprDateRange : [null, null]}
              onChange={(dates) => setDprDateRange(dates ? [dates[0], dates[1]] : [null, null])}
              allowClear
              placeholder={['From', 'To']}
            />
          </Flex>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            disabled={filteredDprReports.length === 0}
            onClick={exportDprReports}
          >
            Export to Excel
          </Button>
        </Flex>

        <Table
          dataSource={filteredDprReports}
          columns={dprColumns}
          rowKey="id"
          size="middle"
          scroll={{ x: 900 }}
          pagination={{ pageSize: 15, showTotal: (total) => `${total} reports` }}
          locale={{ emptyText: 'No DPR reports for the selected filters' }}
        />
      </div>
    ),
  };

  const canSeeReportData = ['admin', 'accounts_manager', 'purchase_team'].includes(role);
  const tabItems = canSeeReportData
    ? [projectTabItems, timesheetTabItems, dprTabItems]
    : [dprTabItems];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <FileTextOutlined className={titleIconClassName} /> Reports
        </Typography.Title>
      </Flex>

      <Card className={cardClassName}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
}
