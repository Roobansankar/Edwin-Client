'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Col, DatePicker, Flex, Input, Modal, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createLabourPayment, updateLabourPaymentStatus } from '@/actions/labour-payments';
import type { LabourPayment, UnpaidLabourWeekSummary } from '@/types/erp';
import {
  cardClassName,
  formatCurrency,
  mutedTextClassName,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
  weekRangeLabel,
} from './ui';

type Props = {
  payments: LabourPayment[];
  unpaidSummary: UnpaidLabourWeekSummary[];
};

// One row per approved week that has not been paid yet, plus every recorded
// payment. Only 'paid' is final: Record Payment is what moves a row to Paid.
type LabourRow = {
  key: string;
  weekStart: string;
  weekEnd: string;
  userId: string;
  userName: string;
  amount: number;
  status: 'pending' | 'paid';
  payDate: string | null;
  // Set for a payment record that already exists (still pending).
  recordId?: string;
};

export function LabourPaymentsClient({ payments, unpaidSummary }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();
  const [payRow, setPayRow] = useState<LabourRow | null>(null);
  const [paymentDate, setPaymentDate] = useState(dayjs());
  const [notes, setNotes] = useState('');

  const rows = useMemo<LabourRow[]>(() => {
    const unpaid: LabourRow[] = unpaidSummary.map((row) => ({
      key: `unpaid-${row.userId}-${row.weekStart}`,
      weekStart: row.weekStart,
      weekEnd: row.weekEnd,
      userId: row.userId,
      userName: row.userName,
      amount: Number(row.totalAmount || 0),
      status: 'pending',
      payDate: null,
    }));
    const recorded: LabourRow[] = payments.map((p) => ({
      key: `record-${p.id}`,
      weekStart: p.weekStart,
      weekEnd: p.weekEnd,
      userId: p.userId,
      userName: p.userName,
      amount: Number(p.amount || 0),
      status: p.status === 'paid' ? 'paid' : 'pending',
      payDate: p.paymentDate,
      recordId: p.status === 'paid' ? undefined : p.id,
    }));
    return [...unpaid, ...recorded].sort(
      (a, b) =>
        (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) ||
        b.weekStart.localeCompare(a.weekStart) ||
        a.userName.localeCompare(b.userName),
    );
  }, [payments, unpaidSummary]);

  const pendingTotal = useMemo(
    () => rows.filter((r) => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0),
    [rows],
  );
  const paidTotal = useMemo(
    () => rows.filter((r) => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0),
    [rows],
  );

  const openRecord = (row: LabourRow) => {
    setPaymentDate(dayjs());
    setNotes('');
    setPayRow(row);
  };

  const handleRecordPayment = () => {
    if (!payRow) return;
    const row = payRow;
    startTransition(async () => {
      try {
        if (row.recordId) {
          // A record created before this flow: just mark it paid.
          await updateLabourPaymentStatus(row.recordId, 'paid');
        } else {
          await createLabourPayment({
            userId: row.userId,
            weekStart: row.weekStart,
            weekEnd: row.weekEnd,
            paymentDate: paymentDate.format('YYYY-MM-DD'),
            status: 'paid',
            notes: notes.trim() || undefined,
          });
        }
        message.success('Payment completed. Status set to Paid');
        setPayRow(null);
        router.refresh();
      } catch (error) {
        // Failed payments stay Pending so they can be recorded again.
        message.error(error instanceof Error ? error.message : 'Failed to record payment');
      }
    });
  };

  const columns: ColumnsType<LabourRow> = [
    { title: 'S.No', key: 'sno', width: 70, align: 'right', render: (_, __, i) => i + 1 },
    { title: 'Week', key: 'week', width: 160, render: (_, r) => weekRangeLabel(r.weekStart) },
    { title: 'Team', dataIndex: 'userName', key: 'team', width: 200, render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'Amount', key: 'amount', align: 'right', width: 140, render: (_, r) => formatCurrency(r.amount) },
    {
      title: 'Pay Date', key: 'payDate', align: 'right', width: 130,
      render: (_, r) => (r.payDate ? dayjs(r.payDate).format('DD-MMM') : '-'),
    },
    {
      title: 'Status', key: 'status', width: 130,
      render: (_, r) => (
        <Tag color={r.status === 'paid' ? 'success' : 'gold'}>{r.status === 'paid' ? 'Paid' : 'Pending'}</Tag>
      ),
    },
    {
      title: 'Action', key: 'action', width: 170,
      render: (_, r) =>
        r.status === 'pending' ? (
          <Button type="primary" size="small" disabled={isPending} onClick={() => openRecord(r)}>
            Record Payment
          </Button>
        ) : (
          <Typography.Text type="secondary">-</Typography.Text>
        ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <DollarOutlined className={titleIconClassName} /> Labour Payments
        </Typography.Title>
      </Flex>

      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={12}>
          <Card className={cardClassName} variant="borderless">
            <Statistic
              title="Pending"
              value={pendingTotal}
              precision={2}
              styles={{ content: { color: '#d97706' } }}
              formatter={(val) => formatCurrency(val as number)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className={cardClassName} variant="borderless">
            <Statistic
              title="Paid"
              value={paidTotal}
              precision={2}
              styles={{ content: { color: '#059669' } }}
              formatter={(val) => formatCurrency(val as number)}
            />
          </Card>
        </Col>
      </Row>

      <Card
        className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!"
        styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}
      >
        <Table
          className="mantis-table"
          dataSource={rows}
          columns={columns}
          rowKey="key"
          size="middle"
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} rows` }}
          locale={{ emptyText: 'No approved labour weeks yet' }}
        />
      </Card>

      <Modal
        title={payRow ? `Record Payment — ${payRow.userName}` : 'Record Payment'}
        open={!!payRow}
        onCancel={() => setPayRow(null)}
        onOk={handleRecordPayment}
        okText="Record Payment"
        confirmLoading={isPending}
        destroyOnHidden
      >
        {payRow && (
          <Space orientation="vertical" size="middle" className="w-full">
            <Typography.Text>
              {weekRangeLabel(payRow.weekStart)} · Amount: <Typography.Text strong>{formatCurrency(payRow.amount)}</Typography.Text>
            </Typography.Text>
            {!payRow.recordId && (
              <>
                <div>
                  <Typography.Text className={mutedTextClassName}>Pay date</Typography.Text>
                  <DatePicker
                    className="w-full"
                    value={paymentDate}
                    onChange={(d) => d && setPaymentDate(d)}
                    format="DD-MM-YYYY"
                    allowClear={false}
                  />
                </div>
                <div>
                  <Typography.Text className={mutedTextClassName}>Notes</Typography.Text>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
                </div>
              </>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
}
