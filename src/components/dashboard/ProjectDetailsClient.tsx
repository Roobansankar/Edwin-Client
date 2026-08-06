'use client';

import { useMemo } from 'react';
import { Card, Descriptions, Flex, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ProjectOutlined } from '@ant-design/icons';
import type { Expense, Payment, ProjectDetails, ProjectTimesheetSummary, PurchaseBill, SalesInvoice } from '@/types/erp';
import { StatusTag, formatCurrency, formatDate, pageTitleClassName, titleIconClassName } from './ui';

const { Title, Text } = Typography;

const ROLE_LABELS: Record<string, string> = {
  site_engineer: 'Site Engineer',
  purchase_team: 'Purchase Team',
  office_staff: 'Office Team',
  accounts_manager: 'Accounts',
  admin: 'Admin',
};

type Props = {
  data: ProjectDetails;
};

export function ProjectDetailsClient({ data }: Props) {
  const { project, expenses, purchaseBills, invoices, payments, timesheetSummary } = data;

  const vendorPayments = useMemo(() => payments.filter((p) => p.vendorId), [payments]);
  const subcontractorPayments = useMemo(() => payments.filter((p) => p.subcontractWorkOrderId), [payments]);

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const totalBills = useMemo(() => purchaseBills.reduce((s, b) => s + Number(b.amount), 0), [purchaseBills]);
  const totalInvoiced = useMemo(() => invoices.reduce((s, i) => s + Number(i.totalAmount) + Number(i.gstAmount), 0), [invoices]);
  const totalVendorPayments = useMemo(() => vendorPayments.reduce((s, p) => s + Number(p.amount), 0), [vendorPayments]);
  const totalSubcontractorPayments = useMemo(() => subcontractorPayments.reduce((s, p) => s + Number(p.amount), 0), [subcontractorPayments]);
  const totalTimesheetAmount = useMemo(() => timesheetSummary.reduce((s, t) => s + Number(t.totalAmount), 0), [timesheetSummary]);

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

  const subcontractorPaymentColumns: ColumnsType<Payment> = [
    { title: 'Date', dataIndex: 'paymentDate', key: 'paymentDate', render: formatDate, width: 110 },
    { title: 'Subcontractor', key: 'subcontractor', width: 160, render: (_, r) => r.subcontractWorkOrder?.subcontractor?.name ?? '-' },
    { title: 'WO #', key: 'wo', width: 130, render: (_, r) => r.subcontractWorkOrder?.woNumber ?? '-' },
    { title: 'Mode', dataIndex: 'paymentMode', key: 'paymentMode', width: 80 },
    { title: 'Reference', dataIndex: 'referenceNumber', key: 'ref', width: 120 },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: formatCurrency, width: 130, sorter: (a, b) => Number(a.amount) - Number(b.amount) },
  ];

  const timesheetColumns: ColumnsType<ProjectTimesheetSummary> = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 150,
      sorter: (a, b) => a.role.localeCompare(b.role),
      render: (v: string) => <Tag>{ROLE_LABELS[v] || v}</Tag>,
    },
    {
      title: 'Total Hours',
      dataIndex: 'totalHours',
      key: 'totalHours',
      align: 'right',
      width: 130,
      sorter: (a, b) => Number(a.totalHours) - Number(b.totalHours),
      render: (v) => `${Number(v || 0).toFixed(1)} hrs`,
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      width: 130,
      sorter: (a, b) => Number(a.totalAmount) - Number(b.totalAmount),
      render: formatCurrency,
    },
  ];

  const summaryCards = [
    { label: 'Total Expenses', value: totalExpenses, color: 'text-orange-600' },
    { label: 'Purchase Bills', value: totalBills, color: 'text-purple-600' },
    { label: 'Invoiced Amount', value: totalInvoiced, color: 'text-green-600' },
    { label: 'Vendor Payments', value: totalVendorPayments, color: 'text-rose-600' },
    { label: 'Subcontractor Payments', value: totalSubcontractorPayments, color: 'text-cyan-600' },
    { label: 'Timesheet Cost', value: totalTimesheetAmount, color: 'text-amber-600' },
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

      <Card title={<Text strong>Subcontractor Payments ({subcontractorPayments.length})</Text>} size="small">
        <Table
          dataSource={subcontractorPayments}
          columns={subcontractorPaymentColumns}
          rowKey="id"
          size="small"
          scroll={{ x: 800 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} subcontractor payments` }}
        />
      </Card>

      <Card title={<Text strong>Timesheet ({timesheetSummary.length})</Text>} size="small">
        <Table
          dataSource={timesheetSummary}
          columns={timesheetColumns}
          rowKey="userId"
          size="small"
          scroll={{ x: 600 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} users` }}
          locale={{ emptyText: 'No admin-approved timesheet hours for this project yet' }}
        />
      </Card>
    </Flex>
  );
}
