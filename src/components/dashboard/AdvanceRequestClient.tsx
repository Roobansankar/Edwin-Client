'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { Button, Card, Flex, Form, Input, InputNumber, Select, Table, Tag, Typography, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DollarOutlined, FilePdfOutlined } from '@ant-design/icons';
import { createAdvanceRequest } from '@/actions/advance-requests';
import type { Project, AdvanceRequest, PurchaseOrder } from '@/types/erp';
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

const poBalance = (po: PurchaseOrder) => Number(po.totalWithGst || po.totalAmount) - Number(po.paidAmount || 0);

export function AdvanceRequestClient({ projects, advanceRequests, purchaseOrders }: Props) {
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [materialRequirementNo, setMaterialRequirementNo] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();

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

  const columns: ColumnsType<AdvanceRequest> = [
    { title: '#', key: 'sno', width: 50, render: (_, __, i) => i + 1 },
    { title: 'PO Number', key: 'po', render: (_, record) => record.purchaseOrder?.poNumber || <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Vendor', key: 'vendor', render: (_, record) => record.vendor?.name || record.vendorId },
    { title: 'Project', key: 'project', render: (_, record) => record.project?.name || '-' },
    { title: 'MR Ref', dataIndex: 'materialRequirementNo', render: (value?: string | null) => value || <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Amount', dataIndex: 'amount', align: 'right', render: (value: number | string) => formatCurrency(value) },
    { title: 'PO Document', key: 'poDocument', render: (_, record) =>
      record.purchaseOrder?.billFileUrl ? (
        <Button type="link" size="small" icon={<FilePdfOutlined />} href={record.purchaseOrder.billFileUrl} target="_blank">View</Button>
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

      <Card className={cardClassName} styles={{ body: { padding: 0 } }}>
        <Table dataSource={advanceRequests} columns={columns} rowKey="id" size="middle" pagination={{ pageSize: 10 }} locale={{ emptyText: 'No vendor payment requests yet' }} />
      </Card>
    </div>
  );
}
