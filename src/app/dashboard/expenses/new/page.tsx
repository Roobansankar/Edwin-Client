'use client';

import { useEffect, useState, useCallback } from 'react';
import { clientApiFetch } from '@/lib/client-api';
import { ExpenseForm } from '@/components/dashboard/ExpenseForm';
import { Alert, Spin, Typography, Button, Drawer, Card, Table, Tag, Space, Image, Flex } from 'antd';
import type { Project, Trade, Expense, ExpenseType } from '@/types/erp';
import { DollarOutlined, PlusOutlined, FileTextOutlined } from '@ant-design/icons';
import { formatCurrency, formatDate, StatusTag, pageHeaderClassName, pageTitleClassName, titleIconClassName } from '@/components/dashboard/ui';
import type { ColumnsType } from 'antd/es/table';

export default function NewExpensePage() {
  const [data, setData] = useState<{ projects: Project[], trades: Trade[], expenseTypes: ExpenseType[], expenses: Expense[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [projects, trades, expenseTypes, expensesRes] = await Promise.all([
        clientApiFetch<Project[]>('/projects'),
        clientApiFetch<Trade[]>('/trades'),
        clientApiFetch<ExpenseType[]>('/expense-types'),
        clientApiFetch<{ data: Expense[] }>('/expenses?limit=50'),
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
      render: (status: string) => <StatusTag value={status} />,
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
          onClick={() => setOpen(true)}
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
        title="New Expense Claim"
        size="large"
        open={open}
        onClose={() => setOpen(false)}
        destroyOnClose
      >
        <ExpenseForm 
          projects={data.projects} 
          trades={data.trades}
          expenseTypes={data.expenseTypes}
          onSuccess={() => {
            setOpen(false);
            load(true);
          }}
          onCancel={() => setOpen(false)}
        />
      </Drawer>
    </div>
  );
}

