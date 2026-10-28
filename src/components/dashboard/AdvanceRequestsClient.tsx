'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Col, DatePicker, Descriptions, Drawer, Flex, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, DollarOutlined, EyeOutlined, FilePdfOutlined, HistoryOutlined, SearchOutlined } from '@ant-design/icons';
import Link from 'next/link';
import dayjs from 'dayjs';
import { respondAdvanceRequest } from '@/actions/advance-requests';
import { createPayment } from '@/actions/payments';
import { PaymentRowForm } from './PaymentRowForm';
import { PaymentApprovalTag } from './PaymentApprovalTag';
import type { AdvanceRequest, Payment, PurchaseBill } from '@/types/erp';
import { useAuthStore } from '@/store/auth';
import { cardClassName, formatCurrency, formatDate, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';

// Status shown in the table. A request stays 'admin_approved' in the database
// (Purchase Order advances depend on that), and it is shown as Paid once the
// payments recorded against it cover the full amount.
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
  paid: 'REQUEST FULLY PAID',
  rejected: 'REJECTED',
};

// Amount accounts must pay: admin's final amount when set, else the request amount.
const payableAmount = (r: AdvanceRequest) =>
  r.approvedAmount !== null && r.approvedAmount !== undefined && r.approvedAmount !== ''
    ? Number(r.approvedAmount)
    : Number(r.amount || 0);

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted by Accounts', value: 'accepted' },
  { label: 'Payment Pending', value: 'admin_approved' },
  { label: 'Paid', value: 'paid' },
  { label: 'Rejected', value: 'rejected' },
];

type Props = {
  requests: AdvanceRequest[];
  bills: PurchaseBill[];
  payments: Payment[];
  // Shown inside the Payments page's Vendor Payment tab: no page title.
  embedded?: boolean;
  mode?: 'approvals' | 'payments' | 'all';
};

type RequestRow = {
  request: AdvanceRequest;
  paid: number;
  balance: number;
  payDate: string | null;
  billNo: string;
  // First bill raised against the request's PO; the eye icon opens it.
  billId: string | null;
  displayStatus: string;
  // Payments recorded against this request, oldest first.
  paymentList: Payment[];
  // Whole-PO view (same as the purchase team's Vendor Payments page): PO total
  // incl. GST, all payments on the PO and what is still owed to the vendor.
  // Null when the request has no PO.
  po: { total: number; paid: number; balance: number; payments: Payment[] } | null;
};

