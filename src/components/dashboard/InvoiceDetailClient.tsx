'use client';

import { useMemo } from 'react';
import { Button, Card, Col, Flex, Row, Space, Statistic, Table, Typography } from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined } from '@ant-design/icons';
import { PDFDownloadLink } from '@react-pdf/renderer';
import Link from 'next/link';
import type { SalesInvoice } from '@/types/erp';
import { InvoicePdf } from './InvoicePdf';
import { PaymentReceiptPdf } from './PaymentReceiptPdf';
import { cardClassName, StatusTag, formatCurrency, formatDate } from './ui';

type Props = {
  invoice: SalesInvoice | null;
  projectInvoices?: SalesInvoice[];
};

export function InvoiceDetailClient({ invoice, projectInvoices = [] }: Props) {
  const totals = useMemo(() => {
    const estimate = Number(
      invoice?.project?.estimatedTotal ||
      (Number(invoice?.project?.estimatedBudget || 0) + Number(invoice?.project?.estimatedGst || 0)),
    );
    const raised = projectInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount) + Number(inv.gstAmount), 0);
    const received = projectInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
    const balance = raised - received;
    return { estimate, raised, received, balance };
  }, [invoice, projectInvoices]);

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

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className={cardClassName} variant="borderless">
              <Statistic
                title="Project Estimate"
                value={totals.estimate}
                precision={2}
                formatter={(val) => formatCurrency(val as number)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className={cardClassName} variant="borderless">
              <Statistic
                title="Raised"
                value={totals.raised}
                precision={2}
                styles={{ content: { color: '#1677ff' } }}
                formatter={(val) => formatCurrency(val as number)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className={cardClassName} variant="borderless">
              <Statistic
                title="Received"
                value={totals.received}
                precision={2}
                styles={{ content: { color: '#3f8600' } }}
                formatter={(val) => formatCurrency(val as number)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className={cardClassName} variant="borderless">
              <Statistic
                title="Balance"
                value={totals.balance}
                precision={2}
                styles={{ content: { color: totals.balance > 0 ? '#cf1322' : undefined } }}
                formatter={(val) => formatCurrency(val as number)}
              />
            </Card>
          </Col>
        </Row>

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
