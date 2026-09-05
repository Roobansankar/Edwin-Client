'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Card, Col, DatePicker, Divider, Drawer, Flex, Form, Row, Select, Space, Table, Typography, Modal, Input, InputNumber, Popconfirm, Dropdown, MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, PlusOutlined, FilePdfOutlined, DeleteOutlined, MoreOutlined, CheckCircleOutlined, HistoryOutlined, CreditCardOutlined, FileTextOutlined } from '@ant-design/icons';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import dayjs from 'dayjs';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { createInvoice, deleteInvoice, updateInvoiceStatus } from '@/actions/invoices';
import { createPayment } from '@/actions/payments';
import type { Project, SalesInvoice, Payment } from '@/types/erp';
import { InvoicePdf } from './InvoicePdf';
import { PaymentReceiptPdf } from './PaymentReceiptPdf';
import {
  StatusTag,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  secondaryTextClassName,
  titleIconClassName,
} from './ui';

const invoiceSchema = z.object({
  projectId: z.string().min(1, 'Select a project'),
  dueDate: z.string().optional(),
  totalAmount: z.number().min(1, 'Enter invoice amount'),
});

const paymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentDate: z.string().min(1, 'Select payment date'),
  paymentMode: z.string().min(1, 'Select payment mode'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;
type PaymentFormValues = z.infer<typeof paymentSchema>;

type InvoicesClientProps = {
  invoices: SalesInvoice[];
  projects: Project[];
};

export function InvoicesClient({ invoices, projects }: InvoicesClientProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<SalesInvoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<SalesInvoice | null>(null);
  const [historyInvoice, setHistoryInvoice] = useState<SalesInvoice | null>(null);
  const [receiptData, setReceiptData] = useState<{ invoice: SalesInvoice; payment: Payment } | null>(null);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const {
    control,
    handleSubmit,
    reset,
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      projectId: '',
      dueDate: undefined,
      totalAmount: undefined,
    },
  });

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentDate: dayjs().format('YYYY-MM-DD'),
      paymentMode: 'upi',
      referenceNumber: '',
      notes: '',
    },
  });

  const selectedProjectId = useWatch({ control, name: 'projectId' });
  const enteredAmount = Number(useWatch({ control, name: 'totalAmount' }) || 0);
  const enteredBase = Math.round((enteredAmount / 1.18) * 100) / 100;
  const enteredGst = Math.round((enteredAmount - enteredBase) * 100) / 100;

  const selectedProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId),
    [selectedProjectId, projects]
  );

  const projectTotals = useMemo(() => {
    const map = new Map<string, { raised: number; received: number }>();
    for (const inv of invoices) {
      const pid = inv.projectId;
      if (!pid) continue;
      const entry = map.get(pid) || { raised: 0, received: 0 };
      entry.raised += Number(inv.totalAmount) + Number(inv.gstAmount);
      entry.received += Number(inv.paidAmount || 0);
      map.set(pid, entry);
    }
    return map;
  }, [invoices]);

  const selectedTotals = selectedProjectId ? projectTotals.get(selectedProjectId) : undefined;
  const selectedBase = Number(selectedProject?.estimatedBudget || 0);
  const selectedGst = Number(selectedProject?.estimatedGst || 0);
  const selectedEstimate = Number(selectedProject?.estimatedTotal || selectedBase + selectedGst || 0);
  const selectedRaised = selectedTotals?.raised || 0;
  const selectedBalance = selectedEstimate - selectedRaised;

  const handleStatusUpdate = (id: string, status: string) => {
    startTransition(async () => {
      try {
        await updateInvoiceStatus(id, status);
        message.success(`Status updated to ${status}`);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Update failed');
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteInvoice(id);
        message.success('Invoice deleted');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Delete failed');
      }
    });
  };

  const submitPayment = (values: PaymentFormValues) => {
    if (!paymentInvoice) return;

    startTransition(async () => {
      try {
        const payment = await createPayment({
          ...values,
          salesInvoiceId: paymentInvoice.id,
          paymentType: 'revenue',
        });
        message.success('Payment recorded successfully');
        paymentForm.reset();
        setPaymentInvoice(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to record payment');
      }
    });
  };

  const columns: ColumnsType<SalesInvoice> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 60,
      render: (_text, _record, index) => index + 1,
    },
    {
      title: 'Invoice',
      dataIndex: 'invoiceNumber',
      width: 130,
      sorter: (a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber),
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Project',
      key: 'project',
      width: 100,
      render: (_value, record) => record.project?.projectCode || '-',
    },
    {
      title: 'Estimate',
      key: 'estimate',
      align: 'right',
      width: 200,
      render: (_, record) => {
        const estimate = Number(record.project?.estimatedTotal || record.project?.estimatedBudget || 0);
        const raised = projectTotals.get(record.projectId || '')?.raised || 0;
        return (
          <Flex vertical gap={2} className="items-end" style={{ width: 160 }}>
            <Typography.Text>{formatCurrency(estimate)}</Typography.Text>
            <Typography.Text
              type="secondary"
              className={`${secondaryTextClassName} text-[10px]`}
              style={{ maxWidth: '100%' }}
              ellipsis={{ tooltip: `Raised: ${formatCurrency(raised)}` }}
            >
              Raised: {formatCurrency(raised)}
            </Typography.Text>
          </Flex>
        );
      },
    },
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      align: 'right',
      width: 200,
      sorter: (a, b) => Number(a.totalAmount) - Number(b.totalAmount),
      render: (value: number | string, record) => {
        const total = Number(value) + Number(record.gstAmount);
        return (
          <Flex vertical gap={2} className="items-end" style={{ width: 160 }}>
            <Typography.Text strong>{formatCurrency(total)}</Typography.Text>
            <Typography.Text
              type="secondary"
              className={`${secondaryTextClassName} text-[10px]`}
              style={{ maxWidth: '100%' }}
              ellipsis={{ tooltip: `Base: ${formatCurrency(value)}` }}
            >
              Base: {formatCurrency(value)}
            </Typography.Text>
          </Flex>
        );
      },
    },
    {
      title: 'Received',
      dataIndex: 'paidAmount',
      align: 'right',
      width: 140,
      render: (value) => <Typography.Text type="success">{formatCurrency(value)}</Typography.Text>,
    },
    {
      title: 'Receivable',
      key: 'balance',
      align: 'right',
      width: 150,
      render: (_, record) => {
        const total = Number(record.totalAmount) + Number(record.gstAmount);
        const balance = total - Number(record.paidAmount || 0);
        return <Typography.Text type={balance > 0 ? 'danger' : 'secondary'}>{formatCurrency(balance)}</Typography.Text>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (value: string) => <StatusTag value={value} />,
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      width: 120,
      render: formatDate,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 280,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/dashboard/accounts/invoices/${record.id}`)}
            title="View Details"
          />
          <Button 
            size="small" 
            type="primary" 
            disabled={record.status === 'paid'}
            onClick={() => {
              setPaymentInvoice(record);
              paymentForm.setValue('amount', 0);
            }}
          >
            Cash Inflow
          </Button>
          <Button
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => setHistoryInvoice(record)}
            title="Payment History"
          />
          {isClient && (
            <Button
              type="text"
              icon={<FilePdfOutlined className="text-red-500" />}
              title="Preview PDF"
              onClick={() => setPreviewInvoice(record)}
            />
          )}
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'status',
                  label: 'Update Status',
                  icon: <HistoryOutlined />,
                  children: [
                    { key: 'draft', label: 'Draft', onClick: () => handleStatusUpdate(record.id, 'draft') },
                    { key: 'sent', label: 'Sent', onClick: () => handleStatusUpdate(record.id, 'sent') },
                    { key: 'partial', label: 'Partial', onClick: () => handleStatusUpdate(record.id, 'partial') },
                    { key: 'paid', label: 'Paid', onClick: () => handleStatusUpdate(record.id, 'paid') },
                    { key: 'cancelled', label: 'Cancelled', onClick: () => handleStatusUpdate(record.id, 'cancelled') },
                  ],
                },
                {
                  type: 'divider',
                },
                {
                  key: 'delete',
                  danger: true,
                  label: 'Delete',
                  icon: <DeleteOutlined />,
                  onClick: () => {
                    Modal.confirm({
                      title: 'Delete Invoice',
                      content: 'Are you sure you want to delete this invoice?',
                      okText: 'Yes',
                      okType: 'danger',
                      cancelText: 'No',
                      onOk: () => handleDelete(record.id),
                    });
                  },
                },
              ],
            }}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const submit = (values: InvoiceFormValues) => {
    startTransition(async () => {
      try {
        await createInvoice({
          ...values,
          projectId: values.projectId || undefined,
          dueDate: values.dueDate || undefined,
          totalAmount: Number(values.totalAmount),
        });
        message.success('Invoice created');
        reset();
        setOpen(false);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to create invoice');
      }
    });
  };

  const invoiceStats = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalRaised = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount) + Number(inv.gstAmount), 0);
    const totalReceived = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
    const receivables = totalRaised - totalReceived;
    return [
      { label: 'Total Invoices', value: totalInvoices },
      { label: 'Total Raised', value: formatCurrency(totalRaised) },
      { label: 'Received', value: formatCurrency(totalReceived) },
      { label: 'Receivable', value: formatCurrency(receivables) },
    ];
  }, [invoices]);

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <FileTextOutlined className={titleIconClassName} /> Sales Invoices
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Create Invoice
        </Button>
      </Flex>

      <Row gutter={[16, 16]} className="mb-4">
        {invoiceStats.map((stat) => (
          <Col xs={24} sm={12} md={6} key={stat.label}>
            <Card
              className="rounded-xl! border! border-[var(--border)]!"
              styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}
            >
              <Flex vertical gap={10}>
                <Typography.Text className="text-sm text-[var(--text-muted)]!">{stat.label}</Typography.Text>
                <Typography.Title level={4} className="m-0! text-[var(--text-primary)]!">
                  {stat.value}
                </Typography.Title>
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!"
        styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}
      >
        <Table
          className="mantis-table"
          dataSource={invoices}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} invoices` }}
        />
      </Card>

      <Drawer
        title="Create Sales Invoice"
        size="large"
        open={open}
        onClose={() => setOpen(false)}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(submit)}>
              Save
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" onFinish={handleSubmit(submit)}>
          <Controller
            control={control}
            name="projectId"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Project"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Select
                  {...field}
                  showSearch
                  placeholder="Select project"
                  optionFilterProp="label"
                  options={projects.map((project) => ({ value: project.id, label: project.name }))}
                />
              </Form.Item>
            )}
          />

          <Form.Item label="Client Billing Name">
            <Input 
              value={selectedProject?.clientName || 'Select a project to see client name'} 
              disabled 
              placeholder="Client name will autofill"
            />
          </Form.Item>

          <Controller
            control={control}
            name="dueDate"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Due Date"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <DatePicker
                  className="w-full"
                  onChange={(_, dateString) => field.onChange(Array.isArray(dateString) ? dateString[0] : dateString)}
                />
              </Form.Item>
            )}
          />

          {selectedProject && (
            <div className="mb-2! rounded-lg border border-[var(--border)] bg-[var(--subtle-bg)] p-4">
              <Typography.Text type="secondary" className="mb-2! block">
                Project Estimate
              </Typography.Text>
              <Flex justify="space-between" className="mb-1!">
                <Typography.Text type="secondary">Base Amount:</Typography.Text>
                <Typography.Text>{formatCurrency(selectedBase)}</Typography.Text>
              </Flex>
              <Flex justify="space-between" className="mb-1!">
                <Typography.Text type="secondary">GST:</Typography.Text>
                <Typography.Text>{formatCurrency(selectedGst)}</Typography.Text>
              </Flex>
              <Flex justify="space-between" className="mb-2!">
                <Typography.Text type="secondary">Total:</Typography.Text>
                <Typography.Text strong>{formatCurrency(selectedEstimate)}</Typography.Text>
              </Flex>
              <Divider className="my-2!" />
              <Flex justify="space-between" className="mb-2!">
                <Typography.Text type="secondary">Already Raised:</Typography.Text>
                <Typography.Text>{formatCurrency(selectedRaised)}</Typography.Text>
              </Flex>
              <Flex justify="space-between">
                <Typography.Text type="secondary">Balance to Raise:</Typography.Text>
                <Typography.Text type={selectedBalance > 0 ? 'danger' : 'secondary'} strong>
                  {formatCurrency(selectedBalance)}
                </Typography.Text>
              </Flex>
            </div>
          )}

          <Controller
            control={control}
            name="totalAmount"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Invoice Amount (includes GST)"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <InputNumber
                  min={1}
                  className="w-full"
                  prefix="₹"
                  placeholder="Enter the amount to raise (GST included)"
                  value={field.value}
                  onChange={field.onChange}
                />
              </Form.Item>
            )}
          />

          {enteredAmount > 0 && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--subtle-bg)] p-4">
              <Flex justify="space-between" className="mb-2!">
                <Typography.Text type="secondary">Base Amount:</Typography.Text>
                <Typography.Text>{formatCurrency(enteredBase)}</Typography.Text>
              </Flex>
              <Flex justify="space-between" className="mb-2!">
                <Typography.Text type="secondary">GST (18%):</Typography.Text>
                <Typography.Text>{formatCurrency(enteredGst)}</Typography.Text>
              </Flex>
              <Flex justify="space-between">
                <Typography.Text type="secondary">Total Billed:</Typography.Text>
                <Typography.Text strong>{formatCurrency(enteredAmount)}</Typography.Text>
              </Flex>
            </div>
          )}
        </Form>
      </Drawer>

      <Drawer
        title="Record Payment Received"
        open={!!paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setPaymentInvoice(null)}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={paymentForm.handleSubmit(submitPayment)}>
              Save Payment
            </Button>
          </Space>
        }
      >
        {paymentInvoice && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-50/5 border border-emerald-500/20">
            <Typography.Text type="secondary" style={{ display: 'block' }}>Recording payment for:</Typography.Text>
            <Typography.Title level={5} style={{ margin: '4px 0' }}>{paymentInvoice.invoiceNumber}</Typography.Title>
            <Flex justify="space-between" className="mt-2!">
              <Typography.Text>Expected: {formatCurrency(Number(paymentInvoice.totalAmount) + Number(paymentInvoice.gstAmount))}</Typography.Text>
              <Typography.Text>Receivable: {formatCurrency((Number(paymentInvoice.totalAmount) + Number(paymentInvoice.gstAmount)) - Number(paymentInvoice.paidAmount || 0))}</Typography.Text>
            </Flex>
          </div>
        )}

        <Form layout="vertical">
          <Controller
            control={paymentForm.control}
            name="amount"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Amount"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <InputNumber
                  min={0.01}
                  className="w-full"
                  prefix="₹"
                  value={field.value}
                  onChange={field.onChange}
                />
              </Form.Item>
            )}
          />
          <Controller
            control={paymentForm.control}
            name="paymentDate"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Payment Date"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <DatePicker
                  className="w-full"
                  defaultValue={dayjs(field.value)}
                  onChange={(_, dateString) => field.onChange(Array.isArray(dateString) ? dateString[0] : dateString)}
                />
              </Form.Item>
            )}
          />
          <Controller
            control={paymentForm.control}
            name="paymentMode"
            render={({ field }) => (
              <Form.Item label="Payment Mode">
                <Select
                  {...field}
                  options={[
                    { label: 'UPI', value: 'upi' },
                    { label: 'RTGS/NEFT', value: 'rtgs' },
                    { label: 'Cash', value: 'cash' },
                    { label: 'Cheque', value: 'cheque' },
                  ]}
                />
              </Form.Item>
            )}
          />
          <Controller
            control={paymentForm.control}
            name="referenceNumber"
            render={({ field }) => (
              <Form.Item label="Reference Number (UTR/Cheque)">
                <Input {...field} placeholder="Enter transaction reference" />
              </Form.Item>
            )}
          />
          <Controller
            control={paymentForm.control}
            name="notes"
            render={({ field }) => (
              <Form.Item label="Notes">
                <Input.TextArea {...field} rows={2} />
              </Form.Item>
            )}
          />
        </Form>
      </Drawer>

      <Modal
        title={`Payment History — ${historyInvoice?.invoiceNumber}`}
        open={!!historyInvoice}
        onCancel={() => setHistoryInvoice(null)}
        footer={[<Button key="close" onClick={() => setHistoryInvoice(null)}>Close</Button>]}
        width={750}
      >
        {historyInvoice?.payments && historyInvoice.payments.length > 0 ? (
          <Table
            dataSource={historyInvoice.payments}
            pagination={false}
            size="small"
            rowKey="id"
            scroll={{ x: 600 }}
            columns={[
              {
                title: 'Date',
                dataIndex: 'paymentDate',
                render: formatDate,
              },
              {
                title: 'Amount',
                dataIndex: 'amount',
                align: 'right',
                render: (val) => formatCurrency(val),
              },
              {
                title: 'Mode',
                dataIndex: 'paymentMode',
                render: (val) => <Typography.Text strong>{val?.toUpperCase()}</Typography.Text>,
              },
              {
                title: 'Ref No',
                dataIndex: 'referenceNumber',
                render: (val) => val || '-',
              },
              {
                title: 'Receipt',
                key: 'receipt',
                align: 'center',
                render: (_, record) => isClient && historyInvoice && (
                  <PDFDownloadLink
                    document={<PaymentReceiptPdf invoice={historyInvoice} payment={record} />}
                    fileName={`Receipt_${record.referenceNumber || record.id}.pdf`}
                  >
                    <Button type="text" size="small" icon={<FilePdfOutlined className="text-red-500" />} />
                  </PDFDownloadLink>
                ),
              },
            ]}
          />
        ) : (
          <div className="py-8 text-center text-[var(--text-very-muted)]">
            No payments received for this invoice yet.
          </div>
        )}
      </Modal>

      <Modal
        title={`Invoice Preview — ${previewInvoice?.invoiceNumber}`}
        open={!!previewInvoice}
        onCancel={() => setPreviewInvoice(null)}
        width="90%"
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={() => setPreviewInvoice(null)}>Close</Button>,
          previewInvoice && (
            <PDFDownloadLink
              key="download"
              document={<InvoicePdf invoice={previewInvoice} />}
              fileName={`${previewInvoice.invoiceNumber}.pdf`}
            >
              <Button type="primary" icon={<FilePdfOutlined />}>
                Download PDF
              </Button>
            </PDFDownloadLink>
          )
        ]}
      >
        <div style={{ height: '75vh', width: '100%', backgroundColor: '#f0f2f5' }}>
          {previewInvoice && (
            <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
              <InvoicePdf invoice={previewInvoice} />
            </PDFViewer>
          )}
        </div>
      </Modal>

      <Modal
        title={`Payment Receipt — ${receiptData?.invoice.invoiceNumber || ''}`}
        open={!!receiptData}
        onCancel={() => setReceiptData(null)}
        width={500}
        footer={[
          <Button key="close" onClick={() => setReceiptData(null)}>Close</Button>,
          receiptData && (
            <PDFDownloadLink
              key="download"
              document={<PaymentReceiptPdf invoice={receiptData.invoice} payment={receiptData.payment} />}
              fileName={`Receipt-${receiptData.invoice.invoiceNumber}.pdf`}
            >
              <Button type="primary" icon={<FilePdfOutlined />}>
                Download Receipt
              </Button>
            </PDFDownloadLink>
          )
        ]}
      >
        {receiptData && (
          <PDFViewer width="100%" height={400} showToolbar={false} style={{ border: 'none' }}>
            <PaymentReceiptPdf invoice={receiptData.invoice} payment={receiptData.payment} />
          </PDFViewer>
        )}
      </Modal>

    </div>
  );
}

