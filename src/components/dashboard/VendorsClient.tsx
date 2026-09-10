'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Descriptions, Drawer, Flex, Form, Input, Popconfirm, Space, Table, Typography, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { createVendor, deleteVendor, updateVendor } from '@/actions/vendors';
import type { Vendor } from '@/types/erp';
import {
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

const vendorSchema = z.object({
  name: z.string().min(2, 'Vendor name is required'),
  gstNumber: z.string().optional(),
  address: z.string().optional(),
  state: z.string().optional(),
  contactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

type VendorsClientProps = {
  vendors: Vendor[];
};

export function VendorsClient({ vendors }: VendorsClientProps) {
  const [open, setOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();

  const filteredVendors = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) => v.name.toLowerCase().includes(q));
  }, [vendors, searchText]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '',
      gstNumber: '',
      address: '',
      state: '',
      contactEmail: '',
      contactPhone: '',
    },
  });

  // Reset form when editingVendor changes
  useEffect(() => {
    if (editingVendor) {
      setValue('name', editingVendor.name);
      setValue('gstNumber', editingVendor.gstNumber || '');
      setValue('address', editingVendor.address || '');
      setValue('state', editingVendor.state || '');
      setValue('contactEmail', editingVendor.contactEmail || '');
      setValue('contactPhone', editingVendor.contactPhone || '');
    } else {
      reset({
        name: '',
        gstNumber: '',
        address: '',
        state: '',
        contactEmail: '',
        contactPhone: '',
      });
    }
  }, [editingVendor, setValue, reset]);

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setOpen(true);
  };

  const handleView = (vendor: Vendor) => {
    setViewingVendor(vendor);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteVendor(id);
        message.success('Vendor deleted successfully');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to delete vendor');
      }
    });
  };

  const columns: ColumnsType<Vendor> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 80,
      render: (_text, _record, index) => index + 1,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'GST Number',
      dataIndex: 'gstNumber',
      render: (value) => value || '-',
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <Flex vertical gap={0}>
          {record.contactEmail && <Typography.Text className="text-xs">{record.contactEmail}</Typography.Text>}
          {record.contactPhone && <Typography.Text type="secondary" className="text-xs">{record.contactPhone}</Typography.Text>}
          {!record.contactEmail && !record.contactPhone && '-'}
        </Flex>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      width: 120,
      sorter: (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
      render: formatDate,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined className="text-emerald-500" />}
            title="View Details"
            onClick={() => handleView(record)}
          />
          <Button
            type="text"
            icon={<EditOutlined className="text-sky-500" />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete Vendor"
            description="Are you sure you want to delete this vendor?"
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

  const submit = (values: VendorFormValues) => {
    startTransition(async () => {
      try {
        if (editingVendor) {
          await updateVendor(editingVendor.id, values);
          message.success('Vendor updated successfully');
        } else {
          await createVendor(values);
          message.success('Vendor created successfully');
        }
        setOpen(false);
        setEditingVendor(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to save vendor');
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    setEditingVendor(null);
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <TeamOutlined className={titleIconClassName} /> Vendors
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Vendor
        </Button>
      </Flex>

      <Flex gap={12} wrap="wrap" className="mb-4!">
        <Input.Search
          placeholder="Search by vendor name..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
          style={{ width: 260 }}
        />
      </Flex>

      <Card
        className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!"
        styles={{ body: { padding: '8px 0' } }}
      >
        <Table
          className="mantis-table"
          dataSource={filteredVendors}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 800 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} vendors` }}
        />
      </Card>

      <Drawer
        title="Vendor Details"
        size="large"
        open={!!viewingVendor}
        onClose={() => setViewingVendor(null)}
        destroyOnClose
      >
        {viewingVendor && (
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="Vendor Name">
              <Typography.Text strong>{viewingVendor.name}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="GST Number">{viewingVendor.gstNumber || '-'}</Descriptions.Item>
            <Descriptions.Item label="State">{viewingVendor.state || '-'}</Descriptions.Item>
            <Descriptions.Item label="Address" styles={{ content: { whiteSpace: 'pre-wrap' } }}>
              {viewingVendor.address || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Contact Email">{viewingVendor.contactEmail || '-'}</Descriptions.Item>
            <Descriptions.Item label="Contact Phone">{viewingVendor.contactPhone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Created">{formatDate(viewingVendor.createdAt)}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Drawer
        title={editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
        size="large"
        open={open}
        onClose={handleClose}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(submit)}>
              {editingVendor ? 'Update Vendor' : 'Save Vendor'}
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" onFinish={handleSubmit(submit)}>
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Vendor Name"
                required
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input {...field} placeholder="Legal company name" />
              </Form.Item>
            )}
          />

          <Flex gap={16}>
            <Controller
              control={control}
              name="gstNumber"
              render={({ field }) => (
                <Form.Item label="GST Number" className="flex-1">
                  <Input {...field} placeholder="GSTIN" />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="state"
              render={({ field }) => (
                <Form.Item label="State" className="flex-1">
                  <Input {...field} placeholder="e.g. Tamil Nadu" />
                </Form.Item>
              )}
            />
          </Flex>

          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <Form.Item label="Address">
                <Input.TextArea {...field} rows={3} placeholder="Registered office address..." />
              </Form.Item>
            )}
          />

          <Flex gap={16}>
            <Controller
              control={control}
              name="contactEmail"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Contact Email"
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Input {...field} placeholder="email@vendor.com" />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="contactPhone"
              render={({ field }) => (
                <Form.Item label="Contact Phone" className="flex-1">
                  <Input {...field} placeholder="+91..." />
                </Form.Item>
              )}
            />
          </Flex>
        </Form>
      </Drawer>
    </div>
  );
}
