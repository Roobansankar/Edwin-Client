'use client';

import { useMemo, useState, useTransition } from 'react';
import { App, Button, Card, Col, Flex, Popconfirm, Row, Select, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, DollarOutlined, FileTextOutlined } from '@ant-design/icons';
import { respondAdvanceRequest } from '@/actions/advance-requests';
import type { AdvanceRequest } from '@/types/erp';
import { useAuthStore } from '@/store/auth';
import { cardClassName, formatCurrency, formatDate, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';

const STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  accepted: 'blue',
  admin_approved: 'green',
  rejected: 'red',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'PENDING',
  accepted: 'ACCEPTED BY ACCOUNTS',
  admin_approved: 'ADMIN APPROVED',
  rejected: 'REJECTED',
};

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted by Accounts', value: 'accepted' },
  { label: 'Admin Approved', value: 'admin_approved' },
  { label: 'Rejected', value: 'rejected' },
];

type Props = { requests: AdvanceRequest[] };

export function AdvanceRequestsClient({ requests }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const filtered = useMemo(
    () => (statusFilter ? requests.filter((r) => r.status === statusFilter) : requests),
    [requests, statusFilter],
  );

  const counts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === 'pending').length,
      accepted: requests.filter((r) => r.status === 'accepted').length,
      adminApproved: requests.filter((r) => r.status === 'admin_approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    }),
    [requests],
  );

  const handleRespond = (id: string, action: 'accepted' | 'admin_approved' | 'rejected') => {
    startTransition(async () => {
      try {
        await respondAdvanceRequest(id, action);
        message.success(
          action === 'accepted'
            ? 'Accepted — awaiting final admin approval'
            : action === 'admin_approved'
              ? 'Vendor payment request given final approval'
              : 'Request rejected',
        );
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to respond to request');
      }
    });
  };

  const columns: ColumnsType<AdvanceRequest> = [
    { title: '#', key: 'sno', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Vendor', key: 'vendor', render: (_, record) => record.vendor?.name || record.vendorId },
    { title: 'Project', key: 'project', render: (_, record) => record.project?.name || '-' },
    { title: 'MR Ref', dataIndex: 'materialRequirementNo', render: (value?: string | null) => value || <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Amount', dataIndex: 'amount', align: 'right', render: (value: number | string) => formatCurrency(value) },
    { title: 'Total Amount', key: 'quotedTotal', align: 'right', render: (_, record) =>
      record.vendorQuotation?.totalAmount ? formatCurrency(record.vendorQuotation.totalAmount) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    { title: 'Quotation', key: 'quotation', render: (_, record) =>
      record.vendorQuotation?.quotationUrl ? (
        <Button type="link" size="small" icon={<FileTextOutlined />} href={record.vendorQuotation.quotationUrl} target="_blank">View</Button>
      ) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    { title: 'Notes', dataIndex: 'notes', ellipsis: true, render: (value?: string | null) => value || '-' },
    { title: 'Requested At', dataIndex: 'createdAt', width: 130, render: formatDate },
    {
      title: 'Status',
      key: 'status',
      width: 150,
      render: (_, record) => <Tag color={STATUS_COLORS[record.status] || 'default'}>{STATUS_LABELS[record.status] || record.status.toUpperCase()}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => {
        if (record.status === 'pending') {
          return (
            <Flex gap={8}>
              <Popconfirm
                title="Accept vendor payment request?"
                description={`Marks the ${formatCurrency(record.amount)} request as accepted — it will still need final admin approval.`}
                onConfirm={() => handleRespond(record.id, 'accepted')}
                okText="Yes, accept"
                cancelText="No"
              >
                <Button size="small" type="primary" ghost icon={<CheckOutlined />} loading={isPending}>
                  Accept
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
          );
        }
        if (record.status === 'accepted') {
          if (!isAdmin) {
            return <Typography.Text type="secondary" className="text-xs">Awaiting admin approval</Typography.Text>;
          }
          return (
            <Flex gap={8}>
              <Popconfirm
                title="Give final approval?"
                description={`Marks the ${formatCurrency(record.amount)} request as fully approved — it will count toward the vendor's advance on Purchase Orders.`}
                onConfirm={() => handleRespond(record.id, 'admin_approved')}
                okText="Yes, approve"
                cancelText="No"
              >
                <Button size="small" type="primary" ghost icon={<CheckOutlined />} loading={isPending}>
                  Final Approve
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
          );
        }
        return (
          <Typography.Text type="secondary" className="text-xs">
            {record.respondedAt ? `Responded ${formatDate(record.respondedAt)}` : '-'}
          </Typography.Text>
        );
      },
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <DollarOutlined className={titleIconClassName} /> Vendor Payment Requests
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
            <Card size="small" className="border! border-blue-500/20! bg-blue-500/5!">
              <Statistic title={<Tag color="blue">Accepted</Tag>} value={counts.accepted} />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Card size="small" className="border! border-emerald-500/20! bg-emerald-500/5!">
              <Statistic title={<Tag color="success">Admin Approved</Tag>} value={counts.adminApproved} />
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
          locale={{ emptyText: 'No vendor payment requests from purchase team' }}
        />
      </Card>
    </div>
  );
}
