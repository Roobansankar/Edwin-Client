'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { App, Button, Card, Col, Flex, Popconfirm, Row, Select, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, DollarOutlined, FileTextOutlined } from '@ant-design/icons';
import { respondSubcontractorPaymentRequest } from '@/actions/subcontractor-payment-requests';
import type { SubcontractorPaymentRequest } from '@/types/erp';
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

type Props = { requests: SubcontractorPaymentRequest[] };

export function SubcontractorPaymentRequestsClient({ requests }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
        await respondSubcontractorPaymentRequest(id, action);
        message.success(
          action === 'accepted'
            ? 'Accepted — awaiting final admin approval'
            : action === 'admin_approved'
              ? 'Payment request given final approval'
              : 'Request rejected',
        );
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to respond to request');
      }
    });
  };

  const columns: ColumnsType<SubcontractorPaymentRequest> = [
    { title: '#', key: 'sno', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Subcontractor', key: 'subcontractor', width: 160, render: (_, record) => record.subcontractor?.name || record.subcontractorId },
    { title: 'Project', key: 'project', width: 160, responsive: ['md'], render: (_, record) => record.project?.name || '-' },
    { title: 'WO Number', key: 'wo', width: 130, responsive: ['lg'], render: (_, record) => record.subcontractWorkOrder?.woNumber || <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Amount', dataIndex: 'amount', align: 'right', width: 120, render: (value: number | string) => formatCurrency(value) },
    { title: 'WO Total', key: 'woTotal', align: 'right', width: 120, responsive: ['xl'], render: (_, record) =>
      record.subcontractWorkOrder?.totalAmount ? formatCurrency(record.subcontractWorkOrder.totalAmount) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    { title: 'Work Order', key: 'workorder', width: 100, responsive: ['xl'], render: (_, record) =>
      record.subcontractWorkOrder?.workorderUrl ? (
        <Button type="link" size="small" icon={<FileTextOutlined />} href={record.subcontractWorkOrder.workorderUrl} target="_blank">View</Button>
      ) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    { title: 'Notes', dataIndex: 'notes', width: 160, responsive: ['lg'], ellipsis: true, render: (value?: string | null) => value || '-' },
    { title: 'Requested At', dataIndex: 'createdAt', width: 120, responsive: ['md'], render: formatDate },
    {
      title: 'Status',
      key: 'status',
      width: 160,
      render: (_, record) => (
        <Tag color={STATUS_COLORS[record.status] || 'default'} className="whitespace-normal! text-center! leading-4! py-1!">
          {STATUS_LABELS[record.status] || record.status.toUpperCase()}
        </Tag>
      ),
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
                title="Accept payment request?"
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
                description={`Marks the ${formatCurrency(record.amount)} request as fully approved.`}
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
          <DollarOutlined className={titleIconClassName} /> Subcontractor Payment Requests
        </Typography.Title>
      </Flex>

      <Card className={cardClassName}>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={12} sm={6}>
            <Card size="small" className="border! border-amber-500/20! bg-amber-500/5!">
              <Statistic title={<Tag color="warning">Pending</Tag>} value={counts.pending} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" className="border! border-blue-500/20! bg-blue-500/5!">
              <Statistic title={<Tag color="blue">Accepted</Tag>} value={counts.accepted} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" className="border! border-emerald-500/20! bg-emerald-500/5!">
              <Statistic title={<Tag color="success">Admin Approved</Tag>} value={counts.adminApproved} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" className="border! border-red-500/20! bg-red-500/5!">
              <Statistic title={<Tag color="error">Rejected</Tag>} value={counts.rejected} />
            </Card>
          </Col>
        </Row>

        <Flex justify="flex-end" className="mb-4!">
          <Select
            allowClear
            placeholder="Filter by status"
            style={{ width: isMobile ? '100%' : 200 }}
            value={statusFilter || undefined}
            onChange={(val) => setStatusFilter(val || '')}
            options={STATUS_OPTIONS}
          />
        </Flex>

        {isMobile ? (
          <div className="flex flex-col">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-gray-400">No subcontractor payment requests from purchase team</div>
            ) : (
              filtered.map((record) => {
                const pendingActions = record.status === 'pending';
                const acceptedActions = record.status === 'accepted' && isAdmin;
                return (
                  <div key={record.id} className="border-b border-[var(--border)] p-3 last:border-b-0">
                    <Flex justify="space-between" align="center" className="mb-1">
                      <Typography.Text strong className="text-sm">{record.subcontractor?.name || record.subcontractorId}</Typography.Text>
                      <Tag color={STATUS_COLORS[record.status] || 'default'} className="m-0!">
                        {STATUS_LABELS[record.status] || record.status.toUpperCase()}
                      </Tag>
                    </Flex>
                    <div className="flex flex-col gap-0.5 text-xs text-[var(--text-muted)]">
                      {record.project?.name && <span>Project: {record.project.name}</span>}
                      {record.subcontractWorkOrder?.woNumber && <span>WO: {record.subcontractWorkOrder.woNumber}</span>}
                      <Flex justify="space-between" align="center" className="mt-1">
                        <Typography.Text strong>{formatCurrency(record.amount)}</Typography.Text>
                        <span>{record.createdAt ? formatDate(record.createdAt) : ''}</span>
                      </Flex>
                    </div>
                    {(pendingActions || acceptedActions) && (
                      <Flex gap={8} className="mt-2">
                        {pendingActions && (
                          <>
                            <Popconfirm
                              title="Accept payment request?"
                              onConfirm={() => handleRespond(record.id, 'accepted')}
                              okText="Yes, accept"
                              cancelText="No"
                            >
                              <Button size="small" type="primary" ghost icon={<CheckOutlined />} loading={isPending}>Accept</Button>
                            </Popconfirm>
                            <Popconfirm
                              title="Reject this request?"
                              onConfirm={() => handleRespond(record.id, 'rejected')}
                              okText="Yes"
                              cancelText="No"
                              okButtonProps={{ danger: true }}
                            >
                              <Button size="small" danger icon={<CloseOutlined />} loading={isPending}>Reject</Button>
                            </Popconfirm>
                          </>
                        )}
                        {acceptedActions && (
                          <>
                            <Popconfirm
                              title="Give final approval?"
                              onConfirm={() => handleRespond(record.id, 'admin_approved')}
                              okText="Yes, approve"
                              cancelText="No"
                            >
                              <Button size="small" type="primary" ghost icon={<CheckOutlined />} loading={isPending}>Final Approve</Button>
                            </Popconfirm>
                            <Popconfirm
                              title="Reject this request?"
                              onConfirm={() => handleRespond(record.id, 'rejected')}
                              okText="Yes"
                              cancelText="No"
                              okButtonProps={{ danger: true }}
                            >
                              <Button size="small" danger icon={<CloseOutlined />} loading={isPending}>Reject</Button>
                            </Popconfirm>
                          </>
                        )}
                      </Flex>
                    )}
                    {record.status === 'accepted' && !isAdmin && (
                      <Typography.Text type="secondary" className="text-xs mt-2 block">Awaiting admin approval</Typography.Text>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1300 }}
            locale={{ emptyText: 'No subcontractor payment requests from purchase team' }}
          />
        )}
      </Card>
    </div>
  );
}
