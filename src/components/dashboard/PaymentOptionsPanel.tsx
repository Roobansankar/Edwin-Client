'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, DatePicker, Descriptions, Flex, Input, InputNumber, Modal, Popconfirm, Select, Space, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type {
  LabourPayment,
  ExpensePayment,
  AdvanceRequest,
  Payment,
  PurchaseBill,
  SubcontractorBill,
  SubcontractorPaymentRequest,
  UnpaidExpenseWeekSummary,
  UnpaidLabourWeekSummary,
} from '@/types/erp';
import { labourPaid } from '@/lib/labour-payment-history';
import { LabourPaymentHistory } from './LabourPaymentHistory';
import { createLabourPayment } from '@/actions/labour-payments';
import { createExpensePayment } from '@/actions/expense-payments';
import { createPayment } from '@/actions/payments';
import { respondSubcontractorPaymentRequest } from '@/actions/subcontractor-payment-requests';
import { useAuthStore } from '@/store/auth';
import { AdvanceRequestsClient } from './AdvanceRequestsClient';
import { SubcontractorPaymentRequestsClient } from './SubcontractorPaymentRequestsClient';
import { PaymentApprovalTag } from './PaymentApprovalTag';
import { formatCurrency, formatDate, mutedTextClassName, weekRangeLabel } from './ui';
import { PagedTableCard, StatusCards } from './DataTablePanel';

