'use client';

import { Alert, Button, Card, Col, Row, Skeleton, Typography } from 'antd';
import {
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  TeamOutlined,
  WalletOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { AccountsDashboardData, PayableCategory } from '@/types/erp';
import { clientApiFetch } from '@/lib/client-api';
import { cardClassName, formatCurrency, secondaryTextClassName } from './ui';

// One card per payable category. `href` is the page where that category
// gets paid; `unit` labels the count shown under the amount.
const PAYABLE_CARDS: Array<{ key: PayableCategory; title: string; icon: React.ReactNode; unit: string; href: string }> = [
  { key: 'labour', title: 'Labour Payable', icon: <TeamOutlined />, unit: 'pending weekly payments', href: '/dashboard/labour-payments' },
  { key: 'material', title: 'Material Payable', icon: <ShoppingCartOutlined />, unit: 'pending POs', href: '/dashboard/accounts/bills' },
  { key: 'subcontractor', title: 'Sub Contractor Payable', icon: <SolutionOutlined />, unit: 'pending work orders', href: '/dashboard/subcontractor-payment-requests' },
  { key: 'expenses', title: 'Expenses Payable', icon: <WalletOutlined />, unit: 'pending weekly payments', href: '/dashboard/expense-payments' },
];

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
      <Row gutter={[16, 16]} className="mb-4">
        {[0, 1, 2].map((item) => (
          <Col key={item} xs={24} sm={12} md={8}>
            <Card className={cardClassName}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]}>
        {[0, 1, 2, 3].map((item) => (
          <Col key={item} xs={24} sm={12} lg={6}>
            <Card className={cardClassName}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

export function AccountsManagerDashboardClient() {
  const router = useRouter();
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

  // Material is the long-standing Total Payables figure, so it still has a
  // value when the API response carries no per-category breakdown.
  const payableFor = (category: PayableCategory) =>
    kpis?.payableByCategory?.[category]
    ?? (category === 'material' && kpis ? { amount: kpis.totalPayable, count: kpis.pendingBillCount } : undefined);

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

      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            className="rounded-xl! border! border-emerald-500/20! bg-linear-to-br! from-emerald-500/15! to-emerald-500/5! cursor-pointer"
            onClick={() => router.push('/dashboard/accounts/invoices')}
          >
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
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            className="rounded-xl! border! border-blue-500/20! bg-linear-to-br! from-blue-500/15! to-blue-500/5! cursor-pointer"
            onClick={() => router.push('/dashboard/payments')}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20 text-blue-500 text-xl">
                <ArrowUpOutlined />
              </div>
              <div>
                <Typography.Text className={secondaryTextClassName}>Inflow</Typography.Text>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{kpis ? formatCurrency(kpis.monthInflow) : '—'}</div>
                <Typography.Text type="secondary" className="text-xs">{kpis ? 'Current month collections' : 'Not available'}</Typography.Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            className="rounded-xl! border! border-amber-500/20! bg-linear-to-br! from-amber-500/15! to-amber-500/5! cursor-pointer"
            onClick={() => router.push('/dashboard/payments')}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500 text-xl">
                <ArrowDownOutlined />
              </div>
              <div>
                <Typography.Text className={secondaryTextClassName}>Outflow</Typography.Text>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{kpis ? formatCurrency(kpis.monthOutflow) : '—'}</div>
                <Typography.Text type="secondary" className="text-xs">{kpis ? 'Current month payments' : 'Not available'}</Typography.Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {PAYABLE_CARDS.map((card) => {
          const payable = payableFor(card.key);
          return (
            <Col key={card.key} xs={24} sm={12} lg={6}>
              <Card
                hoverable
                className="rounded-xl! border! border-rose-500/20! bg-linear-to-br! from-rose-500/15! to-rose-500/5! cursor-pointer"
                onClick={() => router.push(card.href)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-500 text-xl">
                    {card.icon}
                  </div>
                  <div>
                    <Typography.Text className={secondaryTextClassName}>{card.title}</Typography.Text>
                    <div className="text-2xl font-bold text-[var(--text-primary)]">{payable ? formatCurrency(payable.amount) : '—'}</div>
                    <Typography.Text type="secondary" className="text-xs">
                      {payable ? `${payable.count} ${card.unit}` : 'Not available'}
                    </Typography.Text>
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
