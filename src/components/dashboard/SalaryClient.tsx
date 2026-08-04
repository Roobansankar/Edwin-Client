'use client';

import { useEffect, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Card, Drawer, Flex, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, DollarOutlined } from '@ant-design/icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { createSalary, deleteSalary, updateSalary } from '@/actions/salary';
import type { Salary } from '@/types/erp';
import {
  cardClassName,
  formatDate,
  formatCurrency,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

const CATEGORY_OPTIONS = [
  { value: 'White Collar', label: 'White Collar' },
  { value: 'Blue Collar', label: 'Blue Collar' },
];

const salarySchema = z.object({
  grades: z.string().min(1, 'Grade is required'),
  category: z.enum(['White Collar', 'Blue Collar'], {
    message: 'Category is required',
  }),
  role: z.string().min(1, 'Role is required'),
  expInYears: z.string().min(1, 'Experience range is required'),
  monthlySalary: z.number().min(0, 'Must be 0 or more'),
  avgCostPerHr: z.number().min(0, 'Must be 0 or more'),
  bookingCost: z.number().min(0, 'Must be 0 or more'),
});

type SalaryFormValues = z.infer<typeof salarySchema>;

type SalaryClientProps = {
  salaries: Salary[];
};

export function SalaryClient({ salaries }: SalaryClientProps) {
  const [open, setOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<Salary | null>(null);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
  } = useForm<SalaryFormValues>({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      grades: '',
      category: 'White Collar',
      role: '',
      expInYears: '',
      monthlySalary: 0,
      avgCostPerHr: 0,
      bookingCost: 0,
    },
  });

  useEffect(() => {
    if (editingSalary) {
      setValue('grades', editingSalary.grades);
      setValue('category', (editingSalary.category as SalaryFormValues['category']) || 'White Collar');
      setValue('role', editingSalary.role || '');
      setValue('expInYears', editingSalary.expInYears);
      setValue('monthlySalary', Number(editingSalary.monthlySalary));
      setValue('avgCostPerHr', Number(editingSalary.avgCostPerHr));
      setValue('bookingCost', Number(editingSalary.bookingCost));
    } else {
      reset({
        grades: '',
        category: 'White Collar',
        role: '',
        expInYears: '',
        monthlySalary: 0,
        avgCostPerHr: 0,
        bookingCost: 0,
      });
    }
  }, [editingSalary, setValue, reset]);

  const handleEdit = (salary: Salary) => {
    setEditingSalary(salary);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteSalary(id);
        message.success('Salary record deleted successfully');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to delete salary record');
      }
    });
  };

  const columns: ColumnsType<Salary> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 60,
      render: (_text, _record, index) => index + 1,
    },
    {
      title: 'Grades',
      dataIndex: 'grades',
      sorter: (a, b) => a.grades.localeCompare(b.grades),
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      width: 140,
      sorter: (a, b) => (a.category || '').localeCompare(b.category || ''),
      render: (value: string) => (
        <Tag color={value === 'White Collar' ? 'blue' : 'orange'}>{value}</Tag>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      width: 160,
      sorter: (a, b) => (a.role || '').localeCompare(b.role || ''),
      render: (value: string) => <Typography.Text>{value}</Typography.Text>,
    },
    {
      title: 'Exp in Years',
      dataIndex: 'expInYears',
      width: 120,
      sorter: (a, b) => a.expInYears.localeCompare(b.expInYears),
      render: (value) => <Typography.Text code>{value} yrs</Typography.Text>,
    },
    {
      title: 'Monthly Salary',
      dataIndex: 'monthlySalary',
      width: 140,
      sorter: (a, b) => Number(a.monthlySalary) - Number(b.monthlySalary),
      render: (value) => formatCurrency(value),
    },
    {
      title: 'Avg Cost / Hr',
      dataIndex: 'avgCostPerHr',
      width: 140,
      sorter: (a, b) => Number(a.avgCostPerHr) - Number(b.avgCostPerHr),
      render: (value) => formatCurrency(value),
    },
    {
      title: 'Booking Cost',
      dataIndex: 'bookingCost',
      width: 140,
      sorter: (a, b) => Number(a.bookingCost) - Number(b.bookingCost),
      render: (value) => formatCurrency(value),
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
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined className="text-sky-500" />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete Salary Record"
            description="Are you sure you want to delete this salary record?"
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

  const submit = (values: SalaryFormValues) => {
    startTransition(async () => {
      try {
        if (editingSalary) {
          await updateSalary(editingSalary.id, values);
          message.success('Salary record updated successfully');
        } else {
          await createSalary(values);
          message.success('Salary record created successfully');
        }
        setOpen(false);
        setEditingSalary(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to save salary record');
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    setEditingSalary(null);
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <DollarOutlined className={titleIconClassName} /> Salary Management
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Salary
        </Button>
      </Flex>

      <Card className={cardClassName}>
        <Table
          dataSource={salaries}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} salary records` }}
        />
      </Card>

      <Drawer
        title={editingSalary ? 'Edit Salary Record' : 'Add New Salary Record'}
        size="large"
        open={open}
        onClose={handleClose}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(submit)}>
              {editingSalary ? 'Update' : 'Save'}
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" onFinish={handleSubmit(submit)}>
          <Controller
            control={control}
            name="grades"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Grades"
                required
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input {...field} placeholder="e.g. Grade A, Grade B" />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="category"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Category"
                required
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Select
                  {...field}
                  options={CATEGORY_OPTIONS}
                  placeholder="Select category"
                />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="role"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Role"
                required
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input {...field} placeholder="e.g. Site Engineer, Supervisor, Helper" />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="expInYears"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Experience in Years (Range)"
                required
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input {...field} placeholder="e.g. 2-4, 5-7, 10+" />
              </Form.Item>
            )}
          />

          <Flex gap={16}>
            <Controller
              control={control}
              name="monthlySalary"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Monthly Salary"
                  className="flex-1"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <InputNumber
                    {...field}
                    className="w-full"
                    min={0}
                    step={1000}
                    prefix="₹"
                    placeholder="0"
                  />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="avgCostPerHr"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Avg Cost / Hr"
                  className="flex-1"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <InputNumber
                    {...field}
                    className="w-full"
                    min={0}
                    step={0.5}
                    prefix="₹"
                    placeholder="0"
                  />
                </Form.Item>
              )}
            />
          </Flex>

          <Controller
            control={control}
            name="bookingCost"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Booking Cost"
                required
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <InputNumber
                  {...field}
                  className="w-full"
                  min={0}
                  step={1000}
                  prefix="₹"
                  placeholder="0"
                />
              </Form.Item>
            )}
          />
        </Form>
      </Drawer>
    </div>
  );
}
