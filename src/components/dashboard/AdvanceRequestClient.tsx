'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { Button, Card, DatePicker, Flex, Form, Input, InputNumber, Modal, Select, Table, Tag, Typography, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { DollarOutlined, EyeOutlined, FilePdfOutlined, HistoryOutlined, SearchOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { createAdvanceRequest } from '@/actions/advance-requests';
import type { Project, AdvanceRequest, PurchaseOrder, PurchaseBill, Payment } from '@/types/erp';
import {
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';
import { PagedTableCard, StatusCards } from './DataTablePanel';

type Props = {
  projects: Project[];
  advanceRequests: AdvanceRequest[];
  purchaseOrders: PurchaseOrder[];
  bills: PurchaseBill[];
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

const billBalance = (bill: PurchaseBill) => Math.max(0, Number(bill.amount) - Number(bill.paidAmount || 0));

// Same labels as Purchase Enquiry / Vendors.
const PAYMENT_TERMS_LABELS: Record<string, string> = {
  advance: 'Advance',
  credit: 'Credit',
  full_payment: 'Full Payment',
};

// The PO's payment terms, or the vendor's own terms when the PO has none.
const paymentTermsLabel = (po?: PurchaseOrder | null, vendorTerms?: string | null) => {
  const terms = po?.paymentTerms || vendorTerms;
  return terms ? PAYMENT_TERMS_LABELS[terms] || terms : null;
};

export function AdvanceRequestClient({ projects, advanceRequests, purchaseOrders, bills, payments }: Props) {
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [materialRequirementNo, setMaterialRequirementNo] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const [historyRecord, setHistoryRecord] = useState<AdvanceRequest | null>(null);

  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [projectFilter, setProjectFilter] = useState<string | undefined>();

  const filteredRequests = useMemo(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    return advanceRequests.filter((r) => {
      if (projectFilter && r.projectId !== projectFilter) return false;
      if (from && to) {
        const created = r.createdAt ? r.createdAt.split('T')[0] : '';
        if (created < from || created > to) return false;
      }
      if (searchText) {
        const q = searchText.toLowerCase();
        const bill = r.purchaseBill || bills.find((b) => r.purchaseBillId ? b.id === r.purchaseBillId : !!r.purchaseOrderId && b.purchaseOrderId === r.purchaseOrderId);
        const haystack = [r.purchaseOrder?.poNumber, bill?.billNumber, r.vendor?.name, r.project?.name, r.materialRequirementNo]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [advanceRequests, searchText, dateRange, projectFilter, bills]);

  const billOptions = useMemo(
    () => bills.filter((bill) => bill.status === 'approved' && billBalance(bill) > 0 && bill.projectId),
    [bills],
  );
  const selectedBill = useMemo(
    () => billOptions.find((bill) => bill.id === selectedBillId) || null,
    [billOptions, selectedBillId],
  );
  const selectedPo = useMemo(
    () => purchaseOrders.find((po) => po.id === selectedBill?.purchaseOrderId) || selectedBill?.purchaseOrder || null,
    [purchaseOrders, selectedBill],
  );

  const handleBillSelect = useCallback((value: string) => {
    const bill = billOptions.find((entry) => entry.id === value);
    if (!bill) return;
    const po = purchaseOrders.find((entry) => entry.id === bill.purchaseOrderId) || bill.purchaseOrder;
    setSelectedBillId(value);
    setVendorId(bill.vendorId);
    setProjectId(bill.projectId || '');
    setMaterialRequirementNo(po?.materialRequirementNo || null);
    setAmount(billBalance(bill));
  }, [billOptions, purchaseOrders]);

  const resetForm = () => {
    setSelectedBillId(null);
    setVendorId('');
    setProjectId('');
    setMaterialRequirementNo(null);
    setAmount(null);
    setNotes('');
  };

  const handleSubmit = () => {
    if (!selectedBill || !vendorId || !projectId) {
      message.error('Select an approved bill first');
      return;
    }
    if (!amount || amount <= 0 || amount > billBalance(selectedBill)) {
      message.error('Enter an amount within the approved bill remaining balance');
      return;
    }
    startTransition(async () => {
      try {
        await createAdvanceRequest({
          purchaseBillId: selectedBill.id,
          vendorId,
          projectId,
          materialRequirementNo: materialRequirementNo || undefined,
          purchaseOrderId: selectedBill.purchaseOrderId || undefined,
          amount,
          notes: notes.trim() || undefined,
        });
        message.success('Vendor payment request sent to accounts');
        resetForm();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to send request');
      }
    });
  };

  const historyPayments = useMemo(() => {
    if (!historyRecord) return [];
    return [...payments]
      .filter((payment) => historyRecord.purchaseBillId
        ? payment.purchaseBillId === historyRecord.purchaseBillId || (!payment.purchaseBillId && !!historyRecord.purchaseOrderId && payment.purchaseOrderId === historyRecord.purchaseOrderId)
        : !!historyRecord.purchaseOrderId && payment.purchaseOrderId === historyRecord.purchaseOrderId)
      .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
  }, [payments, historyRecord]);

  // S.No follows the filtered list, so numbering continues across pages.
  const serialById = new Map(filteredRequests.map((r, i) => [r.id, i + 1]));

  const columns: ColumnsType<AdvanceRequest> = [
    { title: 'S.No', key: 'sno', width: 70, render: (_, record) => serialById.get(record.id) },

    {
      title: 'Bill No',
      key: 'billNo',
      width: 140,
      render: (_, record) => {
        const bill = record.purchaseBill || bills.find((b) => record.purchaseBillId ? b.id === record.purchaseBillId : !!record.purchaseOrderId && b.purchaseOrderId === record.purchaseOrderId);
        return bill ? bill.billNumber : <Typography.Text type="secondary">-</Typography.Text>;
      },
    },
    { title: 'PO No', key: 'po', width: 130, render: (_, record) => record.purchaseOrder?.poNumber || <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Vendor', key: 'vendor', width: 180, render: (_, record) => record.vendor?.name || record.vendorId },
    { title: 'Project', key: 'project', width: 200, render: (_, record) => record.project?.name || '-' },
    { title: 'MR No', dataIndex: 'materialRequirementNo', width: 130, render: (value?: string | null) => value || <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Amount', dataIndex: 'amount', align: 'right', width: 130, render: (value: number | string) => formatCurrency(value) },
    {
      // Final amount admin approved for payment.
      title: 'Final Amount', dataIndex: 'approvedAmount', align: 'right', width: 130,
      render: (value?: number | string | null) => (value !== null && value !== undefined && value !== '' ? formatCurrency(value) : '-'),
    },
    {
      title: 'Payment Terms',
      key: 'paymentTerms',
      width: 140,
      render: (_, record) => {
        const label = paymentTermsLabel(record.purchaseOrder, record.vendor?.paymentTerms);
        return label ? <Tag color="blue">{label}</Tag> : <Typography.Text type="secondary">-</Typography.Text>;
      },
    },
    {
      title: 'History',
      key: 'history',
      width: 190,
      render: (_, record) => {
        const bill = record.purchaseBill || bills.find((entry) => record.purchaseBillId ? entry.id === record.purchaseBillId : !!record.purchaseOrderId && entry.purchaseOrderId === record.purchaseOrderId);
        if (!bill) return <Typography.Text type="secondary">-</Typography.Text>;
        const poPayments = payments.filter((payment) => record.purchaseBillId
          ? payment.purchaseBillId === record.purchaseBillId || (!payment.purchaseBillId && !!record.purchaseOrderId && payment.purchaseOrderId === record.purchaseOrderId)
          : !!record.purchaseOrderId && payment.purchaseOrderId === record.purchaseOrderId);
        const balance = billBalance(bill);
        return (
          <Flex vertical gap={4}>
            {poPayments.length === 0 && (
              <Typography.Text type="secondary" className="text-xs">No payments yet</Typography.Text>
            )}
            <Typography.Text strong className="text-xs">Balance: {formatCurrency(balance)}</Typography.Text>
            {poPayments.length > 0 && (
              <Button size="small" icon={<HistoryOutlined />} onClick={() => setHistoryRecord(record)}>History</Button>
            )}
          </Flex>
        );
      },
    },
    { title: 'Requested At', dataIndex: 'createdAt', width: 130, render: formatDate },
    { title: 'Status', key: 'status', width: 190, render: (_, record) => <Tag color={STATUS_COLORS[record.status] || 'default'}>{STATUS_LABELS[record.status] || record.status.toUpperCase()}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      align: 'center',
      render: (_, record) => {
        // Opens the vendor bill raised against this request's PO.
        const bill = record.purchaseBill || bills.find((b) => record.purchaseBillId ? b.id === record.purchaseBillId : !!record.purchaseOrderId && b.purchaseOrderId === record.purchaseOrderId);
        const billId = typeof record.purchaseBillId === 'string' && record.purchaseBillId
          ? record.purchaseBillId
          : typeof bill?.id === 'string' && bill.id ? bill.id : null;
        return bill && billId ? (
          <Link href={`/dashboard/accounts/bills/${encodeURIComponent(billId)}`}>
            <Button size="small" icon={<EyeOutlined />} title={`View bill ${bill.billNumber}`} />
          </Link>
        ) : (
          <Button size="small" icon={<EyeOutlined />} disabled title="No linked bill" />
        );
      },
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName}>
        <Typography.Title level={3} className={pageTitleClassName}>
          <DollarOutlined className={titleIconClassName} /> Vendor Payments
        </Typography.Title>
      </Flex>

      <Card
        className="mb-6! rounded-2xl! border! border-[var(--border)]!"
        title={<Typography.Text strong className="text-[var(--text-primary)]!">New Vendor Payment Request</Typography.Text>}
      >
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
                label: `${bill.billNumber} - ${bill.vendor?.name || bill.vendorId} - ${formatCurrency(bill.amount)}${bill.purchaseOrder?.poNumber ? ` (PO: ${bill.purchaseOrder.poNumber})` : ''}`,
              }))}
            />
          </Form.Item>

          {billOptions.length === 0 && (
            <Typography.Text type="secondary">No bills approved by accounts and admin with an outstanding balance.</Typography.Text>
          )}

          {projectId && (
            <Form.Item label="Project">
              <Typography.Text>{projects.find((p) => p.id === projectId)?.name || projectId}</Typography.Text>
            </Form.Item>
          )}

          {selectedBill && (
            <Form.Item label="Bill Reference">
              <Flex align="center" gap={16} wrap="wrap">
                <Typography.Text>
                  Bill Total: <Typography.Text strong>{formatCurrency(selectedBill.amount)}</Typography.Text>
                </Typography.Text>
                <Typography.Text>
                  Paid So Far: <Typography.Text strong>{formatCurrency(selectedBill.paidAmount || 0)}</Typography.Text>
                </Typography.Text>
                <Typography.Text>
                  Balance: <Typography.Text strong>{formatCurrency(billBalance(selectedBill))}</Typography.Text>
                </Typography.Text>
                <Typography.Text>
                  Payment Terms:{' '}
                  {paymentTermsLabel(selectedPo, selectedPo?.vendor?.paymentTerms || selectedBill.vendor?.paymentTerms)
                    ? <Tag color="blue" className="m-0!">{paymentTermsLabel(selectedPo, selectedPo?.vendor?.paymentTerms || selectedBill.vendor?.paymentTerms)}</Tag>
                    : <Typography.Text type="secondary">-</Typography.Text>}
                </Typography.Text>
                {selectedBill.billFileUrl && (
                  <Button size="small" icon={<FilePdfOutlined />} href={selectedBill.billFileUrl} target="_blank">
                    View Bill Document
                  </Button>
                )}
              </Flex>
            </Form.Item>
          )}

          <Form.Item label="Amount" required>
            <InputNumber className="w-full" min={0.01} max={selectedBill ? billBalance(selectedBill) : undefined} precision={2} value={amount} onChange={setAmount} placeholder="Enter payment amount" />
          </Form.Item>

          <Form.Item label="Notes">
            <Input.TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for the payment (optional)" />
          </Form.Item>

          <Button type="primary" loading={isPending} onClick={handleSubmit} disabled={!selectedBill}>
            Send Request
          </Button>
        </Form>
      </Card>

      <StatusCards
        items={[
          { key: 'count', label: 'Requests', value: filteredRequests.length },
          { key: 'pending', label: 'Pending', value: filteredRequests.filter((r) => r.status === 'pending' || r.status === 'accepted').length },
          { key: 'approved', label: 'Approved', value: filteredRequests.filter((r) => r.status === 'admin_approved').length },
          { key: 'total', label: 'Total Requested', value: formatCurrency(filteredRequests.reduce((sum, r) => sum + Number(r.amount || 0), 0)) },
        ]}
      />

      <PagedTableCard
        title="My Payment Requests"
        subtitle={`${filteredRequests.length} ${filteredRequests.length === 1 ? 'request' : 'requests'}`}
        toolbar={(
          <>
            <Input
              placeholder="Search PO, bill, vendor, MR no..."
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
              style={{ width: 200 }}
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
          </>
        )}
        noun="requests"
        dataSource={filteredRequests}
        columns={columns}
        rowKey="id"
        size="middle"
        scroll={{ x: columns.reduce((sum, c) => sum + Number(c.width || 0), 0) }}
        locale={{ emptyText: 'No vendor payment requests yet' }}
      />

      <Modal
        title={`Payment History — ${historyRecord?.purchaseBill?.billNumber || bills.find((bill) => bill.id === historyRecord?.purchaseBillId)?.billNumber || historyRecord?.purchaseOrder?.poNumber || ''}`}
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
