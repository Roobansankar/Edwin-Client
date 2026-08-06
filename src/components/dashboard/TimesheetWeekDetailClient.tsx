'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { App, Avatar, Button, Card, Col, Flex, Popconfirm, Row, Spin, Statistic, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { clientApiFetch } from '@/lib/client-api';
import type { WeeklyTimesheet, TimesheetRow, Project } from '@/types/erp';
import { verifyTimesheet, approveTimesheet, rejectTimesheet } from '@/actions/timesheet-approval';
import { StatusTag, cardClassName, formatCurrency, formatDate, pageHeaderClassName, pageTitleClassName } from './ui';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS = ['monHours', 'tueHours', 'wedHours', 'thuHours', 'friHours', 'satHours', 'sunHours'] as const;
const FIXED_LABELS: Record<string, string> = { holiday: 'Holiday', idle: 'Idle', leave: 'Leave' };

export function TimesheetWeekDetailClient() {
  const { employeeId, timesheetId } = useParams<{ employeeId: string; timesheetId: string }>();
  const router = useRouter();
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();
  const [timesheet, setTimesheet] = useState<WeeklyTimesheet | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [ts, projectList] = await Promise.all([
          clientApiFetch<WeeklyTimesheet>(`/timesheet-attendance/${timesheetId}`),
          clientApiFetch<Project[]>('/projects'),
        ]);
        setTimesheet(ts);
        setProjects(projectList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load timesheet');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [timesheetId]);

  const handleVerify = () => {
    startTransition(async () => {
      try { await verifyTimesheet(timesheetId); message.success('Timesheet verified'); setTimesheet((t) => t ? { ...t, status: 'verified' } : t); }
      catch (e) { message.error(e instanceof Error ? e.message : 'Failed'); }
    });
  };

  const handleApprove = () => {
    startTransition(async () => {
      try { await approveTimesheet(timesheetId); message.success('Timesheet approved & payment created'); setTimesheet((t) => t ? { ...t, status: 'approved' } : t); }
      catch (e) { message.error(e instanceof Error ? e.message : 'Failed'); }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      try { await rejectTimesheet(timesheetId); message.success('Timesheet rejected'); setTimesheet((t) => t ? { ...t, status: 'rejected' } : t); }
      catch (e) { message.error(e instanceof Error ? e.message : 'Failed'); }
    });
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Spin size="large" /></div>;
  if (error) return <Typography.Text type="danger">{error}</Typography.Text>;
  if (!timesheet) return null;

  const rowLabel = (row: TimesheetRow) => {
    if (row.entryType === 'project') return projects.find((p) => p.id === row.projectId)?.name || 'Project';
    return FIXED_LABELS[row.entryType] || row.entryType;
  };

  const dayTotals = DAYS.map((day) => (timesheet.rows || []).reduce((s, r) => s + Number((r as unknown as Record<string, number>)[day] || 0), 0));
  const grandTotal = dayTotals.reduce((s, v) => s + v, 0);
  const avgCostPerHr = Number(timesheet.siteEngineer?.salaryGrade?.avgCostPerHr || 0);
  const totalCost = grandTotal * avgCostPerHr;

  const columns: ColumnsType<TimesheetRow> = [
    { title: 'Entry', key: 'entry', width: 200, render: (_, row) => <Typography.Text strong>{rowLabel(row)}</Typography.Text> },
    ...DAYS.map((day, idx) => ({
      title: DAY_LABELS[idx],
      key: day,
      align: 'right' as const,
      width: 70,
      render: (_: unknown, row: TimesheetRow) => {
        const h = Number((row as unknown as Record<string, number>)[day] || 0);
        return h > 0 ? h : <Typography.Text type="secondary">-</Typography.Text>;
      },
    })),
    {
      title: 'Total', key: 'total', align: 'right', width: 80,
      render: (_, row) => {
        const total = DAYS.reduce((s, day) => s + Number((row as unknown as Record<string, number>)[day] || 0), 0);
        return <Typography.Text strong>{total}</Typography.Text>;
      },
    },
    { title: 'Remark', dataIndex: 'remark', responsive: ['md'], render: (v?: string | null) => v || '-' },
  ];

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} type="text" className="mb-3" onClick={() => router.push(`/dashboard/site-engineer-attendance/${employeeId}`)}>
        Back to {timesheet.siteEngineer?.name || 'employee'}&apos;s timesheets
      </Button>

      <Flex justify="space-between" align="center" wrap="wrap" gap={16} className={pageHeaderClassName}>
        <Flex align="center" gap={12}>
          <Avatar size={48} icon={<UserOutlined />} className="bg-sky-500/20! text-sky-300!" />
          <div>
            <Typography.Title level={3} className={`${pageTitleClassName} mb-0!`}>
              {formatDate(timesheet.weekStart)} - {formatDate(timesheet.weekEnd)}
            </Typography.Title>
            <Typography.Text className="text-[var(--text-muted)]">{timesheet.siteEngineer?.name}</Typography.Text>
          </div>
        </Flex>
        <StatusTag value={timesheet.status} />
      </Flex>

      <Row gutter={16} className="mb-4">
        <Col xs={12} sm={8}>
          <Card className={cardClassName}><Statistic title="Total Hours" value={grandTotal} precision={1} suffix="hrs" /></Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card className={cardClassName}><Statistic title="Total Cost" value={totalCost} precision={2} prefix="₹" formatter={(v) => formatCurrency(v as number).replace('₹', '')} /></Card>
        </Col>
      </Row>

      <Card className={cardClassName} styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={timesheet.rows || []}
          columns={columns}
          rowKey={(row) => row.id || `${row.entryType}-${row.projectId || ''}`}
          pagination={false}
          scroll={{ x: 'max-content' }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><Typography.Text strong>Total</Typography.Text></Table.Summary.Cell>
              {dayTotals.map((total, idx) => (
                <Table.Summary.Cell index={idx + 1} key={idx} align="right">
                  <Typography.Text strong>{total || '-'}</Typography.Text>
                </Table.Summary.Cell>
              ))}
              <Table.Summary.Cell index={8} align="right"><Typography.Text strong>{grandTotal}</Typography.Text></Table.Summary.Cell>
              <Table.Summary.Cell index={9} />
            </Table.Summary.Row>
          )}
        />
      </Card>

      <Flex justify="flex-end" gap={8} className="mt-4!">
        <Popconfirm title="Verify this timesheet?" onConfirm={handleVerify} disabled={timesheet.status !== 'pending' && timesheet.status !== 'submitted'}>
          <Button icon={<SafetyCertificateOutlined />} loading={isPending} disabled={timesheet.status !== 'pending' && timesheet.status !== 'submitted'}>
            Verify
          </Button>
        </Popconfirm>
        <Popconfirm title="Approve & create payment?" onConfirm={handleApprove} disabled={timesheet.status === 'approved' || timesheet.status === 'rejected'}>
          <Button type="primary" icon={<CheckCircleOutlined />} loading={isPending} disabled={timesheet.status === 'approved' || timesheet.status === 'rejected'}>
            Approve
          </Button>
        </Popconfirm>
        <Popconfirm title="Reject this timesheet?" onConfirm={handleReject} disabled={timesheet.status === 'approved' || timesheet.status === 'rejected'}>
          <Button danger icon={<CloseCircleOutlined />} loading={isPending} disabled={timesheet.status === 'approved' || timesheet.status === 'rejected'}>
            Reject
          </Button>
        </Popconfirm>
      </Flex>
    </div>
  );
}
