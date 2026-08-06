'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, Col, Row, Statistic, Table, Typography, Tag, Flex, Tabs, Button, Select, DatePicker } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, BankOutlined, ShoppingCartOutlined, DollarOutlined, FileTextOutlined, RightOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import type { Project, SalesInvoice } from '@/types/erp';
import {
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

const { Title, Text } = Typography;

type PayableRow = {
  id: string;
  source: 'bill' | 'purchase_order';
  billNumber: string;
  vendor?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  billDate: string;
  dueDate?: string | null;
  amount: number | string;
  paidAmount?: number | string;
  status: string;
};

type AccountsClientProps = {
  payables: PayableRow[];
  receivables: SalesInvoice[];
  projects: Project[];
};

function inRange(dateStr: string | null | undefined, range: [Dayjs | null, Dayjs | null]) {
  if (!range[0] || !range[1] || !dateStr) return true;
  const from = range[0].format('YYYY-MM-DD');
  const to = range[1].format('YYYY-MM-DD');
  const d = dateStr.split('T')[0];
  return d >= from && d <= to;
}

export function AccountsClient({ payables, receivables, projects }: AccountsClientProps) {
  const [projectId, setProjectId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const filteredPayables = useMemo(
    () => payables.filter((p) => (!projectId || p.project?.id === projectId) && inRange(p.billDate, dateRange)),
    [payables, projectId, dateRange],
  );
  const filteredReceivables = useMemo(
    () => receivables.filter((i) => (!projectId || i.projectId === projectId) && inRange(i.createdAt, dateRange)),
    [receivables, projectId, dateRange],
  );

  const totalPayables = useMemo(() => filteredPayables.reduce((s, b) => s + (Number(b.amount) - Number(b.paidAmount || 0)), 0), [filteredPayables]);
  const totalReceivables = useMemo(() => filteredReceivables.reduce((s, i) => s + (Number(i.totalAmount) + Number(i.gstAmount) - Number(i.paidAmount || 0)), 0), [filteredReceivables]);
  const totalPaid = useMemo(() => filteredPayables.reduce((s, b) => s + Number(b.paidAmount || 0), 0), [filteredPayables]);
  const totalReceived = useMemo(() => filteredReceivables.reduce((s, i) => s + Number(i.paidAmount || 0), 0), [filteredReceivables]);

  const payableColumns: ColumnsType<PayableRow> = [
    {
      title: 'PO Number',
      dataIndex: 'billNumber',
      key: 'billNumber',
      width: 130,
      render: (v) => (
        <Link href="/dashboard/purchase-orders">
          <Text strong style={{ color: '#1677ff' }}>{v}</Text>
        </Link>
      )
    },
    { title: 'Vendor', key: 'vendor', width: 180, render: (_, r) => r.vendor?.name ?? '-' },
    { title: 'Project', key: 'project', width: 180, render: (_, r) => r.project?.name ?? '-' },
    { title: 'Date', dataIndex: 'billDate', key: 'billDate', render: formatDate, width: 110 },
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
      render: () => (
        <Link href="/dashboard/purchase-orders">
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

      <Flex gap={12} wrap="wrap" className="mb-6" style={{ marginBottom: 24 }}>
        <Select
          showSearch
          placeholder="Filter by project"
          allowClear
          style={{ minWidth: 240 }}
          value={projectId}
          onChange={setProjectId}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          filterOption={(input, option) =>
            String(option?.label || '').toLowerCase().includes(input.toLowerCase())
          }
        />
        <DatePicker.RangePicker
          value={dateRange[0] || dateRange[1] ? dateRange : [null, null]}
          onChange={(dates) => setDateRange(dates ? [dates[0], dates[1]] : [null, null])}
          allowClear
          placeholder={['From', 'To']}
        />
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
        <Col xs={24} sm={12}>
          <Card className={cardClassName} variant="borderless">
            <Statistic
              title="Total Paid Amount"
              value={totalPaid}
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
              title="Total Received Amount"
              value={totalReceived}
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
                <ShoppingCartOutlined /> Payables ({filteredPayables.length})
              </span>
            ),
            children: (
              <Card className={`${cardClassName} mb-6`} styles={{ body: { padding: 0 } }}>
                <Table
                  dataSource={filteredPayables}
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
                <DollarOutlined /> Receivables ({filteredReceivables.length})
              </span>
            ),
            children: (
              <Card className={cardClassName} styles={{ body: { padding: 0 } }}>
                <Table
                  dataSource={filteredReceivables}
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
