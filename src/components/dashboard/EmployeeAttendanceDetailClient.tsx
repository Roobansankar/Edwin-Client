'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { App, Avatar, Button, Card, DatePicker, Flex, Select, Spin, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowLeftOutlined, EyeOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { clientApiFetch } from '@/lib/client-api';
import type { WeeklyTimesheet, PagedResponse } from '@/types/erp';
import { verifyTimesheet, approveTimesheet, rejectTimesheet } from '@/actions/timesheet-approval';
import { cardClassName, formatCurrency, formatDate, pageHeaderClassName, pageTitleClassName } from './ui';

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Admin Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const STATUS_COLORS: Record<string, string> = { pending: 'orange', verified: 'purple', approved: 'green', rejected: 'red' };

export function EmployeeAttendanceDetailClient() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const router = useRouter();
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();
  const [timesheets, setTimesheets] = useState<WeeklyTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await clientApiFetch<PagedResponse<WeeklyTimesheet>>('/timesheet-attendance/all?limit=500');
        setTimesheets((result.data || []).filter((ts) => ts.siteEngineerId === employeeId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load timesheets');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [employeeId]);

  const person = timesheets[0]?.siteEngineer;

  const filtered = useMemo(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    return timesheets
      .filter((ts) => {
        if (statusFilter && ts.status !== statusFilter) return false;
        if (from && to) {
          const d = typeof ts.weekStart === 'string' ? ts.weekStart.split('T')[0] : '';
          if (d < from || d > to) return false;
        }
        return true;
      })
      .sort((a, b) => (b.weekStart || '').localeCompare(a.weekStart || ''));
  }, [timesheets, statusFilter, dateRange]);

  const calcCost = (ts: WeeklyTimesheet) => {
    const avgCostPerHr = Number(ts.siteEngineer?.salaryGrade?.avgCostPerHr || 0);
    return Number(ts.totalHours || 0) * avgCostPerHr;
  };

  const handleVerify = (id: string) => {
    startTransition(async () => {
      try { await verifyTimesheet(id); message.success('Timesheet verified'); setTimesheets((prev) => prev.map((t) => t.id === id ? { ...t, status: 'verified' } : t)); }
      catch (e) { message.error(e instanceof Error ? e.message : 'Failed'); }
    });
  };

  const handleApprove = (id: string) => {
    startTransition(async () => {
      try { await approveTimesheet(id); message.success('Timesheet approved & payment created'); setTimesheets((prev) => prev.map((t) => t.id === id ? { ...t, status: 'approved' } : t)); }
      catch (e) { message.error(e instanceof Error ? e.message : 'Failed'); }
    });
  };

  const handleReject = (id: string) => {
    startTransition(async () => {
      try { await rejectTimesheet(id); message.success('Timesheet rejected'); setTimesheets((prev) => prev.map((t) => t.id === id ? { ...t, status: 'rejected' } : t)); }
      catch (e) { message.error(e instanceof Error ? e.message : 'Failed'); }
    });
  };

  const columns: ColumnsType<WeeklyTimesheet> = [
    {
      title: 'Week', key: 'week',
      render: (_, record) => (
        <Typography.Text className="text-[var(--text-secondary)]">{formatDate(record.weekStart)} - {formatDate(record.weekEnd)}</Typography.Text>
      ),
    },
    {
      title: 'Total Hours', dataIndex: 'totalHours', align: 'right', width: 110,
      render: (v) => <Typography.Text strong className="text-sky-300">{Number(v || 0).toFixed(1)} hrs</Typography.Text>,
    },
    {
      title: 'Total Cost', key: 'cost', align: 'right', width: 120, responsive: ['sm'],
      render: (_, record) => <Typography.Text className="text-emerald-400">{formatCurrency(calcCost(record))}</Typography.Text>,
    },
    {
      title: 'Status', key: 'status', width: 170,
      render: (_, record) => (
        <Select
          value={record.status}
          size="small"
          variant="borderless"
          className="w-full"
          style={{ color: STATUS_COLORS[record.status] || undefined, fontWeight: 600 }}
          onChange={(newStatus) => {
            if (newStatus === record.status) return;
            if (newStatus === 'approved') handleApprove(record.id);
            else if (newStatus === 'rejected') handleReject(record.id);
          }}
          options={STATUS_OPTIONS}
          popupMatchSelectWidth={false}
          disabled={isPending}
        />
      ),
    },
    {
      title: '', key: 'actions', width: 110,
      render: (_, record) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/dashboard/site-engineer-attendance/${employeeId}/${record.id}`)}>
          View Week
        </Button>
      ),
    },
  ];

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Spin size="large" /></div>;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} type="text" className="mb-3" onClick={() => router.push('/dashboard/site-engineer-attendance')}>
        Back to Attendance
      </Button>

      <Flex align="center" gap={12} className={pageHeaderClassName}>
        <Avatar size={48} icon={<UserOutlined />} className="bg-sky-500/20! text-sky-300!" />
        <div>
          <Typography.Title level={3} className={`${pageTitleClassName} mb-0!`}>
            {person?.name || 'Employee'}
          </Typography.Title>
          <Typography.Text className="text-[var(--text-muted)]">{person?.email || ''}</Typography.Text>
        </div>
      </Flex>

      {error && <Typography.Text type="danger" className="mb-4 block">{error}</Typography.Text>}

      <Card className={cardClassName}>
        <Flex gap={12} wrap="wrap" className="mb-4" align="center">
          <Select
            allowClear
            placeholder="Status"
            className="w-40"
            value={statusFilter || undefined}
            onChange={(val) => setStatusFilter(val || '')}
            options={[{ label: 'All', value: '' }, ...STATUS_OPTIONS]}
          />
          <DatePicker.RangePicker
            value={dateRange[0] || dateRange[1] ? dateRange : [null, null]}
            onChange={(dates) => setDateRange(dates ? [dates[0], dates[1]] : [null, null])}
            allowClear
            placeholder={['From', 'To']}
          />
        </Flex>

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 15 }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'No timesheets match these filters' }}
        />
      </Card>
    </div>
  );
}
