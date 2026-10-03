'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Card, DatePicker, Drawer, Flex, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Typography, Upload, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, EyeOutlined, FileDoneOutlined, PlusOutlined, HistoryOutlined, SearchOutlined, UploadOutlined, FileTextOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  createSubcontractorBill,
  updateSubcontractorBill,
  deleteSubcontractorBill,
  uploadSubcontractorBillFile,
} from '@/actions/subcontractor-bills';
import { createPayment } from '@/actions/payments';
import { getApiBaseUrl } from '@/lib/api-url';
import { exportToExcel } from '@/lib/excel';
import type { Subcontractor, Project, SubcontractorBill, SubcontractWorkOrder } from '@/types/erp';
import {
  StatusTag,
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleCase,
  titleIconClassName,
} from './ui';

const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

const billSchema = z.object({
  subcontractorId: z.string().min(1, 'Select a subcontractor'),
  subcontractWorkOrderId: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  gstPercent: z.number().optional(),
  dueDate: z.string().optional(),
  billDate: z.string().min(1, 'Select bill date'),
  projectId: z.string().optional(),
  billFileUrl: z.string().optional(),
  billFileKey: z.string().optional(),
  notes: z.string().optional(),
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

type Props = {
  bills: SubcontractorBill[];
  subcontractors: Subcontractor[];
  projects: Project[];
  workOrders: SubcontractWorkOrder[];
  userRole: string;
};

export function SubcontractorBillsClient({ bills, subcontractors, projects, workOrders, userRole }: Props) {
  const canManagePayments = userRole === 'admin' || userRole === 'accounts_manager';
  // Recording a bill is purchase team's job (same split as Vendor Bills);
  // accounts only reviews/approves and manages payments.
  const canRecordBill = userRole === 'admin' || userRole === 'purchase_team';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<SubcontractorBill | null>(null);
  const [paymentBill, setPaymentBill] = useState<SubcontractorBill | null>(null);
  const [historyBill, setHistoryBill] = useState<SubcontractorBill | null>(null);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  const filteredBills = useMemo(() => {
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    return bills.filter((bill) => {
      if (from && to) {
        const billed = bill.billDate ? bill.billDate.split('T')[0] : '';
        if (billed < from || billed > to) return false;
      }
      if (searchText) {
        const q = searchText.toLowerCase();
        const haystack = [bill.billNumber, bill.subcontractor?.name, bill.project?.name, bill.subcontractWorkOrder?.woNumber]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [bills, searchText, dateRange]);

  const {
    control,
    handleSubmit,
    reset,
  } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      subcontractorId: '',
      subcontractWorkOrderId: '',
      amount: 0,
      gstPercent: 0,
      dueDate: undefined,
      billDate: new Date().toISOString().split('T')[0],
      projectId: undefined,
    },
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

  const handleEdit = (bill: SubcontractorBill) => {
    setEditingBill(bill);
    reset({
      subcontractorId: bill.subcontractorId,
      subcontractWorkOrderId: bill.subcontractWorkOrderId || undefined,
      projectId: bill.projectId || undefined,
      amount: Number(bill.amount),
      gstPercent: Number(bill.gstPercent || 0),
      billDate: bill.billDate,
      dueDate: bill.dueDate || undefined,
      notes: bill.notes || '',
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
        await deleteSubcontractorBill(id);
        message.success('Bill deleted');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to delete bill');
      }
    });
  };

  const handleWoSelect = (woId: string) => {
    const wo = workOrders.find((w) => w.id === woId);
    if (wo) {
      reset({
        subcontractorId: wo.subcontractorId,
        subcontractWorkOrderId: woId,
        projectId: wo.projectId || undefined,
        billDate: new Date().toISOString().split('T')[0],
        amount: Number(wo.totalAmount) - Number(wo.paidAmount || 0),
        gstPercent: Number(wo.gstPercentage || 0),
      });
      message.info(`Loaded details from WO ${wo.woNumber}`);
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
          const { fileUrl, fileKey } = await uploadSubcontractorBillFile({ name: fileList[0].name, base64 });
          billFileUrl = fileUrl;
          billFileKey = fileKey;
        }

        const gstAmount = Number(values.amount || 0) * (Number(values.gstPercent || 0) / 100);
        const payload = { ...values, gstAmount, billFileUrl, billFileKey };

        if (editingBill) {
          await updateSubcontractorBill(editingBill.id, payload);
          message.success('Bill updated successfully');
        } else {
          await createSubcontractorBill(payload);
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
          subcontractorBillId: paymentBill.id,
          paymentType: 'labour',
        });
        message.success('Payment recorded successfully');
        paymentForm.reset();
        setPaymentBill(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to record payment');
      }
    });
  };

  const columns: ColumnsType<SubcontractorBill> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 60,
      render: (_text, _record, index) => index + 1,
    },
    {
      title: 'WO No',
      key: 'subcontractWorkOrder',
      render: (_value, record) => record.subcontractWorkOrder ? (
        <Typography.Text>{record.subcontractWorkOrder.woNumber}</Typography.Text>
      ) : '-',
    },
    {
      title: 'Bill No',
      dataIndex: 'billNumber',
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Bill Date',
      dataIndex: 'billDate',
      render: formatDate,
    },
    {
      title: 'Sub Contractor',
      dataIndex: ['subcontractor', 'name'],
      render: (_value, record) => record.subcontractor?.name || '-',
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
          title="Subcontractor Bill"
          onClick={() => window.open(`${getApiBaseUrl().replace('/api/v1', '')}${url}`, '_blank')}
        />
      ) : '-',
    },
    {
      title: 'Amount Paid',
      dataIndex: 'paidAmount',
      align: 'right',
      width: 120,
      render: (value) => Number(value) > 0 ? formatCurrency(value) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'History',
      key: 'history',
      width: 170,
      render: (_, record) => {
        const payments = [...(record.payments || [])].sort(
          (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime(),
        );
        const balance = Number(record.amount) - Number(record.paidAmount || 0);
        return (
          <Flex vertical gap={0}>
            {payments.length === 0 ? (
              <Typography.Text type="secondary" className="text-xs">No payments yet</Typography.Text>
            ) : (
              payments.slice(0, 2).map((p, i) => (
                <Typography.Text key={p.id} className="text-xs">{ordinal(i + 1)} Paid: {formatCurrency(p.amount)}</Typography.Text>
              ))
            )}
            <Typography.Text strong className="text-xs">Balance: {formatCurrency(balance)}</Typography.Text>
            {canManagePayments && payments.length > 0 && (
              <Button type="link" size="small" icon={<HistoryOutlined />} className="px-0! h-auto! justify-start!" onClick={() => setHistoryBill(record)}>
                {payments.length > 2 ? `View all (${payments.length})` : 'View'}
              </Button>
            )}
          </Flex>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value) => <StatusTag value={value} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/dashboard/accounts/subcontractor-bills/${record.id}`)}
            title="View Details — Work Order, Subcontractor Bill"
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
        </Space>
      ),
    },
  ];

  const handleExportExcel = () => {
    exportToExcel({
      filename: 'Subcontractor-Bills',
      sheetName: 'Subcontractor Bills',
      headers: [
        'S.No', 'WO No', 'Bill No', 'Bill Date', 'Sub Contractor', 'Total Amount',
        'Amount Paid', 'Balance', '1st Paid', '2nd Paid', 'Status',
      ],
      rows: filteredBills.map((b, i) => {
        const payments = [...(b.payments || [])].sort(
          (x, y) => new Date(x.paymentDate).getTime() - new Date(y.paymentDate).getTime(),
        );
        return [
          i + 1,
          b.subcontractWorkOrder?.woNumber || '-',
          b.billNumber,
          b.billDate ? formatDate(b.billDate) : '-',
          b.subcontractor?.name || '-',
          Number(b.amount || 0),
          Number(b.paidAmount || 0),
          Number(b.amount || 0) - Number(b.paidAmount || 0),
          payments[0] ? Number(payments[0].amount) : 0,
          payments[1] ? Number(payments[1].amount) : 0,
          titleCase(b.status),
        ];
      }),
    });
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <FileDoneOutlined className={titleIconClassName} /> Subcontractor Bills
        </Typography.Title>
        <Space>
          <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>
            Export to Excel
          </Button>
          {canRecordBill && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              Record Bill
            </Button>
          )}
        </Space>
      </Flex>

      <Flex gap={12} wrap="wrap" className="mb-6!">
        <Input.Search
          placeholder="Search bill, subcontractor, project..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
          style={{ width: 200 }}
        />
        <DatePicker.RangePicker
          value={dateRange[0] || dateRange[1] ? dateRange : [null, null]}
          onChange={(dates) => setDateRange(dates ? [dates[0], dates[1]] : [null, null])}
          allowClear
          placeholder={['From date', 'To date']}
        />
      </Flex>

      <Card className={cardClassName}>
        <Table
          dataSource={filteredBills}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1350 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} bills` }}
        />
      </Card>

      <Drawer
        title={editingBill ? `Edit Bill — ${editingBill.billNumber}` : 'Record Subcontractor Bill'}
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
          <Form.Item label="Import from Work Order" className="mb-6 rounded-lg border border-[var(--border)] bg-slate-50/5 p-4">
            <Select
              showSearch
              placeholder="Search WO number to autofill..."
              optionFilterProp="label"
              onChange={handleWoSelect}
              options={workOrders
                .filter((wo) => wo.status === 'approved')
                .map((wo) => ({
                  value: wo.id,
                  label: `${wo.woNumber} - ${wo.subcontractor?.name || 'Unknown Subcontractor'}`,
                }))}
            />
          </Form.Item>

          <Flex gap={16}>
            <Controller
              control={control}
              name="subcontractorId"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Subcontractor"
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Select
                    {...field}
                    showSearch
                    placeholder="Select subcontractor"
                    optionFilterProp="label"
                    options={subcontractors.map((s) => ({ value: s.id, label: s.name }))}
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
                  help={fieldState.error?.message}
                >
                  <InputNumber
                    min={0}
                    className="w-full"
                    prefix="₹"
                    value={field.value}
                    onChange={field.onChange}
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
            name="gstPercent"
            render={({ field }) => (
              <Form.Item label="GST %">
                <InputNumber
                  min={0}
                  max={100}
                  addonAfter="%"
                  value={field.value}
                  onChange={(val) => field.onChange(val ?? 0)}
                />
              </Form.Item>
            )}
          />

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
          <Form.Item label="Upload Subcontractor Bill (PDF/Image)">
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
            <Flex justify="space-between" className="mt-2!">
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
