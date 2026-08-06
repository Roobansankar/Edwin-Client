'use client';

import { Button, Card, Flex, Space, Table, Typography } from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined } from '@ant-design/icons';
import { PDFDownloadLink } from '@react-pdf/renderer';
import Link from 'next/link';
import type { SalesInvoice } from '@/types/erp';
import { InvoicePdf } from './InvoicePdf';
import { PaymentReceiptPdf } from './PaymentReceiptPdf';
import { StatusTag, formatCurrency, formatDate } from './ui';

type Props = {
  invoice: SalesInvoice | null;
};

export function InvoiceDetailClient({ invoice }: Props) {
  if (!invoice) {
    return (
      <div className="py-16 text-center">
        <Typography.Title level={4} type="secondary">Invoice not found</Typography.Title>
        <Link href="/dashboard/accounts/invoices">
          <Button type="primary" className="mt-4">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  const total = Number(invoice.totalAmount) + Number(invoice.gstAmount);
  const balance = total - Number(invoice.paidAmount || 0);

  return (
    <div>
      <Flex justify="space-between" align="center" className="mb-6!">
        <Flex align="center" gap={12}>
          <Link href="/dashboard/accounts/invoices">
            <Button icon={<ArrowLeftOutlined />} type="text" size="large" />
          </Link>
          <Typography.Title level={3} className="m-0!">
            Invoice — {invoice.invoiceNumber}
          </Typography.Title>
        </Flex>
        <Space>
          <PDFDownloadLink
            document={<InvoicePdf invoice={invoice} />}
            fileName={`${invoice.invoiceNumber}.pdf`}
          >
            <Button type="primary" icon={<FilePdfOutlined />}>Download PDF</Button>
          </PDFDownloadLink>
        </Space>
      </Flex>

      <Flex vertical gap={24}>
        <Card title="Invoice Info" size="small">
          <Flex vertical gap={8}>
            <Flex justify="space-between">
              <Typography.Text strong>Status:</Typography.Text>
              <StatusTag value={invoice.status} />
            </Flex>
            <Flex justify="space-between">
              <Typography.Text strong>Project:</Typography.Text>
              <Typography.Text>{invoice.project?.name || '-'}</Typography.Text>
            </Flex>
            <Flex justify="space-between">
              <Typography.Text strong>Client:</Typography.Text>
              <Typography.Text>{invoice.project?.clientName || '-'}</Typography.Text>
            </Flex>
            <Flex justify="space-between">
              <Typography.Text strong>Due Date:</Typography.Text>
              <Typography.Text>{formatDate(invoice.dueDate)}</Typography.Text>
            </Flex>
          </Flex>
        </Card>

        {invoice.items && invoice.items.length > 0 && (
          <Card title="Line Items" size="small">
            <Table
              dataSource={invoice.items}
              pagination={false}
              size="small"
              rowKey={(_, i) => String(i)}
              columns={[
                { title: '#', key: 'sno', width: 40, render: (_, __, i) => i + 1 },
                { title: 'Description', dataIndex: 'description' },
                { title: 'Qty', dataIndex: 'quantity', align: 'right' },
                { title: 'Unit', dataIndex: 'unit', align: 'center' },
                { title: 'Rate', dataIndex: 'rate', align: 'right', render: (val) => formatCurrency(val) },
                { title: 'Amount', key: 'amount', align: 'right', render: (_, r) => formatCurrency(Number(r.quantity) * Number(r.rate)) },
              ]}
            />
          </Card>
        )}

        <Card size="small">
          <Flex vertical gap={8} className="items-end">
            <Flex>
              <Typography.Text strong className="w-32">Subtotal:</Typography.Text>
              <Typography.Text className="w-28 text-right">{formatCurrency(invoice.totalAmount)}</Typography.Text>
            </Flex>
            <Flex>
              <Typography.Text strong className="w-32">GST:</Typography.Text>
              <Typography.Text className="w-28 text-right">{formatCurrency(invoice.gstAmount)}</Typography.Text>
            </Flex>
            <Flex>
              <Typography.Text strong className="w-32">Total:</Typography.Text>
              <Typography.Text className="w-28 text-right">{formatCurrency(total)}</Typography.Text>
            </Flex>
            <Flex>
              <Typography.Text strong className="w-32">Paid:</Typography.Text>
              <Typography.Text className="w-28 text-right" type="success">{formatCurrency(invoice.paidAmount)}</Typography.Text>
            </Flex>
            <Flex>
              <Typography.Text strong className="w-32">Balance:</Typography.Text>
              <Typography.Text className="w-28 text-right" type="danger">{formatCurrency(balance)}</Typography.Text>
            </Flex>
          </Flex>
        </Card>

        <Card title="Payment History" size="small">
          {invoice.payments && invoice.payments.length > 0 ? (
            <Table
              dataSource={invoice.payments}
              pagination={false}
              size="small"
              rowKey="id"
              columns={[
                { title: 'Date', dataIndex: 'paymentDate', render: formatDate },
                { title: 'Amount', dataIndex: 'amount', align: 'right', render: (val) => formatCurrency(val) },
                { title: 'Mode', dataIndex: 'paymentMode', render: (val) => <Typography.Text strong>{val?.toUpperCase()}</Typography.Text> },
                { title: 'Ref No', dataIndex: 'referenceNumber', render: (val) => val || '-' },
                {
                  title: 'Receipt',
                  key: 'receipt',
                  align: 'center',
                  render: (_, record) => (
                    <PDFDownloadLink
                      document={<PaymentReceiptPdf invoice={invoice} payment={record} />}
                      fileName={`Receipt_${record.referenceNumber || record.id}.pdf`}
                    >
                      <Button type="text" size="small" icon={<FilePdfOutlined className="text-red-500" />} />
                    </PDFDownloadLink>
                  ),
                },
              ]}
            />
          ) : (
            <Typography.Text type="secondary">No payments received yet.</Typography.Text>
          )}
        </Card>
      </Flex>
    </div>
  );
}
