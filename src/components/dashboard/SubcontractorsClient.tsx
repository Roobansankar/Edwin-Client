'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Divider, Drawer, Flex, Form, Input, Popconfirm, Space, Table, Typography, App, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, TeamOutlined, CloseOutlined } from '@ant-design/icons';
import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { createSubcontractor, deleteSubcontractor, updateSubcontractor } from '@/actions/subcontractors';
import { createWorkCategory, deleteWorkCategory } from '@/actions/work-categories';
import type { Subcontractor, WorkCategory } from '@/types/erp';
import {
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

const subcontractorSchema = z.object({
  name: z.string().min(2, 'Subcontractor name is required'),
  gstNumber: z.string().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
  workCategoryId: z.string().min(1, 'Work category is required'),
});

type SubcontractorFormValues = z.infer<typeof subcontractorSchema>;

type SubcontractorsClientProps = {
  subcontractors: Subcontractor[];
  workCategories: WorkCategory[];
};

export function SubcontractorsClient({ subcontractors, workCategories }: SubcontractorsClientProps) {
  const [open, setOpen] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const router = useRouter();

  // For adding new category
  const [newCategoryName, setNewCategoryName] = useState('');
  const inputRef = useRef<any>(null);
  const [localWorkCategories, setLocalWorkCategories] = useState<WorkCategory[]>(workCategories);

  const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewCategoryName(event.target.value);
  };

  const addItem = async (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
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

  const {
    control,
    handleSubmit,
    reset,
    setValue,
  } = useForm<SubcontractorFormValues>({
    resolver: zodResolver(subcontractorSchema),
    defaultValues: {
      name: '',
      gstNumber: '',
      address: '',
      contactPerson: '',
      email: '',
      phone: '',
      notes: '',
      workCategoryId: '',
    },
  });

  useEffect(() => {
    if (editingSubcontractor) {
      setValue('name', editingSubcontractor.name);
      setValue('gstNumber', editingSubcontractor.gstNumber || '');
      setValue('address', editingSubcontractor.address || '');
      setValue('contactPerson', editingSubcontractor.contactPerson || '');
      setValue('email', editingSubcontractor.email || '');
      setValue('phone', editingSubcontractor.phone || '');
      setValue('notes', editingSubcontractor.notes || '');
      setValue('workCategoryId', editingSubcontractor.workCategory?.id || '');
    } else {
      reset({
        name: '',
        gstNumber: '',
        address: '',
        contactPerson: '',
        email: '',
        phone: '',
        notes: '',
        workCategoryId: '',
      });
    }
  }, [editingSubcontractor, setValue, reset]);

  const handleEdit = (subcontractor: Subcontractor) => {
    setEditingSubcontractor(subcontractor);
    setOpen(true);
  };

  

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteSubcontractor(id);
        message.success('Subcontractor deleted successfully');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to delete subcontractor');
      }
    });
  };

  const columns: ColumnsType<Subcontractor> = [
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
      title: 'Work Category',
      dataIndex: ['workCategory', 'name'],
      render: (value: string) => value || '-',
      filters: workCategories.map(c => ({ text: c.name, value: c.id })),
      onFilter: (value, record) => record.workCategory?.id === value,
    },
    {
      title: 'GST Number',
      dataIndex: 'gstNumber',
      render: (value) => value || '-',
    },
    {
      title: 'Contact Person',
      dataIndex: 'contactPerson',
      render: (value) => value || '-',
    },
    {
      title: 'Contact Details',
      key: 'contact',
      render: (_, record) => (
        <Flex vertical gap={0}>
          {record.email && <Typography.Text className="text-xs">{record.email}</Typography.Text>}
          {record.phone && <Typography.Text type="secondary" className="text-xs">{record.phone}</Typography.Text>}
          {!record.email && !record.phone && '-'}
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
      width: 140,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined className="text-emerald-500" />}
            title="View History"
            onClick={() => router.push(`/dashboard/subcontractors/${record.id}`)}
          />
          <Button
            type="text"
            icon={<EditOutlined className="text-sky-500" />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete Subcontractor"
            description="Are you sure you want to delete this subcontractor?"
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

  const submit = (values: SubcontractorFormValues) => {
    startTransition(async () => {
      try {
        if (editingSubcontractor) {
          await updateSubcontractor(editingSubcontractor.id, values);
          message.success('Subcontractor updated successfully');
        } else {
          await createSubcontractor(values);
          message.success('Subcontractor created successfully');
        }
        setOpen(false);
        setEditingSubcontractor(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to save subcontractor');
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    setEditingSubcontractor(null);
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <TeamOutlined className={titleIconClassName} /> Subcontractor Master
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Subcontractor
        </Button>
      </Flex>

      <Card
        className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!"
        styles={{ body: { padding: '8px 0' } }}
      >
        <Table
          className="mantis-table"
          dataSource={subcontractors}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} subcontractors` }}
        />
      </Card>

      <Drawer
        title={editingSubcontractor ? 'Edit Subcontractor' : 'Add Subcontractor'}
        size="large"
        open={open}
        onClose={handleClose}
        destroyOnClose
        styles={{ header: { flexWrap: 'wrap', rowGap: 8 } }}
        extra={
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(submit)}>
              {editingSubcontractor ? 'Update' : 'Save'}
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
                label="Subcontractor Name"
                required
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input {...field} placeholder="Legal company name" />
              </Form.Item>
            )}
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
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
                    placeholder="Select category"
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <Divider style={{ margin: '8px 0' }} />
                        <Space style={{ padding: '0 8px 4px' }}>
                          <Input
                            placeholder="New category"
                            ref={inputRef}
                            value={newCategoryName}
                            onChange={onNameChange}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                          <Button type="text" icon={<PlusOutlined />} onClick={addItem}>
                            Add
                          </Button>
                        </Space>
                      </>
                    )}
                    optionRender={(option) => (
                      <Flex justify="space-between" align="center">
                        <span>{option.label}</span>
                        <CloseOutlined
                          className="text-red-500 cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); removeCategory(String(option.value)); }}
                        />
                      </Flex>
                    )}
                    options={localWorkCategories.map(c => ({ label: c.name, value: c.id }))}
                  />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="gstNumber"
              render={({ field }) => (
                <Form.Item label="GST Number" className="flex-1">
                  <Input {...field} placeholder="GSTIN" />
                </Form.Item>
              )}
            />
          </div>

          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <Form.Item label="Address">
                <Input.TextArea {...field} rows={3} placeholder="Address..." />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="contactPerson"
            render={({ field }) => (
              <Form.Item label="Contact Person">
                <Input {...field} placeholder="Name of contact person" />
              </Form.Item>
            )}
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
            <Controller
              control={control}
              name="email"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Email"
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Input {...field} placeholder="email@subcontractor.com" />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <Form.Item label="Phone" className="flex-1">
                  <Input {...field} placeholder="+91..." />
                </Form.Item>
              )}
            />
          </div>

          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <Form.Item label="Notes">
                <Input.TextArea {...field} rows={4} placeholder="Internal notes about the subcontractor..." />
              </Form.Item>
            )}
          />
        </Form>
      </Drawer>
    </div>
  );
}
