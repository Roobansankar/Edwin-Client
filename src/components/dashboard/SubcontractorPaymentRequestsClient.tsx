'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { App, Button, Card, Col, DatePicker, Drawer, Flex, Form, Input, InputNumber, Popconfirm, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, DollarOutlined, FileTextOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { respondSubcontractorPaymentRequest } from '@/actions/subcontractor-payment-requests';
import { createPayment } from '@/actions/payments';
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
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
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

  const filtered = useMemo(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    return requests.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (from && to) {
        const created = r.createdAt ? r.createdAt.split('T')[0] : '';
        if (created < from || created > to) return false;
      }
      if (searchText) {
        const q = searchText.toLowerCase();
        const haystack = [r.subcontractWorkOrder?.woNumber, r.subcontractor?.name, r.project?.name, r.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [requests, statusFilter, searchText, dateRange],
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

  // Recording the payment straight from here creates a real row on the
  // Master Ledger (/dashboard/payments) — same as filling in that page's
  // "Record Direct Payment" form by hand and picking this request there,
  // just without leaving this page.
  const [payTarget, setPayTarget] = useState<SubcontractorPaymentRequest | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(dayjs());
  const [payMode, setPayMode] = useState('upi');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const openPay = (record: SubcontractorPaymentRequest) => {
    setPayTarget(record);
    setPayAmount(Number(record.amount));
    setPayDate(dayjs());
    setPayMode('upi');
    setPayRef('');
    setPayNotes('');
  };

  const submitPayment = () => {
    if (!payTarget) return;
    startTransition(async () => {
      try {
        await createPayment({
          paymentType: 'labour',
          subcontractorPaymentRequestId: payTarget.id,
          subcontractWorkOrderId: payTarget.subcontractWorkOrderId || undefined,
          payeeName: payTarget.subcontractor?.name,
          projectId: payTarget.projectId,
          amount: payAmount,
          paymentDate: payDate.format('YYYY-MM-DD'),
          paymentMode: payMode,
          referenceNumber: payRef || undefined,
          notes: payNotes || undefined,
        });
        message.success('Payment recorded — see it on the Payments (Master Ledger) page');
        setPayTarget(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to record payment');
      }
    });
  };

  const columns: ColumnsType<SubcontractorPaymentRequest> = [
    { title: '#', key: 'sno', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Subcontractor', key: 'subcontractor', width: 160, render: (_, record) => record.subcontractor?.name || record.subcontractorId },
    { title: 'Project', key: 'project', width: 160, render: (_, record) => record.project?.name || '-' },
    { title: 'WO Number', key: 'wo', width: 130, render: (_, record) => record.subcontractWorkOrder?.woNumber || <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Amount', dataIndex: 'amount', align: 'right', width: 120, render: (value: number | string) => formatCurrency(value) },
    { title: 'WO Total', key: 'woTotal', align: 'right', width: 120, render: (_, record) =>
      record.subcontractWorkOrder?.totalAmount ? formatCurrency(record.subcontractWorkOrder.totalAmount) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    { title: 'Work Order', key: 'workorder', width: 100, render: (_, record) =>
      record.subcontractWorkOrder?.workorderUrl ? (
        <Button type="link" size="small" icon={<FileTextOutlined />} href={record.subcontractWorkOrder.workorderUrl} target="_blank">View</Button>
      ) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    { title: 'Notes', dataIndex: 'notes', width: 160, ellipsis: true, render: (value?: string | null) => value || '-' },
    { title: 'Requested At', dataIndex: 'createdAt', width: 120, render: formatDate },
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
        if (record.status === 'admin_approved') {
          return (
            <Button size="small" type="primary" icon={<DollarOutlined />} onClick={() => openPay(record)}>
              Record Payment
            </Button>
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

        <Flex justify="flex-end" gap={12} wrap="wrap" className="mb-4!">
          <Input.Search
            placeholder="Search WO, subcontractor, project..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
            style={{ width: isMobile ? '100%' : 220 }}
          />
          <DatePicker.RangePicker
            value={dateRange[0] || dateRange[1] ? dateRange : [null, null]}
            onChange={(dates) => setDateRange(dates ? [dates[0], dates[1]] : [null, null])}
            allowClear
            style={{ width: isMobile ? '100%' : undefined }}
            placeholder={['From date', 'To date']}
          />
          <Select
            allowClear
            placeholder="Filter by status"
            style={{ width: isMobile ? '100%' : 200 }}
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
          scroll={{ x: 1300 }}
          locale={{ emptyText: 'No subcontractor payment requests from purchase team' }}
        />
      </Card>

      <Drawer
        title={payTarget ? `Record Payment — ${payTarget.subcontractor?.name || ''}` : 'Record Payment'}
        size={420}
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        extra={
          <Space>
            <Button onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={submitPayment}>
              Save Payment
            </Button>
          </Space>
        }
      >
        {payTarget && (
          <Form layout="vertical">
            <Form.Item label="Subcontractor">
              <Input value={payTarget.subcontractor?.name || '-'} disabled />
            </Form.Item>
            <Form.Item label="Project">
              <Input value={payTarget.project?.name || '-'} disabled />
            </Form.Item>
            {payTarget.subcontractWorkOrder?.woNumber && (
              <Form.Item label="WO Number">
                <Input value={payTarget.subcontractWorkOrder.woNumber} disabled />
              </Form.Item>
            )}
            <Form.Item label="Amount Paid" required>
              <InputNumber className="w-full" prefix="₹" min={1} value={payAmount} onChange={(v) => setPayAmount(Number(v) || 0)} />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Date">
                  <DatePicker className="w-full" value={payDate} onChange={(d) => d && setPayDate(d)} format="DD-MM-YYYY" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Mode">
                  <Select
                    value={payMode}
                    onChange={setPayMode}
                    options={[
                      { label: 'UPI', value: 'upi' },
                      { label: 'RTGS', value: 'rtgs' },
                      { label: 'Cash', value: 'cash' },
                      { label: 'Cheque', value: 'cheque' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="UTR / Reference Number">
              <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Transaction ID" />
            </Form.Item>
            <Form.Item label="Notes">
              <Input.TextArea rows={3} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
            </Form.Item>
          </Form>
        )}
      </Drawer>
    </div>
  );
}
