'use client';

import { useMemo, useState, useTransition } from 'react';
import { App, Button, Card, Col, DatePicker, Drawer, Flex, Form, Input, InputNumber, Popconfirm, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, DollarOutlined, FilePdfOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { respondAdvanceRequest } from '@/actions/advance-requests';
import { createPayment } from '@/actions/payments';
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

  // Recording the payment straight from here creates a real row on the
  // Master Ledger (/dashboard/payments) — same as filling in that page's
  // "Record Direct Payment" form by hand and picking this request there,
  // just without leaving this page.
  const [payTarget, setPayTarget] = useState<AdvanceRequest | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(dayjs());
  const [payMode, setPayMode] = useState('upi');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const openPay = (record: AdvanceRequest) => {
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
          paymentType: 'material',
          advanceRequestId: payTarget.id,
          purchaseOrderId: payTarget.purchaseOrderId || undefined,
          vendorId: payTarget.vendorId,
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

  const columns: ColumnsType<AdvanceRequest> = [
    { title: '#', key: 'sno', width: 50, render: (_, __, i) => i + 1 },
    { title: 'PO Number', key: 'po', render: (_, record) => record.purchaseOrder?.poNumber || <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Vendor', key: 'vendor', render: (_, record) => record.vendor?.name || record.vendorId },
    { title: 'Project', key: 'project', render: (_, record) => record.project?.name || '-' },
    { title: 'MR Ref', key: 'mrRef', render: (_, record) => {
      const mrRef = record.materialRequirementNo || record.purchaseOrder?.materialRequirementNo;
      return mrRef || <Typography.Text type="secondary">-</Typography.Text>;
    } },
    { title: 'Amount', dataIndex: 'amount', align: 'right', render: (value: number | string) => formatCurrency(value) },
    { title: 'Total Amount', key: 'poTotal', align: 'right', render: (_, record) => {
      const poTotal = record.purchaseOrder ? (record.purchaseOrder.totalWithGst || record.purchaseOrder.totalAmount) : record.vendorQuotation?.totalAmount;
      return poTotal ? formatCurrency(poTotal) : <Typography.Text type="secondary">-</Typography.Text>;
    } },
    { title: 'PO Document', key: 'poDocument', render: (_, record) => {
      const url = record.purchaseOrder?.billFileUrl || record.vendorQuotation?.quotationUrl;
      return url ? (
        <Button type="link" size="small" icon={<FilePdfOutlined />} href={url} target="_blank">View</Button>
      ) : <Typography.Text type="secondary">-</Typography.Text>;
    } },
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
          scroll={{ x: 1200 }}
          locale={{ emptyText: 'No vendor payment requests from purchase team' }}
        />
      </Card>

      <Drawer
        title={payTarget ? `Record Payment — ${payTarget.vendor?.name || ''}` : 'Record Payment'}
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
            <Form.Item label="Vendor">
              <Input value={payTarget.vendor?.name || '-'} disabled />
            </Form.Item>
            <Form.Item label="Project">
              <Input value={payTarget.project?.name || '-'} disabled />
            </Form.Item>
            {payTarget.purchaseOrder?.poNumber && (
              <Form.Item label="PO Number">
                <Input value={payTarget.purchaseOrder.poNumber} disabled />
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
