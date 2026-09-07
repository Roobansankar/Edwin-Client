'use client';

import { useMemo, useState, useTransition } from 'react';
import { App, Button, Card, Col, DatePicker, Flex, Input, Row, Select, Space, Statistic, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createExpensePayment, updateExpensePaymentStatus } from '@/actions/expense-payments';
import type { ExpensePayment, UnpaidExpenseWeekSummary } from '@/types/erp';
import { cardClassName, formatCurrency, formatDate, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';

type Props = {
  payments: ExpensePayment[];
  unpaidSummary: UnpaidExpenseWeekSummary[];
};

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
];

function weekLabel(weekStart: string, weekEnd: string) {
  return `${dayjs(weekStart).format('DD MMM')} – ${dayjs(weekEnd).format('DD MMM YYYY')}`;
}

export function ExpensePaymentsClient({ payments, unpaidSummary }: Props) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();

  const [userId, setUserId] = useState<string | undefined>();
  const [weekKey, setWeekKey] = useState<string | undefined>();
  const [paymentDate, setPaymentDate] = useState(dayjs());
  const [status, setStatus] = useState<'pending' | 'paid'>('pending');
  const [notes, setNotes] = useState('');

  const userOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of unpaidSummary) map.set(row.userId, row.userName);
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [unpaidSummary]);

  const weeksForUser = useMemo(
    () => unpaidSummary.filter((row) => row.userId === userId),
    [unpaidSummary, userId],
  );

  const weekOptions = useMemo(
    () =>
      weeksForUser.map((row) => ({
        value: `${row.weekStart}|${row.weekEnd}`,
        label: `${weekLabel(row.weekStart, row.weekEnd)} — ${formatCurrency(row.totalAmount)} (${row.expenseCount} expense${row.expenseCount > 1 ? 's' : ''})`,
      })),
    [weeksForUser],
  );

  const selectedWeek = useMemo(() => {
    if (!weekKey) return undefined;
    const [weekStart, weekEnd] = weekKey.split('|');
    return weeksForUser.find((row) => row.weekStart === weekStart && row.weekEnd === weekEnd);
  }, [weekKey, weeksForUser]);

  const resetForm = () => {
    setUserId(undefined);
    setWeekKey(undefined);
    setPaymentDate(dayjs());
    setStatus('pending');
    setNotes('');
  };

  const handleRecordPayment = () => {
    if (!userId || !selectedWeek) {
      message.error('Select a user and a week first');
      return;
    }
    startTransition(async () => {
      try {
        await createExpensePayment({
          userId,
          weekStart: selectedWeek.weekStart,
          weekEnd: selectedWeek.weekEnd,
          paymentDate: paymentDate.format('YYYY-MM-DD'),
          status,
          notes: notes || undefined,
        });
        message.success('Payment recorded');
        resetForm();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to record payment');
      }
    });
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    startTransition(async () => {
      try {
        await updateExpensePaymentStatus(id, newStatus as 'pending' | 'paid');
        message.success('Status updated');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to update status');
      }
    });
  };

  const totalPending = useMemo(
    () => unpaidSummary.reduce((sum, row) => sum + Number(row.totalAmount), 0),
    [unpaidSummary],
  );
  const totalPaidRecorded = useMemo(
    () => payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0),
    [payments],
  );

  const columns: ColumnsType<ExpensePayment> = [
    { title: '#', key: 'sno', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Name', dataIndex: 'userName', render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'Week', key: 'week', render: (_, record) => weekLabel(record.weekStart, record.weekEnd) },
    { title: 'Amount', dataIndex: 'amount', align: 'right', render: formatCurrency },
    { title: 'Pay Date', dataIndex: 'paymentDate', render: formatDate },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (_, record) => (
        <Select
          value={record.status}
          size="small"
          variant="borderless"
          className="w-full"
          onChange={(newStatus) => handleStatusChange(record.id, newStatus)}
          options={STATUS_OPTIONS}
          popupMatchSelectWidth={false}
          disabled={isPending}
        />
      ),
    },
    { title: 'Notes', dataIndex: 'notes', ellipsis: true, render: (v?: string | null) => v || '-' },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <DollarOutlined className={titleIconClassName} /> Expense Payments
        </Typography.Title>
      </Flex>

      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={12}>
          <Card className={cardClassName} variant="borderless">
            <Statistic
              title="Admin-Approved, Unpaid"
              value={totalPending}
              precision={2}
              styles={{ content: { color: '#d97706' } }}
              formatter={(val) => formatCurrency(val as number)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className={cardClassName} variant="borderless">
            <Statistic
              title="Paid So Far"
              value={totalPaidRecorded}
              precision={2}
              styles={{ content: { color: '#059669' } }}
              formatter={(val) => formatCurrency(val as number)}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<Typography.Text strong>Record a Payment</Typography.Text>}
        className={`${cardClassName} mb-4`}
      >
        <Row gutter={[12, 12]} align="bottom">
          <Col xs={24} sm={8}>
            <Typography.Text type="secondary" className="mb-1 block text-xs uppercase">User</Typography.Text>
            <Select
              showSearch
              placeholder="Select user"
              className="w-full"
              value={userId}
              onChange={(val) => {
                setUserId(val);
                setWeekKey(undefined);
              }}
              options={userOptions}
              filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
              notFoundContent="No admin-approved unpaid expenses"
            />
          </Col>
          <Col xs={24} sm={8}>
            <Typography.Text type="secondary" className="mb-1 block text-xs uppercase">Week</Typography.Text>
            <Select
              placeholder={userId ? 'Select week' : 'Select a user first'}
              className="w-full"
              value={weekKey}
              onChange={setWeekKey}
              options={weekOptions}
              disabled={!userId}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Typography.Text type="secondary" className="mb-1 block text-xs uppercase">Pay Date</Typography.Text>
            <DatePicker
              className="w-full"
              value={paymentDate}
              onChange={(d) => d && setPaymentDate(d)}
              format="DD-MM-YYYY"
            />
          </Col>
          <Col xs={24} sm={8}>
            <Typography.Text type="secondary" className="mb-1 block text-xs uppercase">Status</Typography.Text>
            <Select className="w-full" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </Col>
          <Col xs={24} sm={16}>
            <Typography.Text type="secondary" className="mb-1 block text-xs uppercase">Notes</Typography.Text>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </Col>
        </Row>

        {selectedWeek && (
          <Space className="mt-3">
            <Typography.Text type="secondary">Amount to pay:</Typography.Text>
            <Typography.Text strong className="text-lg text-emerald-600">
              {formatCurrency(selectedWeek.totalAmount)}
            </Typography.Text>
            <Typography.Text type="secondary" className="text-xs">
              ({selectedWeek.expenseCount} admin-approved expense{selectedWeek.expenseCount > 1 ? 's' : ''})
            </Typography.Text>
          </Space>
        )}

        <Flex justify="end" className="mt-4!">
          <Button type="primary" loading={isPending} disabled={!selectedWeek} onClick={handleRecordPayment}>
            Record Payment
          </Button>
        </Flex>
      </Card>

      <Card
        className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!"
        styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}
      >
        <Table
          className="mantis-table"
          dataSource={payments}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 900 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} payments` }}
          locale={{ emptyText: 'No expense payments recorded yet' }}
        />
      </Card>
    </div>
  );
}
