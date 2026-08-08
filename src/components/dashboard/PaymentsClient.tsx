'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Card, Table, Typography, Tag, Space, Flex, Button, Drawer, Form, Input, InputNumber, Select, DatePicker, Row, Col, Statistic, Tabs } from 'antd';
import { CreditCardOutlined, PlusOutlined, ArrowDownOutlined, ArrowUpOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import dayjs from 'dayjs';
import { createPayment, syncExpensesToLedger } from '@/actions/payments';
import type { AdvanceRequest, Payment, Project, PurchaseOrder, Vendor } from '@/types/erp';
import {
  StatusTag,
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
  titleCase,
} from './ui';

const { Title, Text } = Typography;

const paymentSchema = z.object({
  paymentType: z.string().min(1, 'Select category'),
  payeeName: z.string().optional(),
  vendorId: z.string().optional(),
  purchaseOrderId: z.string().optional(),
  advanceRequestId: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  paymentDate: z.string().min(1, 'Select date'),
  paymentMode: z.string().min(1, 'Select mode'),
  referenceNumber: z.string().optional(),
  projectId: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

type PaymentsClientProps = {
  payments: Payment[];
  summary: Array<{ paymentType: string; total: string | number }>;
  projects: Project[];
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  advanceRequests: AdvanceRequest[];
};

export function PaymentsClient({ payments, summary, projects, vendors, purchaseOrders, advanceRequests }: PaymentsClientProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Automatically sync missing expenses when page loads
    syncExpensesToLedger().catch(console.error);
  }, []);

  const { control, handleSubmit, reset, watch, setValue } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentType: 'labour',
      paymentDate: dayjs().format('YYYY-MM-DD'),
      paymentMode: 'upi',
      amount: 0,
    },
  });

  const selectedType = watch('paymentType');

  const onSubmit = (values: PaymentFormValues) => {
    startTransition(async () => {
      try {
        await createPayment(values);
        reset();
        setOpen(false);
      } catch (error) {
        console.error(error);
      }
    });
  };

  const [activeTab, setActiveTab] = useState('inflow');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  const inflowPayments = useMemo(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    return payments.filter((p) => {
      if (!p.salesInvoice) return false;
      if (statusFilter && p.salesInvoice?.status !== statusFilter) return false;
      if (from && to) {
        const pd = typeof p.paymentDate === 'string' ? p.paymentDate.split('T')[0] : '';
        if (pd < from || pd > to) return false;
      }
      if (searchText) {
        const q = searchText.toLowerCase();
        const payee = p.salesInvoice?.project?.clientName || p.vendor?.name || p.payeeName || '';
        const ref = p.referenceNumber || '';
        if (!payee.toLowerCase().includes(q) && !ref.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [payments, dateRange, searchText, statusFilter]);

  const outflowPayments = useMemo(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    return payments.filter((p) => {
      if (p.salesInvoice) return false;
      if (p.timesheetId) return true;
      const srcStatus = p.expense?.status || p.purchaseBill?.status;
      if (srcStatus !== 'admin_approved') return false;
      if (statusFilter && srcStatus !== statusFilter) return false;
      if (from && to) {
        const pd = typeof p.paymentDate === 'string' ? p.paymentDate.split('T')[0] : '';
        if (pd < from || pd > to) return false;
      }
      if (searchText) {
        const q = searchText.toLowerCase();
        const payee = p.vendor?.name || p.payeeName || '';
        const ref = p.referenceNumber || '';
        if (!payee.toLowerCase().includes(q) && !ref.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [payments, dateRange, searchText, statusFilter]);

  const columns: ColumnsType<Payment> = [
    {
      title: '#',
      key: 'sno',
      width: 50,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Date',
      dataIndex: 'paymentDate',
      render: formatDate,
      sorter: (a, b) => dayjs(a.paymentDate).unix() - dayjs(b.paymentDate).unix(),
    },
    {
      title: 'Category',
      dataIndex: 'paymentType',
      render: (type) => <StatusTag value={type} />,
    },
    {
      title: 'Payee / Vendor',
      key: 'payee',
      render: (_, record) => {
        const payee = record.salesInvoice?.project?.clientName || record.vendor?.name || record.payeeName || '-';
        const project = record.project?.name || record.salesInvoice?.project?.name || 'General Office';
        return (
          <Flex vertical gap={0}>
            <Text strong>{payee}</Text>
            <Text type="secondary" className="text-xs">{project}</Text>
          </Flex>
        );
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      render: (amount) => <Text strong type="danger">{formatCurrency(amount)}</Text>,
    },
    {
      title: 'Total Amount',
      key: 'totalAmount',
      align: 'right',
      render: (_, record) => {
        if (record.purchaseBill?.amount) return formatCurrency(record.purchaseBill.amount);
        if (record.salesInvoice?.totalAmount) return formatCurrency(Number(record.salesInvoice.totalAmount) + Number(record.salesInvoice.gstAmount || 0));
        return '-';
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const status = record.expense?.status || record.salesInvoice?.status || record.purchaseBill?.status || 'completed';
        return <StatusTag value={status} />;
      },
    },
    {
      title: 'Mode',
      dataIndex: 'paymentMode',
      render: (mode) => <Text className="uppercase text-xs">{mode}</Text>,
    },
    {
      title: 'Ref No',
      dataIndex: 'referenceNumber',
      render: (val) => val || '-',
    },
  ];

  const totalInflow = summary.find((item) => item.paymentType === 'revenue')?.total || 0;
  const totalOutflow = summary
    .filter((item) => item.paymentType !== 'revenue')
    .reduce((sum, item) => sum + Number(item.total), 0);

  const inflowSum = inflowPayments.reduce((s, p) => s + Number(p.amount), 0);
  const outflowSum = outflowPayments.reduce((s, p) => s + Number(p.amount), 0);

  const filterRow = (
    <Row gutter={16} className="mb-4">
      <Col xs={24} sm={12} md={8}>
        <Input.Search
          placeholder="Search payee or reference..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
        />
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Select
          allowClear
          placeholder="Filter by status"
          className="w-full"
          value={statusFilter || undefined}
          onChange={(val) => setStatusFilter(val || '')}
          options={[
            { label: 'Admin Approved', value: 'admin_approved' },
            { label: 'Approved', value: 'approved' },
            { label: 'Pending', value: 'pending' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'Completed', value: 'completed' },
          ]}
        />
      </Col>
      <Col xs={24} sm={12} md={6}>
        <DatePicker.RangePicker
          className="w-full"
          value={dateRange[0] || dateRange[1] ? dateRange : [null, null]}
          onChange={(dates) => setDateRange(dates ? [dates[0], dates[1]] : [null, null])}
          allowClear
          placeholder={['From date', 'To date']}
        />
      </Col>
    </Row>
  );

  const tabItems = [
    {
      key: 'inflow',
      label: (
        <span>
          <ArrowUpOutlined className="text-green-500 mr-1" /> Inflow
        </span>
      ),
      children: (
        <div>
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24} sm={12} md={6}>
              <Card className={cardClassName}>
                <Statistic
                  title="Total Inflow"
                  value={inflowSum}
                  prefix={<ArrowUpOutlined className="text-green-500" />}
                  formatter={(val) => formatCurrency(val as number)}
                />
              </Card>
            </Col>
          </Row>
          {filterRow}
          <Table
            dataSource={inflowPayments}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 15 }}
            scroll={{ x: 900 }}
          />
        </div>
      ),
    },
    {
      key: 'outflow',
      label: (
        <span>
          <ArrowDownOutlined className="text-red-500 mr-1" /> Outflow
        </span>
      ),
      children: (
        <div>
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24} sm={12} md={6}>
              <Card className={cardClassName}>
                <Statistic
                  title="Total Outflow"
                  value={outflowSum}
                  prefix={<ArrowDownOutlined className="text-red-500" />}
                  formatter={(val) => formatCurrency(val as number)}
                />
              </Card>
            </Col>
          </Row>
          {filterRow}
          <Table
            dataSource={outflowPayments}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 15 }}
            scroll={{ x: 900 }}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Title level={3} className={pageTitleClassName}>
          <CreditCardOutlined className={titleIconClassName} /> Master Ledger
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Record Direct Payment
        </Button>
      </Flex>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card className={cardClassName}>
            <Statistic
              title="Total Inflow"
              value={totalInflow}
              prefix={<ArrowUpOutlined className="text-green-500" />}
              formatter={(val) => formatCurrency(val as number)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className={cardClassName}>
            <Statistic
              title="Total Outflow"
              value={totalOutflow}
              prefix={<ArrowDownOutlined className="text-red-500" />}
              formatter={(val) => formatCurrency(val as number)}
            />
          </Card>
        </Col>
      </Row>

      <Card className={cardClassName}>
        <Tabs activeKey={activeTab} onChange={(key) => { setActiveTab(key); setSearchText(''); setStatusFilter(''); setDateRange([null, null]); }} items={tabItems} />
      </Card>

      <Drawer
        title="Record Direct Payment"
        width={450}
        onClose={() => setOpen(false)}
        open={open}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(onSubmit)}>
              Save Transaction
            </Button>
          </Space>
        }
      >
        <Form layout="vertical">
          <Controller
            name="paymentType"
            control={control}
            render={({ field }) => (
              <Form.Item label="Payment Category" required>
                <Select {...field}>
                  <Select.Option value="material">Material (Vendor)</Select.Option>
                  <Select.Option value="labour">Labour Contractor</Select.Option>
                  <Select.Option value="rent">Site/Office Rent</Select.Option>
                  <Select.Option value="accommodation">Staff Accommodation</Select.Option>
                  <Select.Option value="office_maintenance">Office Maintenance</Select.Option>
                  <Select.Option value="staff_expense">Staff Expense</Select.Option>
                  <Select.Option value="travel">Travel</Select.Option>
                  <Select.Option value="transport">Transport</Select.Option>
                </Select>
              </Form.Item>
            )}
          />

          {selectedType === 'material' ? (
            <>
              <Controller
                name="purchaseOrderId"
                control={control}
                render={({ field }) => (
                  <Form.Item label="Purchase Order (optional)">
                    <Select
                      {...field}
                      allowClear
                      showSearch
                      placeholder="Choose the PO this payment is against"
                      optionFilterProp="label"
                      options={purchaseOrders.map((po) => ({ label: `${po.poNumber} — ${po.vendor?.name || ''}`, value: po.id }))}
                      onChange={(val) => {
                        field.onChange(val);
                        const po = purchaseOrders.find((p) => p.id === val);
                        if (po) {
                          setValue('vendorId', po.vendorId);
                          setValue('projectId', po.projectId);
                        }
                      }}
                    />
                  </Form.Item>
                )}
              />
              <Controller
                name="advanceRequestId"
                control={control}
                render={({ field }) => (
                  <Form.Item label="Vendor Payment Request (Admin Approved, optional)">
                    <Select
                      {...field}
                      allowClear
                      showSearch
                      placeholder="Choose an admin-approved vendor payment request"
                      optionFilterProp="label"
                      options={advanceRequests.map((ar) => ({
                        label: `${ar.vendor?.name || ''} — ${formatCurrency(ar.amount)}${ar.materialRequirementNo ? ` (${ar.materialRequirementNo})` : ''}`,
                        value: ar.id,
                      }))}
                      onChange={(val) => {
                        field.onChange(val);
                        const ar = advanceRequests.find((a) => a.id === val);
                        if (ar) {
                          setValue('vendorId', ar.vendorId);
                          setValue('projectId', ar.projectId);
                          setValue('amount', Number(ar.amount));
                        }
                      }}
                    />
                  </Form.Item>
                )}
              />
              <Controller
                name="vendorId"
                control={control}
                render={({ field }) => (
                  <Form.Item label="Select Vendor">
                    <Select {...field} showSearch optionFilterProp="label" options={vendors.map(v => ({ label: v.name, value: v.id }))} />
                  </Form.Item>
                )}
              />
            </>
          ) : (
            <Controller
              name="payeeName"
              control={control}
              render={({ field }) => (
                <Form.Item label="Payee Name">
                  <Input {...field} placeholder="Enter name of person/company" />
                </Form.Item>
              )}
            />
          )}

          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <Form.Item label="Amount Paid" required>
                <InputNumber {...field} className="w-full" prefix="₹" min={1} />
              </Form.Item>
            )}
          />

          <Controller
            name="projectId"
            control={control}
            render={({ field }) => (
              <Form.Item label="Link to Project (Optional)">
                <Select {...field} allowClear showSearch optionFilterProp="label" options={projects.map(p => ({ label: p.name, value: p.id }))} />
              </Form.Item>
            )}
          />

          <Row gutter={16}>
            <Col span={12}>
              <Controller
                name="paymentDate"
                control={control}
                render={({ field }) => (
                  <Form.Item label="Date">
                    <DatePicker className="w-full" value={dayjs(field.value)} onChange={(_, dateStr) => field.onChange(dateStr)} />
                  </Form.Item>
                )}
              />
            </Col>
            <Col span={12}>
              <Controller
                name="paymentMode"
                control={control}
                render={({ field }) => (
                  <Form.Item label="Mode">
                    <Select {...field}>
                      <Select.Option value="upi">UPI</Select.Option>
                      <Select.Option value="rtgs">RTGS</Select.Option>
                      <Select.Option value="cash">Cash</Select.Option>
                      <Select.Option value="cheque">Cheque</Select.Option>
                    </Select>
                  </Form.Item>
                )}
              />
            </Col>
          </Row>

          <Controller
            name="referenceNumber"
            control={control}
            render={({ field }) => (
              <Form.Item label="UTR / Reference Number">
                <Input {...field} placeholder="Transaction ID" />
              </Form.Item>
            )}
          />

          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <Form.Item label="Notes">
                <Input.TextArea {...field} rows={3} />
              </Form.Item>
            )}
          />
        </Form>
      </Drawer>
    </div>
  );
}
