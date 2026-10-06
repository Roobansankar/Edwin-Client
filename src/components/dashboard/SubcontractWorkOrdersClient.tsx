'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Card,
  Divider,
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
  CloseOutlined,
  SearchOutlined,
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
import { createWorkCategory, deleteWorkCategory } from '@/actions/work-categories';
import { createPayment } from '@/actions/payments';
import type { SubcontractWorkOrder, Project, Subcontractor, WorkCategory, Payment, SubcontractorEnquiry } from '@/types/erp';
import { SubcontractWorkOrderPdf } from './SubcontractWorkOrderPdf';
import {
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';
import { useAuthStore } from '@/store/auth';

const swoSchema = z.object({
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
  subcontractorEnquiries: SubcontractorEnquiry[];
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
  subcontractorEnquiries,
}: SubcontractWorkOrdersClientProps) {
  const [open, setOpen] = useState(false);
  const [editingSwo, setEditingSwo] = useState<SubcontractWorkOrder | null>(null);
  const [previewSwo, setPreviewSwo] = useState<SubcontractWorkOrder | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const isPurchaseTeam = user?.role === 'purchase_team';
  const [localWorkCategories, setLocalWorkCategories] = useState<WorkCategory[]>(workCategories);
  const statusOptions = isPurchaseTeam
    ? STATUS_OPTIONS.filter((opt) => opt.value !== 'admin_approved')
    : STATUS_OPTIONS;

  // Preview of the number the backend will actually assign on save - mirrors
  // generateWoNumber() in subcontract-work-orders.service.ts (same prefix,
  // same year-scoped sequence). The server has the final say at save time;
  // this is just so the form doesn't show a placeholder in the meantime.
  const nextWoNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const prefix = `SWO-${year}-`;
    let maxSeq = 0;
    for (const wo of workOrders) {
      if (!wo.woNumber?.startsWith(prefix)) continue;
      const seq = parseInt(wo.woNumber.slice(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
  }, [workOrders]);

  // Which approved subcontractor enquiries have already been turned into a
  // WO (keyed by scrNo + subcontractorId, since one enquiry group can hold
  // several subcontractors' quotes - converting one shouldn't hide the rest).
  const usedEnquiryKeys = useMemo(
    () => new Set(workOrders.filter((wo) => wo.scrNo).map((wo) => `${wo.scrNo}|${wo.subcontractorId}`)),
    [workOrders],
  );
  const approvedEnquiryOptions = useMemo(
    () => subcontractorEnquiries.filter((e) => e.status === 'approved' && !usedEnquiryKeys.has(`${e.scrNo}|${e.subcontractorId}`)),
    [subcontractorEnquiries, usedEnquiryKeys],
  );
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null);
  const selectedEnquiry = useMemo(
    () => approvedEnquiryOptions.find((e) => e.id === selectedEnquiryId) || null,
    [approvedEnquiryOptions, selectedEnquiryId],
  );

  const filteredWorkOrders = useMemo(() => {
    if (!searchText) return workOrders;
    const q = searchText.toLowerCase();
    return workOrders.filter((wo) => {
      const haystack = [
        wo.woNumber,
        wo.project?.name,
        wo.project?.projectCode,
        wo.subcontractor?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [workOrders, searchText]);

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
  const [newCategoryName, setNewCategoryName] = useState('');
  const inputRef = useRef<any>(null);

  const onCategoryNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewCategoryName(event.target.value);
  };

  const addCategory = async (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const name = newCategoryName.trim();
    setNewCategoryName('');
    try {
      const created = await createWorkCategory({ name });
      setLocalWorkCategories((prev) => [...prev, { id: created.id, name: created.name }].sort((a, b) => a.name.localeCompare(b.name)));
      message.success('Category added');
      setTimeout(() => { inputRef.current?.focus(); }, 0);
    } catch (error) {
      setNewCategoryName(name);
      message.error(error instanceof Error ? error.message : 'Failed to add category');
    }
  };

  const removeCategory = async (id: string) => {
    try {
      await deleteWorkCategory(id);
      setLocalWorkCategories((prev) => prev.filter((c) => c.id !== id));
      message.success('Category deleted');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to delete category');
    }
  };
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
      setSelectedEnquiryId(null);
    }
  }, [editingSwo, setValue, reset]);

  // Picking an approved Subcontractor Enquiry autofills the project,
  // subcontractor, category, amount, GST and time period from that quote -
  // same "pick an approved quote" pattern Purchase Orders uses for Vendor
  // Quotations. Fields stay editable afterward if adjustment is needed.
  const handleEnquirySelect = (enquiryId: string) => {
    setSelectedEnquiryId(enquiryId);
    const enquiry = approvedEnquiryOptions.find((e) => e.id === enquiryId);
    if (!enquiry) return;
    setValue('projectId', enquiry.projectId);
    setValue('subcontractorId', enquiry.subcontractorId);
    setValue('workCategoryId', enquiry.workCategoryId);
    setValue('amount', Number(enquiry.totalAmount) || 0);
    setValue('gstPercentage', Number(enquiry.gstPercent) || 0);
    setValue('startDate', enquiry.startDate ? dayjs(enquiry.startDate) : undefined);
    setValue('endDate', enquiry.endDate ? dayjs(enquiry.endDate) : undefined);
  };

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
      title: 'SCR No',
      dataIndex: 'scrNo',
      key: 'scrNo',
      width: 130,
      render: (value?: string | null) => value || <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'WO No',
      dataIndex: 'woNumber',
      key: 'woNumber',
      width: 140,
      render: (text) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: 'Date (WO Created)',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v?: string) => formatDate(v),
    },
    {
      title: 'Project',
      key: 'project',
      width: 220,
      render: (_, record) => record.project?.projectCode || '-',
    },
    {
      title: 'Subcontractor',
      dataIndex: ['subcontractor', 'name'],
      key: 'subcontractor',
      width: 150,
    },
    {
      title: 'Category',
      dataIndex: ['workCategory', 'name'],
      key: 'category',
      width: 130,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 160,
      ellipsis: true,
      render: (val) => val || '-',
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      width: 130,
      render: (value: number | string) => <Typography.Text strong>{formatCurrency(value)}</Typography.Text>,
    },
    {
      title: 'Work Order',
      key: 'workorder',
      width: 120,
      render: (_, record) =>
        record.workorderUrl ? (
          <Space>
            <Tooltip title="View">
              <Button
                type="link"
                size="small"
                icon={<FilePdfOutlined />}
                href={record.workorderUrl}
                target="_blank"
              />
            </Tooltip>
            <Tooltip title="Download">
              <Button
                type="link"
                size="small"
                icon={<DownloadOutlined />}
                href={record.workorderUrl}
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

        const scrNo = selectedEnquiry?.scrNo || editingSwo?.scrNo;
        if (scrNo) payload.scrNo = scrNo;

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
        setSelectedEnquiryId(null);
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

      <Flex gap={12} wrap="wrap" className="mb-4!">
        <Input.Search
          placeholder="Search WO number, project, subcontractor..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
          style={{ width: 320 }}
        />
      </Flex>

      <Card
        className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!"
        styles={{ body: { padding: '8px 0' } }}
      >
        <Table
          className="mantis-table"
          dataSource={filteredWorkOrders}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1560 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} work orders` }}
        />
      </Card>

      <Drawer
        title={editingSwo ? 'Edit Subcontract WO' : 'New Subcontract WO'}
        size="large"
        open={open}
        onClose={() => setOpen(false)}
        destroyOnClose
        styles={{ header: { flexWrap: 'wrap', rowGap: 8 } }}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(submit)}>
              Save
            </Button>
          </Space>
        }
      >
        <Form layout="vertical">
          <Form.Item label="WO Number">
            <Input
              value={editingSwo ? editingSwo.woNumber : nextWoNumber}
              disabled
            />
          </Form.Item>

          {!editingSwo && approvedEnquiryOptions.length > 0 && (
            <Form.Item label="SCR No" className="mb-6 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <Select
                allowClear
                showSearch
                placeholder="Search SCR No or subcontractor..."
                optionFilterProp="label"
                value={selectedEnquiryId || undefined}
                onChange={(v) => { if (v) handleEnquirySelect(v); else setSelectedEnquiryId(null); }}
                options={approvedEnquiryOptions.map((e) => ({
                  value: e.id,
                  label: `${e.scrNo} — ${e.subcontractor?.name || ''} (${e.project?.name || 'Unknown project'})`,
                })).sort((a, b) => a.label.localeCompare(b.label))}
              />
            </Form.Item>
          )}

          {selectedEnquiry && (
            <Form.Item label="Quotation Reference" className="mb-6">
              <Flex align="center" gap={16} wrap="wrap">
                <Typography.Text>
                  Quoted Total (incl. GST):{' '}
                  <Typography.Text strong>
                    {selectedEnquiry.totalAmount ? formatCurrency(selectedEnquiry.totalWithGst || selectedEnquiry.totalAmount) : 'Not entered'}
                  </Typography.Text>
                </Typography.Text>
                {selectedEnquiry.quotationUrl && (
                  <Button size="small" icon={<FilePdfOutlined />} href={selectedEnquiry.quotationUrl} target="_blank">
                    View Quotation
                  </Button>
                )}
              </Flex>
            </Form.Item>
          )}

          <Controller
            control={control}
            name="projectId"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Project"
                required
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Select
                  {...field}
                  options={projects.map((p) => ({ label: p.projectCode ? `${p.name} (${p.projectCode})` : p.name, value: p.id }))}
                  placeholder="Select Project"
                />
              </Form.Item>
            )}
          />

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
                    options={localWorkCategories.map((c) => ({ label: c.name, value: c.id }))}
                    placeholder="Select Category"
                    optionRender={(option) => (
                      <Flex justify="space-between" align="center">
                        <span>{option.label}</span>
                        <CloseOutlined
                          className="text-red-500 cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); removeCategory(String(option.value)); }}
                        />
                      </Flex>
                    )}
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <Divider style={{ margin: '8px 0' }} />
                        <Space style={{ padding: '0 8px 4px' }}>
                          <Input
                            placeholder="New category"
                            ref={inputRef}
                            value={newCategoryName}
                            onChange={onCategoryNameChange}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                          <Button type="text" icon={<PlusOutlined />} onClick={addCategory}>
                            Add
                          </Button>
                        </Space>
                      </>
                    )}
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
              <Flex align="center" gap={8} className="mt-2!">
                {getFileIcon(uploadedFile.workorderKey)}
                <Typography.Text>{uploadedFile.workorderKey}</Typography.Text>
                <Button
                  type="link"
                  size="small"
                  icon={<FilePdfOutlined />}
                  href={uploadedFile.workorderUrl}
                  target="_blank"
                >
                  View
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
    </div>
  );
}
