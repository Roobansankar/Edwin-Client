'use client';

import { useEffect, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Drawer, Flex, Form, Input, Popconfirm, Space, Table, Typography, App, Select, Switch, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, BankOutlined } from '@ant-design/icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { createAccountsManager, deleteAccountsManager, updateAccountsManager } from '@/actions/accounts-managers';
import type { AccountsManager, Project, Salary } from '@/types/erp';
import {
  cardClassName,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

const accountsManagerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  employeeId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').optional().or(z.literal('')),
  password: z.string().min(4, 'Password must be at least 4 characters').optional().or(z.literal('')),
  isActive: z.boolean(),
  salaryGradeId: z.string().optional(),
});

type AccountsManagerFormValues = z.infer<typeof accountsManagerSchema>;

type AccountsManagersClientProps = {
  accountsManagers: AccountsManager[];
  projects: Project[];
  salaries: Salary[];
};

export function AccountsManagersClient({ accountsManagers, projects, salaries }: AccountsManagersClientProps) {
  const [open, setOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<AccountsManager | null>(null);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();

  const form = useForm<AccountsManagerFormValues>({
    resolver: zodResolver(accountsManagerSchema),
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
    }
  });
  const { control, handleSubmit, reset, setValue } = form;

  useEffect(() => {
    if (editingManager) {
      setValue('name', editingManager.name);
      setValue('employeeId', editingManager.employeeId || '');
      setValue('phone', editingManager.phone || '');
      setValue('email', editingManager.email || '');
      setValue('address', editingManager.address || '');
      setValue('username', editingManager.username || '');
      setValue('isActive', editingManager.isActive);
      setValue('salaryGradeId', editingManager.salaryGradeId || '');
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
  }, [editingManager, setValue, reset]);

  const handleEdit = (manager: AccountsManager) => {
    setEditingManager(manager);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteAccountsManager(id);
        message.success('Accounts manager deleted successfully');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to delete');
      }
    });
  };

  const columns: ColumnsType<AccountsManager> = [
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
          <Popconfirm
            title="Delete Accounts Manager"
            description="Are you sure you want to delete this account?"
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

  const submit = (values: AccountsManagerFormValues) => {
    startTransition(async () => {
      try {
        if (editingManager) {
          const updateData = { ...values };
          if (!updateData.password) delete updateData.password;

          await updateAccountsManager(editingManager.id, updateData);
          message.success('Accounts manager updated successfully');
        } else {
          await createAccountsManager(values);
          message.success('Accounts manager created successfully');
        }
        setOpen(false);
        setEditingManager(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to save');
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    setEditingManager(null);
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <BankOutlined className={titleIconClassName} /> Accounts Managers
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Accounts Manager
        </Button>
      </Flex>

      <Card className={cardClassName} styles={{ body: { overflowX: 'auto' } }}>
        <Table
          dataSource={accountsManagers}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Drawer
        title={editingManager ? 'Edit Accounts Manager' : 'Add New Accounts Manager'}
        size="large"
        open={open}
        onClose={handleClose}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(submit)}>
              {editingManager ? 'Update' : 'Save'}
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
                  <Input {...field} placeholder="Full name" />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="employeeId"
              render={({ field }) => (
                <Form.Item label="Employee ID" className="flex-1">
                  <Input {...field} placeholder="EMP-ACC-001" />
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
                  label={editingManager ? "New Password (Optional)" : "Password"}
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                  extra={!editingManager && "Default password will be '8220' if left blank"}
                >
                  <Input.Password {...field} placeholder="********" />
                </Form.Item>
              )}
            />
          </Flex>

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
