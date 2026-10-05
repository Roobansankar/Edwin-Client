'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Col, DatePicker, Descriptions, Drawer, Flex, Form, Input, InputNumber, Popconfirm, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, DollarOutlined, FileTextOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { respondSubcontractorPaymentRequest } from '@/actions/subcontractor-payment-requests';
import { createPayment } from '@/actions/payments';
import type { Payment, SubcontractorPaymentRequest } from '@/types/erp';
import { useAuthStore } from '@/store/auth';
import { cardClassName, formatCurrency, formatDate, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';

// Status shown in the table. The request stays 'admin_approved' in the
// database (the payment rules depend on that), and it is shown as Paid once
// the payments recorded against it cover the full amount.
const STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  accepted: 'blue',
  admin_approved: 'gold',
  paid: 'success',
  rejected: 'red',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'PENDING',
  accepted: 'ACCEPTED BY ACCOUNTS',
  admin_approved: 'PAYMENT PENDING',
  paid: 'PAID',
  rejected: 'REJECTED',
};

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted by Accounts', value: 'accepted' },
  { label: 'Payment Pending', value: 'admin_approved' },
  { label: 'Paid', value: 'paid' },
  { label: 'Rejected', value: 'rejected' },
];

type Props = {
  requests: SubcontractorPaymentRequest[];
  payments: Payment[];
};

type RequestRow = {
  request: SubcontractorPaymentRequest;
  paid: number;
  balance: number;
  payDate: string | null;
  displayStatus: string;
};

