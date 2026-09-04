'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Button, Card, Flex, Form, Input, InputNumber, Select, Table, Tag, Typography, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DollarOutlined, FileTextOutlined } from '@ant-design/icons';
import { createSubcontractorPaymentRequest } from '@/actions/subcontractor-payment-requests';
import type { Project, SubcontractWorkOrder, SubcontractorPaymentRequest } from '@/types/erp';
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

const approvedWorkOrders = (wos: SubcontractWorkOrder[]) => wos.filter((wo) => wo.status === 'approved');

export function SubcontractorPaymentRequestClient({ projects, workOrders, requests }: Props) {
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [subcontractorId, setSubcontractorId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const woOptions = useMemo(() => approvedWorkOrders(workOrders), [workOrders]);
  const selectedWorkOrder = useMemo(
    () => woOptions.find((wo) => wo.id === selectedWorkOrderId) || null,
    [woOptions, selectedWorkOrderId],
  );

  const handleWorkOrderSelect = useCallback((value: string) => {
    const wo = woOptions.find((w) => w.id === value);
    if (!wo) return;
    setSelectedWorkOrderId(value);
    setSubcontractorId(wo.subcontractorId);
    setProjectId(wo.projectId);
  }, [woOptions]);

  const resetForm = () => {
    setSelectedWorkOrderId(null);
    setSubcontractorId('');
    setProjectId('');
    setAmount(null);
    setNotes('');
  };

  const handleSubmit = () => {
    if (!subcontractorId || !projectId) {
      message.error('Select an approved work order first');
      return;
    }
    if (!amount || amount <= 0) {
      message.error('Enter a valid amount');
      return;
    }
    startTransition(async () => {
      try {
        await createSubcontractorPaymentRequest({
          subcontractorId,
          projectId,
          subcontractWorkOrderId: selectedWorkOrderId || undefined,
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
    { title: '#', key: 'sno', width: 50, render: (_, __, i) => i + 1 },
    { title: 'Subcontractor', key: 'subcontractor', width: 160, render: (_, record) => record.subcontractor?.name || record.subcontractorId },
    { title: 'Project', key: 'project', width: 160, responsive: ['md'], render: (_, record) => record.project?.name || '-' },
    { title: 'WO Number', key: 'wo', width: 130, responsive: ['md'], render: (_, record) => record.subcontractWorkOrder?.woNumber || <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Amount', dataIndex: 'amount', align: 'right', width: 120, render: (value: number | string) => formatCurrency(value) },
    { title: 'Work Order', key: 'workorder', width: 100, responsive: ['lg'], render: (_, record) =>
      record.subcontractWorkOrder?.workorderUrl ? (
        <Button type="link" size="small" icon={<FileTextOutlined />} href={record.subcontractWorkOrder.workorderUrl} target="_blank">View</Button>
      ) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    { title: 'Requested At', dataIndex: 'createdAt', width: 120, responsive: ['md'], render: formatDate },
    { title: 'Status', key: 'status', width: 140, render: (_, record) => <Tag color={STATUS_COLORS[record.status] || 'default'}>{STATUS_LABELS[record.status] || record.status.toUpperCase()}</Tag> },
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
          {woOptions.length > 0 && (
            <Form.Item label="Work Order / Subcontractor" required>
              <Select
                showSearch
                placeholder="Search WO number or subcontractor..."
                optionFilterProp="label"
                value={selectedWorkOrderId || undefined}
                onChange={handleWorkOrderSelect}
                options={woOptions.map((wo) => {
                  const subName = wo.subcontractor?.name || wo.subcontractorId;
                  const projectName = wo.project?.name || 'Unknown project';
                  return {
                    value: wo.id,
                    label: `${wo.woNumber} — ${subName} (${projectName})`,
                  };
                })}
              />
            </Form.Item>
          )}

          {woOptions.length === 0 && (
            <Typography.Text type="secondary">No approved work orders available yet — approve a subcontract work order first.</Typography.Text>
          )}

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

          {selectedWorkOrder && (
            <Form.Item label="Work Order Reference">
              <Flex align="center" gap={16} wrap="wrap">
                <Typography.Text>
                  Total Amount:{' '}
                  <Typography.Text strong>
                    {selectedWorkOrder.totalAmount ? formatCurrency(selectedWorkOrder.totalAmount) : 'Not entered'}
                  </Typography.Text>
                </Typography.Text>
                {selectedWorkOrder.workorderUrl && (
                  <Button size="small" icon={<FileTextOutlined />} href={selectedWorkOrder.workorderUrl} target="_blank">
                    View Work Order
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

          <Button type="primary" loading={isPending} onClick={handleSubmit} disabled={!subcontractorId} block={isMobile}>
            Send Request
          </Button>
        </Form>
      </Card>

      <Card className={cardClassName} styles={{ body: { padding: isMobile ? '0' : undefined } }}>
        {isMobile ? (
          <div className="flex flex-col">
            {requests.length === 0 ? (
              <div className="p-4 text-center text-gray-400">No subcontractor payment requests yet</div>
            ) : (
              requests.map((record) => (
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
          <Table dataSource={requests} columns={columns} rowKey="id" size="middle" pagination={{ pageSize: 10 }} locale={{ emptyText: 'No subcontractor payment requests yet' }} />
        )}
      </Card>
    </div>
  );
}
