'use client';
import { useState } from 'react';
import { Button, Descriptions, Modal, Table } from 'antd';
import type { LabourPayment } from '@/types/erp';
import { labourHistory } from '@/lib/labour-payment-history';
import { formatCurrency, formatDate } from './ui';

export function LabourPaymentHistory({ payments, title = "Labour payment history", showSummary = false }: { payments: LabourPayment[]; title?: string; showSummary?: boolean }) {
  const [open, setOpen] = useState(false);
  const entries = payments.flatMap(labourHistory);
  const total = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const paid = entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const balance = payments.reduce((sum, payment) => sum + Math.max(0,
    Number(payment.amount || 0) - labourHistory(payment).reduce((amount, entry) => amount + Number(entry.amount || 0), 0)), 0);
  return <>
    <Button size="small" disabled={!entries.length} onClick={() => setOpen(true)}>History ({entries.length})</Button>
    <Modal title={title} open={open} onCancel={() => setOpen(false)} footer={null} width={850}>
      {showSummary && <Descriptions size="small" column={{ xs: 1, sm: 3 }} className="mb-4" items={[
        { key: 'total', label: 'Total Amount', children: formatCurrency(total) },
        { key: 'paid', label: 'Paid Amount', children: formatCurrency(paid) },
        { key: 'balance', label: 'Balance Amount', children: formatCurrency(balance) },
      ]} />}
      <Table rowKey="id" dataSource={entries} size="small" scroll={{ x: 700 }} pagination={{ pageSize: 10 }} columns={[
        { title: 'Date', dataIndex: 'paymentDate', render: formatDate },
        { title: 'Amount', dataIndex: 'amount', align: 'right', render: formatCurrency },
        { title: 'Mode', dataIndex: 'paymentMode' },
        { title: 'Reference Number', dataIndex: 'referenceNumber', render: (value?: string) => value || '-' },
        { title: 'Notes', dataIndex: 'notes', render: (value?: string) => value || '-' },
      ]} />
    </Modal>
  </>;
}