export function SubcontractorPaymentRequestsClient({ requests, payments }: Props) {
  const router = useRouter();
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

  const rows = useMemo<RequestRow[]>(() => {
    const paidById = new Map<string, { total: number; lastDate: string | null }>();
    for (const p of payments) {
      if (!p.subcontractorPaymentRequestId) continue;
      const current = paidById.get(p.subcontractorPaymentRequestId) || { total: 0, lastDate: null };
      current.total += Number(p.amount || 0);
      const date = p.paymentDate ? p.paymentDate.split('T')[0] : null;
      if (date && (!current.lastDate || date > current.lastDate)) current.lastDate = date;
      paidById.set(p.subcontractorPaymentRequestId, current);
    }

    return requests.map((request) => {
      const payment = paidById.get(request.id);
      const paid = payment?.total || 0;
      const balance = Number(request.amount || 0) - paid;
      const isPaid = request.status === 'admin_approved' && paid > 0 && balance <= 0;
      return {
        request,
        paid,
        balance,
        payDate: payment?.lastDate || null,
        displayStatus: isPaid ? 'paid' : request.status,
      };
    });
  }, [requests, payments]);

  const filtered = useMemo(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    return rows.filter((row) => {
      const r = row.request;
      if (statusFilter && row.displayStatus !== statusFilter) return false;
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
  }, [rows, statusFilter, searchText, dateRange]);

  const counts = useMemo(
    () => ({
      pending: rows.filter((r) => r.displayStatus === 'pending').length,
      accepted: rows.filter((r) => r.displayStatus === 'accepted').length,
      paymentPending: rows.filter((r) => r.displayStatus === 'admin_approved').length,
      paid: rows.filter((r) => r.displayStatus === 'paid').length,
    }),
    [rows],
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
  const [payTarget, setPayTarget] = useState<RequestRow | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(dayjs());
  const [payMode, setPayMode] = useState('upi');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const openPay = (row: RequestRow) => {
    setPayTarget(row);
    setPayAmount(Math.max(row.balance, 0));
    setPayDate(dayjs());
    setPayMode('upi');
    setPayRef('');
    setPayNotes('');
  };

  const submitPayment = () => {
    if (!payTarget) return;
    const target = payTarget.request;
    startTransition(async () => {
      try {
        await createPayment({
          paymentType: 'labour',
          subcontractorPaymentRequestId: target.id,
          subcontractWorkOrderId: target.subcontractWorkOrderId || undefined,
          payeeName: target.subcontractor?.name,
          projectId: target.projectId,
          amount: payAmount,
          paymentDate: payDate.format('YYYY-MM-DD'),
          paymentMode: payMode,
          referenceNumber: payRef || undefined,
          notes: payNotes || undefined,
        });
        message.success('Payment completed. Status set to Paid once the full amount is paid');
        setPayTarget(null);
        router.refresh();
      } catch (error) {
        // Failed payments leave the request as Payment Pending.
        message.error(error instanceof Error ? error.message : 'Failed to record payment');
      }
    });
  };

  const renderActions = (row: RequestRow) => {
    const record = row.request;
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
      if (row.displayStatus === 'paid') {
        return <Typography.Text type="secondary">-</Typography.Text>;
      }
      return (
        <Button size="small" type="primary" icon={<DollarOutlined />} onClick={() => openPay(row)}>
          Record Payment
        </Button>
      );
    }
    return (
      <Typography.Text type="secondary" className="text-xs">
        {record.respondedAt ? `Responded ${formatDate(record.respondedAt)}` : '-'}
      </Typography.Text>
    );
  };

  const columns: ColumnsType<RequestRow> = [
    { title: 'S.No', key: 'sno', width: 70, align: 'right', render: (_, __, i) => i + 1 },
    { title: 'Date', key: 'date', width: 100, render: (_, r) => (r.request.createdAt ? dayjs(r.request.createdAt).format('DD-MMM') : '-') },
    { title: 'Subcontractor Name', key: 'subcontractor', width: 200, ellipsis: true, render: (_, r) => r.request.subcontractor?.name || r.request.subcontractorId },
    { title: 'WO No', key: 'wo', width: 110, render: (_, r) => r.request.subcontractWorkOrder?.woNumber || <Typography.Text type="secondary">-</Typography.Text> },
    {
      title: 'Amount', key: 'amount', width: 130, align: 'right',
      render: (_, r) => <Typography.Text strong>{formatCurrency(r.request.amount)}</Typography.Text>,
    },
    { title: 'Pay Date', key: 'payDate', width: 110, align: 'right', render: (_, r) => (r.payDate ? dayjs(r.payDate).format('DD-MMM') : '-') },
    {
      title: 'Status', key: 'status', width: 170,
      render: (_, r) => (
        <Tag color={STATUS_COLORS[r.displayStatus] || 'default'} className="whitespace-normal! text-center! leading-4! py-1!">
          {STATUS_LABELS[r.displayStatus] || r.displayStatus.toUpperCase()}
        </Tag>
      ),
    },
    { title: 'Action', key: 'actions', width: 200, render: (_, r) => renderActions(r) },
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
            <Card size="small" className="border! border-yellow-500/20! bg-yellow-500/5!">
              <Statistic title={<Tag color="gold">Payment Pending</Tag>} value={counts.paymentPending} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" className="border! border-emerald-500/20! bg-emerald-500/5!">
              <Statistic title={<Tag color="success">Paid</Tag>} value={counts.paid} />
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
          rowKey={(row) => row.request.id}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: 'No subcontractor payment requests from purchase team' }}
          expandable={{
            expandedRowRender: (row) => {
              const r = row.request;
              return (
                <Descriptions
                  size="small"
                  column={{ xs: 1, md: 2 }}
                  items={[
                    { key: 'project', label: 'Project', children: r.project?.name || '-' },
                    { key: 'woTotal', label: 'WO Total', children: r.subcontractWorkOrder?.totalAmount ? formatCurrency(r.subcontractWorkOrder.totalAmount) : '-' },
                    { key: 'paid', label: 'Paid so far', children: formatCurrency(row.paid) },
                    { key: 'balance', label: 'Balance', children: formatCurrency(Math.max(row.balance, 0)) },
                    { key: 'requested', label: 'Requested At', children: r.createdAt ? formatDate(r.createdAt) : '-' },
                    { key: 'notes', label: 'Notes', children: r.notes || '-' },
                    {
                      key: 'wo-doc', label: 'Work Order',
                      children: r.subcontractWorkOrder?.workorderUrl ? (
                        <Button type="link" size="small" icon={<FileTextOutlined />} href={r.subcontractWorkOrder.workorderUrl} target="_blank" className="p-0!">
                          View
                        </Button>
                      ) : '-',
                    },
                  ]}
                />
              );
            },
          }}
        />
      </Card>

      <Drawer
        title={payTarget ? `Record Payment — ${payTarget.request.subcontractor?.name || ''}` : 'Record Payment'}
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
              <Input value={payTarget.request.subcontractor?.name || '-'} disabled />
            </Form.Item>
            <Form.Item label="Project">
              <Input value={payTarget.request.project?.name || '-'} disabled />
            </Form.Item>
            {payTarget.request.subcontractWorkOrder?.woNumber && (
              <Form.Item label="WO Number">
                <Input value={payTarget.request.subcontractWorkOrder.woNumber} disabled />
              </Form.Item>
            )}
            <Form.Item label={`Amount Paid (balance ${formatCurrency(Math.max(payTarget.balance, 0))})`} required>
              <InputNumber
                className="w-full"
                prefix="₹"
                min={1}
                max={Math.max(payTarget.balance, 0)}
                value={payAmount}
                onChange={(v) => setPayAmount(Number(v) || 0)}
              />
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
