'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, DatePicker, Descriptions, Flex, Input, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type {
  AdvanceRequest,
  Payment,
  PurchaseBill,
  SubcontractorPaymentRequest,
  UnpaidExpenseWeekSummary,
  UnpaidLabourWeekSummary,
} from '@/types/erp';
import { createLabourPayment } from '@/actions/labour-payments';
import { createExpensePayment } from '@/actions/expense-payments';
import { createPayment } from '@/actions/payments';
import { respondSubcontractorPaymentRequest } from '@/actions/subcontractor-payment-requests';
import { useAuthStore } from '@/store/auth';
import { AdvanceRequestsClient } from './AdvanceRequestsClient';
import { SubcontractorPaymentRequestsClient } from './SubcontractorPaymentRequestsClient';
import { PaymentApprovalTag } from './PaymentApprovalTag';
import { cardClassName, formatCurrency, formatDate, mutedTextClassName, weekRangeLabel } from './ui';

type Props = {
  payments: Payment[];
  unpaidLabourSummary: UnpaidLabourWeekSummary[];
  unpaidExpenseSummary: UnpaidExpenseWeekSummary[];
  advanceRequests: AdvanceRequest[];
  subcontractorPaymentRequests: SubcontractorPaymentRequest[];
  bills: PurchaseBill[];
  // Tab to open first, e.g. "vendor" from a notification link.
  initialTab?: string;
};

type RequestAction = 'accepted' | 'admin_approved' | 'rejected';

// One row of the Labour, Subcontractor and Expenses tabs. Labour and expense
// weeks are already approved; subcontractor requests carry their own approval
// status, and only admin-approved ones can be paid. `pay` records the payment
// through the category's existing flow; ledger rows also take a mode and reference.
type PaymentRow = {
  key: string;
  ref: string;
  name: string;
  project: string;
  team?: string;
  amount: number;
  ledger: boolean;
  status: string;
  pay: (paymentDate: string, paymentMode: string, referenceNumber: string) => Promise<unknown>;
  // Set for subcontractor requests.
  request?: {
    id: string;
    respond: (action: RequestAction) => Promise<unknown>;
    details: { label: string; value: React.ReactNode }[];
  };
};

const PAYMENT_OPTIONS = [
  { key: 'labour', no: 1, label: 'Labour Payment' },
  { key: 'vendor', no: 2, label: 'Vendor Payment' },
  { key: 'subcontractor', no: 3, label: 'Subcontractor Payment' },
  { key: 'expenses', no: 4, label: 'Expenses Payment' },
];

const MODE_OPTIONS = [
  { label: 'UPI', value: 'upi' },
  { label: 'RTGS', value: 'rtgs' },
  { label: 'Cash', value: 'cash' },
  { label: 'Cheque', value: 'cheque' },
];

const STATUS_TAGS: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: 'Pending' },
  accepted: { color: 'blue', label: 'Accepted by Accounts' },
  admin_approved: { color: 'gold', label: 'Payment Pending' },
};

// Sum of the payments already recorded against each request.
function paidByKey(payments: Payment[], pick: (p: Payment) => string | null | undefined) {
  const map = new Map<string, number>();
  for (const p of payments) {
    const id = pick(p);
    if (!id) continue;
    map.set(id, (map.get(id) || 0) + Number(p.amount || 0));
  }
  return map;
}

