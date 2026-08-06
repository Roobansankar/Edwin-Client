'use client';

import { useState, useTransition, useEffect } from 'react';
import { App, Button, Card, Drawer, Flex, Select, Space, Table, Typography, Popconfirm, Tooltip, Image } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DollarOutlined, PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, PictureOutlined } from '@ant-design/icons';
import { deleteExpense, updateExpenseStatus } from '@/actions/expenses';
import type { Expense, Trade, Project, ExpenseType } from '@/types/erp';
import { ExpenseForm } from './ExpenseForm';
import { clientApiFetch } from '@/lib/client-api';
import { getApiOrigin } from '@/lib/api-url';
import { useAuthStore } from '@/store/auth';
import {
  StatusTag,
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';
const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Admin Approved', value: 'admin_approved' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

type ExpensesClientProps = {
  expenses: Expense[];
  projects: Project[];
};

export function ExpensesClient({ expenses: initialExpenses, projects }: ExpensesClientProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [open, setOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const canUpdateStatus = user?.role === 'admin' || user?.role === 'accounts_manager';

  useEffect(() => {
    Promise.all([
      clientApiFetch<Trade[]>('/trades'),
      clientApiFetch<ExpenseType[]>('/expense-types'),
    ]).then(([tradesData, typesData]) => {
      setTrades(tradesData);
      setExpenseTypes(typesData);
    });
  }, []);

  const refreshExpenses = async () => {
    try {
      const res = await clientApiFetch<{ data: Expense[] }>('/expenses?limit=100');
      setExpenses(res.data);
      const types = await clientApiFetch<ExpenseType[]>('/expense-types');
      setExpenseTypes(types);
    } catch (err) {
      console.error('Failed to refresh expenses:', err);
    }
  };

  const handleEdit = (record: Expense) => {
    setEditingExpense(record);
    setOpen(true);
  };

  const handleAdd = () => {
    setEditingExpense(null);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteExpense(id);
        message.success('Expense deleted');
        refreshExpenses();
      } catch (error) {
        message.error('Failed to delete expense');
      }
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      try {
        await updateExpenseStatus(id, status);
        message.success('Status updated');
        refreshExpenses();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to update status');
      }
    });
  };

  const columns: ColumnsType<Expense> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 60,
      render: (_text, _record, index) => index + 1,
    },
    {
      title: 'Date',
      dataIndex: 'expenseDate',
      sorter: (a, b) => new Date(a.expenseDate || 0).getTime() - new Date(b.expenseDate || 0).getTime(),
      render: formatDate,
    },
    {
      title: 'Added By',
      dataIndex: 'creator',
        render: (creator) => creator ? (
          <Space orientation="vertical" size={0}>
            <Typography.Text strong>{creator.name}</Typography.Text>
          <Typography.Text type="secondary" className="text-[10px] uppercase">
            {creator.role.replace('_', ' ')}
          </Typography.Text>
        </Space>
      ) : '-',
    },
    {
      title: 'Project',
      dataIndex: ['project', 'name'],
      render: (val, record) => val || (record.project ? <Typography.Text>{record.project.name}</Typography.Text> : '-'),
    },
    
    {
      title: 'Expense Type',
      dataIndex: ['expenseType', 'name'],
      render: (val, record) => val || (record.category ? <StatusTag value={record.category} /> : '-'),
    },
    {
      title: 'Trade',
      dataIndex: ['trade', 'name'],
      render: (val) => val || '-',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      sorter: (a, b) => a.description.localeCompare(b.description),
      render: (value: string, record) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{value}</Typography.Text>
          {record.project && (
            <Typography.Text type="secondary" className="text-xs">
              {record.project.name}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      sorter: (a, b) => Number(a.amount) - Number(b.amount),
      render: formatCurrency,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      filters: STATUS_OPTIONS.map(opt => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.status === value,
      render: (value: string, record: Expense) =>
        canUpdateStatus ? (
          <Select
            defaultValue={value || 'pending'}
            size="small"
            variant="borderless"
            className="w-full"
            onChange={(newStatus) => handleStatusChange(record.id, newStatus)}
            options={STATUS_OPTIONS}
            popupMatchSelectWidth={false}
            styles={{ popup: { root: { minWidth: 120 } } }}
            disabled={isPending}
          />
        ) : (
          <StatusTag value={value || 'pending'} />
        ),
    },
    {
      title: 'Receipts',
      dataIndex: 'receiptUrls',
      render: (urls: string[]) => urls?.length ? (
        <Space>
          {urls.map((url, i) => (
            <Button 
              key={i}
              type="text" 
              size="small"
              icon={<FileTextOutlined className="text-sky-500" />} 
              onClick={() => window.open(`${getApiOrigin()}${url}`, '_blank')}
            />
          ))}
        </Space>
      ) : '-',
    },
    {
      title: 'Site Photos',
      dataIndex: 'sitePhotoUrls',
      render: (urls: string[]) => urls?.length ? (
        <Image.PreviewGroup>
          <Space>
            {urls.map((url, i) => (
              <Image
                key={i}
                src={`${getApiOrigin()}${url}`}
                width={30}
                height={30}
                className="rounded object-cover border border-[var(--border)]"
              />
            ))}
          </Space>
        </Image.PreviewGroup>
      ) : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Expense"
            description="Are you sure you want to delete this expense?"
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

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <DollarOutlined className={titleIconClassName} /> Expenses
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Expense
        </Button>
      </Flex>

      <Card className={cardClassName}>
        <Table
          dataSource={expenses}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} expenses` }}
        />
      </Card>

      <Drawer
        title={editingExpense ? "Edit Expense" : "Add Expense"}
        size="large"
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingExpense(null);
        }}
        destroyOnClose
      >
        <ExpenseForm 
          projects={projects}
          trades={trades}
          expenseTypes={expenseTypes}
          initialValues={editingExpense}
          onSuccess={() => {
            setOpen(false);
            setEditingExpense(null);
            refreshExpenses();
          }}
          onCancel={() => {
            setOpen(false);
            setEditingExpense(null);
          }}
          showPaidBy={true}
        />
      </Drawer>
    </div>
  );
}
