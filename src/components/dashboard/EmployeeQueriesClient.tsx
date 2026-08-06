'use client';

import { useMemo, useState, useTransition } from 'react';
import { App, Button, Card, Col, Flex, Popconfirm, Row, Select, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, SolutionOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { respondEmployeeQuery } from '@/actions/employee-queries';
import type { EmployeeQuery } from '@/types/erp';
import { cardClassName, formatDate, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dayLabel(record: EmployeeQuery): string {
  if (record.dayIndex === null || record.dayIndex === undefined || !record.timesheet?.weekStart) {
    return 'Whole week';
  }
  const date = dayjs(record.timesheet.weekStart).add(record.dayIndex, 'day');
  return `${DAY_LABELS[record.dayIndex]} (${date.format('D MMM')})`;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
};

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

type Props = { queries: EmployeeQuery[] };

export function EmployeeQueriesClient({ queries }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();

  const filtered = useMemo(
    () => (statusFilter ? queries.filter((q) => q.status === statusFilter) : queries),
    [queries, statusFilter],
  );

  const counts = useMemo(
    () => ({
      pending: queries.filter((q) => q.status === 'pending').length,
      approved: queries.filter((q) => q.status === 'approved').length,
      rejected: queries.filter((q) => q.status === 'rejected').length,
    }),
    [queries],
  );

  const handleRespond = (id: string, action: 'approved' | 'rejected') => {
    startTransition(async () => {
      try {
        await respondEmployeeQuery(id, action);
        message.success(action === 'approved' ? 'Edit access granted — timesheet reopened' : 'Request rejected');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to respond to request');
      }
    });
  };

  const columns: ColumnsType<EmployeeQuery> = [
    { title: '#', key: 'sno', width: 50, render: (_, __, i) => i + 1 },
    {
      title: 'Site Engineer',
      key: 'engineer',
      render: (_, record) => record.siteEngineer?.name || record.siteEngineer?.email || record.siteEngineerId,
    },
    {
      title: 'Timesheet Week',
      key: 'week',
      render: (_, record) =>
        record.timesheet ? `${formatDate(record.timesheet.weekStart)} - ${formatDate(record.timesheet.weekEnd)}` : '-',
    },
    {
      title: 'Day',
      key: 'day',
      width: 130,
      render: (_, record) => <Tag color={record.dayIndex !== null && record.dayIndex !== undefined ? 'geekblue' : 'default'}>{dayLabel(record)}</Tag>,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      ellipsis: true,
    },
    {
      title: 'Requested At',
      dataIndex: 'createdAt',
      width: 130,
      render: formatDate,
    },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_, record) => <Tag color={STATUS_COLORS[record.status] || 'default'}>{record.status.toUpperCase()}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record) =>
        record.status === 'pending' ? (
          <Flex gap={8}>
            <Popconfirm
              title="Grant edit access?"
              description={`Reopens ${dayLabel(record)} only — the rest of the week stays locked.`}
              onConfirm={() => handleRespond(record.id, 'approved')}
              okText="Yes, grant access"
              cancelText="No"
            >
              <Button size="small" type="primary" ghost icon={<CheckOutlined />} loading={isPending}>
                Approve
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Reject this request?"
              onConfirm={() => handleRespond(record.id, 'rejected')}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<CloseOutlined />} loading={isPending}>
                Reject
              </Button>
            </Popconfirm>
          </Flex>
        ) : (
          <Typography.Text type="secondary" className="text-xs">
            {record.respondedAt ? `Responded ${formatDate(record.respondedAt)}` : '-'}
          </Typography.Text>
        ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <SolutionOutlined className={titleIconClassName} /> Employee Queries
        </Typography.Title>
      </Flex>

      <Card className={cardClassName}>
        <Row gutter={16} className="mb-4">
          <Col xs={12} sm={6} md={4}>
            <Card size="small" className="border! border-amber-500/20! bg-amber-500/5!">
              <Statistic title={<Tag color="warning">Pending</Tag>} value={counts.pending} />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" className="border! border-emerald-500/20! bg-emerald-500/5!">
              <Statistic title={<Tag color="success">Approved</Tag>} value={counts.approved} />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" className="border! border-red-500/20! bg-red-500/5!">
              <Statistic title={<Tag color="error">Rejected</Tag>} value={counts.rejected} />
            </Card>
          </Col>
        </Row>

        <Flex justify="flex-end" className="mb-4!">
          <Select
            allowClear
            placeholder="Filter by status"
            style={{ width: 200 }}
            value={statusFilter || undefined}
            onChange={(val) => setStatusFilter(val || '')}
            options={STATUS_OPTIONS}
          />
        </Flex>

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
          locale={{ emptyText: 'No edit requests from site engineers' }}
        />
      </Card>
    </div>
  );
}
