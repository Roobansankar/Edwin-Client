'use client';

import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Collapse, Descriptions, Flex, Progress, Space, Spin, Table, Tag, Typography, Statistic, Row, Col, Select, DatePicker,
} from 'antd';
import {
  ProjectOutlined, ShoppingCartOutlined, CalendarOutlined, UserOutlined,
  ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/auth';
import { clientApiFetch } from '@/lib/client-api';
import { cardClassName, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';

type EngineerReport = {
  engineer: { id: string; name: string; email: string; employeeId: string | null; phone: string | null };
  assignedProjects: { id: string; name: string; completionPct: number }[];
  materialRequirements: {
    id: string; enquiryNo: string; projectName: string; status: string;
    items: { description: string; quantity: number }[]; notes: string | null; createdAt: string;
  }[];
  hourlyRate: number;
  timesheets: { id: string; weekStart: string; weekEnd: string; totalHours: number; earnedAmount: number; status: string }[];
  attendanceLogs: { date: string; projectName: string; headcount: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'orange', approved: 'green', rejected: 'red', draft: 'default',
  submitted: 'blue',
};

const STATUS_OPTIONS: Record<string, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected', draft: 'Draft',
  submitted: 'Submitted',
};

function fmt(d: string) {
  if (!d) return '-';
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function EngineerReportClient() {
  const [data, setData] = useState<EngineerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mrStatusFilter, setMrStatusFilter] = useState<string | null>(null);
  const [mrDateRange, setMrDateRange] = useState<[string, string] | null>(null);
  const [tsMonth, setTsMonth] = useState<string | null>(null);
  const [tsDateRange, setTsDateRange] = useState<[string, string] | null>(null);
  const user = useAuthStore((s) => s.user);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await clientApiFetch<EngineerReport>('/dashboard/engineer/report');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  if (loading) {
    return (
      <Flex justify="center" align="center" className="min-h-64">
        <Spin size="large" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        title="Failed to load report"
        description={error}
        action={<Button onClick={fetchReport}>Retry</Button>}
      />
    );
  }

  if (!data) return null;

  const mrPending = data.materialRequirements.filter((m) => m.status === 'pending').length;
  const mrApproved = data.materialRequirements.filter((m) => m.status === 'approved').length;
  const mrRejected = data.materialRequirements.filter((m) => m.status === 'rejected').length;
  const tsApproved = data.timesheets.filter((t) => t.status === 'approved').length;
  const tsPending = data.timesheets.filter((t) => t.status !== 'approved').length;
  const totalAttendance = data.attendanceLogs.reduce((s, a) => s + a.headcount, 0);

  const filteredMR = data.materialRequirements.filter((m) => {
    if (mrStatusFilter && m.status !== mrStatusFilter) return false;
    if (mrDateRange) {
      const d = new Date(m.createdAt).getTime();
      const from = new Date(mrDateRange[0]).getTime();
      const to = new Date(mrDateRange[1]).getTime();
      if (d < from || d > to) return false;
    }
    return true;
  });

  const monthOptions: { label: string; value: string }[] = [];
  const seenMonths = new Set<string>();
  for (const t of data.timesheets) {
    const key = t.weekStart ? t.weekStart.slice(0, 7) : '';
    if (key && !seenMonths.has(key)) {
      seenMonths.add(key);
      const d = new Date(t.weekStart);
      monthOptions.push({ label: d.toLocaleString('default', { month: 'long', year: 'numeric' }), value: key });
    }
  }

  const filteredTS = data.timesheets.filter((t) => {
    if (tsMonth && (!t.weekStart || !t.weekStart.startsWith(tsMonth))) return false;
    if (tsDateRange) {
      const d = new Date(t.weekStart).getTime();
      const from = new Date(tsDateRange[0]).getTime();
      const to = new Date(tsDateRange[1]).getTime();
      if (d < from || d > to) return false;
    }
    return true;
  });

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} wrap="wrap" gap={12}>
        <Typography.Title level={3} className={pageTitleClassName}>
          <UserOutlined className={titleIconClassName} style={{ marginBottom: 24 }} /> My Report
        </Typography.Title>
        <Button  style={{ marginBottom: 24 }} icon={<ReloadOutlined />} onClick={fetchReport} loading={loading}>
          Refresh
        </Button>
      </Flex>

      {/* Engineer Info */}
      <Card className={cardClassName} style={{ marginBottom: 24 }}>
        <Descriptions title="Engineer Details" column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="Name">{data.engineer.name}</Descriptions.Item>
          <Descriptions.Item label="Employee ID">{data.engineer.employeeId || '-'}</Descriptions.Item>
          <Descriptions.Item label="Email">{data.engineer.email}</Descriptions.Item>
          <Descriptions.Item label="Phone">{data.engineer.phone || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={6}>
          <Card className="rounded-xl! border! border-blue-500/20! bg-linear-to-br! from-blue-500/15! to-blue-500/5!">
            <Statistic title="Projects" value={data.assignedProjects.length} prefix={<ProjectOutlined />} styles={{ content: { color: '#3b82f6' } }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="rounded-xl! border! border-amber-500/20! bg-linear-to-br! from-amber-500/15! to-amber-500/5!">
            <Statistic title="Material Req." value={data.materialRequirements.length} prefix={<ShoppingCartOutlined />} styles={{ content: { color: '#f59e0b' } }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="rounded-xl! border! border-violet-500/20! bg-linear-to-br! from-violet-500/15! to-violet-500/5!">
            <Statistic title="Timesheets" value={data.timesheets.length} prefix={<CalendarOutlined />} styles={{ content: { color: '#8b5cf6' } }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="rounded-xl! border! border-emerald-500/20! bg-linear-to-br! from-emerald-500/15! to-emerald-500/5!">
            <Statistic title="Attendance (30d)" value={totalAttendance} prefix={<UserOutlined />} styles={{ content: { color: '#10b981' } }} />
          </Card>
        </Col>
      </Row>

      {/* Status cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={6}>
          <Card size="small" className="border! border-orange-500/20!">
            <Statistic title="MR Pending" value={mrPending} styles={{ content: { color: '#f59e0b', fontSize: 20 } }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="border! border-emerald-500/20!">
            <Statistic title="MR Approved" value={mrApproved} styles={{ content: { color: '#10b981', fontSize: 20 } }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="border! border-red-500/20!">
            <Statistic title="MR Rejected" value={mrRejected} styles={{ content: { color: '#ef4444', fontSize: 20 } }} prefix={<CloseCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="border! border-blue-500/20!">
            <Statistic title="TS Approved" value={tsApproved} styles={{ content: { color: '#3b82f6', fontSize: 20 } }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Collapsible Sections */}
      <Collapse
        defaultActiveKey={['projects', 'materials', 'timesheets', 'attendance']}
        size="middle"
        style={{ marginBottom: 24 }}
        items={[
          {
            key: 'projects',
            label: (
              <Space><ProjectOutlined /><Typography.Text strong>Assigned Projects ({data.assignedProjects.length})</Typography.Text></Space>
            ),
            children: (
              <Table
                dataSource={data.assignedProjects}
                columns={[
                  { title: '#', key: 'sno', width: 50, render: (_: unknown, __: unknown, i: number) => i + 1 },
                  { title: 'Project Name', dataIndex: 'name', key: 'name' },
                  {
                    title: 'Completion', dataIndex: 'completionPct', key: 'completionPct', width: 200,
                    render: (v: number) => <Progress percent={Math.round(v)} size="small" strokeColor={{ from: '#3b82f6', to: '#10b981' }} />,
                  },
                ]}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 500 }}
              />
            ),
          },
          {
            key: 'materials',
            label: (
              <Space><ShoppingCartOutlined /><Typography.Text strong>Material Requirements ({data.materialRequirements.length})</Typography.Text></Space>
            ),
            children: (
              <>
                <Flex gap={8} wrap className="mb-4!" style={{ marginBottom: 24 }}>
                  <Select
                    allowClear
                    placeholder="Filter by status"
                    style={{ width: 160 }}
                    value={mrStatusFilter}
                    onChange={(v) => setMrStatusFilter(v ?? null)}
                    options={[
                      { label: 'Pending', value: 'pending' },
                      { label: 'Approved', value: 'approved' },
                      { label: 'Rejected', value: 'rejected' },
                    ]}
                  />
                  <DatePicker.RangePicker
                    format="DD/MM/YYYY"
                    onChange={(_, dateStrings) => {
                      setMrDateRange(dateStrings[0] && dateStrings[1] ? [dateStrings[0], dateStrings[1]] : null);
                    }}
                  />
                </Flex>
                <Table
                  dataSource={filteredMR}
                  columns={[
                    { title: '#', key: 'sno', width: 50, render: (_: unknown, __: unknown, i: number) => i + 1 },
                    { title: 'Enquiry No', dataIndex: 'enquiryNo', key: 'enquiryNo', width: 150 },
                    { title: 'Project', dataIndex: 'projectName', key: 'projectName', width: 180 },
                    {
                      title: 'Status', dataIndex: 'status', key: 'status', width: 110,
                      render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{STATUS_OPTIONS[v] || v}</Tag>,
                    },
                    {
                      title: 'Items', key: 'items', width: 200,
                      render: (_: unknown, r: EngineerReport['materialRequirements'][number]) => (
                        <Typography.Text type="secondary" className="text-xs">
                          {r.items?.map((i) => `${i.description} (${i.quantity})`).join(', ') || '-'}
                        </Typography.Text>
                      ),
                    },
                    {
                      title: 'Date', dataIndex: 'createdAt', key: 'createdAt', width: 120,
                      render: (v: string) => fmt(v),
                    },
                  ]}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 810 }}
                />
              </>
            ),
          },
          // {
          //   key: 'timesheets',
          //   label: (
          //     <Space><CalendarOutlined /><Typography.Text strong>Timesheets ({data.timesheets.length})</Typography.Text></Space>
          //   ),
          //   children: (
          //     <>
          //       <Flex gap={8} wrap className="mb-4"  style={{ marginBottom: 24 }}>
          //         <Select
          //           allowClear
          //           placeholder="Filter by month"
          //           style={{ width: 180 }}
          //           value={tsMonth}
          //           onChange={(v) => setTsMonth(v ?? null)}
          //           options={monthOptions}
          //         />
          //         <DatePicker.RangePicker
          //           format="DD/MM/YYYY"
          //           placeholder={['From date', 'To date']}
          //           onChange={(_, dateStrings) => {
          //             setTsDateRange(dateStrings[0] && dateStrings[1] ? [dateStrings[0], dateStrings[1]] : null);
          //           }}
          //         />
          //       </Flex>
          //       <Flex gap={8} className="mb-4"  style={{ marginBottom: 24 }}>
          //         <Card size="small" className="flex-1! border! border-blue-500/20!">
          //           <Statistic
          //             title="Filtered Hours"
          //             value={filteredTS.reduce((s, t) => s + t.totalHours, 0).toFixed(2)}
          //             valueStyle={{ color: '#3b82f6', fontSize: 20 }}
          //           />
          //         </Card>
          //         <Card size="small" className="flex-1! border! border-emerald-500/20!">
          //           <Statistic
          //             title="Filtered Earned"
          //             value={`₹${filteredTS.reduce((s, t) => s + t.earnedAmount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          //             valueStyle={{ color: '#10b981', fontSize: 20 }}
          //           />
          //         </Card>
          //       </Flex>
          //       <Table
                
          //         dataSource={filteredTS}
          //         columns={[
          //           { title: '#', key: 'sno', width: 50, render: (_: unknown, __: unknown, i: number) => i + 1 },
          //           { title: 'Week Start', dataIndex: 'weekStart', key: 'weekStart', render: (v: string) => fmt(v) },
          //             { title: 'Week End', dataIndex: 'weekEnd', key: 'weekEnd', render: (v: string) => fmt(v) },
          //           { title: 'Total Hours', dataIndex: 'totalHours', key: 'totalHours', width: 100 },
          //           {
          //             title: 'Earned Amount', dataIndex: 'earnedAmount', key: 'earnedAmount', width: 130,
          //             render: (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          //           },
          //           {
          //             title: 'Status', dataIndex: 'status', key: 'status', width: 110,
          //             render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{STATUS_OPTIONS[v] || v}</Tag>,
          //           },
          //         ]}
          //         rowKey="id"
          //         pagination={false}
          //         size="small"
          //       />
          //     </>
          //   ),
          // },
          // {
          //   key: 'attendance',
          //   label: (
          //     <Space><UserOutlined /><Typography.Text strong>Daily Attendance (Last 30 Days) — {data.attendanceLogs.length} records</Typography.Text></Space>
          //   ),
          //   children: (
          //     <Table
          //       dataSource={data.attendanceLogs}
          //       columns={[
          //         { title: '#', key: 'sno', width: 50, render: (_: unknown, __: unknown, i: number) => i + 1 },
          //         { title: 'Date', dataIndex: 'date', key: 'date', render: (v: string) => fmt(v) },
          //         { title: 'Project', dataIndex: 'projectName', key: 'projectName' },
          //         { title: 'Headcount', dataIndex: 'headcount', key: 'headcount', width: 120 },
          //       ]}
          //       rowKey={(_, i) => String(i)}
          //       pagination={false}
          //       size="small"
          //     />
          //   ),
          // },
        ]}
      />
    </div>
  );
}