type Props = {
  labourPayments: LabourPayment[];
  expensePayments: ExpensePayment[];
  payments: Payment[];
  unpaidLabourSummary: UnpaidLabourWeekSummary[];
  unpaidExpenseSummary: UnpaidExpenseWeekSummary[];
  advanceRequests: AdvanceRequest[];
  subcontractorPaymentRequests: SubcontractorPaymentRequest[];
  bills: PurchaseBill[];
  subcontractorBills?: SubcontractorBill[];
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
  labour?: boolean;
  expense?: boolean;
  labourPayment?: LabourPayment;
  status: string;
  pay: (paymentDate: string, paymentMode: string, referenceNumber: string, amount: number) => Promise<unknown>;
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
  labourPayments,
  expensePayments,
  payments,
  unpaidLabourSummary,
  unpaidExpenseSummary,
  advanceRequests,
  subcontractorPaymentRequests,
  bills,
  subcontractorBills = [],
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
  const [payAmount, setPayAmount] = useState(0);

  const paidSubcontractor = useMemo(() => paidByKey(payments, (p) => p.subcontractorPaymentRequestId), [payments]);

  // Weekly labour and expenses: approved entries not yet paid (the server
  // summaries already leave out paid weeks).
  const labourRows = useMemo<PaymentRow[]>(() =>
    [...unpaidLabourSummary.map((row) => ({
      key: `labour-${row.userId}-${row.weekStart}-${row.workerIds?.[0]}`,
      ref: weekRangeLabel(row.weekStart),
      name: row.userName,
      project: row.projectNames?.join(', ') || '-',
      team: row.teamNames?.join(', ') || 'Unassigned Team',
      amount: Number(row.totalAmount || 0),
      labour: true, ledger: true,
      status: 'admin_approved',
      pay: (date: string, mode: string, ref: string, amount: number) => createLabourPayment({ workerIds: row.workerIds, userId: row.userId, weekStart: row.weekStart, weekEnd: row.weekEnd, paymentDate: date, status: 'paid', amount, paymentMode: mode, referenceNumber: ref }),
    })), ...labourPayments.map((payment) => ({
      key: `labour-record-${payment.id}`, ref: weekRangeLabel(payment.weekStart), name: payment.userName,
      project: payment.projectNames?.join(', ') || '-', team: payment.teamNames?.join(', ') || 'Unassigned Team', amount: Math.max(0, Number(payment.amount) - labourPaid(payment)),
      ledger: true, labour: true, labourPayment: payment,
      status: labourPaid(payment) >= Number(payment.amount) ? 'paid' : 'admin_approved',
      pay: (date: string, mode: string, ref: string, amount: number) => createLabourPayment({
        paymentId: payment.id, userId: payment.userId, weekStart: payment.weekStart, weekEnd: payment.weekEnd,
        paymentDate: date, status: 'paid', amount, paymentMode: mode, referenceNumber: ref,
      }),
    }))],
  [unpaidLabourSummary, labourPayments]);

  const expenseRows = useMemo<PaymentRow[]>(() => [
    ...unpaidExpenseSummary.map((row) => ({
      key: `expenses-${row.userId}-${row.weekStart}`,
      ref: weekRangeLabel(row.weekStart), name: row.userName, project: '-',
      amount: Number(row.totalAmount || 0), ledger: true, expense: true,
      status: 'admin_approved',
      pay: (date: string, mode: string, ref: string, amount: number) => createExpensePayment({
        userId: row.userId, weekStart: row.weekStart, weekEnd: row.weekEnd,
        paymentDate: date, status: 'paid', amount, paymentMode: mode, referenceNumber: ref,
      }),
    })),
    ...expensePayments.map((payment) => ({
      key: `expense-record-${payment.id}`, ref: weekRangeLabel(payment.weekStart),
      name: payment.userName, project: '-',
      amount: Math.max(0, Number(payment.amount) - labourPaid(payment)),
      ledger: true, expense: true, labourPayment: payment,
      status: labourPaid(payment) >= Number(payment.amount) ? 'paid' : 'admin_approved',
      pay: (date: string, mode: string, ref: string, amount: number) => createExpensePayment({
        paymentId: payment.id, userId: payment.userId, weekStart: payment.weekStart,
        weekEnd: payment.weekEnd, paymentDate: date, status: 'paid', amount,
        paymentMode: mode, referenceNumber: ref,
      }),
    })),
  ], [unpaidExpenseSummary, expensePayments]);

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
    setPayAmount(row.amount);
    setPaymentDate(dayjs());
    setPaymentMode('upi');
    setReferenceNumber('');
    setPayRow(row);
  };

  const handlePay = () => {
    if (!payRow || payAmount <= 0 || payAmount > payRow.amount) return;
    const date = paymentDate.format('YYYY-MM-DD');
    startTransition(async () => {
      try {
        const result = await payRow.pay(date, paymentMode, referenceNumber.trim(), payAmount);
        if (payRow.expense && result && typeof result === 'object' && 'success' in result && result.success === false) {
          message.error('error' in result && typeof result.error === 'string' ? result.error : 'Failed to record payment');
          return;
        }
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
    return r.labourPayment ? <Tag color="success">Fully Paid</Tag> : null;
  };

  const columns: ColumnsType<PaymentRow> = [
    { title: 'S.No', key: 'sno', width: 70, render: (_, __, i) => i + 1 },
    { title: 'Week / Ref', dataIndex: 'ref', key: 'ref', width: 160 },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Project', dataIndex: 'project', key: 'project', width: 180 },
    { title: 'Balance', key: 'amount', align: 'right', width: 140, render: (_, r) => formatCurrency(r.amount) },
    {
      title: 'Approval Status', key: 'approvalStatus', width: 180,
      render: (_, r) => <PaymentApprovalTag status={r.status} />,
    },
    {
      title: 'Status', key: 'status', width: 190,
      render: (_, r) => {
        if (r.labourPayment) return <Tag color={r.amount <= 0 ? 'success' : 'warning'}>{r.amount <= 0 ? 'Fully Paid' : labourPaid(r.labourPayment) > 0 ? 'Partially Paid' : 'Unpaid'}</Tag>;
        const tag = STATUS_TAGS[r.status] || { color: 'default', label: r.status };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    { title: 'Paid Amount', key: 'paid', width: 140, render: (_, row) => row.labourPayment ? formatCurrency(labourPaid(row.labourPayment)) : '-' },
    { title: 'History', key: 'history', width: 140, render: (_, row) => row.labourPayment ? <LabourPaymentHistory payments={[row.labourPayment]} title={row.expense ? "Expense payment history" : undefined} showSummary={row.expense} /> : '-' },
    { title: 'Action', key: 'action', width: 200, render: (_, r) => renderAction(r) },
  ];

  const tabItems = PAYMENT_OPTIONS.map((option) => {
    // Payments contains only requests that completed both approval stages.
    if (option.key === 'vendor') {
      return {
        key: option.key,
        label: `${option.no}. ${option.label}`,
        children: <AdvanceRequestsClient requests={advanceRequests.filter((request) => request.status === 'admin_approved')} bills={bills} payments={payments} embedded mode="payments" />,
      };
    }
    // Admin sets the final amount on the Approvals page.
    if (option.key === 'subcontractor') {
      return {
        key: option.key,
        label: `${option.no}. ${option.label}`,
        children: <SubcontractorPaymentRequestsClient requests={subcontractorPaymentRequests.filter((request) => request.status === 'admin_approved')} payments={payments} subcontractorBills={subcontractorBills} embedded mode="payments" />,
      };
    }

    const rows = rowsByOption[option.key];
    const payable = rows.filter((r) => r.status === 'admin_approved');
    const payableTotal = payable.reduce((sum, r) => sum + r.amount, 0);
    const awaiting = rows.length - payable.length;
    const tabColumns: ColumnsType<PaymentRow> = option.key === 'labour' || option.key === 'expenses'
              ? [
                  ...columns.slice(0, 4),
                  ...(option.key === 'labour' ? [{ title: 'Team', dataIndex: 'team', key: 'team', width: 180 }] : []),
                  { title: 'Total Amount', key: 'totalAmount', width: 140, align: 'right', render: (_, row) => formatCurrency(row.labourPayment ? Number(row.labourPayment.amount) : row.amount) },
                  { title: 'Paid Amount', key: 'paidAmount', width: 140, align: 'right', render: (_, row) => formatCurrency(row.labourPayment ? labourPaid(row.labourPayment) : 0) },
                  { title: 'Remaining Balance', key: 'remainingBalance', width: 160, align: 'right', render: (_, row) => <Typography.Text strong type={row.amount > 0 ? 'warning' : 'success'}>{formatCurrency(row.amount)}</Typography.Text> },
                  ...columns.slice(5).filter((column) => column.key !== 'paid'),
                ]
              : columns;
    return {
      key: option.key,
      label: `${option.no}. ${option.label}`,
      children: (
        <div>
          <StatusCards
            items={[
              { key: 'ready', label: 'Ready to Pay', value: formatCurrency(payableTotal) },
              { key: 'readyCount', label: 'Ready Items', value: payable.length },
              { key: 'awaiting', label: 'Awaiting Approval', value: awaiting },
              { key: 'total', label: 'Total Items', value: rows.length },
            ]}
          />
          <PagedTableCard
            title={option.label}
            subtitle={`${rows.length} ${rows.length === 1 ? 'item' : 'items'}`}
            noun="items"
            dataSource={rows}
            columns={tabColumns}
            rowKey="key"
            size="middle"
            scroll={{ x: tabColumns.reduce((sum, c) => sum + Number(c.width || 0), 0) }}
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
    <div className="mb-8">
      <Typography.Title level={4} className="mb-2! text-[var(--text-primary)]!" style={{ fontWeight: 800 }}>Payment Options</Typography.Title>
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
        okButtonProps={{ disabled: !payRow || payAmount <= 0 || payAmount > payRow.amount }}
        destroyOnHidden
      >
        {payRow && (
          <Space orientation="vertical" size="middle" className="w-full">
            {payRow.labour && <Typography.Text>Team: <Typography.Text strong>{payRow.team}</Typography.Text></Typography.Text>}
            <Typography.Text>
              {payRow.labour || payRow.expense ? 'Remaining balance' : 'Amount'}: <Typography.Text strong>{formatCurrency(payRow.amount)}</Typography.Text>
              {payRow.ref !== '-' && <> · {payRow.ref}</>}
            </Typography.Text>
            {(payRow.labour || payRow.expense) && <div>
              <Typography.Text className={mutedTextClassName}>Amount to pay (remaining balance {formatCurrency(payRow.amount)})</Typography.Text>
              <InputNumber className="w-full" min={0.01} max={payRow.amount} precision={2} value={payAmount} onChange={(value) => setPayAmount(Number(value) || 0)} />
            </div>}
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
    </div>
  );
}