export function AdvanceRequestsClient({ requests, bills, payments, embedded = false, mode = 'all' }: Props) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const isAccounts = user?.role === 'accounts_manager';

  const rows = useMemo<RequestRow[]>(() => {
    const paidById = new Map<string, { total: number; lastDate: string | null; list: Payment[] }>();
    for (const p of payments) {
      if (!p.advanceRequestId) continue;
      const current = paidById.get(p.advanceRequestId) || { total: 0, lastDate: null, list: [] };
      current.list.push(p);
      current.total += Number(p.amount || 0);
      const date = p.paymentDate ? p.paymentDate.split('T')[0] : null;
      if (date && (!current.lastDate || date > current.lastDate)) current.lastDate = date;
      paidById.set(p.advanceRequestId, current);
    }

    const paymentsByPo = new Map<string, Payment[]>();
    for (const p of payments) {
      if (!p.purchaseOrderId) continue;
      const list = paymentsByPo.get(p.purchaseOrderId) || [];
      list.push(p);
      paymentsByPo.set(p.purchaseOrderId, list);
    }

    const billNumbersByPo = new Map<string, string[]>();
    for (const b of bills) {
      if (!b.purchaseOrderId) continue;
      const list = billNumbersByPo.get(b.purchaseOrderId) || [];
      list.push(b.billNumber);
      billNumbersByPo.set(b.purchaseOrderId, list);
    }

    return requests.map((request) => {
      const payment = paidById.get(request.id);
      const paid = payment?.total || 0;
      const balance = payableAmount(request) - paid;
      const isPaid = request.status === 'admin_approved' && paid > 0 && balance <= 0;
      const billNumbers = request.purchaseOrderId ? billNumbersByPo.get(request.purchaseOrderId) : undefined;
      const bill = request.purchaseBill || bills.find((entry) => request.purchaseBillId ? entry.id === request.purchaseBillId : !!request.purchaseOrderId && entry.purchaseOrderId === request.purchaseOrderId);
      return {
        request,
        paid,
        balance,
        payDate: payment?.lastDate || null,
        billNo: bill?.billNumber || billNumbers?.join(', ') || '-',
        billId: typeof request.purchaseBillId === 'string' && request.purchaseBillId
          ? request.purchaseBillId
          : typeof bill?.id === 'string' && bill.id ? bill.id : null,
        displayStatus: isPaid ? 'paid' : request.status,
        paymentList: [...(payment?.list || [])].sort((a, b) => (a.paymentDate || '').localeCompare(b.paymentDate || '')),
        po: (() => {
          if (!request.purchaseOrderId) return null;
          const poPayments = [...(paymentsByPo.get(request.purchaseOrderId) || [])]
            .sort((a, b) => (a.paymentDate || '').localeCompare(b.paymentDate || ''));
          const total = Number(request.purchaseOrder?.totalWithGst || request.purchaseOrder?.totalAmount || 0);
          const poPaid = poPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
          return { total, paid: poPaid, balance: total - poPaid, payments: poPayments };
        })(),
      };
    });
  }, [requests, payments, bills]);

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
        const haystack = [r.purchaseOrder?.poNumber, r.vendor?.name, r.project?.name, r.materialRequirementNo, row.billNo]
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

  const handleRespond = (id: string, action: 'accepted' | 'admin_approved' | 'rejected', approvedAmount?: number) => {
    startTransition(async () => {
      try {
        await respondAdvanceRequest(id, action, approvedAmount);
        if (action === 'admin_approved') setApproveTarget(null);
        message.success(
          action === 'accepted'
            ? 'Accepted — awaiting final admin approval'
            : action === 'admin_approved'
              ? `Approved — final amount ${formatCurrency(approvedAmount ?? 0)} sent to accounts`
              : 'Request rejected',
        );
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to respond to request');
      }
    });
  };

  // Admin final approval: admin enters the final amount accounts will pay.
  const [approveTarget, setApproveTarget] = useState<AdvanceRequest | null>(null);
  const [approveAmount, setApproveAmount] = useState<number | null>(null);
  const openApprove = (r: AdvanceRequest) => {
    setApproveTarget(r);
    setApproveAmount(Number(r.amount || 0));
  };

  const [historyRow, setHistoryRow] = useState<RequestRow | null>(null);
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
          paymentType: 'material',
          advanceRequestId: target.id,
          purchaseBillId: target.purchaseBillId || undefined,
          purchaseOrderId: target.purchaseOrderId || undefined,
          vendorId: target.vendorId,
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

  const renderRequestActions = (row: RequestRow) => {
    const record = row.request;
    if (record.status === 'pending') {
      if (mode === 'payments') return null;
      if (!isAccounts) return <Typography.Text type="secondary">Awaiting accounts approval</Typography.Text>;
      return (
        <Flex gap={6} wrap="wrap">
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
      if (mode === 'payments') return null;
      if (!isAdmin) {
        return <Typography.Text type="secondary" className="text-xs whitespace-nowrap">Awaiting admin</Typography.Text>;
      }
      return (
        <Flex gap={6} wrap="wrap">
          <Button size="small" type="primary" ghost icon={<CheckOutlined />} loading={isPending} onClick={() => openApprove(record)}>
            Approve
          </Button>
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
      if (mode === 'approvals') return <Typography.Text type="secondary">Approved - available in Payments</Typography.Text>;
      if (row.displayStatus === 'paid') {
        return null;
      }
      if (embedded && payTarget?.request.id === record.id) {
        return (
          <PaymentRowForm
            amount={payAmount} balance={row.balance} date={payDate} mode={payMode}
            reference={payRef} notes={payNotes} loading={isPending}
            onAmountChange={setPayAmount} onDateChange={setPayDate} onModeChange={setPayMode}
            onReferenceChange={setPayRef} onNotesChange={setPayNotes}
            onRecord={submitPayment} onCancel={() => setPayTarget(null)}
          />
        );
      }
      return (
        <Button size="small" type="primary" icon={<DollarOutlined />} onClick={() => openPay(row)}>
          {embedded ? 'Pay' : 'Record Payment'}
        </Button>
      );
    }
    return (
      <Typography.Text type="secondary" className="text-xs whitespace-nowrap">
        {record.respondedAt ? formatDate(record.respondedAt) : '-'}
      </Typography.Text>
    );
  };

  const renderActions = (row: RequestRow) => {
    const canPay = row.request.status === 'admin_approved' && row.balance > 0;
    const reason = row.displayStatus === 'paid'
      ? 'Approved request fully paid. Create another request and obtain admin approval to pay any remaining order balance.'
      : row.request.status === 'rejected'
        ? 'Request rejected'
        : 'Waiting for final admin approval';
    return (
      <Flex vertical gap={6} align="start">
        {renderRequestActions(row)}
        {embedded && mode !== 'approvals' && !canPay && (
          <Flex vertical gap={4} align="start">
            <span title={reason}><Button size="small" icon={<DollarOutlined />} disabled>Pay</Button></span>
            <Typography.Text type="secondary" className="text-xs">{reason}</Typography.Text>
          </Flex>
        )}
      </Flex>
    );
  };

  const columns: ColumnsType<RequestRow> = [
    { title: 'S.No', key: 'sno', width: 70, align: 'right', render: (_, __, i) => i + 1 },
    { title: 'Date', key: 'date', width: 100, render: (_, r) => (r.request.createdAt ? dayjs(r.request.createdAt).format('DD-MMM') : '-') },
    { title: 'Vendor Name', key: 'vendor', width: 200, ellipsis: true, render: (_, r) => r.request.vendor?.name || r.request.vendorId },
    { title: 'Bill No', key: 'billNo', width: 130, render: (_, r) => r.billNo },
    {
      title: 'Total PO Amount', key: 'poTotal', width: 150, align: 'right',
      render: (_, r) => r.request.purchaseOrder
        ? formatCurrency(r.request.purchaseOrder.totalWithGst || r.request.purchaseOrder.totalAmount || 0)
        : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'Requested Amount', key: 'amount', width: 150, align: 'right',
      render: (_, r) => <Typography.Text strong>{formatCurrency(r.request.amount)}</Typography.Text>,
    },
    {
      // Final amount fixed by admin on approval — what accounts pays.
      title: 'Final Amount', key: 'approvedAmount', width: 140, align: 'right',
      render: (_, r) => {
        const v = r.request.approvedAmount;
        if (v === null || v === undefined || v === '') return <Typography.Text type="secondary">-</Typography.Text>;
        const changed = Number(v) !== Number(r.request.amount);
        return <Typography.Text strong type={changed ? 'warning' : 'success'}>{formatCurrency(v)}</Typography.Text>;
      },
    },
    {
      title: 'History', key: 'history', width: 160,
      render: (_, r) => {
        const list = r.po ? r.po.payments : r.paymentList;
        const balance = r.po ? r.po.balance : r.balance;
        return (
          <Flex vertical gap={4}>
            {list.length === 0 && <Typography.Text type="secondary" className="text-xs">No payments yet</Typography.Text>}
            <Typography.Text strong className="text-xs">{r.po ? 'PO Balance' : 'Request Balance'}: {formatCurrency(Math.max(balance, 0))}</Typography.Text>
            {list.length > 0 && (
              <Button size="small" icon={<HistoryOutlined />} onClick={() => setHistoryRow(r)}>History</Button>
            )}
          </Flex>
        );
      },
    },
    { title: 'Paid Amount', key: 'requestPaid', width: 140, align: 'right', render: (_, r) => formatCurrency(r.paid) },
    { title: 'Request Balance', key: 'requestBalance', width: 150, align: 'right', render: (_, r) => formatCurrency(Math.max(r.balance, 0)) },
    { title: 'Pay Date', key: 'payDate', width: 110, align: 'right', render: (_, r) => (r.payDate ? dayjs(r.payDate).format('DD-MMM') : '-') },
    {
      title: 'Approval Status', key: 'approvalStatus', width: 180,
      render: (_, r) => <PaymentApprovalTag status={r.request.status} />,
    },
    {
      title: 'Status', key: 'status', width: 180,
      render: (_, r) => (
        <Tag color={STATUS_COLORS[r.displayStatus] || 'default'} className="m-0!">
          {STATUS_LABELS[r.displayStatus] || r.displayStatus.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Action', key: 'actions', width: 300,
      render: (_, r) => (
        <Flex gap={6} align="center" wrap="wrap">
          {r.billId ? (
            // Opens the vendor bill raised against this request's PO.
            <Link href={`/dashboard/accounts/bills/${encodeURIComponent(r.billId)}`}>
              <Button size="small" icon={<EyeOutlined />} title={`View bill ${r.billNo}`} />
            </Link>
          ) : (
            <Button size="small" icon={<EyeOutlined />} disabled title="No bill raised against this PO yet" />
          )}
          {renderActions(r)}
        </Flex>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {!embedded && (
        <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
          <Typography.Title level={3} className={pageTitleClassName}>
            <DollarOutlined className={titleIconClassName} /> Vendor Payment Requests
          </Typography.Title>
        </Flex>
      )}

      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card size="small" className={`${cardClassName} !border-amber-500/30 !bg-amber-500/5`}>
            <Statistic title={<span className="text-xs">Pending</span>} value={counts.pending} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className={`${cardClassName} !border-blue-500/30 !bg-blue-500/5`}>
            <Statistic title={<span className="text-xs">Accepted</span>} value={counts.accepted} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className={`${cardClassName} !border-yellow-500/30 !bg-yellow-500/5`}>
            <Statistic title={<span className="text-xs">Payment Pending</span>} value={counts.paymentPending} valueStyle={{ color: '#d48806' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className={`${cardClassName} !border-green-500/30 !bg-green-500/5`}>
            <Statistic title={<span className="text-xs">Paid</span>} value={counts.paid} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      <Card className={cardClassName}>
        <Flex justify="flex-end" align="center" className="mb-3! gap-3!" wrap="wrap">
          <Typography.Text type="secondary" className="text-xs">
            {filtered.length} of {rows.length} requests
          </Typography.Text>
          <Input.Search
            placeholder="Search bill, PO, vendor, project..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
            style={{ width: 220 }}
          />
          <DatePicker.RangePicker
            value={dateRange[0] || dateRange[1] ? dateRange : [null, null]}
            onChange={(dates) => setDateRange(dates ? [dates[0], dates[1]] : [null, null])}
            allowClear
            placeholder={['From date', 'To date']}
          />
          <Select
            placeholder="Filter by status"
            style={{ width: 200 }}
            value={statusFilter || undefined}
            onChange={(val) => setStatusFilter(val || '')}
            options={STATUS_OPTIONS}
            allowClear
            onClear={() => setStatusFilter('')}
          />
        </Flex>

        <Table
          dataSource={mode === 'payments' ? filtered.filter((row) => row.request.status === 'admin_approved') : filtered}
          columns={columns}
          rowKey={(row) => row.request.id}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `Total ${total} requests` }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: 'No vendor payment requests found' }}
          size="middle"
          expandable={{
            expandedRowRender: (row) => {
              const r = row.request;
              const poTotal = r.purchaseOrder ? (r.purchaseOrder.totalWithGst || r.purchaseOrder.totalAmount) : r.vendorQuotation?.totalAmount;
              const docUrl = r.purchaseOrder?.billFileUrl || r.vendorQuotation?.quotationUrl;
              return (
                <Descriptions
                  size="small"
                  column={{ xs: 1, md: 2 }}
                  items={[
                    { key: 'project', label: 'Project', children: r.project?.name || '-' },
                    { key: 'mr', label: 'MR Ref', children: r.materialRequirementNo || r.purchaseOrder?.materialRequirementNo || '-' },
                    { key: 'po', label: 'PO Number', children: r.purchaseOrder?.poNumber || '-' },
                    { key: 'poTotal', label: 'PO Total', children: poTotal ? formatCurrency(poTotal) : '-' },
                    { key: 'requested', label: 'Requested Amount', children: formatCurrency(r.amount) },
                    { key: 'final', label: 'Final Amount (Admin)', children: r.approvedAmount ? formatCurrency(r.approvedAmount) : '-' },
                    { key: 'paid', label: 'Paid (this request)', children: formatCurrency(row.paid) },
                    { key: 'reqBalance', label: 'Left to pay (this request)', children: formatCurrency(Math.max(row.balance, 0)) },
                    { key: 'poPaid', label: 'Paid on PO', children: row.po ? formatCurrency(row.po.paid) : '-' },
                    { key: 'balance', label: 'PO Balance', children: row.po ? formatCurrency(Math.max(row.po.balance, 0)) : '-' },
                    { key: 'notes', label: 'Notes', children: r.notes || '-' },
                    {
                      key: 'doc', label: 'PO Document',
                      children: docUrl ? (
                        <Button type="link" size="small" icon={<FilePdfOutlined />} href={docUrl} target="_blank" className="p-0!">
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
        title={payTarget ? `Record Payment — ${payTarget.request.vendor?.name || ''}` : 'Record Payment'}
        width={420}
        open={!embedded && !!payTarget}
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
              <Input value={payTarget.request.vendor?.name || '-'} disabled />
            </Form.Item>
            <Form.Item label="Project">
              <Input value={payTarget.request.project?.name || '-'} disabled />
            </Form.Item>
            {payTarget.request.purchaseOrder?.poNumber && (
              <Form.Item label="PO Number">
                <Input value={payTarget.request.purchaseOrder.poNumber} disabled />
              </Form.Item>
            )}
            <Form.Item label="Final Amount Approved by Admin">
              <Input value={formatCurrency(payableAmount(payTarget.request))} disabled />
            </Form.Item>
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

      <Modal
        title={`Payment History — ${historyRow?.request.vendor?.name || ''}${historyRow?.request.purchaseOrder?.poNumber ? ` (${historyRow.request.purchaseOrder.poNumber})` : ''}`}
        open={!!historyRow}
        onCancel={() => setHistoryRow(null)}
        footer={[<Button key="close" onClick={() => setHistoryRow(null)}>Close</Button>]}
        width={700}
      >
        {historyRow && (
          <Flex vertical gap={12}>
            <Descriptions
              size="small"
              column={{ xs: 1, sm: 3 }}
              items={[
                ...(historyRow.po
                  ? [
                      { key: 'total', label: 'PO Total', children: formatCurrency(historyRow.po.total) },
                      { key: 'paid', label: 'Paid', children: formatCurrency(historyRow.po.paid) },
                      { key: 'balance', label: 'Balance', children: formatCurrency(Math.max(historyRow.po.balance, 0)) },
                    ]
                  : [
                      { key: 'final', label: 'Amount to Pay', children: formatCurrency(payableAmount(historyRow.request)) },
                      { key: 'paid', label: 'Paid', children: formatCurrency(historyRow.paid) },
                      { key: 'balance', label: 'Balance', children: formatCurrency(Math.max(historyRow.balance, 0)) },
                    ]),
              ]}
            />
            <Table
              dataSource={historyRow.po ? historyRow.po.payments : historyRow.paymentList}
              pagination={false}
              size="small"
              rowKey="id"
              locale={{ emptyText: 'No payments recorded yet' }}
              columns={[
                { title: 'Date', dataIndex: 'paymentDate', render: (v: string) => formatDate(v) },
                { title: 'Amount', dataIndex: 'amount', align: 'right', render: (v: number | string) => formatCurrency(v) },
                { title: 'Mode', dataIndex: 'paymentMode', render: (v: string) => v?.toUpperCase() || '-' },
                { title: 'Reference', dataIndex: 'referenceNumber', render: (v?: string | null) => v || '-' },
              ]}
            />
          </Flex>
        )}
      </Modal>

      <Modal
        title="Final approval — set amount to pay"
        open={!!approveTarget}
        onCancel={() => setApproveTarget(null)}
        okText="Approve"
        confirmLoading={isPending}
        okButtonProps={{ disabled: !approveAmount || approveAmount <= 0 }}
        onOk={() => approveTarget && approveAmount && handleRespond(approveTarget.id, 'admin_approved', approveAmount)}
        destroyOnHidden
      >
        {approveTarget && (
          <Form layout="vertical">
            <Form.Item label="Vendor">
              <Input value={approveTarget.vendor?.name || '-'} disabled />
            </Form.Item>
            <Form.Item label="Requested Amount">
              <Input value={formatCurrency(approveTarget.amount)} disabled />
            </Form.Item>
            <Form.Item
              label="Final Amount to Pay"
              required
              extra="Accounts will pay this amount. Accounts and the purchase team are notified."
            >
              <InputNumber
                className="w-full"
                prefix="₹"
                min={1}
                value={approveAmount}
                onChange={(v) => setApproveAmount(v === null ? null : Number(v))}
                autoFocus
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
