'use client';

import { useEffect, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Drawer, Flex, Form, Input, Popconfirm, Space, Table, Typography, App, Select, Switch, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { createPurchaseTeamMember, deletePurchaseTeamMember, updatePurchaseTeamMember } from '@/actions/purchase-team';
import type { PurchaseTeamMember, Project, Salary } from '@/types/erp';
import {
  cardClassName,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

const purchaseTeamSchema = z.object({
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

type PurchaseTeamFormValues = z.infer<typeof purchaseTeamSchema>;

type PurchaseTeamClientProps = {
  purchaseTeamMembers: PurchaseTeamMember[];
  projects: Project[];
  salaries: Salary[];
};

export function PurchaseTeamClient({ purchaseTeamMembers, projects, salaries }: PurchaseTeamClientProps) {
  const [open, setOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<PurchaseTeamMember | null>(null);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();

  const form = useForm<PurchaseTeamFormValues>({
    resolver: zodResolver(purchaseTeamSchema),
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

  const selectedSalaryId = useWatch({ control, name: 'salaryGradeId' });
  const selectedSalary = salaries.find(s => s.id === selectedSalaryId);

  useEffect(() => {
    if (editingMember) {
      setValue('name', editingMember.name);
      setValue('employeeId', editingMember.employeeId || '');
      setValue('phone', editingMember.phone || '');
      setValue('email', editingMember.email || '');
      setValue('address', editingMember.address || '');
      setValue('username', editingMember.username || '');
      setValue('isActive', editingMember.isActive);
      setValue('salaryGradeId', editingMember.salaryGradeId || '');
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
  }, [editingMember, setValue, reset]);

  const handleEdit = (member: PurchaseTeamMember) => {
    setEditingMember(member);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deletePurchaseTeamMember(id);
        message.success('Purchase team member deleted successfully');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to delete');
      }
    });
  };

  const columns: ColumnsType<PurchaseTeamMember> = [
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
            title="Delete Purchase Team Member"
            description="Are you sure you want to delete this member?"
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

  const submit = (values: PurchaseTeamFormValues) => {
    startTransition(async () => {
      try {
        if (editingMember) {
          const updateData = { ...values };
          if (!updateData.password) delete updateData.password;

          await updatePurchaseTeamMember(editingMember.id, updateData);
          message.success('Purchase team member updated successfully');
        } else {
          await createPurchaseTeamMember(values);
          message.success('Purchase team member created successfully');
        }
        setOpen(false);
        setEditingMember(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to save');
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    setEditingMember(null);
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <ShoppingCartOutlined className={titleIconClassName} /> Purchase Team
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Purchase Team Member
        </Button>
      </Flex>

      <Card className={cardClassName} styles={{ body: { overflowX: 'auto' } }}>
        <Table
          dataSource={purchaseTeamMembers}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Drawer
        title={editingMember ? 'Edit Purchase Team Member' : 'Add New Purchase Team Member'}
        size="large"
        open={open}
        onClose={handleClose}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(submit)}>
              {editingMember ? 'Update' : 'Save'}
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
                  <Input {...field} placeholder="EMP-PUR-001" />
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
                  label={editingMember ? "New Password (Optional)" : "Password"}
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                  extra={!editingMember && "Default password will be '8220' if left blank"}
                >
                  <Input.Password {...field} placeholder="********" />
                </Form.Item>
              )}
            />
          </Flex>

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
                {selectedSalary && (
                  <Typography.Text type="secondary" className="block mt-1">
                    Avg Cost/hr: ₹{Number(selectedSalary.avgCostPerHr).toLocaleString()}
                  </Typography.Text>
                )}
              </Form.Item>
            )}
          />
        </Form>
      </Drawer>
    </div>
  );
}
