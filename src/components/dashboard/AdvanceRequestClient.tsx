'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { Button, Card, DatePicker, Flex, Form, Input, InputNumber, Modal, Select, Table, Tag, Typography, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { DollarOutlined, FilePdfOutlined, HistoryOutlined, SearchOutlined } from '@ant-design/icons';
import { createAdvanceRequest } from '@/actions/advance-requests';
import type { Project, AdvanceRequest, PurchaseOrder, PurchaseBill, Payment } from '@/types/erp';
import {
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

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

const poBalance = (po: PurchaseOrder) => Number(po.totalWithGst || po.totalAmount) - Number(po.paidAmount || 0);

export function AdvanceRequestClient({ projects, advanceRequests, purchaseOrders, bills, payments }: Props) {
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
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
        const bill = bills.find((b) => b.purchaseOrderId === r.purchaseOrderId);
        const haystack = [r.purchaseOrder?.poNumber, bill?.billNumber, r.vendor?.name, r.project?.name, r.materialRequirementNo]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [advanceRequests, searchText, dateRange, projectFilter, bills]);

  const poOptions = useMemo(
    () => purchaseOrders.filter((po) => po.status === 'approved' && poBalance(po) > 0),
    [purchaseOrders],
  );
  const selectedPo = useMemo(
    () => poOptions.find((po) => po.id === selectedPoId) || null,
    [poOptions, selectedPoId],
  );

  const handlePoSelect = useCallback((value: string) => {
    const po = poOptions.find((p) => p.id === value);
    if (!po) return;
    setSelectedPoId(value);
    setVendorId(po.vendorId);
    setProjectId(po.projectId);
    setMaterialRequirementNo(po.materialRequirementNo || null);
    const balance = poBalance(po);
    setAmount(balance > 0 ? balance : null);
  }, [poOptions]);

  const resetForm = () => {
    setSelectedPoId(null);
    setVendorId('');
    setProjectId('');
    setMaterialRequirementNo(null);
    setAmount(null);
    setNotes('');
  };

  const handleSubmit = () => {
    if (!vendorId || !projectId) {
      message.error('Select a PO first');
      return;
    }
    if (!amount || amount <= 0) {
      message.error('Enter a valid amount');
      return;
    }
    startTransition(async () => {
      try {
        await createAdvanceRequest({
          vendorId,
          projectId,
          materialRequirementNo: materialRequirementNo || undefined,
          purchaseOrderId: selectedPoId || undefined,
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
    if (!historyRecord?.purchaseOrderId) return [];
    return [...payments]
      .filter((p) => p.purchaseOrderId === historyRecord.purchaseOrderId)
      .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
  }, [payments, historyRecord]);

  const columns: ColumnsType<AdvanceRequest> = [
    { title: 'S.No', key: 'sno', width: 60, render: (_, __, i) => i + 1 },
    { title: 'PO No', key: 'po', render: (_, record) => record.purchaseOrder?.poNumber || <Typography.Text type="secondary">-</Typography.Text> },
    {
      title: 'Bill No',
      key: 'billNo',
      render: (_, record) => {
        const bill = bills.find((b) => b.purchaseOrderId === record.purchaseOrderId);
        return bill ? bill.billNumber : <Typography.Text type="secondary">-</Typography.Text>;
      },
    },
    { title: 'Vendor', key: 'vendor', render: (_, record) => record.vendor?.name || record.vendorId },
    { title: 'Project', key: 'project', render: (_, record) => record.project?.name || '-' },
    { title: 'MR No', dataIndex: 'materialRequirementNo', render: (value?: string | null) => value || <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Amount', dataIndex: 'amount', align: 'right', render: (value: number | string) => formatCurrency(value) },
    {
      title: 'History',
      key: 'history',
      width: 190,
      render: (_, record) => {
        if (!record.purchaseOrderId) return <Typography.Text type="secondary">-</Typography.Text>;
        const poPayments = [...payments]
          .filter((p) => p.purchaseOrderId === record.purchaseOrderId)
          .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
        const poTotal = Number(record.purchaseOrder?.totalWithGst || record.purchaseOrder?.totalAmount || 0);
        const paid = poPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const balance = poTotal - paid;
        return (
          <Flex vertical gap={4}>
            {poPayments.length === 0 ? (
              <Typography.Text type="secondary" className="text-xs">No payments yet</Typography.Text>
            ) : (
              poPayments.slice(0, 2).map((p, i) => (
                <Typography.Text key={p.id} className="text-xs">{ordinal(i + 1)} Payment: {formatCurrency(p.amount)}</Typography.Text>
              ))
            )}
            <Typography.Text strong className="text-xs">Balance: {formatCurrency(balance)}</Typography.Text>
            {poPayments.length > 0 && (
              <Button size="small" icon={<HistoryOutlined />} onClick={() => setHistoryRecord(record)}>History</Button>
            )}
          </Flex>
        );
      },
    },
    { title: 'Requested At', dataIndex: 'createdAt', render: formatDate },
    { title: 'Status', key: 'status', render: (_, record) => <Tag color={STATUS_COLORS[record.status] || 'default'}>{STATUS_LABELS[record.status] || record.status.toUpperCase()}</Tag> },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName}>
        <Typography.Title level={3} className={pageTitleClassName}>
          <DollarOutlined className={titleIconClassName} /> Vendor Payments
        </Typography.Title>
      </Flex>

      <Card className={`${cardClassName} mb-6`}>
        <Form layout="vertical">
          {poOptions.length > 0 && (
            <Form.Item label="PO Number / MR Ref" required>
              <Select
                showSearch
                placeholder="Search PO number or MR Ref..."
                optionFilterProp="label"
                value={selectedPoId || undefined}
                onChange={handlePoSelect}
                options={poOptions.map((po) => {
                  const mrRef = po.materialRequirementNo;
                  const vendorName = po.vendor?.name || po.vendorId;
                  const projectName = po.project?.name || 'Unknown project';
                  return {
                    value: po.id,
                    label: mrRef ? `${po.poNumber} — ${mrRef} — ${vendorName} (${projectName})` : `${po.poNumber} — ${vendorName} (${projectName})`,
                  };
                })}
              />
            </Form.Item>
          )}

          {poOptions.length === 0 && (
            <Typography.Text type="secondary">No approved purchase orders with an outstanding balance yet.</Typography.Text>
          )}

          {projectId && (
            <Form.Item label="Project">
              <Typography.Text>{projects.find((p) => p.id === projectId)?.name || projectId}</Typography.Text>
            </Form.Item>
          )}

          {selectedPo && (
            <Form.Item label="PO Reference">
              <Flex align="center" gap={16} wrap="wrap">
                <Typography.Text>
                  PO Total: <Typography.Text strong>{formatCurrency(selectedPo.totalWithGst || selectedPo.totalAmount)}</Typography.Text>
                </Typography.Text>
                <Typography.Text>
                  Paid So Far: <Typography.Text strong>{formatCurrency(selectedPo.paidAmount || 0)}</Typography.Text>
                </Typography.Text>
                <Typography.Text>
                  Balance: <Typography.Text strong>{formatCurrency(poBalance(selectedPo))}</Typography.Text>
                </Typography.Text>
                {selectedPo.billFileUrl && (
                  <Button size="small" icon={<FilePdfOutlined />} href={selectedPo.billFileUrl} target="_blank">
                    View PO Document
                  </Button>
                )}
              </Flex>
            </Form.Item>
          )}

          <Form.Item label="Amount" required>
            <InputNumber className="w-full" min={0} value={amount} onChange={setAmount} placeholder="Enter payment amount" />
          </Form.Item>

          <Form.Item label="Notes">
            <Input.TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for the payment (optional)" />
          </Form.Item>

          <Button type="primary" loading={isPending} onClick={handleSubmit} disabled={!vendorId}>
            Send Request
          </Button>
        </Form>
      </Card>

      <Flex gap={12} wrap="wrap" className="mb-6!">
        <Input.Search
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

      <Card className={cardClassName} styles={{ body: { padding: 0 } }}>
        <Table dataSource={filteredRequests} columns={columns} rowKey="id" size="middle" scroll={{ x: 1200 }} pagination={{ pageSize: 10 }} locale={{ emptyText: 'No vendor payment requests yet' }} />
      </Card>

      <Modal
        title={`Payment History — ${historyRecord?.purchaseOrder?.poNumber || ''}`}
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
