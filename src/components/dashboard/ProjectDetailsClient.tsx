'use client';

import { useMemo } from 'react';
import { Card, Descriptions, Flex, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ProjectOutlined } from '@ant-design/icons';
import type { Expense, Payment, ProjectDetails, PurchaseBill, SalesInvoice, SubcontractWorkOrder } from '@/types/erp';
import { StatusTag, cardClassName, formatCurrency, formatDate, pageTitleClassName, titleIconClassName } from './ui';
import { getApiOrigin } from '@/lib/api-url';

const { Title, Text } = Typography;

type Props = {
  data: ProjectDetails;
};

export function ProjectDetailsClient({ data }: Props) {
  const { project, expenses, subcontractWorkOrders, purchaseBills, invoices, payments } = data;

  const vendorPayments = useMemo(() => payments.filter((p) => p.vendorId), [payments]);

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const totalSwo = useMemo(() => subcontractWorkOrders.reduce((s, w) => s + Number(w.totalAmount), 0), [subcontractWorkOrders]);
  const totalBills = useMemo(() => purchaseBills.reduce((s, b) => s + Number(b.amount), 0), [purchaseBills]);
  const totalInvoiced = useMemo(() => invoices.reduce((s, i) => s + Number(i.totalAmount) + Number(i.gstAmount), 0), [invoices]);
  const totalVendorPayments = useMemo(() => vendorPayments.reduce((s, p) => s + Number(p.amount), 0), [vendorPayments]);

  const expenseColumns: ColumnsType<Expense> = [
    { title: 'Date', dataIndex: 'expenseDate', key: 'expenseDate', render: formatDate, width: 110 },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 100 },
    { title: 'Expense Type', key: 'expenseType', width: 120, render: (_, r) => r.expenseType?.name ?? '-' },
    { title: 'Project', key: 'project', width: 140, render: (_, r) => r.project?.name ?? '-' },
    { title: 'Trade', key: 'trade', width: 100, render: (_, r) => r.trade?.name ?? '-' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: formatCurrency, width: 130, sorter: (a, b) => Number(a.amount) - Number(b.amount) },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <StatusTag value={v} />, width: 130 },
    { title: 'Receipts', key: 'receipts', width: 90, render: (_, r) => r.receiptUrls?.length ? <Text>{r.receiptUrls.length} file(s)</Text> : '-' },
    { title: 'Photos', key: 'photos', width: 90, render: (_, r) => r.sitePhotoUrls?.length ? <Text>{r.sitePhotoUrls.length} photo(s)</Text> : '-' },
  ];

  const swoColumns: ColumnsType<SubcontractWorkOrder> = [
    { title: 'WO #', dataIndex: 'woNumber', key: 'woNumber', width: 130 },
    { title: 'Subcontractor', key: 'sub', width: 160, render: (_, r) => r.subcontractor?.name ?? '-' },
    { title: 'Work Category', key: 'cat', width: 120, render: (_, r) => r.workCategory?.name ?? '-' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Work Order', key: 'workorder', width: 100, render: (_, r) => r.workorderUrl ? <Typography.Link href={`${getApiOrigin()}${r.workorderUrl}`} target="_blank">View File</Typography.Link> : '-' },
    { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right', render: formatCurrency, width: 130, sorter: (a, b) => Number(a.totalAmount) - Number(b.totalAmount) },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <StatusTag value={v} />, width: 130 },
    { title: 'Timeline', key: 'timeline', width: 140, render: (_, r) => `${formatDate(r.startDate)} - ${formatDate(r.endDate)}` },
  ];

  const billColumns: ColumnsType<PurchaseBill> = [
    { title: 'Bill #', dataIndex: 'billNumber', key: 'billNumber', width: 130 },
    { title: 'Vendor', key: 'vendor', width: 160, render: (_, r) => r.vendor?.name ?? '-' },
    { title: 'Date', dataIndex: 'billDate', key: 'billDate', render: formatDate, width: 110 },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: formatCurrency, width: 130, sorter: (a, b) => Number(a.amount) - Number(b.amount) },
    { title: 'Paid', dataIndex: 'paidAmount', key: 'paidAmount', align: 'right', render: (v) => formatCurrency(v), width: 130 },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <StatusTag value={v} />, width: 130 },
  ];

  const invoiceColumns: ColumnsType<SalesInvoice> = [
    { title: 'Invoice #', dataIndex: 'invoiceNumber', key: 'invoiceNumber', width: 140 },
    { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', align: 'right', render: formatCurrency, width: 130, sorter: (a, b) => Number(a.totalAmount) - Number(b.totalAmount) },
    { title: 'GST', dataIndex: 'gstAmount', key: 'gstAmount', align: 'right', render: formatCurrency, width: 110 },
    { title: 'Paid', dataIndex: 'paidAmount', key: 'paidAmount', align: 'right', render: formatCurrency, width: 130 },
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate', render: (v) => v ? formatDate(v) : '-', width: 110 },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v) => <StatusTag value={v} />, width: 130 },
  ];

  const vendorPaymentColumns: ColumnsType<Payment> = [
    { title: 'Date', dataIndex: 'paymentDate', key: 'paymentDate', render: formatDate, width: 110 },
    { title: 'Vendor', key: 'vendor', width: 160, render: (_, r) => r.vendor?.name ?? '-' },
    {
      title: 'Linked To',
      key: 'linkedTo',
      width: 160,
      render: (_, r) =>
        r.purchaseOrder?.poNumber
          ? `PO: ${r.purchaseOrder.poNumber}`
          : r.subcontractWorkOrder?.woNumber
            ? `WO: ${r.subcontractWorkOrder.woNumber}`
            : r.purchaseBill?.billNumber
              ? `Bill: ${r.purchaseBill.billNumber}`
              : '-',
    },
    { title: 'Mode', dataIndex: 'paymentMode', key: 'paymentMode', width: 80 },
    { title: 'Reference', dataIndex: 'referenceNumber', key: 'ref', width: 120 },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: formatCurrency, width: 130, sorter: (a, b) => Number(a.amount) - Number(b.amount) },
  ];

  const summaryCards = [
    { label: 'Total Expenses', value: totalExpenses, color: 'text-orange-600' },
    { label: 'Subcontract WOs', value: totalSwo, color: 'text-blue-600' },
    { label: 'Purchase Bills', value: totalBills, color: 'text-purple-600' },
    { label: 'Invoiced Amount', value: totalInvoiced, color: 'text-green-600' },
    { label: 'Vendor Payments', value: totalVendorPayments, color: 'text-rose-600' },
  ];

  return (
    <Flex vertical gap={16}>
      <Title level={3} className={pageTitleClassName}>
        <ProjectOutlined className={titleIconClassName} /> {project.name}
      </Title>

      <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
        <Flex vertical gap={2}>
          <Text type="secondary">{project.clientName}</Text>
          <Text type="secondary">{project.location}</Text>
        </Flex>
        <Flex gap={16} wrap="wrap">
          <Text><Text strong>Budget:</Text> {formatCurrency(project.estimatedBudget)}</Text>
          <Text><Text strong>Start:</Text> {formatDate(project.startDate)}</Text>
          <Text><Text strong>End:</Text> {formatDate(project.endDate)}</Text>
        </Flex>
      </Flex>

      <Flex gap={12} wrap="wrap">
        {summaryCards.map((c) => (
          <Card key={c.label} size="small" className="flex-1 min-w-[160px]">
            <Text type="secondary" className="text-xs">{c.label}</Text>
            <div className={`text-lg font-bold ${c.color}`}>{formatCurrency(c.value)}</div>
          </Card>
        ))}
      </Flex>

      <Card title={<Text strong>Classification</Text>} size="small">
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small" bordered>
          <Descriptions.Item label="Project Category">
            {project.projectCategory?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Project Nature">
            {project.projectNature ? <Tag>{project.projectNature}</Tag> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Job Type">
            {project.jobType ? <Tag>{project.jobType}</Tag> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Job Status">
            {project.jobStatus ? <Tag>{project.jobStatus}</Tag> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Financial Year">
            {project.financialYear || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Date of Creation">
            {project.dateOfCreation ? formatDate(project.dateOfCreation) : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={<Text strong>Expenses ({expenses.length})</Text>} size="small">
        <Table
          dataSource={expenses}
          columns={expenseColumns}
          rowKey="id"
          size="small"
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} expenses` }}
        />
      </Card>

      <Card title={<Text strong>Subcontract Work Orders ({subcontractWorkOrders.length})</Text>} size="small">
        <Table
          dataSource={subcontractWorkOrders}
          columns={swoColumns}
          rowKey="id"
          size="small"
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} work orders` }}
        />
      </Card>

      <Card title={<Text strong>Purchase Bills ({purchaseBills.length})</Text>} size="small">
        <Table
          dataSource={purchaseBills}
          columns={billColumns}
          rowKey="id"
          size="small"
          scroll={{ x: 800 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} bills` }}
        />
      </Card>

      <Card title={<Text strong>Invoices ({invoices.length})</Text>} size="small">
        <Table
          dataSource={invoices}
          columns={invoiceColumns}
          rowKey="id"
          size="small"
          scroll={{ x: 800 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} invoices` }}
        />
      </Card>

      <Card title={<Text strong>Vendor Payments ({vendorPayments.length})</Text>} size="small">
        <Table
          dataSource={vendorPayments}
          columns={vendorPaymentColumns}
          rowKey="id"
          size="small"
          scroll={{ x: 800 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} vendor payments` }}
        />
      </Card>
    </Flex>
  );
}
