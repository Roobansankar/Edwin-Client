'use client';

import { useEffect, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Card,
  Drawer,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Typography,
  App,
  Select,
  DatePicker,
  Upload,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  FilePdfOutlined,
  PlusOutlined,
  FileTextOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FileUnknownOutlined,
  UploadOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import dayjs from 'dayjs';
import {
  createSubcontractWorkOrder,
  deleteSubcontractWorkOrder,
  updateSubcontractWorkOrder,
  updateSubcontractWorkOrderStatus,
  uploadWorkOrderFile,
} from '@/actions/subcontract-work-orders';
import { createPayment } from '@/actions/payments';
import type { SubcontractWorkOrder, Project, Subcontractor, WorkCategory, Payment } from '@/types/erp';
import { SubcontractWorkOrderPdf } from './SubcontractWorkOrderPdf';
import {
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';
import { getApiOrigin } from '@/lib/api-url';
import { useAuthStore } from '@/store/auth';

const swoSchema = z.object({
  woNumber: z.string().min(2, 'WO number is required'),
  projectId: z.string().min(1, 'Project is required'),
  subcontractorId: z.string().min(1, 'Subcontractor is required'),
  workCategoryId: z.string().min(1, 'Work category is required'),
  description: z.string().optional(),
  amount: z.number().min(0.01, 'Amount is required'),
  gstPercentage: z.number().min(0, 'GST % cannot be negative'),
  startDate: z.any().optional(),
  endDate: z.any().optional(),
  notes: z.string().optional(),
});

type SwoFormValues = z.infer<typeof swoSchema>;

type SubcontractWorkOrdersClientProps = {
  workOrders: SubcontractWorkOrder[];
  projects: Project[];
  subcontractors: Subcontractor[];
  workCategories: WorkCategory[];
};

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Admin Approved', value: 'admin_approved' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const getFileIcon = (filename: string) => {
  const ext = filename?.toLowerCase() || '';
  if (ext.endsWith('.pdf')) return <FilePdfOutlined className="text-red-500" />;
  if (ext.endsWith('.xls') || ext.endsWith('.xlsx')) return <FileExcelOutlined className="text-green-500" />;
  if (ext.endsWith('.doc') || ext.endsWith('.docx')) return <FileTextOutlined className="text-blue-500" />;
  return <FileUnknownOutlined className="text-gray-500" />;
};

export function SubcontractWorkOrdersClient({
  workOrders,
  projects,
  subcontractors,
  workCategories,
}: SubcontractWorkOrdersClientProps) {
  const [open, setOpen] = useState(false);
  const [editingSwo, setEditingSwo] = useState<SubcontractWorkOrder | null>(null);
  const [previewSwo, setPreviewSwo] = useState<SubcontractWorkOrder | null>(null);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const isPurchaseTeam = user?.role === 'purchase_team';
  const statusOptions = isPurchaseTeam
    ? STATUS_OPTIONS.filter((opt) => opt.value !== 'admin_approved')
    : STATUS_OPTIONS;

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      try {
        await updateSubcontractWorkOrderStatus(id, status);
        message.success('Status updated');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to update status');
      }
    });
  };
  const [isClient, setIsClient] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    workorderUrl: string;
    workorderKey: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  const [swoPayments, setSwoPayments] = useState<Payment[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
  const [paymentDate, setPaymentDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [paymentMode, setPaymentMode] = useState('upi');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentPending, startPaymentTransition] = useTransition();

  const loadSwoPayments = async (swoId: string) => {
    try {
      const res = await fetch(`/api/backend/payments?subcontractWorkOrderId=${swoId}`);
      if (res.ok) {
        const data = await res.json();
        setSwoPayments(data?.data || []);
      }
    } catch { /* silent */ }
  };

  const handleAddPayment = (swo: SubcontractWorkOrder) => {
    if (!paymentAmount || paymentAmount <= 0) { message.error('Enter a valid amount'); return; }
    startPaymentTransition(async () => {
      try {
        await createPayment({
          subcontractWorkOrderId: swo.id,
          projectId: swo.projectId,
          paymentType: 'labour',
          amount: paymentAmount,
          paymentDate,
          paymentMode,
          referenceNumber: paymentReference || undefined,
        });
        message.success('Payment recorded');
        setPaymentAmount(null);
        setPaymentReference('');
        loadSwoPayments(swo.id);
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Failed to record payment');
      }
    });
  };

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySwo, setHistorySwo] = useState<SubcontractWorkOrder | null>(null);
  const [historyPayments, setHistoryPayments] = useState<Payment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openHistory = async (swo: SubcontractWorkOrder) => {
    setHistorySwo(swo);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/backend/payments?subcontractWorkOrderId=${swo.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryPayments(data?.data || []);
      }
    } catch { /* silent */ }
    finally { setHistoryLoading(false); }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
  } = useForm<SwoFormValues>({
    resolver: zodResolver(swoSchema),
    defaultValues: {
      woNumber: '',
      projectId: '',
      subcontractorId: '',
      workCategoryId: '',
      description: '',
      amount: 0,
      gstPercentage: 18,
      notes: '',
    },
  });

  const selectedSubcontractorId = useWatch({ control, name: 'subcontractorId' });
  const watchedAmount = useWatch({ control, name: 'amount' });
  const watchedGstPercentage = useWatch({ control, name: 'gstPercentage' });
  const computedTotal = (Number(watchedAmount) || 0) + ((Number(watchedAmount) || 0) * (Number(watchedGstPercentage) || 0)) / 100;

  useEffect(() => {
    if (selectedSubcontractorId && !editingSwo) {
      const sub = subcontractors.find((s) => s.id === selectedSubcontractorId);
      if (sub && sub.workCategory) {
        setValue('workCategoryId', sub.workCategory.id);
      }
    }
  }, [selectedSubcontractorId, subcontractors, setValue, editingSwo]);

  useEffect(() => {
    if (editingSwo) {
      setValue('woNumber', editingSwo.woNumber);
      setValue('projectId', editingSwo.projectId);
      setValue('subcontractorId', editingSwo.subcontractorId);
      setValue('workCategoryId', editingSwo.workCategoryId);
      setValue('description', editingSwo.description || '');
      setValue('amount', Number(editingSwo.amount));
      setValue('gstPercentage', Number(editingSwo.gstPercentage));
      setValue('notes', editingSwo.notes || '');
      setValue('startDate', editingSwo.startDate ? dayjs(editingSwo.startDate) : undefined);
      setValue('endDate', editingSwo.endDate ? dayjs(editingSwo.endDate) : undefined);
      if (editingSwo.workorderUrl) {
        setUploadedFile({
          workorderUrl: editingSwo.workorderUrl,
          workorderKey: editingSwo.workorderKey || '',
        });
      }
    } else {
      reset({
        woNumber: `SWO-${dayjs().format('YYYY')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        projectId: '',
        subcontractorId: '',
        workCategoryId: '',
        description: '',
        amount: 0,
        gstPercentage: 18,
        notes: '',
      });
      setUploadedFile(null);
      setSwoPayments([]);
      setPaymentAmount(null);
      setPaymentReference('');
    }
  }, [editingSwo, setValue, reset]);

  const handleEdit = (swo: SubcontractWorkOrder) => {
    setEditingSwo(swo);
    setOpen(true);
    loadSwoPayments(swo.id);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteSubcontractWorkOrder(id);
        message.success('Work order deleted successfully');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to delete work order');
      }
    });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('workorder', file);
      const result = await uploadWorkOrderFile(formData);
      setUploadedFile(result);
      message.success('File uploaded successfully');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const columns: ColumnsType<SubcontractWorkOrder> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'WO Number',
      dataIndex: 'woNumber',
      key: 'woNumber',
      render: (text) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: 'Project',
      dataIndex: ['project', 'name'],
      key: 'project',
    },
    {
      title: 'Subcontractor',
      dataIndex: ['subcontractor', 'name'],
      key: 'subcontractor',
    },
    {
      title: 'Category',
      dataIndex: ['workCategory', 'name'],
      key: 'category',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (value: number | string) => formatCurrency(value),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (value: number | string) => <Typography.Text strong>{formatCurrency(value)}</Typography.Text>,
    },
    {
      title: 'Paid',
      key: 'paidAmount',
      align: 'right',
      render: (_, record) => record.paidAmount ? formatCurrency(record.paidAmount) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'Balance',
      key: 'balance',
      align: 'right',
      render: (_, record) => {
        const balance = Number(record.totalAmount) - Number(record.paidAmount || 0);
        return <Typography.Text strong={balance > 0}>{formatCurrency(balance)}</Typography.Text>;
      },
    },
    {
      title: 'History',
      key: 'history',
      width: 90,
      render: (_, record) => (
        <Button size="small" icon={<HistoryOutlined />} onClick={() => openHistory(record)}>History</Button>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (val) => val || '-',
    },
    {
      title: 'Work Order',
      key: 'workorder',
      width: 120,
      render: (_, record) =>
        record.workorderUrl ? (
          <Space>
            {getFileIcon(record.workorderKey || '')}
            <Tooltip title="View">
              <Button
                type="link"
                size="small"
                icon={<FilePdfOutlined />}
                href={`${getApiOrigin()}${record.workorderUrl}`}
                target="_blank"
              />
            </Tooltip>
            <Tooltip title="Download">
              <Button
                type="link"
                size="small"
                icon={<DownloadOutlined />}
                href={`${getApiOrigin()}${record.workorderUrl}`}
                target="_blank"
                download
              />
            </Tooltip>
          </Space>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      filters: STATUS_OPTIONS.map(opt => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.status === value,
      render: (value: string, record) => (
        <Select
          value={value}
          size="small"
          variant="borderless"
          className="w-full"
          onChange={(newStatus) => handleStatusChange(record.id, newStatus)}
          options={statusOptions}
          popupMatchSelectWidth={false}
          disabled={isPending}
        />
      ),
    },
    {
      title: 'Date Range',
      key: 'dates',
      render: (_, record) => (
        <Typography.Text className="text-xs">
          {record.startDate ? dayjs(record.startDate).format('DD/MM/YY') : '-'} to{' '}
          {record.endDate ? dayjs(record.endDate).format('DD/MM/YY') : '-'}
        </Typography.Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          {isClient && (
            <Button
              type="text"
              icon={<FilePdfOutlined className="text-red-500" />}
              title="Preview PDF"
              onClick={() => setPreviewSwo(record)}
            />
          )}
          <Button
            type="text"
            icon={<EditOutlined className="text-sky-500" />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete Work Order"
            description="Are you sure?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true, loading: isPending }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const submit = (values: SwoFormValues) => {
    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = {
          ...values,
          startDate: values.startDate ? dayjs(values.startDate).format('YYYY-MM-DD') : undefined,
          endDate: values.endDate ? dayjs(values.endDate).format('YYYY-MM-DD') : undefined,
        };

        if (uploadedFile) {
          payload.workorderUrl = uploadedFile.workorderUrl;
          payload.workorderKey = uploadedFile.workorderKey;
        }

        if (editingSwo) {
          await updateSubcontractWorkOrder(editingSwo.id, payload);
          message.success('Work order updated');
        } else {
          await createSubcontractWorkOrder(payload);
          message.success('Work order created');
        }
        setOpen(false);
        setEditingSwo(null);
        setUploadedFile(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to save');
      }
    });
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <FileTextOutlined className={titleIconClassName} /> Subcontract Work Orders
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          New Subcontract WO
        </Button>
      </Flex>

      <Card className={cardClassName}>
        <Table
          dataSource={workOrders}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Drawer
        title={editingSwo ? 'Edit Subcontract WO' : 'New Subcontract WO'}
        size="large"
        open={open}
        onClose={() => setOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(submit)}>
              Save Work Order
            </Button>
          </Space>
        }
      >
        <Form layout="vertical">
          <Flex gap={16}>
            <Controller
              control={control}
              name="woNumber"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="WO Number"
                  required
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Input {...field} placeholder="WO-2026-001" />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="projectId"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Project"
                  required
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Select
                    {...field}
                    options={projects.map((p) => ({ label: p.name, value: p.id }))}
                    placeholder="Select Project"
                  />
                </Form.Item>
              )}
            />
          </Flex>

          <Flex gap={16}>
            <Controller
              control={control}
              name="subcontractorId"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Subcontractor"
                  required
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Select
                    {...field}
                    options={subcontractors.map((s) => ({ label: s.name, value: s.id }))}
                    placeholder="Select Subcontractor"
                  />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="workCategoryId"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Work Category"
                  required
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Select
                    {...field}
                    options={workCategories.map((c) => ({ label: c.name, value: c.id }))}
                    placeholder="Select Category"
                  />
                </Form.Item>
              )}
            />
          </Flex>

          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <Form.Item label="Description of Work">
                <Input.TextArea {...field} rows={2} placeholder="Briefly describe the scope of work" />
              </Form.Item>
            )}
          />

          <Flex gap={16}>
            <Controller
              control={control}
              name="amount"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Amount"
                  required
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <InputNumber {...field} min={0} style={{ width: '100%' }} />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="gstPercentage"
              render={({ field }) => (
                <Form.Item label="GST %" className="w-32">
                  <InputNumber {...field} style={{ width: '100%' }} />
                </Form.Item>
              )}
            />
            <Form.Item label="Total Amount" className="flex-1">
              <InputNumber value={computedTotal} disabled style={{ width: '100%' }} />
            </Form.Item>
          </Flex>

          {editingSwo && (
            <Card size="small" title="Payments" className="border! border-gray-200! mb-4">
              <Table
                dataSource={swoPayments}
                rowKey="id"
                size="small"
                pagination={false}
                className="mb-3"
                locale={{ emptyText: 'No payments recorded yet' }}
                columns={[
                  { title: 'Date', dataIndex: 'paymentDate', render: formatDate },
                  { title: 'Amount', dataIndex: 'amount', align: 'right', render: (v: number | string) => formatCurrency(v) },
                  { title: 'Mode', dataIndex: 'paymentMode', render: (v: string) => v?.toUpperCase() },
                  { title: 'Reference', dataIndex: 'referenceNumber', render: (v?: string | null) => v || '-' },
                ]}
              />
              <Flex gap={8} wrap="wrap" align="flex-end">
                <InputNumber min={0} placeholder="Amount" value={paymentAmount} onChange={setPaymentAmount} style={{ width: 140 }} />
                <DatePicker
                  value={dayjs(paymentDate)}
                  onChange={(_, dateStr) => setPaymentDate(typeof dateStr === 'string' ? dateStr : paymentDate)}
                  style={{ width: 140 }}
                />
                <Select
                  value={paymentMode}
                  onChange={setPaymentMode}
                  style={{ width: 120 }}
                  options={[
                    { label: 'UPI', value: 'upi' },
                    { label: 'RTGS', value: 'rtgs' },
                    { label: 'Cash', value: 'cash' },
                    { label: 'Cheque', value: 'cheque' },
                  ]}
                />
                <Input placeholder="Reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} style={{ width: 140 }} />
                <Button type="primary" loading={paymentPending} onClick={() => handleAddPayment(editingSwo)}>
                  Add Payment
                </Button>
              </Flex>
            </Card>
          )}

          <Form.Item label="Work Order File">
            <Upload.Dragger
              beforeUpload={handleUpload}
              maxCount={1}
              accept=".pdf,.xls,.xlsx,.doc,.docx"
              showUploadList={false}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">Click or drag file to this area to upload</p>
              <p className="ant-upload-hint">Support for PDF, Excel, Word documents.</p>
            </Upload.Dragger>
            {uploadedFile && (
              <Flex align="center" gap={8} className="mt-2">
                {getFileIcon(uploadedFile.workorderKey)}
                <Typography.Text>{uploadedFile.workorderKey}</Typography.Text>
                <Button
                  type="link"
                  size="small"
                  icon={<FilePdfOutlined />}
                  href={`${getApiOrigin()}${uploadedFile.workorderUrl}`}
                  target="_blank"
                >
                  View
                </Button>
                <Button
                  type="link"
                  size="small"
                  icon={<DownloadOutlined />}
                  href={`${getApiOrigin()}${uploadedFile.workorderUrl}`}
                  target="_blank"
                  download
                >
                  Download
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger
                  onClick={() => setUploadedFile(null)}
                >
                  Remove
                </Button>
              </Flex>
            )}
          </Form.Item>

          <Flex gap={16}>
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <Form.Item label="Start Date" className="flex-1">
                  <DatePicker {...field} style={{ width: '100%' }} />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="endDate"
              render={({ field }) => (
                <Form.Item label="End Date" className="flex-1">
                  <DatePicker {...field} style={{ width: '100%' }} />
                </Form.Item>
              )}
            />
          </Flex>

          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <Form.Item label="Notes">
                <Input.TextArea {...field} rows={4} placeholder="Execution terms, special instructions, etc." />
              </Form.Item>
            )}
          />
        </Form>
      </Drawer>

      {/* PDF Preview Modal */}
      <Modal
        title={`Subcontract Work Order Preview — ${previewSwo?.woNumber}`}
        open={!!previewSwo}
        onCancel={() => setPreviewSwo(null)}
        width="90%"
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={() => setPreviewSwo(null)}>Close</Button>,
          previewSwo && (
            <PDFDownloadLink
              key="download"
              document={<SubcontractWorkOrderPdf workOrder={previewSwo} />}
              fileName={`${previewSwo.woNumber}.pdf`}
            >
              <Button type="primary" icon={<FilePdfOutlined />}>
                Download PDF
              </Button>
            </PDFDownloadLink>
          )
        ]}
      >
        <div style={{ height: '75vh', width: '100%', backgroundColor: '#f0f2f5' }}>
          {previewSwo && (
            <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: 'none' }}>
              <SubcontractWorkOrderPdf workOrder={previewSwo} />
            </PDFViewer>
          )}
        </div>
      </Modal>

      <Modal
        title={historySwo ? `Payment History — ${historySwo.woNumber}` : 'Payment History'}
        open={historyOpen}
        onCancel={() => { setHistoryOpen(false); setHistorySwo(null); setHistoryPayments([]); }}
        footer={null}
      >
        <Table
          dataSource={historyPayments}
          rowKey="id"
          size="small"
          loading={historyLoading}
          pagination={false}
          locale={{ emptyText: 'No payments recorded yet' }}
          columns={[
            { title: 'Date', dataIndex: 'paymentDate', render: formatDate },
            { title: 'Amount', dataIndex: 'amount', align: 'right', render: (v: number | string) => formatCurrency(v) },
            { title: 'Mode', dataIndex: 'paymentMode', render: (v: string) => v?.toUpperCase() },
            { title: 'Reference', dataIndex: 'referenceNumber', render: (v?: string | null) => v || '-' },
          ]}
        />
      </Modal>
    </div>
  );
}
