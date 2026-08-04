'use client';

import { useEffect, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  App,
  Button,
  Card,
  Drawer,
  Flex,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  createOfficeStaff,
  deleteOfficeStaff,
  updateOfficeStaff,
} from '@/actions/office-staff';
import { OFFICE_STAFF_TYPES } from '@/types/erp';
import type { OfficeStaff, Salary } from '@/types/erp';
import {
  cardClassName,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

const officeStaffSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  staffType: z.enum(OFFICE_STAFF_TYPES, { message: 'Staff type is required' }),
  employeeId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  isActive: z.boolean(),
  salaryGradeId: z.string().optional(),
});

type OfficeStaffFormValues = z.infer<typeof officeStaffSchema>;

type OfficeStaffClientProps = {
  officeStaff: OfficeStaff[];
  salaries: Salary[];
};

export function OfficeStaffClient({ officeStaff, salaries }: OfficeStaffClientProps) {
  const [open, setOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<OfficeStaff | null>(null);
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { message } = App.useApp();

  const { control, handleSubmit, reset, setValue } = useForm<OfficeStaffFormValues>({
    resolver: zodResolver(officeStaffSchema),
    defaultValues: {
      name: '',
      staffType: 'Architect',
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
    if (editingStaff) {
      setValue('name', editingStaff.name);
      setValue('staffType', (editingStaff.staffType as OfficeStaffFormValues['staffType']) || 'Architect');
      setValue('employeeId', editingStaff.employeeId || '');
      setValue('phone', editingStaff.phone || '');
      setValue('email', editingStaff.email || '');
      setValue('address', editingStaff.address || '');
      setValue('username', editingStaff.username || '');
      setValue('isActive', editingStaff.isActive);
      setValue('salaryGradeId', editingStaff.salaryGradeId || '');
      setValue('password', '');
    } else {
      reset({
        name: '',
        staffType: 'Architect',
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
  }, [editingStaff, setValue, reset]);

  const handleEdit = (staff: OfficeStaff) => {
    setEditingStaff(staff);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteOfficeStaff(id);
        message.success('Office staff deactivated successfully');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to deactivate');
      }
    });
  };

  const columns: ColumnsType<OfficeStaff> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 70,
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Staff Type',
      dataIndex: 'staffType',
      width: 160,
      sorter: (a, b) => (a.staffType || '').localeCompare(b.staffType || ''),
      render: (value: string) => (value ? <Tag color="purple">{value}</Tag> : '-'),
    },
    {
      title: 'Employee ID',
      dataIndex: 'employeeId',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 220,
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
      width: 140,
      render: (text) => text || '-',
    },
    {
      title: 'Salary Grade',
      key: 'salaryGrade',
      width: 120,
      render: (_, record) =>
        record.salaryGrade ? (
          <Tag color="cyan">{record.salaryGrade.grades}</Tag>
        ) : (
          <Typography.Text type="secondary">-</Typography.Text>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 110,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>{isActive ? 'ACTIVE' : 'INACTIVE'}</Tag>
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
              title="Deactivate Staff"
              description="Are you sure you want to deactivate this account?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true, loading: isPending }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const submit = (values: OfficeStaffFormValues) => {
    startTransition(async () => {
      try {
        if (editingStaff) {
          const updateData = { ...values };
          if (!updateData.password) delete updateData.password;
          await updateOfficeStaff(editingStaff.id, updateData);
          message.success('Office staff updated successfully');
        } else {
          await createOfficeStaff(values);
          message.success('Office staff created successfully');
        }
        setOpen(false);
        setEditingStaff(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to save');
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    setEditingStaff(null);
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <TeamOutlined className={titleIconClassName} /> Office Staff
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Staff
        </Button>
      </Flex>

      <Card className={cardClassName} styles={{ body: { overflowX: 'auto' } }}>
        <Table
          dataSource={officeStaff}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1300 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} staff members`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      <Drawer
        title={editingStaff ? 'Edit Office Staff' : 'Add New Office Staff'}
        size="large"
        open={open}
        onClose={handleClose}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(submit)}>
              {editingStaff ? 'Update Staff' : 'Save Staff'}
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
                  <Input {...field} placeholder="Staff full name" />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="staffType"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Staff Type"
                  required
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Select
                    {...field}
                    placeholder="Select staff type"
                    options={OFFICE_STAFF_TYPES.map((t) => ({ value: t, label: t }))}
                  />
                </Form.Item>
              )}
            />
          </Flex>

          <Flex gap={16}>
            <Controller
              control={control}
              name="employeeId"
              render={({ field }) => (
                <Form.Item label="Employee ID" className="flex-1">
                  <Input {...field} placeholder="EMP-101" />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <Form.Item label="Phone Number" className="flex-1">
                  <Input {...field} placeholder="+91..." />
                </Form.Item>
              )}
            />
          </Flex>

          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Email"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input {...field} placeholder="email@company.com" />
              </Form.Item>
            )}
          />

          <Typography.Title level={5} className="mt-4 mb-2 border-b border-[var(--border)] pb-2">
            Login Credentials
          </Typography.Title>

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
                  label={editingStaff ? 'New Password (Optional)' : 'Password'}
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                  extra={!editingStaff && "Default password will be '8220' if left blank"}
                >
                  <Input.Password {...field} placeholder="********" />
                </Form.Item>
              )}
            />
          </Flex>

          <Typography.Title level={5} className="mt-4 mb-2 border-b border-[var(--border)] pb-2">
            Assignments
          </Typography.Title>

          <Controller
            control={control}
            name="salaryGradeId"
            render={({ field }) => (
              <Form.Item label="Salary Grade">
                <Select
                  {...field}
                  placeholder="Select salary grade"
                  allowClear
                  options={salaries.map((s) => ({
                    label: `${s.grades} (${s.expInYears} yrs - ₹${Number(s.monthlySalary).toLocaleString()})`,
                    value: s.id,
                  }))}
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