export function PaymentOptionsPanel({
  payments,
  unpaidLabourSummary,
  unpaidExpenseSummary,
  advanceRequests,
  subcontractorPaymentRequests,
  bills,
  initialTab,
}: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [isPending, startTransition] = useTransition();
  const [payRow, setPayRow] = useState<PaymentRow | null>(null);
  const [paymentDate, setPaymentDate] = useState(dayjs());
  const [paymentMode, setPaymentMode] = useState('upi');
  const [referenceNumber, setReferenceNumber] = useState('');

  const paidSubcontractor = useMemo(() => paidByKey(payments, (p) => p.subcontractorPaymentRequestId), [payments]);

  // Weekly labour and expenses: approved entries not yet paid (the server
  // summaries already leave out paid weeks).
  const labourRows = useMemo<PaymentRow[]>(() =>
    unpaidLabourSummary.map((row) => ({
      key: `labour-${row.userId}-${row.weekStart}`,
      ref: weekRangeLabel(row.weekStart),
      name: row.userName,
      project: row.projectNames?.join(', ') || '-',
      team: row.teamNames?.join(', ') || 'Unassigned Team',
      amount: Number(row.totalAmount || 0),
      ledger: false,
      status: 'admin_approved',
      pay: (date) => createLabourPayment({ userId: row.userId, weekStart: row.weekStart, weekEnd: row.weekEnd, paymentDate: date, status: 'paid' }),
    })),
  [unpaidLabourSummary]);

  const expenseRows = useMemo<PaymentRow[]>(() =>
    unpaidExpenseSummary.map((row) => ({
      key: `expenses-${row.userId}-${row.weekStart}`,
      ref: weekRangeLabel(row.weekStart),
      name: row.userName,
      project: '-',
      amount: Number(row.totalAmount || 0),
      ledger: false,
      status: 'admin_approved',
      pay: (date) => createExpensePayment({ userId: row.userId, weekStart: row.weekStart, weekEnd: row.weekEnd, paymentDate: date, status: 'paid' }),
    })),
  [unpaidExpenseSummary]);

  // Subcontractor payment requests still open: waiting for approval, or
  // approved and not fully paid. Rejected and fully paid requests drop out.
  const subcontractorRows = useMemo<PaymentRow[]>(() =>
    subcontractorPaymentRequests
      .filter((r) => r.status !== 'rejected')
      .map((r) => {
        const paid = paidSubcontractor.get(r.id) || 0;
        return { r, paid, pending: Number(r.amount || 0) - paid };
      })
      .filter(({ r, pending }) => r.status !== 'admin_approved' || pending > 0)
      .map(({ r, paid, pending }) => ({
        key: `subcontractor-${r.id}`,
        ref: r.subcontractWorkOrder?.woNumber || '-',
        name: r.subcontractor?.name || '-',
        project: r.project?.name || '-',
        amount: pending,
        ledger: true,
        status: r.status,
        pay: (date, mode, ref) => createPayment({
          paymentType: 'labour',
          subcontractorPaymentRequestId: r.id,
          subcontractWorkOrderId: r.subcontractWorkOrderId || undefined,
          projectId: r.projectId,
          payeeName: r.subcontractor?.name || undefined,
          amount: pending,
          paymentDate: date,
          paymentMode: mode,
          referenceNumber: ref || undefined,
        }),
        request: {
          id: r.id,
          respond: (action) => respondSubcontractorPaymentRequest(r.id, action),
          details: [
            { label: 'WO Number', value: r.subcontractWorkOrder?.woNumber || '-' },
            { label: 'WO Total', value: r.subcontractWorkOrder?.totalAmount ? formatCurrency(r.subcontractWorkOrder.totalAmount) : '-' },
            { label: 'Requested Amount', value: formatCurrency(r.amount) },
            { label: 'Paid So Far', value: formatCurrency(paid) },
            { label: 'Requested On', value: formatDate(r.createdAt) },
            { label: 'Notes', value: r.notes || '-' },
            {
              label: 'Work Order',
              value: r.subcontractWorkOrder?.workorderUrl ? (
                <Button type="link" size="small" className="p-0!" href={r.subcontractWorkOrder.workorderUrl} target="_blank">View</Button>
              ) : '-',
            },
          ],
        },
      })),
  [subcontractorPaymentRequests, paidSubcontractor]);

  const rowsByOption: Record<string, PaymentRow[]> = {
    labour: labourRows,
    subcontractor: subcontractorRows,
    expenses: expenseRows,
  };

  const openPay = (row: PaymentRow) => {
    setPaymentDate(dayjs());
    setPaymentMode('upi');
    setReferenceNumber('');
    setPayRow(row);
  };

  const handlePay = () => {
    if (!payRow) return;
    const date = paymentDate.format('YYYY-MM-DD');
    startTransition(async () => {
      try {
        await payRow.pay(date, paymentMode, referenceNumber.trim());
        message.success('Payment recorded');
        setPayRow(null);
        router.refresh();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to record payment');
      }
    });
  };

  const handleRespond = (row: PaymentRow, action: RequestAction) => {
    if (!row.request) return;
    const respond = row.request.respond;
    startTransition(async () => {
      try {
        await respond(action);
        message.success(
          action === 'accepted' ? 'Accepted — waiting for admin approval'
            : action === 'admin_approved' ? 'Approved — ready to pay'
              : 'Request rejected',
        );
        router.refresh();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to update the request');
      }
    });
  };

  const rejectButton = (r: PaymentRow) => (
    <Popconfirm title="Reject this request?" okText="Yes" cancelText="No" okButtonProps={{ danger: true }} onConfirm={() => handleRespond(r, 'rejected')}>
      <Button size="small" danger icon={<CloseOutlined />} loading={isPending}>Reject</Button>
    </Popconfirm>
  );

  // Approve first (accounts accepts, admin gives final approval), then pay.
  const renderAction = (r: PaymentRow) => {
    if (r.status === 'admin_approved') {
      return <Button type="primary" size="small" icon={<DollarOutlined />} onClick={() => openPay(r)}>Pay</Button>;
    }
    if (r.status === 'pending') {
      return (
        <Flex gap={6} wrap="wrap">
          <Popconfirm title="Accept this request?" description="Admin still gives the final approval." okText="Yes, accept" cancelText="No" onConfirm={() => handleRespond(r, 'accepted')}>
            <Button size="small" type="primary" ghost icon={<CheckOutlined />} loading={isPending}>Accept</Button>
          </Popconfirm>
          {rejectButton(r)}
        </Flex>
      );
    }
    if (r.status === 'accepted') {
      if (!isAdmin) return <Typography.Text type="secondary" className="text-xs">Awaiting admin approval</Typography.Text>;
      return (
        <Flex gap={6} wrap="wrap">
          <Popconfirm title="Give final approval?" description="It can be paid once approved." okText="Yes, approve" cancelText="No" onConfirm={() => handleRespond(r, 'admin_approved')}>
            <Button size="small" type="primary" ghost icon={<CheckOutlined />} loading={isPending}>Approve</Button>
          </Popconfirm>
          {rejectButton(r)}
        </Flex>
      );
    }
    return null;
  };

  const columns: ColumnsType<PaymentRow> = [
    { title: 'S.No', key: 'sno', width: 70, render: (_, __, i) => i + 1 },
    { title: 'Week / Ref', dataIndex: 'ref', key: 'ref', width: 160 },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Project', dataIndex: 'project', key: 'project', width: 180 },
    { title: 'Amount', key: 'amount', align: 'right', width: 140, render: (_, r) => formatCurrency(r.amount) },
    {
      title: 'Approval Status', key: 'approvalStatus', width: 180,
      render: (_, r) => <PaymentApprovalTag status={r.status} />,
    },
    {
      title: 'Status', key: 'status', width: 190,
      render: (_, r) => {
        const tag = STATUS_TAGS[r.status] || { color: 'default', label: r.status };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    { title: 'Action', key: 'action', width: 200, render: (_, r) => renderAction(r) },
  ];

  const tabItems = PAYMENT_OPTIONS.map((option) => {
    // Vendor Payment is the full Vendor Payment Requests screen.
    if (option.key === 'vendor') {
      return {
        key: option.key,
        label: `${option.no}. ${option.label}`,
        children: <AdvanceRequestsClient requests={advanceRequests} bills={bills} payments={payments} embedded />,
      };
    }
    // Subcontractor Payment is the full Subcontractor Payment Requests screen
    // (admin sets the final amount there on approval).
    if (option.key === 'subcontractor') {
      return {
        key: option.key,
        label: `${option.no}. ${option.label}`,
        children: <SubcontractorPaymentRequestsClient requests={subcontractorPaymentRequests} payments={payments} embedded />,
      };
    }

    const rows = rowsByOption[option.key];
    const payable = rows.filter((r) => r.status === 'admin_approved');
    const payableTotal = payable.reduce((sum, r) => sum + r.amount, 0);
    const awaiting = rows.length - payable.length;
    return {
      key: option.key,
      label: `${option.no}. ${option.label}`,
      children: (
        <div>
          <Typography.Text className={`mb-3 block ${mutedTextClassName}`}>
            Ready to pay: <Typography.Text strong className="text-[var(--text-primary)]!">{formatCurrency(payableTotal)}</Typography.Text> ({payable.length} {payable.length === 1 ? 'item' : 'items'})
            {awaiting > 0 && <> · Awaiting approval: <Typography.Text strong className="text-[var(--text-primary)]!">{awaiting}</Typography.Text></>}
          </Typography.Text>
          <Table
            dataSource={rows}
            columns={option.key === 'labour'
              ? [...columns.slice(0, 4), { title: 'Team', dataIndex: 'team', key: 'team', width: 180 }, ...columns.slice(4)]
              : columns}
            rowKey="key"
            size="middle"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1140 }}
            locale={{ emptyText: 'Nothing waiting for approval or payment' }}
            expandable={{
              rowExpandable: (r) => !!r.request,
              expandedRowRender: (r) => (
                <Descriptions size="small" column={{ xs: 1, md: 2, lg: 3 }}>
                  {r.request?.details.map((d) => (
                    <Descriptions.Item key={d.label} label={d.label}>{d.value}</Descriptions.Item>
                  ))}
                </Descriptions>
              ),
            }}
          />
        </div>
      ),
    };
  });

  return (
    <Card className={`${cardClassName} mb-6`} title={<Typography.Text strong className="text-[var(--text-primary)]!">Payment Options</Typography.Text>}>
      <Tabs
        // Re-opens on the linked tab when a notification is clicked while already on Payments.
        key={initialTab || 'default'}
        defaultActiveKey={PAYMENT_OPTIONS.some((o) => o.key === initialTab) ? initialTab : 'labour'}
        items={tabItems}
      />

      <Modal
        title={payRow ? `Pay ${payRow.name}` : 'Pay'}
        open={!!payRow}
        onCancel={() => setPayRow(null)}
        onOk={handlePay}
        okText="Record Payment"
        confirmLoading={isPending}
        destroyOnHidden
      >
        {payRow && (
          <Space orientation="vertical" size="middle" className="w-full">
            <Typography.Text>
              Amount: <Typography.Text strong>{formatCurrency(payRow.amount)}</Typography.Text>
              {payRow.ref !== '-' && <> · {payRow.ref}</>}
            </Typography.Text>
            <div>
              <Typography.Text className={mutedTextClassName}>Payment date</Typography.Text>
              <DatePicker className="w-full" value={paymentDate} onChange={(d) => d && setPaymentDate(d)} allowClear={false} />
            </div>
            {payRow.ledger && (
              <>
                <div>
                  <Typography.Text className={mutedTextClassName}>Mode</Typography.Text>
                  <Select className="w-full" value={paymentMode} onChange={setPaymentMode} options={MODE_OPTIONS} />
                </div>
                <div>
                  <Typography.Text className={mutedTextClassName}>UTR / Reference number</Typography.Text>
                  <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Transaction ID" />
                </div>
              </>
            )}
          </Space>
        )}
      </Modal>
    </Card>
  );
}
