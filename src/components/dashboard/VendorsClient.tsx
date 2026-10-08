'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Descriptions, Divider, Drawer, Flex, Form, Input, List, Modal, Popconfirm, Select, Space, Table, Typography, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { createVendor, deleteVendor, updateVendor } from '@/actions/vendors';
import { createVendorCategory, deleteVendorCategory } from '@/actions/vendor-categories';
import type { Vendor, VendorCategory } from '@/types/erp';
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
  category: z.string().optional(),
  bankName: z.string().optional(),
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  branch: z.string().optional(),
  paymentTerms: z.string().optional(),
});

// Same choices as Purchase Enquiry.
const PAYMENT_TERMS_OPTIONS = [
  { label: 'Advance', value: 'advance' },
  { label: 'Credit', value: 'credit' },
  { label: 'Full Payment', value: 'full_payment' },
];
const PAYMENT_TERMS_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_TERMS_OPTIONS.map((o) => [o.value, o.label]),
);

type VendorFormValues = z.infer<typeof vendorSchema>;

type VendorsClientProps = {
  vendors: Vendor[];
  categories: VendorCategory[];
};

export function VendorsClient({ vendors, categories }: VendorsClientProps) {
  const [open, setOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [manageOpen, setManageOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [dropdownNewCat, setDropdownNewCat] = useState('');
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const router = useRouter();

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => {
      if (c.name?.trim()) set.add(c.name.trim());
    });
    // Legacy free-text values already saved on vendors still show up
    vendors.forEach((v) => {
      if (v.category?.trim()) set.add(v.category.trim());
    });
    return Array.from(set).sort();
  }, [vendors, categories]);

  const filteredVendors = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return vendors.filter((v) => {
      if (categoryFilter !== 'ALL' && (v.category?.trim() || '') !== categoryFilter) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        (v.category || '').toLowerCase().includes(q)
      );
    });
  }, [vendors, searchText, categoryFilter]);

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
      category: '',
      bankName: '',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      branch: '',
      paymentTerms: '',
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
      setValue('category', editingVendor.category || '');
      setValue('bankName', editingVendor.bankName || '');
      setValue('accountHolderName', editingVendor.accountHolderName || '');
      setValue('accountNumber', editingVendor.accountNumber || '');
      setValue('ifscCode', editingVendor.ifscCode || '');
      setValue('branch', editingVendor.branch || '');
      setValue('paymentTerms', editingVendor.paymentTerms || '');
    } else {
      reset({
        name: '',
        gstNumber: '',
        address: '',
        state: '',
        contactEmail: '',
        contactPhone: '',
        category: '',
        bankName: '',
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
        paymentTerms: '',
      });
    }
  }, [editingVendor, setValue, reset]);

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setOpen(true);
  };

  const handleView = (vendor: Vendor) => {
    router.push(`/dashboard/vendors/${vendor.id}`);
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
      width: 200,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      width: 150,
      render: (value) => value || '-',
    },
    {
      title: 'GST Number',
      dataIndex: 'gstNumber',
      width: 170,
      render: (value) => value || '-',
    },
    {
      title: 'Payment Terms',
      dataIndex: 'paymentTerms',
      width: 140,
      render: (value?: string | null) => (value ? PAYMENT_TERMS_LABELS[value] || value : '-'),
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 260,
      render: (_, record) => (
        <Flex vertical gap={0} style={{ whiteSpace: 'normal', wordBreak: 'break-all' }}>
          {record.contactEmail && <Typography.Text className="text-xs">{record.contactEmail}</Typography.Text>}
          {record.contactPhone && <Typography.Text type="secondary" className="text-xs">{record.contactPhone}</Typography.Text>}
          {!record.contactEmail && !record.contactPhone && '-'}
        </Flex>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      width: 140,
      sorter: (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
      render: formatDate,
    },
    {
      title: 'Actions',
      key: 'actions',
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

  const submit = (formValues: VendorFormValues) => {
    // Cleared payment terms are saved as null, not an empty string.
    const values = { ...formValues, paymentTerms: formValues.paymentTerms || null };
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

  const handleAddCategory = () => {
    const name = newCategory.trim();
    if (!name) {
      message.error('Please type a category name');
      return;
    }
    startTransition(async () => {
      try {
        await createVendorCategory(name);
        message.success('Category added');
        setNewCategory('');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to add category');
      }
    });
  };

  const handleDeleteCategory = (id: string) => {
    startTransition(async () => {
      try {
        await deleteVendorCategory(id);
        message.success('Category deleted');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to delete category');
      }
    });
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <TeamOutlined className={titleIconClassName} /> Vendors
        </Typography.Title>
        <Space>
          <Button onClick={() => setManageOpen(true)}>
            Manage Categories
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Add Vendor
          </Button>
        </Space>
      </Flex>

      <Flex gap={12} wrap="wrap" className="mb-4!">
        <Input.Search
          placeholder="Search by vendor name or category..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
          style={{ width: 260 }}
        />
        <Select
          value={categoryFilter}
          onChange={setCategoryFilter}
          style={{ width: 200 }}
          options={[
            { value: 'ALL', label: 'All Categories' },
            ...categoryOptions.map((c) => ({ value: c, label: c })),
          ]}
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
          scroll={{ x: 1300 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} vendors` }}
        />
      </Card>

      <Drawer
        title="Vendor Details"
        size="large"
        open={!!viewingVendor}
        onClose={() => setViewingVendor(null)}
        destroyOnHidden
      >
        {viewingVendor && (
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="Vendor Name">
              <Typography.Text strong>{viewingVendor.name}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="GST Number">{viewingVendor.gstNumber || '-'}</Descriptions.Item>
            <Descriptions.Item label="Category">{viewingVendor.category || '-'}</Descriptions.Item>
            <Descriptions.Item label="Payment Terms">
              {viewingVendor.paymentTerms ? PAYMENT_TERMS_LABELS[viewingVendor.paymentTerms] || viewingVendor.paymentTerms : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="State">{viewingVendor.state || '-'}</Descriptions.Item>
            <Descriptions.Item label="Address" styles={{ content: { whiteSpace: 'pre-wrap' } }}>
              {viewingVendor.address || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Contact Email">{viewingVendor.contactEmail || '-'}</Descriptions.Item>
            <Descriptions.Item label="Contact Phone">{viewingVendor.contactPhone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Created">{formatDate(viewingVendor.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Bank Name">{viewingVendor.bankName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Account Holder">{viewingVendor.accountHolderName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Account Number">{viewingVendor.accountNumber || '-'}</Descriptions.Item>
            <Descriptions.Item label="IFSC Code">{viewingVendor.ifscCode || '-'}</Descriptions.Item>
            <Descriptions.Item label="Branch">{viewingVendor.branch || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal
        title="Manage Vendor Categories"
        open={manageOpen}
        onCancel={() => { setManageOpen(false); setNewCategory(''); }}
        footer={null}
        destroyOnHidden
      >
        <Flex gap={8} className="mb-4!">
          <Input
            placeholder="New category name (e.g. Cement)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onPressEnter={handleAddCategory}
            maxLength={100}
          />
          <Button type="primary" loading={isPending} onClick={handleAddCategory}>
            Add
          </Button>
        </Flex>
        <List
          dataSource={categories}
          rowKey="id"
          locale={{ emptyText: 'No categories yet — add one above' }}
          renderItem={(cat) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="delete"
                  title="Delete category?"
                  description="Vendors already using it keep their value as plain text."
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ danger: true, loading: isPending }}
                  onConfirm={() => handleDeleteCategory(cat.id)}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <Typography.Text>{cat.name}</Typography.Text>
            </List.Item>
          )}
        />
      </Modal>

      <Drawer
        title={editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
        size="large"
        open={open}
        onClose={handleClose}
        destroyOnHidden
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
            name="category"
            render={({ field }) => (
              <Form.Item label="Vendor Category">
                <Select
                  {...field}
                  placeholder="Select or add a category"
                  allowClear
                  options={categoryOptions.map((c) => ({ value: c, label: c }))}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space style={{ padding: '0 8px 4px', width: '100%' }}>
                        <Input
                          placeholder="New category name"
                          value={dropdownNewCat}
                          onChange={(e) => setDropdownNewCat(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          maxLength={100}
                        />
                        <Button
                          type="text"
                          icon={<PlusOutlined />}
                          loading={isPending}
                          onClick={() => {
                            const name = dropdownNewCat.trim();
                            if (!name) {
                              message.error('Please type a category name');
                              return;
                            }
                            startTransition(async () => {
                              try {
                                await createVendorCategory(name);
                                setValue('category', name);
                                setDropdownNewCat('');
                                message.success(`Category "${name}" added`);
                              } catch (error) {
                                message.error(error instanceof Error ? error.message : 'Failed to add category');
                              }
                            });
                          }}
                        >
                          Add
                        </Button>
                      </Space>
                    </>
                  )}
                />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="paymentTerms"
            render={({ field }) => (
              <Form.Item label="Payment Terms">
                <Select
                  {...field}
                  value={field.value || undefined}
                  onChange={(v) => field.onChange(v || '')}
                  allowClear
                  placeholder="Select payment terms"
                  options={PAYMENT_TERMS_OPTIONS}
                />
              </Form.Item>
            )}
          />

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

          <Typography.Title level={5} className="mt-2!">Bank Details</Typography.Title>

          <Flex gap={16}>
            <Controller
              control={control}
              name="bankName"
              render={({ field }) => (
                <Form.Item label="Bank Name" className="flex-1">
                  <Input {...field} placeholder="e.g. HDFC Bank" />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="branch"
              render={({ field }) => (
                <Form.Item label="Branch" className="flex-1">
                  <Input {...field} placeholder="Branch name" />
                </Form.Item>
              )}
            />
          </Flex>

          <Flex gap={16}>
            <Controller
              control={control}
              name="accountHolderName"
              render={({ field }) => (
                <Form.Item label="Account Holder Name" className="flex-1">
                  <Input {...field} placeholder="As per bank records" />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="accountNumber"
              render={({ field }) => (
                <Form.Item label="Account Number" className="flex-1">
                  <Input {...field} placeholder="Account number" />
                </Form.Item>
              )}
            />
          </Flex>

          <Controller
            control={control}
            name="ifscCode"
            render={({ field }) => (
              <Form.Item label="IFSC Code">
                <Input {...field} placeholder="e.g. HDFC0001234" />
              </Form.Item>
            )}
          />
        </Form>
      </Drawer>
    </div>
  );
}
