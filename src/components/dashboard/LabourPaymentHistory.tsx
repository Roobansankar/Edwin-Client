'use client';
import { useState } from 'react';
import { Button, Modal, Table } from 'antd';
import type { LabourPayment } from '@/types/erp';
import { labourHistory } from '@/lib/labour-payment-history';
import { formatCurrency, formatDate } from './ui';

export function LabourPaymentHistory({ payments, title = "Labour payment history" }: { payments: LabourPayment[]; title?: string }) {
  const [open, setOpen] = useState(false);
  const entries = payments.flatMap(labourHistory);
  return <>
    <Button size="small" disabled={!entries.length} onClick={() => setOpen(true)}>History ({entries.length})</Button>
    <Modal title={title} open={open} onCancel={() => setOpen(false)} footer={null} width={850}>
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
