'use client';

import { useEffect, useMemo, useState, useCallback, useTransition } from 'react';
import dayjs from 'dayjs';
import { clientApiFetch } from '@/lib/client-api';
import { ExpenseForm } from '@/components/dashboard/ExpenseForm';
import { deleteExpense } from '@/actions/expenses';
import { Alert, Spin, Typography, Button, DatePicker, Drawer, Input, Space, Image, Flex, Popconfirm, Tooltip, App } from 'antd';
import type { Project, Trade, Expense, ExpenseType } from '@/types/erp';
import { DollarOutlined, PlusOutlined, FileTextOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { formatCurrency, formatDate, StatusTag, pageHeaderClassName, pageTitleClassName, titleIconClassName } from '@/components/dashboard/ui';
import type { ColumnsType } from 'antd/es/table';
import { PagedTableCard, StatusCards } from '@/components/dashboard/DataTablePanel';

export default function NewExpensePage() {
  const [data, setData] = useState<{ projects: Project[], trades: Trade[], expenseTypes: ExpenseType[], expenses: Expense[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  // Search and date filters (this page only ever lists the signed-in user's own expenses).
  const filteredExpenses = useMemo(() => {
    const list = data?.expenses || [];
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    const q = searchText.trim().toLowerCase();
    return list.filter((e) => {
      const day = (e.expenseDate || '').split('T')[0];
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (!q) return true;
      return [e.description, e.expenseType?.name, e.category, e.project?.name, e.trade?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, searchText, dateRange]);
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  // S.No follows the filtered list, so numbering continues across pages.
  const serialById = new Map(filteredExpenses.map((e, i) => [e.id, i + 1]));

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [projects, trades, expenseTypes, expensesRes] = await Promise.all([
        clientApiFetch<Project[]>('/projects'),
        clientApiFetch<Trade[]>('/trades'),
        clientApiFetch<ExpenseType[]>('/expense-types'),
        clientApiFetch<{ data: Expense[] }>('/expenses?limit=5000&mine=true'),
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
      width: 70,
      render: (_text, record) => serialById.get(record.id),
    },
    {
      title: 'Date',
      dataIndex: 'expenseDate',
      width: 120,
      render: formatDate,
    },
     {
      title: 'Added By',
      dataIndex: 'creator',
      width: 190,
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
      width: 160,
      render: (val, record) => val || (record.category ? <StatusTag value={record.category} /> : '-'),
    },
    {
      title: 'Trade',
      dataIndex: ['trade', 'name'],
      width: 140,
      render: (val) => val || '-',
    },
    {
      title: 'Project',
      dataIndex: ['project', 'name'],
      width: 200,
      render: (val) => val || '-',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      width: 260,
      render: (val) => <Typography.Text strong>{val}</Typography.Text>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      width: 130,
      align: 'right',
      render: formatCurrency,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 160,
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
      width: 110,
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
      width: 150,
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

      <StatusCards
        items={[
          { key: 'count', label: 'Expenses', value: filteredExpenses.length },
          { key: 'total', label: 'Total Amount', value: formatCurrency(totalAmount) },
          { key: 'pending', label: 'Pending', value: filteredExpenses.filter((e) => e.status === 'pending').length },
          {
            key: 'approved',
            label: 'Approved',
            value: filteredExpenses.filter((e) => e.status === 'approved' || e.status === 'admin_approved').length,
          },
        ]}
      />

      <PagedTableCard
        title="Expenses"
        subtitle={`${filteredExpenses.length} ${filteredExpenses.length === 1 ? 'expense' : 'expenses'}`}
        toolbar={(
          <>
            <Input
              placeholder="Search description, type, project..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
              style={{ width: 240 }}
            />
            <DatePicker.RangePicker
              value={dateRange[0] || dateRange[1] ? dateRange : [null, null]}
              onChange={(dates) => setDateRange(dates ? [dates[0], dates[1]] : [null, null])}
              allowClear
              placeholder={['From date', 'To date']}
            />
          </>
        )}
        noun="expenses"
        className="mantis-table"
        dataSource={filteredExpenses}
        columns={columns}
        rowKey="id"
        size="middle"
        scroll={{ x: 1790 }}
      />

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

