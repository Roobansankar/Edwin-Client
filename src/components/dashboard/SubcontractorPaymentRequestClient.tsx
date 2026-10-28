'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Button, Card, DatePicker, Flex, Form, Input, InputNumber, Modal, Select, Table, Tag, Typography, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { DollarOutlined, EyeOutlined, FileTextOutlined, HistoryOutlined, SearchOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { createSubcontractorPaymentRequest } from '@/actions/subcontractor-payment-requests';
import type { Project, SubcontractWorkOrder, SubcontractorPaymentRequest, SubcontractorBill, Payment } from '@/types/erp';
import {
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

type Props = {
  projects: Project[];
  workOrders: SubcontractWorkOrder[];
  requests: SubcontractorPaymentRequest[];
  subcontractorBills: SubcontractorBill[];
  payments: Payment[];
};

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



export function SubcontractorPaymentRequestClient({ projects, workOrders, requests, subcontractorBills, payments }: Props) {
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [subcontractorId, setSubcontractorId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const [isMobile, setIsMobile] = useState(false);
  const [historyRecord, setHistoryRecord] = useState<SubcontractorPaymentRequest | null>(null);

  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [projectFilter, setProjectFilter] = useState<string | undefined>();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const filteredRequests = useMemo(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    return requests.filter((r) => {
      if (projectFilter && r.projectId !== projectFilter) return false;
      if (from && to) {
        const created = r.createdAt ? r.createdAt.split('T')[0] : '';
        if (created < from || created > to) return false;
      }
      if (searchText) {
        const q = searchText.toLowerCase();
        const bill = r.subcontractorBill || subcontractorBills.find((b) => r.subcontractorBillId ? b.id === r.subcontractorBillId : !!r.subcontractWorkOrderId && b.subcontractWorkOrderId === r.subcontractWorkOrderId);
        const haystack = [r.subcontractWorkOrder?.woNumber, bill?.billNumber, r.subcontractor?.name, r.project?.name, r.subcontractWorkOrder?.scrNo]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [requests, searchText, dateRange, projectFilter, subcontractorBills]);

  // Payments can land on a work order either directly (subcontractWorkOrderId,
  // the SWO drawer's own "Add Payment") or via a recorded Subcontractor Bill
  // ("Cash Outflow", which stamps subcontractorBillId instead) - match both
  // so History reflects everything actually paid against this WO.
  const paymentsForWorkOrder = useCallback((woId?: string | null) => {
    if (!woId) return [] as Payment[];
    const bill = subcontractorBills.find((b) => b.subcontractWorkOrderId === woId);
    return payments.filter((p) => p.subcontractWorkOrderId === woId || (bill && p.subcontractorBillId === bill.id));
  }, [payments, subcontractorBills]);

  const paymentsForRequest = useCallback((request: SubcontractorPaymentRequest) => {
    if (!request.subcontractorBillId) return paymentsForWorkOrder(request.subcontractWorkOrderId);
    return payments.filter((payment) => payment.subcontractorBillId === request.subcontractorBillId ||
      (!payment.subcontractorBillId && !!request.subcontractWorkOrderId && payment.subcontractWorkOrderId === request.subcontractWorkOrderId));
  }, [payments, paymentsForWorkOrder]);

  const historyPayments = useMemo(() => {
    return [...(historyRecord ? paymentsForRequest(historyRecord) : [])]
      .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
  }, [paymentsForRequest, historyRecord]);

  const billBalance = useCallback((bill: SubcontractorBill) => {
    const legacyPaid = payments.filter((payment) => !payment.subcontractorBillId && !!bill.subcontractWorkOrderId && payment.subcontractWorkOrderId === bill.subcontractWorkOrderId)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return Math.max(0, Number(bill.amount) - Number(bill.paidAmount || 0) - legacyPaid);
  }, [payments]);
  const billOptions = useMemo(() => subcontractorBills.filter((bill) => bill.status === 'approved' && bill.projectId && billBalance(bill) > 0), [subcontractorBills, billBalance]);
  const selectedBill = billOptions.find((bill) => bill.id === selectedBillId) || null;
  const selectedWorkOrder = workOrders.find((wo) => wo.id === selectedBill?.subcontractWorkOrderId) || selectedBill?.subcontractWorkOrder || null;

  const handleBillSelect = useCallback((value: string) => {
    const bill = billOptions.find((entry) => entry.id === value);
    if (!bill) return;
    setSelectedBillId(value);
    setSubcontractorId(bill.subcontractorId);
    setProjectId(bill.projectId || '');
    setAmount(billBalance(bill));
  }, [billOptions, billBalance]);

  const resetForm = () => {
    setSelectedBillId(null);
    setSubcontractorId('');
    setProjectId('');
    setAmount(null);
    setNotes('');
  };

  const handleSubmit = () => {
    if (!selectedBill || !subcontractorId || !projectId) {
      message.error('Select an approved bill first');
      return;
    }
    if (!amount || amount <= 0 || amount > billBalance(selectedBill)) {
      message.error('Enter an amount within the approved bill remaining balance');
      return;
    }
    startTransition(async () => {
      try {
        await createSubcontractorPaymentRequest({
          subcontractorBillId: selectedBill.id,
          subcontractorId,
          projectId,
          subcontractWorkOrderId: selectedBill.subcontractWorkOrderId || undefined,
          amount,
          notes: notes.trim() || undefined,
        });
        message.success('Payment request sent to accounts');
        resetForm();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to send request');
      }
    });
  };

  const columns: ColumnsType<SubcontractorPaymentRequest> = [
    { title: 'S.No', key: 'sno', width: 60, render: (_, __, i) => i + 1 },
    { title: 'WO No', key: 'wo', width: 130, render: (_, record) => record.subcontractWorkOrder?.woNumber || <Typography.Text type="secondary">-</Typography.Text> },
    {
      title: 'Bill No',
      key: 'billNo',
      width: 130,
      render: (_, record) => {
        const bill = record.subcontractorBill || subcontractorBills.find((b) => record.subcontractorBillId ? b.id === record.subcontractorBillId : !!record.subcontractWorkOrderId && b.subcontractWorkOrderId === record.subcontractWorkOrderId);
        return bill ? bill.billNumber : <Typography.Text type="secondary">-</Typography.Text>;
      },
    },
    { title: 'Sub Contractor', key: 'subcontractor', width: 160, render: (_, record) => record.subcontractor?.name || record.subcontractorId },
    { title: 'Project', key: 'project', width: 160, render: (_, record) => record.project?.name || '-' },
    { title: 'SCR No', key: 'scrNo', width: 120, render: (_, record) => record.subcontractWorkOrder?.scrNo || <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Amount', dataIndex: 'amount', align: 'right', width: 120, render: (value: number | string) => formatCurrency(value) },
    {
      // Final amount admin approved for payment.
      title: 'Final Amount', dataIndex: 'approvedAmount', align: 'right', width: 130,
      render: (value?: number | string | null) => (value !== null && value !== undefined && value !== '' ? formatCurrency(value) : '-'),
    },
    {
      title: 'History',
      key: 'history',
      width: 190,
      render: (_, record) => {
        if (!record.subcontractWorkOrderId && !record.subcontractorBillId) return <Typography.Text type="secondary">-</Typography.Text>;
        const woPayments = [...paymentsForRequest(record)]
          .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
        const bill = subcontractorBills.find((entry) => record.subcontractorBillId ? entry.id === record.subcontractorBillId : entry.subcontractWorkOrderId === record.subcontractWorkOrderId) || record.subcontractorBill;
        const balance = bill ? billBalance(bill) : Number(record.subcontractWorkOrder?.totalAmount || 0) - woPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        return (
          <Flex vertical gap={4}>
            {woPayments.length === 0 && (
              <Typography.Text type="secondary" className="text-xs">No payments yet</Typography.Text>
            )}
            <Typography.Text strong className="text-xs">Balance: {formatCurrency(balance)}</Typography.Text>
            {woPayments.length > 0 && (
              <Button size="small" icon={<HistoryOutlined />} onClick={() => setHistoryRecord(record)}>History</Button>
            )}
          </Flex>
        );
      },
    },
    { title: 'Requested At', dataIndex: 'createdAt', width: 120, render: formatDate },
    { title: 'Status', key: 'status', width: 140, render: (_, record) => <Tag color={STATUS_COLORS[record.status] || 'default'}>{STATUS_LABELS[record.status] || record.status.toUpperCase()}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      align: 'center',
      render: (_, record) => {
        // Opens the subcontractor bill raised against this request's work order.
        const bill = record.subcontractorBill || subcontractorBills.find((b) => record.subcontractorBillId ? b.id === record.subcontractorBillId : !!record.subcontractWorkOrderId && b.subcontractWorkOrderId === record.subcontractWorkOrderId);
        return bill && typeof bill.id === 'string' ? (
          <Link href={`/dashboard/accounts/subcontractor-bills/${encodeURIComponent(bill.id)}`}>
            <Button size="small" icon={<EyeOutlined />} title={`View bill ${bill.billNumber}`} />
          </Link>
        ) : (
          <Button size="small" icon={<EyeOutlined />} disabled title="No bill raised against this work order yet" />
        );
      },
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <DollarOutlined className={titleIconClassName} /> Subcontractor Payments
        </Typography.Title>
      </Flex>

      <Card className={`${cardClassName} mb-6`}>
        <Form layout="vertical">
          <Form.Item label="Bill Number" required>
            <Select
              showSearch
              placeholder="Search approved bill number..."
              optionFilterProp="label"
              value={selectedBillId || undefined}
              onChange={handleBillSelect}
              options={billOptions.map((bill) => ({
                value: bill.id,
                label: `${bill.billNumber} - ${bill.subcontractor?.name || bill.subcontractorId} - ${formatCurrency(bill.amount)}`,
              }))}
            />
          </Form.Item>
          {billOptions.length === 0 && <Typography.Text type="secondary">No bills approved by accounts and admin with an outstanding balance.</Typography.Text>}

          {projectId && (
            <Form.Item label="Project">
              <Typography.Text>{projects.find((p) => p.id === projectId)?.name || projectId}</Typography.Text>
            </Form.Item>
          )}

          {selectedWorkOrder && (
            <Form.Item label="WO Number">
              <Typography.Text strong>{selectedWorkOrder.woNumber}</Typography.Text>
            </Form.Item>
          )}

          {selectedBill && (
            <Form.Item label="Bill Reference">
              <Flex gap={16} wrap="wrap">
                <Typography.Text>Bill Total: <Typography.Text strong>{formatCurrency(selectedBill.amount)}</Typography.Text></Typography.Text>
                <Typography.Text>Balance: <Typography.Text strong>{formatCurrency(billBalance(selectedBill))}</Typography.Text></Typography.Text>
                {selectedBill.billFileUrl && <Button size="small" icon={<FileTextOutlined />} href={selectedBill.billFileUrl} target="_blank">View Bill Document</Button>}
              </Flex>
            </Form.Item>
          )}

          <Form.Item label="Amount" required>
            <InputNumber className="w-full" min={0.01} max={selectedBill ? billBalance(selectedBill) : undefined} precision={2} value={amount} onChange={setAmount} placeholder="Enter payment amount" />
          </Form.Item>

          <Form.Item label="Notes">
            <Input.TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for the payment (optional)" />
          </Form.Item>

          <Button type="primary" loading={isPending} onClick={handleSubmit} disabled={!selectedBill} block={isMobile}>
            Send Request
          </Button>
        </Form>
      </Card>

      <Flex gap={12} wrap="wrap" className="mb-6!">
        <Input.Search
          placeholder="Search WO, bill, subcontractor, SCR no..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
          style={{ width: 240 }}
        />
        <Select
          allowClear
          showSearch
          placeholder="Filter by project"
          style={{ width: 220 }}
          value={projectFilter}
          onChange={setProjectFilter}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
        />
        <DatePicker.RangePicker
          value={dateRange[0] || dateRange[1] ? dateRange : [null, null]}
          onChange={(dates) => setDateRange(dates ? [dates[0], dates[1]] : [null, null])}
          allowClear
          placeholder={['From date', 'To date']}
        />
      </Flex>

      <Card className={cardClassName} styles={{ body: { padding: isMobile ? '0' : undefined } }}>
        {isMobile ? (
          <div className="flex flex-col">
            {filteredRequests.length === 0 ? (
              <div className="p-4 text-center text-gray-400">No subcontractor payment requests yet</div>
            ) : (
              filteredRequests.map((record) => (
                <div key={record.id} className="border-b border-[var(--border)] p-3 last:border-b-0">
                  <Flex justify="space-between" align="center" className="mb-1">
                    <Typography.Text strong className="text-sm">{record.subcontractor?.name || record.subcontractorId}</Typography.Text>
                    <Tag color={STATUS_COLORS[record.status] || 'default'} className="m-0!">{STATUS_LABELS[record.status] || record.status.toUpperCase()}</Tag>
                  </Flex>
                  <div className="flex flex-col gap-0.5 text-xs text-[var(--text-muted)]">
                    {record.project?.name && <span>Project: {record.project.name}</span>}
                    {record.subcontractWorkOrder?.woNumber && <span>WO: {record.subcontractWorkOrder.woNumber}</span>}
                    <Flex justify="space-between" align="center" className="mt-1">
                      <Typography.Text strong>{formatCurrency(record.amount)}</Typography.Text>
                      <span>{record.createdAt ? formatDate(record.createdAt) : ''}</span>
                    </Flex>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <Table dataSource={filteredRequests} columns={columns} rowKey="id" size="middle" scroll={{ x: 1450 }} pagination={{ pageSize: 10 }} locale={{ emptyText: 'No subcontractor payment requests yet' }} />
        )}
      </Card>

      <Modal
        title={`Payment History — ${historyRecord?.subcontractWorkOrder?.woNumber || ''}`}
        open={!!historyRecord}
        onCancel={() => setHistoryRecord(null)}
        footer={[<Button key="close" onClick={() => setHistoryRecord(null)}>Close</Button>]}
        width={700}
      >
        <Table
          dataSource={historyPayments}
          pagination={false}
          size="small"
          rowKey="id"
          locale={{ emptyText: 'No payments recorded yet' }}
          columns={[
            { title: 'Date', dataIndex: 'paymentDate', render: formatDate },
            { title: 'Amount', dataIndex: 'amount', align: 'right', render: (v: number | string) => formatCurrency(v) },
            { title: 'Mode', dataIndex: 'paymentMode', render: (v: string) => v?.toUpperCase() },
            { title: 'Reference', dataIndex: 'referenceNumber', render: (v?: string | null) => v || '-' },
          ]}
        />
      </Modal>
    </div>
  );
}
