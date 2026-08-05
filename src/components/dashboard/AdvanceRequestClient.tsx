'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { Button, Card, Flex, Form, Input, InputNumber, Select, Table, Tag, Typography, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DollarOutlined, FileTextOutlined } from '@ant-design/icons';
import { createAdvanceRequest } from '@/actions/advance-requests';
import type { Project, VendorQuotation, AdvanceRequest, PurchaseOrder } from '@/types/erp';
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
  vendorQuotations: VendorQuotation[];
  advanceRequests: AdvanceRequest[];
  purchaseOrders: PurchaseOrder[];
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

const approvedQuotations = (vqs: VendorQuotation[]) => vqs.filter((vq) => vq.status === 'approved');

export function AdvanceRequestClient({ projects, vendorQuotations, advanceRequests, purchaseOrders }: Props) {
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [materialRequirementNo, setMaterialRequirementNo] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();

  const fullyPaidKeys = useMemo(() => {
    const set = new Set<string>();
    for (const po of purchaseOrders) {
      if (!po.materialRequirementNo) continue;
      const balance = Number(po.totalWithGst || po.totalAmount) - Number(po.paidAmount || 0);
      if (balance <= 0) set.add(`${po.vendorId}|${po.materialRequirementNo}`);
    }
    return set;
  }, [purchaseOrders]);

  const peOptions = useMemo(
    () => approvedQuotations(vendorQuotations).filter(
      (q) => !fullyPaidKeys.has(`${q.vendorId}|${q.materialRequirement?.enquiryNo || ''}`),
    ),
    [vendorQuotations, fullyPaidKeys],
  );
  const selectedQuotation = useMemo(
    () => peOptions.find((vq) => vq.id === selectedQuotationId) || null,
    [peOptions, selectedQuotationId],
  );

  const handleQuotationSelect = useCallback((value: string) => {
    const q = peOptions.find((vq) => vq.id === value);
    if (!q) return;
    setSelectedQuotationId(value);
    setVendorId(q.vendorId);
    setProjectId(q.projectId);
    setMaterialRequirementNo(q.materialRequirement?.enquiryNo || null);
  }, [peOptions]);

  const resetForm = () => {
    setSelectedQuotationId(null);
    setVendorId('');
    setProjectId('');
    setMaterialRequirementNo(null);
    setAmount(null);
    setNotes('');
  };

  const handleSubmit = () => {
    if (!vendorId || !projectId) {
      message.error('Select an approved vendor/MR first');
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
          vendorQuotationId: selectedQuotationId || undefined,
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

  const columns: ColumnsType<AdvanceRequest> = [
    { title: '#', key: 'sno', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Vendor', key: 'vendor', render: (_, record) => record.vendor?.name || record.vendorId },
    { title: 'Project', key: 'project', render: (_, record) => record.project?.name || '-' },
    { title: 'MR Ref', dataIndex: 'materialRequirementNo', render: (value?: string | null) => value || <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Amount', dataIndex: 'amount', align: 'right', render: (value: number | string) => formatCurrency(value) },
    { title: 'Quotation', key: 'quotation', render: (_, record) =>
      record.vendorQuotation?.quotationUrl ? (
        <Button type="link" size="small" icon={<FileTextOutlined />} href={record.vendorQuotation.quotationUrl} target="_blank">View</Button>
      ) : <Typography.Text type="secondary">-</Typography.Text>,
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
          {peOptions.length > 0 && (
            <Form.Item label="MR Ref / Vendor" required>
              <Select
                showSearch
                placeholder="Search MR Ref or vendor..."
                optionFilterProp="label"
                value={selectedQuotationId || undefined}
                onChange={handleQuotationSelect}
                options={peOptions.map((q) => {
                  const mrRef = q.materialRequirement?.enquiryNo;
                  const vendorName = q.vendor?.name || q.vendorId;
                  const projectName = q.project?.name || 'Unknown project';
                  return {
                    value: q.id,
                    label: mrRef ? `${mrRef} — ${vendorName} (${projectName})` : `${projectName} — ${vendorName}`,
                  };
                })}
              />
            </Form.Item>
          )}

          {peOptions.length === 0 && (
            <Typography.Text type="secondary">No approved vendors available yet — approve a vendor quotation first.</Typography.Text>
          )}

          {projectId && (
            <Form.Item label="Project">
              <Typography.Text>{projects.find((p) => p.id === projectId)?.name || projectId}</Typography.Text>
            </Form.Item>
          )}

          {selectedQuotation && (
            <Form.Item label="Quotation Reference">
              <Flex align="center" gap={16} wrap="wrap">
                <Typography.Text>
                  Quoted Total:{' '}
                  <Typography.Text strong>
                    {selectedQuotation.totalAmount ? formatCurrency(selectedQuotation.totalAmount) : 'Not entered'}
                  </Typography.Text>
                </Typography.Text>
                {selectedQuotation.quotationUrl && (
                  <Button size="small" icon={<FileTextOutlined />} href={selectedQuotation.quotationUrl} target="_blank">
                    View Quotation Bill
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

      <Card className={cardClassName} styles={{ body: { padding: 0 } }}>
        <Table dataSource={advanceRequests} columns={columns} rowKey="id" size="middle" pagination={{ pageSize: 10 }} locale={{ emptyText: 'No vendor payment requests yet' }} />
      </Card>
    </div>
  );
}
