'use client';

import { useEffect, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Drawer, Flex, Form, Input, Popconfirm, Space, Table, Typography, App, Select, Switch, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { createSiteEngineer, deleteSiteEngineer, updateSiteEngineer } from '@/actions/site-engineers';
import type { SiteEngineer, Salary } from '@/types/erp';
import {
  cardClassName,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

const siteEngineerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  employeeId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  isActive: z.boolean(),
  salaryGradeId: z.string().optional(),
});

type SiteEngineerFormValues = z.infer<typeof siteEngineerSchema>;

type SiteEngineersClientProps = {
  siteEngineers: SiteEngineer[];
  salaries: Salary[];
};

export function SiteEngineersClient({ siteEngineers, salaries }: SiteEngineersClientProps) {
  const [open, setOpen] = useState(false);
  const [editingEngineer, setEditingEngineer] = useState<SiteEngineer | null>(null);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
  } = useForm<SiteEngineerFormValues>({
    resolver: zodResolver(siteEngineerSchema),
    defaultValues: {
      name: '',
      employeeId: '',
      phone: '',
      email: '',
      address: '',
      username: '',
      password: '',
      isActive: true,
      salaryGradeId: '',
    },
  });

  useEffect(() => {
    if (editingEngineer) {
      setValue('name', editingEngineer.name);
      setValue('employeeId', editingEngineer.employeeId || '');
      setValue('phone', editingEngineer.phone || '');
      setValue('email', editingEngineer.email || '');
      setValue('address', editingEngineer.address || '');
      setValue('username', editingEngineer.username || '');
      setValue('isActive', editingEngineer.isActive);
      setValue('salaryGradeId', editingEngineer.salaryGradeId || '');
      setValue('password', '');
    } else {
      reset({
        name: '',
        employeeId: '',
        phone: '',
        email: '',
        address: '',
        username: '',
        password: '',
        isActive: true,
        salaryGradeId: '',
      });
    }
  }, [editingEngineer, setValue, reset]);

  const handleEdit = (engineer: SiteEngineer) => {
    setEditingEngineer(engineer);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteSiteEngineer(id);
        message.success('Site engineer deactivated successfully');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to deactivate');
      }
    });
  };

  const columns: ColumnsType<SiteEngineer> = [
    {
      title: 'Employee ID',
      dataIndex: 'employeeId',
      key: 'employeeId',
      render: (text) => text || '-',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Contact',
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
      title: 'Username',
      dataIndex: 'username',
      render: (text) => text || '-',
    },
    {
      title: 'Salary Grade',
      key: 'salaryGrade',
      render: (_, record) => (
        record.salaryGrade
          ? <Tag color="cyan">{record.salaryGrade.grades}</Tag>
          : <Typography.Text type="secondary">-</Typography.Text>
      ),
    },
    {
      title: 'Assigned Projects',
      key: 'projects',
      width: 260,
      render: (_, record) => (
        <div className="flex flex-wrap gap-1">
          {record.projects && record.projects.length > 0 ? (
            record.projects.map((p) => (
              <Tag key={p.id} color="blue" className="max-w-[180px] truncate!">{p.name}</Tag>
            ))
          ) : (
            <Typography.Text type="secondary">None</Typography.Text>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined className="text-sky-500" />}
            onClick={() => handleEdit(record)}
          />
          {record.isActive && (
            <Popconfirm
              title="Deactivate Engineer"
              description="Are you sure you want to deactivate this account?"
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
          )}
        </Space>
      ),
    },
  ];

  const submit = (values: SiteEngineerFormValues) => {
    startTransition(async () => {
      try {
        if (editingEngineer) {
          // Only send password if it was entered
          const updateData = { ...values };
          if (!updateData.password) delete updateData.password;
          
          await updateSiteEngineer(editingEngineer.id, updateData);
          message.success('Site engineer updated successfully');
        } else {
          await createSiteEngineer(values);
          message.success('Site engineer created successfully');
        }
        setOpen(false);
        setEditingEngineer(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to save');
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    setEditingEngineer(null);
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <UserOutlined className={titleIconClassName} /> Site Engineers
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Engineer
        </Button>
      </Flex>

      <Card className={cardClassName} styles={{ body: { overflowX: 'auto' } }}>
        <Table
          dataSource={siteEngineers}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} engineers` }}
        />
      </Card>

      <Drawer
        title={editingEngineer ? 'Edit Site Engineer' : 'Add New Site Engineer'}
        size="large"
        open={open}
        onClose={handleClose}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(submit)}>
              {editingEngineer ? 'Update Engineer' : 'Save Engineer'}
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" onFinish={handleSubmit(submit)}>
          <Flex gap={16}>
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Name"
                  required
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Input {...field} placeholder="Engineer's full name" />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="employeeId"
              render={({ field }) => (
                <Form.Item label="Employee ID" className="flex-1">
                  <Input {...field} placeholder="EMP-001" />
                </Form.Item>
              )}
            />
          </Flex>

          <Flex gap={16}>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <Form.Item label="Phone Number" className="flex-1">
                  <Input {...field} placeholder="+91..." />
                </Form.Item>
              )}
            />
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
                  <Input {...field} placeholder="email@company.com" />
                </Form.Item>
              )}
            />
          </Flex>

          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <Form.Item label="Address">
                <Input.TextArea {...field} rows={3} placeholder="Full address" />
              </Form.Item>
            )}
          />

          <Typography.Title level={5} className="mt-4 mb-2 border-b border-[var(--border)] pb-2">Login Credentials</Typography.Title>
          
          <Flex gap={16}>
            <Controller
              control={control}
              name="username"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Username"
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Input {...field} placeholder="login_username" />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field, fieldState }) => (
                <Form.Item
                  label={editingEngineer ? "New Password (Optional)" : "Password"}
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                  extra={!editingEngineer && "Default password will be '8220' if left blank"}
                >
                  <Input.Password {...field} placeholder="********" />
                </Form.Item>
              )}
            />
          </Flex>

          <Typography.Title level={5} className="mt-4 mb-2 border-b border-[var(--border)] pb-2">Assignments</Typography.Title>

          <Controller
            control={control}
            name="salaryGradeId"
            render={({ field }) => (
              <Form.Item label="Salary Grade">
                <Select
                  {...field}
                  placeholder="Select salary grade"
                  allowClear
                  options={salaries.map(s => ({ label: `${s.grades} (${s.expInYears} yrs - ₹${Number(s.monthlySalary).toLocaleString()})`, value: s.id }))}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="isActive"
            render={({ field: { value, onChange } }) => (
              <Form.Item label="Account Status" className="mt-4">
                <Space>
                  <Switch checked={value} onChange={onChange} />
                  <Typography.Text>{value ? 'Active' : 'Inactive'}</Typography.Text>
                </Space>
              </Form.Item>
            )}
          />
        </Form>
      </Drawer>
    </div>
  );
}
