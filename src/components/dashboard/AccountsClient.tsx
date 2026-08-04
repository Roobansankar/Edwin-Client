'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, Col, Row, Statistic, Table, Typography, Tag, Flex, Tabs, Button } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, BankOutlined, ShoppingCartOutlined, DollarOutlined, FileTextOutlined, RightOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { PurchaseBill, SalesInvoice } from '@/types/erp';
import {
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

const { Title, Text } = Typography;

type AccountsClientProps = {
  payables: PurchaseBill[];
  receivables: SalesInvoice[];
};

export function AccountsClient({ payables, receivables }: AccountsClientProps) {
  const totalPayables = useMemo(() => payables.reduce((s, b) => s + (Number(b.amount) - Number(b.paidAmount || 0)), 0), [payables]);
  const totalReceivables = useMemo(() => receivables.reduce((s, i) => s + (Number(i.totalAmount) + Number(i.gstAmount) - Number(i.paidAmount || 0)), 0), [receivables]);

  const payableColumns: ColumnsType<PurchaseBill> = [
    { 
      title: 'Bill #', 
      dataIndex: 'billNumber', 
      key: 'billNumber', 
      width: 130, 
      render: (v, r) => (
        <Link href={`/dashboard/accounts/bills/${r.id}`}>
          <Text strong style={{ color: '#1677ff' }}>{v}</Text>
        </Link>
      )
    },
    { title: 'Vendor', key: 'vendor', width: 180, render: (_, r) => r.vendor?.name ?? '-' },
    { title: 'Date', dataIndex: 'billDate', key: 'billDate', render: formatDate, width: 110 },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate', render: (v) => v ? formatDate(v) : '-', width: 110 },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: formatCurrency, width: 130, sorter: (a, b) => Number(a.amount) - Number(b.amount) },
    { title: 'Paid', dataIndex: 'paidAmount', key: 'paidAmount', align: 'right', render: formatCurrency, width: 130 },
    { title: 'Balance', key: 'balance', align: 'right', width: 130, render: (_, r) => <Text type="danger" strong>{formatCurrency(Number(r.amount) - Number(r.paidAmount || 0))}</Text> },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v) => <Tag color={v === 'paid' ? 'green' : 'orange'}>{String(v).toUpperCase()}</Tag>,
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, r) => (
        <Link href={`/dashboard/accounts/bills/${r.id}`}>
          <Button type="text" icon={<RightOutlined />} />
        </Link>
      ),
    },
  ];

  const receivableColumns: ColumnsType<SalesInvoice> = [
    { 
      title: 'Invoice #', 
      dataIndex: 'invoiceNumber', 
      key: 'invoiceNumber', 
      width: 140, 
      render: (v, r) => (
        <Link href={`/dashboard/accounts/invoices/${r.id}`}>
          <Text strong style={{ color: '#1677ff' }}>{v}</Text>
        </Link>
      )
    },
    { title: 'Project', key: 'project', width: 180, render: (_, r) => r.project?.name ?? '-' },
    { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right', render: formatCurrency, width: 130, sorter: (a, b) => Number(a.totalAmount) - Number(b.totalAmount) },
    { title: 'GST', dataIndex: 'gstAmount', key: 'gstAmount', align: 'right', render: formatCurrency, width: 110 },
    { title: 'Paid', dataIndex: 'paidAmount', key: 'paidAmount', align: 'right', render: formatCurrency, width: 130 },
    { title: 'Balance', key: 'balance', align: 'right', width: 130, render: (_, r) => <Text type="success" strong>{formatCurrency(Number(r.totalAmount) + Number(r.gstAmount) - Number(r.paidAmount || 0))}</Text> },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate', render: (v) => v ? formatDate(v) : '-', width: 110 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v) => <Tag color={v === 'paid' ? 'green' : v === 'overdue' ? 'red' : 'blue'}>{String(v).toUpperCase()}</Tag>,
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, r) => (
        <Link href={`/dashboard/accounts/invoices/${r.id}`}>
          <Button type="text" icon={<RightOutlined />} />
        </Link>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Title level={3} className={pageTitleClassName}>
          <BankOutlined className={titleIconClassName} /> Accounts
        </Title>
        <Flex gap={8}>
          <Link href="/dashboard/accounts/bills">
            <Button icon={<ShoppingCartOutlined />}>Purchase Bills</Button>
          </Link>
          <Link href="/dashboard/accounts/invoices">
            <Button type="primary" icon={<FileTextOutlined />}>Sales Invoices</Button>
          </Link>
        </Flex>
      </Flex>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12}>
          <Card className={cardClassName} variant="borderless">
            <Statistic
              title="Total Payables"
              value={totalPayables}
              precision={2}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ArrowDownOutlined />}
              formatter={(val) => formatCurrency(val as number)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className={cardClassName} variant="borderless">
            <Statistic
              title="Total Receivables"
              value={totalReceivables}
              precision={2}
              valueStyle={{ color: '#3f8600' }}
              prefix={<ArrowUpOutlined />}
              formatter={(val) => formatCurrency(val as number)}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="payables"
        items={[
          {
            key: 'payables',
            label: (
              <span>
                <ShoppingCartOutlined /> Payables ({payables.length})
              </span>
            ),
            children: (
              <Card className={`${cardClassName} mb-6`} styles={{ body: { padding: 0 } }}>
                <Table
                  dataSource={payables}
                  columns={payableColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} payables` }}
                  scroll={{ x: 800 }}
                />
              </Card>
            ),
          },
          {
            key: 'receivables',
            label: (
              <span>
                <DollarOutlined /> Receivables ({receivables.length})
              </span>
            ),
            children: (
              <Card className={cardClassName} styles={{ body: { padding: 0 } }}>
                <Table
                  dataSource={receivables}
                  columns={receivableColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} receivables` }}
                  scroll={{ x: 800 }}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
