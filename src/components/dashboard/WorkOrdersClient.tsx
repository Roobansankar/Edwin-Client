'use client';

import { useEffect, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Drawer, Flex, Form, Input, Modal, Popconfirm, Select, Space, Table, Typography, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, FilePdfOutlined, PlusOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { createWorkOrder, deleteWorkOrder, updateWorkOrder, updateWorkOrderStatus } from '@/actions/workorders';
import type { Project, Vendor, WorkOrder } from '@/types/erp';
import { LineItemsEditor } from './LineItemsEditor';
import { WorkOrderPdf } from './WorkOrderPdf';
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

const itemSchema = z.object({
  description: z.string().min(2, 'Enter an item description'),
  quantity: z.number().positive('Qty must be greater than zero'),
  unit: z.string().min(1, 'Unit is required'),
  rate: z.number().nonnegative('Rate cannot be negative'),
});

const workOrderSchema = z.object({
  vendorId: z.string().min(1, 'Select a vendor'),
  projectId: z.string().min(1, 'Select a project'),
  terms: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one line item'),
});

type WorkOrderFormValues = z.infer<typeof workOrderSchema>;

type WorkOrdersClientProps = {
  workOrders: WorkOrder[];
  projects: Project[];
  vendors: Vendor[];
};

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Admin Approved', value: 'admin_approved' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export function WorkOrdersClient({ workOrders, projects, vendors }: WorkOrdersClientProps) {
  const [open, setOpen] = useState(false);
  const [editingWo, setEditingWo] = useState<WorkOrder | null>(null);
  const [previewWo, setPreviewWo] = useState<WorkOrder | null>(null);
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
    setValue,
    formState: { errors },
  } = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      vendorId: '',
      projectId: '',
      terms: '',
      items: [{ description: '', quantity: 1, unit: 'nos', rate: 0 }],
    },
  });

  useEffect(() => {
    if (editingWo) {
      setValue('vendorId', editingWo.vendorId);
      setValue('projectId', editingWo.projectId);
      setValue('terms', editingWo.terms || '');
      setValue('items', editingWo.items?.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate)
      })) || []);
    } else {
      reset({
        vendorId: '',
        projectId: '',
        terms: '',
        items: [{ description: '', quantity: 1, unit: 'nos', rate: 0 }],
      });
    }
  }, [editingWo, setValue, reset]);

  const handleEdit = (wo: WorkOrder) => {
    setEditingWo(wo);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteWorkOrder(id);
        message.success('Work order deleted successfully');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to delete work order');
      }
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      try {
        await updateWorkOrderStatus(id, status);
        message.success('Status updated');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to update status');
      }
    });
  };

  const columns: ColumnsType<WorkOrder> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 60,
      render: (_text, _record, index) => index + 1,
    },
    {
      title: 'WO Number',
      dataIndex: 'woNumber',
      sorter: (a, b) => a.woNumber.localeCompare(b.woNumber),
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Vendor',
      dataIndex: ['vendor', 'name'],
      sorter: (a, b) => (a.vendor?.name || '').localeCompare(b.vendor?.name || ''),
      render: (_value, record) => record.vendor?.name || '-',
    },
    {
      title: 'Project',
      dataIndex: ['project', 'name'],
      sorter: (a, b) => (a.project?.name || '').localeCompare(b.project?.name || ''),
      render: (_value, record) => record.project?.name || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 140,
      filters: STATUS_OPTIONS.map(opt => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.status === value,
      render: (value: string, record) => (
        <Select
          defaultValue={value}
          size="small"
          variant="borderless"
          className="w-full"
          onChange={(newStatus) => handleStatusChange(record.id, newStatus)}
          options={STATUS_OPTIONS}
          popupMatchSelectWidth={false}
          styles={{ popup: { root: { minWidth: 120 } } }}
          disabled={isPending}
        />
      ),
    },
    {
      title: 'Items',
      dataIndex: 'items',
      width: 80,
      render: (items: WorkOrder['items']) => items?.length || 0,
      sorter: (a, b) => (a.items?.length || 0) - (b.items?.length || 0),
    },
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      align: 'right',
      sorter: (a, b) => Number(a.totalAmount) - Number(b.totalAmount),
      render: (value: number | string, record) => (
        <Flex vertical gap={0} className="items-end">
          <Typography.Text>{formatCurrency(value)}</Typography.Text>
          <Typography.Text type="secondary" className={`${secondaryTextClassName} text-xs`}>
            GST {formatCurrency(record.gstAmount)}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
      render: formatDate,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 130,
      render: (_, record) => (
        <Space>
          {isClient && (
            <Button
              type="text"
              icon={<FilePdfOutlined className="text-red-500" />}
              title="Preview PDF"
              onClick={() => setPreviewWo(record)}
            />
          )}
          <Button
            type="text"
            icon={<EditOutlined className="text-sky-500" />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete Work Order"
            description="Are you sure you want to delete this work order?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true, loading: isPending }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const submit = (values: WorkOrderFormValues) => {
    startTransition(async () => {
      try {
        if (editingWo) {
          await updateWorkOrder(editingWo.id, values);
          message.success('Work order updated successfully');
        } else {
          await createWorkOrder(values);
          message.success('Work order created successfully');
        }
        setOpen(false);
        setEditingWo(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to save work order');
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    setEditingWo(null);
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <ShoppingCartOutlined className={titleIconClassName} /> Work Orders
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Create Work Order
        </Button>
      </Flex>

      <Card className={cardClassName}>
        <Table
          dataSource={workOrders}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} work orders` }}
        />
      </Card>

      <Drawer
        title={editingWo ? 'Edit Work Order' : 'Create Work Order'}
        size="large"
        open={open}
        onClose={handleClose}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(submit)}>
              {editingWo ? 'Update' : 'Save'}
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" onFinish={handleSubmit(submit)}>
          <Controller
            control={control}
            name="vendorId"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Vendor"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Select
                  {...field}
                  showSearch
                  placeholder="Select vendor"
                  optionFilterProp="label"
                  options={vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))}
                />
              </Form.Item>
            )}
          />
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
          <Controller
            control={control}
            name="terms"
            render={({ field }) => (
              <Form.Item label="Terms">
                <Input.TextArea {...field} rows={3} placeholder="Commercial terms, execution notes, payment schedule..." />
              </Form.Item>
            )}
          />
          <LineItemsEditor control={control} name="items" />
          {errors.items?.message && (
            <Typography.Text type="danger" className="mt-2 block">
              {errors.items.message}
            </Typography.Text>
          )}
        </Form>
      </Drawer>

      {/* PDF Preview Modal */}
      <Modal
        title={`Work Order Preview — ${previewWo?.woNumber}`}
        open={!!previewWo}
        onCancel={() => setPreviewWo(null)}
        width="90%"
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={() => setPreviewWo(null)}>Close</Button>,
          previewWo && (
            <PDFDownloadLink
              key="download"
              document={<WorkOrderPdf workOrder={previewWo} />}
              fileName={`${previewWo.woNumber}.pdf`}
            >
              <Button type="primary" icon={<FilePdfOutlined />}>
                Download PDF
              </Button>
            </PDFDownloadLink>
          )
        ]}
      >
        <div style={{ height: '75vh', width: '100%', backgroundColor: '#f0f2f5' }}>
          {previewWo && (
            <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: 'none' }}>
              <WorkOrderPdf workOrder={previewWo} />
            </PDFViewer>
          )}
        </div>
      </Modal>
    </div>
  );
}
