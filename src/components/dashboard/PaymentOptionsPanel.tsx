'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, DatePicker, Input, Modal, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type {
  AdvanceRequest,
  Payment,
  SubcontractorPaymentRequest,
  UnpaidExpenseWeekSummary,
  UnpaidLabourWeekSummary,
} from '@/types/erp';
import { createLabourPayment } from '@/actions/labour-payments';
import { createExpensePayment } from '@/actions/expense-payments';
import { createPayment } from '@/actions/payments';
import { cardClassName, formatCurrency, mutedTextClassName, weekRangeLabel } from './ui';

type Props = {
  payments: Payment[];
  unpaidLabourSummary: UnpaidLabourWeekSummary[];
  unpaidExpenseSummary: UnpaidExpenseWeekSummary[];
  advanceRequests: AdvanceRequest[];
  subcontractorPaymentRequests: SubcontractorPaymentRequest[];
};

// One row of a payment option. `pay` records the payment through the
// category's existing flow. Ledger rows also take a mode and reference.
type PendingRow = {
  key: string;
  ref: string;
  name: string;
  project: string;
  amount: number;
  ledger: boolean;
  pay: (paymentDate: string, paymentMode: string, referenceNumber: string) => Promise<unknown>;
};

const PAYMENT_OPTIONS = [
  { key: 'labour', no: 1, label: 'Labour Payment' },
  { key: 'material', no: 2, label: 'Material Payment' },
  { key: 'subcontractor', no: 3, label: 'Subcontractor Payment' },
  { key: 'expenses', no: 4, label: 'Expenses Payment' },
];

const MODE_OPTIONS = [
  { label: 'UPI', value: 'upi' },
  { label: 'RTGS', value: 'rtgs' },
  { label: 'Cash', value: 'cash' },
  { label: 'Cheque', value: 'cheque' },
];

// Sum of the payments already recorded against each request, so a request
// only shows while part of it is still owed.
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
}: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();
  const [payRow, setPayRow] = useState<PendingRow | null>(null);
  const [paymentDate, setPaymentDate] = useState(dayjs());
  const [paymentMode, setPaymentMode] = useState('upi');
  const [referenceNumber, setReferenceNumber] = useState('');

  const paidAdvance = useMemo(() => paidByKey(payments, (p) => p.advanceRequestId), [payments]);
  const paidSubcontractor = useMemo(() => paidByKey(payments, (p) => p.subcontractorPaymentRequestId), [payments]);

  // Weekly labour and expenses: only approved entries that are not yet paid
  // (the server summaries already leave out paid weeks).
  const labourRows = useMemo<PendingRow[]>(() =>
    unpaidLabourSummary.map((row) => ({
      key: `labour-${row.userId}-${row.weekStart}`,
      ref: weekRangeLabel(row.weekStart),
      name: row.userName,
      project: '-',
      amount: Number(row.totalAmount || 0),
      ledger: false,
      pay: (paymentDate) => createLabourPayment({
        userId: row.userId,
        weekStart: row.weekStart,
        weekEnd: row.weekEnd,
        paymentDate,
        status: 'paid',
      }),
    })),
  [unpaidLabourSummary]);

  const expenseRows = useMemo<PendingRow[]>(() =>
    unpaidExpenseSummary.map((row) => ({
      key: `expenses-${row.userId}-${row.weekStart}`,
      ref: weekRangeLabel(row.weekStart),
      name: row.userName,
      project: '-',
      amount: Number(row.totalAmount || 0),
      ledger: false,
      pay: (paymentDate) => createExpensePayment({
        userId: row.userId,
        weekStart: row.weekStart,
        weekEnd: row.weekEnd,
        paymentDate,
        status: 'paid',
      }),
    })),
  [unpaidExpenseSummary]);

  // Vendor payment requests that are admin approved and still owed.
  const materialRows = useMemo<PendingRow[]>(() =>
    advanceRequests
      .map((r) => ({ r, pending: Number(r.amount || 0) - (paidAdvance.get(r.id) || 0) }))
      .filter(({ pending }) => pending > 0)
      .map(({ r, pending }) => ({
        key: `material-${r.id}`,
        ref: r.materialRequirementNo || '-',
        name: r.vendor?.name || '-',
        project: r.project?.name || '-',
        amount: pending,
        ledger: true,
        pay: (paymentDate, paymentMode, referenceNumber) => createPayment({
          paymentType: 'material',
          advanceRequestId: r.id,
          vendorId: r.vendorId,
          projectId: r.projectId,
          amount: pending,
          paymentDate,
          paymentMode,
          referenceNumber: referenceNumber || undefined,
        }),
      })),
  [advanceRequests, paidAdvance]);

  // Subcontractor payment requests that are admin approved and still owed.
  const subcontractorRows = useMemo<PendingRow[]>(() =>
    subcontractorPaymentRequests
      .map((r) => ({ r, pending: Number(r.amount || 0) - (paidSubcontractor.get(r.id) || 0) }))
      .filter(({ pending }) => pending > 0)
      .map(({ r, pending }) => ({
        key: `subcontractor-${r.id}`,
        ref: r.subcontractWorkOrder?.woNumber || '-',
        name: r.subcontractor?.name || '-',
        project: r.project?.name || '-',
        amount: pending,
        ledger: true,
        pay: (paymentDate, paymentMode, referenceNumber) => createPayment({
          paymentType: 'labour',
          subcontractorPaymentRequestId: r.id,
          projectId: r.projectId,
          payeeName: r.subcontractor?.name || undefined,
          amount: pending,
          paymentDate,
          paymentMode,
          referenceNumber: referenceNumber || undefined,
        }),
      })),
  [subcontractorPaymentRequests, paidSubcontractor]);

  const rowsByOption: Record<string, PendingRow[]> = {
    labour: labourRows,
    material: materialRows,
    subcontractor: subcontractorRows,
    expenses: expenseRows,
  };

  const openPay = (row: PendingRow) => {
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

  const columns: ColumnsType<PendingRow> = [
    { title: 'S.No', key: 'sno', width: 70, render: (_, __, i) => i + 1 },
    { title: 'Week / Ref', dataIndex: 'ref', key: 'ref', width: 170 },
    { title: 'Name', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Project', dataIndex: 'project', key: 'project', width: 180 },
    { title: 'Amount', key: 'amount', align: 'right', width: 140, render: (_, r) => formatCurrency(r.amount) },
    {
      title: 'Status', key: 'status', width: 170,
      render: () => <Tag color="gold">Payment Pending</Tag>,
    },
    {
      title: 'Action', key: 'action', width: 110,
      render: (_, r) => <Button type="primary" size="small" onClick={() => openPay(r)}>Pay</Button>,
    },
  ];

  const tabItems = PAYMENT_OPTIONS.map((option) => {
    const rows = rowsByOption[option.key];
    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    return {
      key: option.key,
      label: `${option.no}. ${option.label}`,
      children: (
        <div>
          <Typography.Text className={`mb-3 block ${mutedTextClassName}`}>
            Pending: <Typography.Text strong className="text-[var(--text-primary)]!">{formatCurrency(total)}</Typography.Text> ({rows.length} {rows.length === 1 ? 'item' : 'items'})
          </Typography.Text>
          <Table
            dataSource={rows}
            columns={columns}
            rowKey="key"
            size="middle"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1100 }}
            locale={{ emptyText: 'No approved items waiting for payment' }}
          />
        </div>
      ),
    };
  });

  return (
    <Card className={`${cardClassName} mb-6`} title={<Typography.Text strong className="text-[var(--text-primary)]!">Payment Options</Typography.Text>}>
      <Tabs items={tabItems} />

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
