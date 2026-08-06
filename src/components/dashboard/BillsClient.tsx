'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Card, DatePicker, Drawer, Flex, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Typography, Upload, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, EyeOutlined, FileDoneOutlined, PlusOutlined, HistoryOutlined, UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import { Controller, useForm, useFieldArray, useWatch } from 'react-hook-form';
import { z } from 'zod';
import dayjs from 'dayjs';
import { createBill, updateBill, deleteBill, uploadBillFile } from '@/actions/invoices';
import { createPayment } from '@/actions/payments';
import { getApiBaseUrl } from '@/lib/api-url';
import type { Vendor, Project, PurchaseBill, PurchaseOrder } from '@/types/erp';
import { PaymentMode, BillStatus } from '@/types/erp';
import {
  StatusTag,
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  secondaryTextClassName,
  titleIconClassName,
} from './ui';

const billItemSchema = z.object({
  poItemId: z.string(),
  description: z.string(),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  unit: z.string(),
  rate: z.number(),
  orderedQty: z.number(),
  billedQty: z.number(),
});

const billSchema = z.object({
  vendorId: z.string().min(1, 'Select a vendor'),
  purchaseOrderId: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  gstPercent: z.number().optional(),
  dueDate: z.string().optional(),
  billDate: z.string().min(1, 'Select bill date'),
  projectId: z.string().optional(),
  billFileUrl: z.string().optional(),
  billFileKey: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(billItemSchema).optional(),
});

const paymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentDate: z.string().min(1, 'Select payment date'),
  paymentMode: z.string().min(1, 'Select payment mode'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type BillFormValues = z.infer<typeof billSchema>;
type PaymentFormValues = z.infer<typeof paymentSchema>;

type BillsClientProps = {
  bills: PurchaseBill[];
  vendors: Vendor[];
  projects: Project[];
  purchaseOrders: PurchaseOrder[];
  userRole: string;
};

export function BillsClient({ bills, vendors, projects, purchaseOrders, userRole }: BillsClientProps) {
  const canManagePayments = userRole === 'admin' || userRole === 'accounts_manager';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<PurchaseBill | null>(null);
  const [paymentBill, setPaymentBill] = useState<PurchaseBill | null>(null);
  const [historyBill, setHistoryBill] = useState<PurchaseBill | null>(null);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<any[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      vendorId: '',
      purchaseOrderId: '',
      amount: 0,
      gstPercent: 0,
      dueDate: undefined,
      billDate: new Date().toISOString().split('T')[0],
      projectId: undefined,
      items: [],
    },
  });

  const { fields } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = useWatch({
    control,
    name: 'items',
  });

  const watchedGstPercent = useWatch({
    control,
    name: 'gstPercent',
  });

  const watchedProjectId = useWatch({
    control,
    name: 'projectId',
  });

  const watchedPoId = useWatch({
    control,
    name: 'purchaseOrderId',
  });

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: 'upi',
      referenceNumber: '',
      notes: '',
    },
  });

  // Update total amount (basic + GST) based on items and GST %
  useEffect(() => {
    if (watchedItems && watchedItems.length > 0) {
      const basicAmount = watchedItems.reduce((sum: number, item: any) =>
        sum + (Number(item?.quantity || 0) * Number(item?.rate || 0)), 0);
      const gstAmount = basicAmount * (Number(watchedGstPercent || 0) / 100);
      setValue('amount', basicAmount + gstAmount);
    }
  }, [watchedItems, watchedGstPercent, setValue]);

  const handleEdit = (bill: PurchaseBill) => {
    setEditingBill(bill);
    reset({
      vendorId: bill.vendorId,
      purchaseOrderId: bill.purchaseOrderId || undefined,
      projectId: bill.projectId || undefined,
      amount: Number(bill.amount),
      gstPercent: Number(bill.gstPercent || 0),
      billDate: bill.billDate,
      dueDate: bill.dueDate || undefined,
      notes: bill.notes || '',
      items: bill.billItems?.map((item: any) => ({
        poItemId: item.poItemId,
        description: item.description || '',
        quantity: Number(item.quantity),
        unit: item.unit || 'nos',
        rate: Number(item.rate),
        orderedQty: Number(item.orderedQty),
        billedQty: Number(item.billedQty),
      })) || [],
    });
    if (bill.billFileUrl) {
      setFileList([{ uid: '-1', name: bill.billFileUrl.split('/').pop() || 'Bill File', status: 'done', url: bill.billFileUrl }]);
    } else {
      setFileList([]);
    }
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteBill(id);
        message.success('Bill deleted');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to delete bill');
      }
    });
  };

  const handlePoSelect = (poId: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      reset({
        vendorId: po.vendorId,
        purchaseOrderId: poId,
        projectId: po.projectId || undefined,
        billDate: new Date().toISOString().split('T')[0],
        amount: 0,
        gstPercent: Number(po.gstPercent || 0),
        items: po.items?.map(item => ({
          poItemId: item.id!,
          description: item.description,
          orderedQty: Number(item.quantity),
          billedQty: Number(item.billedQuantity || 0),
          quantity: Number(item.quantity),
          unit: item.unit,
          rate: Number(item.rate),
        })) || [],
      });
      message.info(`Loaded ${po.items?.length || 0} items from PO ${po.poNumber}`);
    }
  };

  const uploadProps = {
    onRemove: () => setFileList([]),
    beforeUpload: (file: any) => {
      setFileList([file]);
      return false;
    },
    fileList,
  };

  // When a project is chosen, auto-select the matching approved Purchase Order
  useEffect(() => {
    if (!watchedProjectId || editingBill) return;
    const po = purchaseOrders.find(
      (p) => p.status === 'approved' && p.projectId === watchedProjectId,
    );
    if (po && po.id !== watchedPoId) {
      handlePoSelect(po.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedProjectId, purchaseOrders]);

  const submit = async (values: BillFormValues) => {
    startTransition(async () => {
      try {
        let billFileUrl = '';
        let billFileKey = '';

        if (fileList.length > 0) {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(fileList[0]);
          });
          const { fileUrl, fileKey } = await uploadBillFile({ name: fileList[0].name, base64 });
          billFileUrl = fileUrl;
          billFileKey = fileKey;
        }

        const basicAmount = (values.items || []).reduce((sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);
        const gstAmount = basicAmount * (Number(values.gstPercent || 0) / 100);

        const payload = {
          ...values,
          gstAmount,
          billFileUrl,
          billFileKey,
          items: values.items?.map(item => ({
            poItemId: item.poItemId,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            orderedQty: item.orderedQty,
            billedQty: item.billedQty,
          }))
        };

        if (editingBill) {
          await updateBill(editingBill.id, payload);
          message.success('Bill updated successfully');
        } else {
          await createBill(payload);
          message.success('Bill recorded successfully');
        }
        reset();
        setFileList([]);
        setOpen(false);
        setEditingBill(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to record bill');
      }
    });
  };

  const submitPayment = (values: PaymentFormValues) => {
    if (!paymentBill) return;

    startTransition(async () => {
      try {
        await createPayment({
          ...values,
          purchaseBillId: paymentBill.id,
          paymentType: 'material',
        });
        message.success('Payment recorded successfully');
        paymentForm.reset();
        setPaymentBill(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to record payment');
      }
    });
  };

  const columns: ColumnsType<PurchaseBill> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 60,
      render: (_text, _record, index) => index + 1,
    },
    {
      title: 'Bill Number',
      dataIndex: 'billNumber',
      render: (value: string, record) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{value}</Typography.Text>
          {record.purchaseOrder && (
            <Typography.Text type="secondary" className="text-xs">
              PO: {record.purchaseOrder.poNumber}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Vendor',
      dataIndex: ['vendor', 'name'],
      render: (_value, record) => record.vendor?.name || '-',
    },
    {
      title: 'GST',
      key: 'gst',
      align: 'right',
      width: 90,
      render: (_, record) => (record.gstPercent ? `${Number(record.gstPercent)}%` : '-'),
    },
    {
      title: 'Total Amount',
      dataIndex: 'amount',
      align: 'right',
      render: (value) => formatCurrency(value),
    },
    {
      title: 'Doc',
      dataIndex: 'billFileUrl',
      width: 60,
      render: (url) => url ? (
        <Button 
          type="text" 
          icon={<FileTextOutlined className="text-blue-500" />} 
          onClick={() => window.open(`${getApiBaseUrl().replace('/api/v1', '')}${url}`, '_blank')}
        />
      ) : '-',
    },
    {
      title: 'Balance',
      key: 'balance',
      align: 'right',
      render: (_, record) => {
        const balance = Number(record.amount) - Number(record.paidAmount);
        return <Typography.Text type={balance > 0 ? 'danger' : 'secondary'}>{formatCurrency(balance)}</Typography.Text>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value) => <StatusTag value={value} />,
    },
    {
      title: 'Bill Date',
      dataIndex: 'billDate',
      render: formatDate,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/dashboard/accounts/bills/${record.id}`)}
            title="View Details"
          />
          {record.status === 'pending' && (
            <>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                title="Edit"
              />
              <Popconfirm
                title="Delete Bill?"
                description="This will permanently delete this bill."
                onConfirm={() => handleDelete(record.id)}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button
                  size="small"
                  type="text"
                  icon={<DeleteOutlined className="text-red-500" />}
                  title="Delete"
                  loading={isPending}
                />
              </Popconfirm>
            </>
          )}
          {canManagePayments && (
            <Button 
              size="small" 
              type="primary" 
              disabled={record.status === 'approved'}
              onClick={() => {
                setPaymentBill(record);
                paymentForm.setValue('amount', Number(record.amount) - Number(record.paidAmount));
              }}
            >
              Cash Outflow
            </Button>
          )}
          {canManagePayments && (
            <Button
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => setHistoryBill(record)}
              title="Payment History"
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <FileDoneOutlined className={titleIconClassName} /> Purchase Bills
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Record Bill
        </Button>
      </Flex>

      <Card className={cardClassName}>
        <Table
          dataSource={bills}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} bills` }}
        />
      </Card>

      <Drawer
        title={editingBill ? `Edit Bill — ${editingBill.billNumber}` : 'Record Purchase Bill'}
        size="large"
        open={open}
        onClose={() => { setOpen(false); setEditingBill(null); }}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => { setOpen(false); setEditingBill(null); }}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(submit)}>
              {editingBill ? 'Update' : 'Save'}
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" onFinish={handleSubmit(submit)}>
          <Form.Item label="Import from Purchase Order" className="mb-6 rounded-lg border border-[var(--border)] bg-slate-50/5 p-4">
            <Select
              showSearch
              placeholder="Search PO number to autofill..."
              optionFilterProp="label"
              value={watchedPoId || undefined}
              onChange={handlePoSelect}
              options={purchaseOrders
                .filter((po) => po.status === 'approved')
                .map((po) => ({
                  value: po.id,
                  label: `${po.poNumber} - ${po.vendor?.name || 'Unknown Vendor'}${po.materialRequirementNo ? ` (MR Ref: ${po.materialRequirementNo})` : ''}`,
                }))}
            />
          </Form.Item>

          <Flex gap={16}>
            <Controller
              control={control}
              name="vendorId"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Vendor"
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Select
                    {...field}
                    showSearch
                    placeholder="Select vendor"
                    optionFilterProp="label"
                    options={vendors.map((v) => ({ value: v.id, label: v.name }))}
                  />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="amount"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Total Bill Amount"
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fields.length > 0 ? "Auto-calculated from items below" : fieldState.error?.message}
                >
                  <InputNumber
                    min={0}
                    className="w-full"
                    prefix="₹"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={fields.length > 0}
                    style={{ 
                      width: '100%',
                      backgroundColor: fields.length > 0 ? 'rgba(0, 145, 255, 0.05)' : undefined,
                      fontWeight: fields.length > 0 ? 'bold' : 'normal',
                      color: fields.length > 0 ? '#10b981' : 'inherit'
                    }}
                  />
                </Form.Item>
              )}
            />
          </Flex>

          <Flex gap={16}>
            <Controller
              control={control}
              name="billDate"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Bill Date"
                  className="flex-1"
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
              control={control}
              name="dueDate"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Due Date"
                  className="flex-1"
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
          </Flex>

          <Controller
            control={control}
            name="projectId"
            render={({ field }) => (
              <Form.Item label="Project (Optional)">
                <Select
                  {...field}
                  allowClear
                  showSearch
                  placeholder="Link to project"
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                />
              </Form.Item>
            )}
          />

          <Divider titlePlacement="left">Bill Document</Divider>
          <Form.Item label="Upload Vendor Bill (PDF/Image)">
            <Upload {...uploadProps} maxCount={1}>
              <Button icon={<UploadOutlined />}>{editingBill?.billFileUrl ? 'Replace File' : 'Select File'}</Button>
            </Upload>
            {editingBill?.billFileUrl && fileList.length === 0 && (
              <Button type="link" size="small" icon={<FileTextOutlined />} href={`${getApiBaseUrl().replace('/api/v1', '')}${editingBill.billFileUrl}`} target="_blank" className="mt-2">
                View uploaded bill
              </Button>
            )}
          </Form.Item>

          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <Form.Item label="Notes">
                <Input.TextArea {...field} rows={3} placeholder="Additional notes..." />
              </Form.Item>
            )}
          />

          {fields.length > 0 && (
            <>
              <Divider titlePlacement="left">Bill Items</Divider>
              <div className="mb-4 rounded-lg border border-[var(--border)] p-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="mb-4 last:mb-0 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                    <Flex justify="space-between" align="start" className="mb-2">
                      <Controller
                        control={control}
                        name={`items.${index}.description`}
                        render={({ field }) => (
                          <Input
                            {...field}
                            size="small"
                            className="max-w-60"
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        )}
                      />
                      <Controller
                        control={control}
                        name={`items.${index}.rate`}
                        render={({ field }) => (
                          <InputNumber
                            {...field}
                            min={0}
                            size="small"
                            className="w-28"
                            prefix="₹"
                            onChange={(val) => field.onChange(val || 0)}
                          />
                        )}
                      />
                    </Flex>
                    <Flex justify="flex-end">
                      <Form.Item label="Quantity" className="mb-0 w-32" required>
                        <Controller
                          control={control}
                          name={`items.${index}.quantity`}
                          render={({ field: qtyField }) => (
                            <InputNumber
                              {...qtyField}
                              min={0}
                              className="w-full"
                              addonAfter={watch(`items.${index}.unit`)}
                              onChange={(val) => qtyField.onChange(val || 0)}
                            />
                          )}
                        />
                      </Form.Item>
                    </Flex>
                  </div>
                ))}

                <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
                    <Form.Item label="GST %" className="mb-0">
                      <Controller
                        control={control}
                        name="gstPercent"
                        render={({ field }) => (
                          <InputNumber
                            {...field}
                            min={0}
                            max={100}
                            addonAfter="%"
                            onChange={(val) => field.onChange(val ?? 0)}
                          />
                        )}
                      />
                    </Form.Item>
                    <Form.Item label="Basic" className="mb-0">
                      <Typography.Text strong>
                        {formatCurrency((watchedItems || []).reduce((s, i) => s + Number(i.quantity || 0) * Number(i.rate || 0), 0))}
                      </Typography.Text>
                    </Form.Item>
                    <Form.Item label="GST Amt" className="mb-0">
                      <Typography.Text>
                        {formatCurrency((watchedItems || []).reduce((s, i) => s + Number(i.quantity || 0) * Number(i.rate || 0), 0) * (Number(watchedGstPercent || 0) / 100))}
                      </Typography.Text>
                    </Form.Item>
                    <Form.Item label="Total w/ GST" className="mb-0">
                      <Typography.Title level={4} style={{ margin: 0, color: '#10b981' }}>
                        {formatCurrency(watch('amount'))}
                      </Typography.Title>
                    </Form.Item>
                  </Flex>
                </div>
              </div>
            </>
          )}
        </Form>
      </Drawer>

      <Drawer
        title="Record Payment"
        open={!!paymentBill}
        onClose={() => setPaymentBill(null)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setPaymentBill(null)}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={paymentForm.handleSubmit(submitPayment)}>
              Save Payment
            </Button>
          </Space>
        }
      >
        {paymentBill && (
          <div className="mb-6 p-4 rounded-lg bg-blue-50/5 border border-blue-500/20">
            <Typography.Text type="secondary" style={{ display: 'block' }}>Recording payment for:</Typography.Text>
            <Typography.Title level={5} style={{ margin: '4px 0' }}>{paymentBill.billNumber}</Typography.Title>
            <Flex justify="space-between" className="mt-2">
              <Typography.Text>Total: {formatCurrency(paymentBill.amount)}</Typography.Text>
              <Typography.Text>Balance: {formatCurrency(Number(paymentBill.amount) - Number(paymentBill.paidAmount))}</Typography.Text>
            </Flex>
          </div>
        )}

        <Form layout="vertical">
          <Controller
            control={paymentForm.control}
            name="amount"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Amount to Pay"
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
              <Form.Item label="UTR / Reference Number">
                <Input {...field} placeholder="Enter transaction ID or cheque number" />
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
        title={`Payment History — ${historyBill?.billNumber}`}
        open={!!historyBill}
        onCancel={() => setHistoryBill(null)}
        footer={[<Button key="close" onClick={() => setHistoryBill(null)}>Close</Button>]}
        width={700}
      >
        {historyBill?.payments && historyBill.payments.length > 0 ? (
          <Table
            dataSource={historyBill.payments}
            pagination={false}
            size="small"
            rowKey="id"
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
            ]}
          />
        ) : (
          <div className="py-8 text-center text-[var(--text-very-muted)]">
            No payments recorded yet for this bill.
          </div>
        )}
      </Modal>
    </div>
  );
}
