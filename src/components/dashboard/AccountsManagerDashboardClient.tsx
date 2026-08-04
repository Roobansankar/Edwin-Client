'use client';

import { Alert, Button, Card, Col, Row, Skeleton, Table, Typography, Tag, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  ReloadOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  HistoryOutlined,
  FileTextOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type { AccountsDashboardData } from '@/types/erp';
import { clientApiFetch } from '@/lib/client-api';
import { cardClassName, formatCurrency, formatDate, secondaryTextClassName } from './ui';

type RecentPayment = AccountsDashboardData['recentPayments'][number];

async function loadAccountsDashboard(): Promise<AccountsDashboardData> {
  return await clientApiFetch<AccountsDashboardData>('/dashboard/accounts');
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Skeleton.Input active size="large" className="w-64!" />
        <Skeleton.Button active />
      </div>
      <Row gutter={[16, 16]} className="mb-6">
        {[0, 1, 2, 3].map((item) => (
          <Col key={item} xs={24} sm={12} lg={6}>
            <Card className={cardClassName}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card className={cardClassName}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    </div>
  );
}

export function AccountsManagerDashboardClient() {
  const {
    data,
    error,
    isError,
    isFetching,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'accounts'],
    queryFn: loadAccountsDashboard,
  });

  if (isPending) {
    return <DashboardSkeleton />;
  }

  const kpis = data?.kpis;
  const recentPayments = data?.recentPayments || [];

  const paymentColumns: ColumnsType<RecentPayment> = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (v) => formatDate(v),
      width: 120,
    },
    {
      title: 'Party',
      dataIndex: 'party',
      key: 'party',
      render: (v) => <Typography.Text strong>{v || '-'}</Typography.Text>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (v) => <Tag color={v === 'revenue' ? 'green' : 'blue'}>{String(v).toUpperCase()}</Tag>,
      width: 120,
    },
    {
      title: 'Mode',
      dataIndex: 'mode',
      key: 'mode',
      render: (v) => <Tag>{String(v).toUpperCase()}</Tag>,
      width: 100,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (v) => <Typography.Text strong>{formatCurrency(v)}</Typography.Text>,
      width: 150,
    },
  ];

  return (
    <div>
      {isError && (
        <Alert
          type="error"
          showIcon
          title="Dashboard data is unavailable"
          description={error instanceof Error ? error.message : 'Unable to load dashboard data.'}
          action={
            <Button size="small" onClick={() => void refetch()} loading={isFetching}>
              Retry
            </Button>
          }
          className="mb-4"
        />
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Typography.Title level={3} className="m-0! text-[var(--text-primary)]!">
          Accounts Dashboard
        </Typography.Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void refetch()}
          loading={isFetching}
        >
          Refresh
        </Button>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-xl! border! border-emerald-500/20! bg-linear-to-br! from-emerald-500/15! to-emerald-500/5!">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-500 text-xl">
                <FileTextOutlined />
              </div>
              <div>
                <Typography.Text className={secondaryTextClassName}>Total Receivables</Typography.Text>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(kpis?.totalReceivable || 0)}</div>
                <Typography.Text type="secondary" className="text-xs">{kpis?.pendingInvoiceCount} pending invoices</Typography.Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-xl! border! border-rose-500/20! bg-linear-to-br! from-rose-500/15! to-rose-500/5!">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-500/20 text-rose-500 text-xl">
                <ShoppingCartOutlined />
              </div>
              <div>
                <Typography.Text className={secondaryTextClassName}>Total Payables</Typography.Text>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(kpis?.totalPayable || 0)}</div>
                <Typography.Text type="secondary" className="text-xs">{kpis?.pendingBillCount} pending bills</Typography.Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-xl! border! border-blue-500/20! bg-linear-to-br! from-blue-500/15! to-blue-500/5!">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20 text-blue-500 text-xl">
                <ArrowUpOutlined />
              </div>
              <div>
                <Typography.Text className={secondaryTextClassName}>Month Inflow</Typography.Text>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(kpis?.monthInflow || 0)}</div>
                <Typography.Text type="secondary" className="text-xs">Current month collections</Typography.Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="rounded-xl! border! border-amber-500/20! bg-linear-to-br! from-amber-500/15! to-amber-500/5!">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500 text-xl">
                <ArrowDownOutlined />
              </div>
              <div>
                <Typography.Text className={secondaryTextClassName}>Month Outflow</Typography.Text>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(kpis?.monthOutflow || 0)}</div>
                <Typography.Text type="secondary" className="text-xs">Current month payments</Typography.Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card 
        title={
          <Space>
            <HistoryOutlined />
            <Typography.Text strong>Recent Payments</Typography.Text>
          </Space>
        } 
        className={cardClassName}
      >
        <Table
          dataSource={recentPayments}
          columns={paymentColumns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="middle"
          locale={{ emptyText: 'No recent payments' }}
        />
      </Card>
    </div>
  );
}
