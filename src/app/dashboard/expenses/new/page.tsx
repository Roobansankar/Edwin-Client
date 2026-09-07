'use client';

import { useEffect, useState, useCallback, useTransition } from 'react';
import { clientApiFetch } from '@/lib/client-api';
import { ExpenseForm } from '@/components/dashboard/ExpenseForm';
import { deleteExpense } from '@/actions/expenses';
import { Alert, Spin, Typography, Button, Drawer, Card, Table, Space, Image, Flex, Popconfirm, Tooltip, App } from 'antd';
import type { Project, Trade, Expense, ExpenseType } from '@/types/erp';
import { DollarOutlined, PlusOutlined, FileTextOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { formatCurrency, formatDate, StatusTag, pageHeaderClassName, pageTitleClassName, titleIconClassName } from '@/components/dashboard/ui';
import type { ColumnsType } from 'antd/es/table';

export default function NewExpensePage() {
  const [data, setData] = useState<{ projects: Project[], trades: Trade[], expenseTypes: ExpenseType[], expenses: Expense[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [projects, trades, expenseTypes, expensesRes] = await Promise.all([
        clientApiFetch<Project[]>('/projects'),
        clientApiFetch<Trade[]>('/trades'),
        clientApiFetch<ExpenseType[]>('/expense-types'),
        clientApiFetch<{ data: Expense[] }>('/expenses?limit=50&mine=true'),
      ]);
      setData({ projects, trades, expenseTypes, expenses: expensesRes.data });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = () => {
    setEditingExpense(null);
    setOpen(true);
  };

  const handleEdit = (record: Expense) => {
    setEditingExpense(record);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteExpense(id);
        message.success('Expense deleted');
        load(true);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to delete expense');
      }
    });
  };

  const columns: ColumnsType<Expense> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 80,
      render: (_text, _record, index) => index + 1,
    },
    {
      title: 'Date',
      dataIndex: 'expenseDate',
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
      title: 'Project',
      dataIndex: ['project', 'name'],
      render: (val) => val || '-',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: (val) => <Typography.Text strong>{val}</Typography.Text>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      render: formatCurrency,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: Expense) => (
        <Space orientation="vertical" size={2}>
          <StatusTag value={status} />
          {status === 'rejected' && record.rejectionReason && (
            <Typography.Text type="danger" className="text-[10px]">
              {record.rejectionReason}
            </Typography.Text>
          )}
        </Space>
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
              onClick={() => window.open(url, '_blank')}
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
                src={url}
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

  if (loading) return <div className="p-10 text-center"><Spin size="large" /></div>;
  if (error) return <Alert title="Error" description={error} type="error" showIcon />;
  if (!data) return null;

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <DollarOutlined className={titleIconClassName} /> My Expenses
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          Add Expense
        </Button>
      </Flex>

      <Card
        className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!"
        styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}
      >
        <Table
          className="mantis-table"
          dataSource={data.expenses}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1300 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} expenses` }}
        />
      </Card>

      <Drawer
        title={editingExpense ? 'Edit Expense' : 'New Expense Claim'}
        size="large"
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingExpense(null);
        }}
        destroyOnClose
      >
        <ExpenseForm
          projects={data.projects}
          trades={data.trades}
          expenseTypes={data.expenseTypes}
          initialValues={editingExpense}
          onSuccess={() => {
            setOpen(false);
            setEditingExpense(null);
            load(true);
          }}
          onCancel={() => {
            setOpen(false);
            setEditingExpense(null);
          }}
        />
      </Drawer>
    </div>
  );
}

