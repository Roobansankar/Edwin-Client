'use client';

import { Alert, Button, Card, Col, Row, Skeleton, Statistic, Typography } from 'antd';
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
import {
  KpiCard,
  cardClassName,
  formatCurrency,
  kpiCardClassNames,
  mutedTextClassName,
  pageTitleClassName,
  secondaryTextClassName,
  statisticClassNames,
} from './ui';

// One card per payable category. `href` is the page where that category
// gets paid; `unit` labels the count shown under the amount.
const PAYABLE_CARDS: Array<{ key: PayableCategory; title: string; icon: React.ReactNode; unit: string; href: string }> = [
  { key: 'labour', title: 'Labour Payable', icon: <TeamOutlined className="text-rose-500" />, unit: 'pending weekly payments', href: '/dashboard/labour-payments' },
  { key: 'material', title: 'Material Payable', icon: <ShoppingCartOutlined className="text-rose-500" />, unit: 'unpaid bills', href: '/dashboard/accounts/bills' },
  { key: 'subcontractor', title: 'Sub Contractor Payable', icon: <SolutionOutlined className="text-rose-500" />, unit: 'admin-approved bills unpaid', href: '/dashboard/accounts/subcontractor-bills' },
  { key: 'expenses', title: 'Expenses Payable', icon: <WalletOutlined className="text-rose-500" />, unit: 'pending weekly payments', href: '/dashboard/expense-payments' },
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
        <div>
          <Typography.Title level={3} className={pageTitleClassName}>
            Accounts Dashboard
          </Typography.Title>
          <Typography.Text className={mutedTextClassName}>
            Receivables, collections, payments and payables at a glance
          </Typography.Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void refetch()}
          loading={isFetching}
        >
          Refresh
        </Button>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={8}>
          <KpiCard
            tone="green"
            title="Total Receivables"
            value={formatCurrency(kpis?.totalReceivable || 0)}
            icon={<FileTextOutlined className="text-emerald-500" />}
            note={kpis ? `${kpis.pendingInvoiceCount} pending invoices` : 'Not available'}
            onClick={() => router.push('/dashboard/accounts/invoices')}
          />
        </Col>
        <Col xs={24} sm={12} md={16}>
          {/* Inflow and outflow for the current month, side by side in one card. */}
          <Card
            className={`${kpiCardClassNames.blue} h-full cursor-pointer`}
            size="small"
            hoverable
            onClick={() => router.push('/dashboard/payments')}
          >
            <Typography.Text className={secondaryTextClassName}>Inflow &amp; Outflow (This Month)</Typography.Text>
            <Row gutter={16} className="mt-2">
              <Col span={12}>
                <Statistic
                  title={<Typography.Text className={secondaryTextClassName}>Inflow</Typography.Text>}
                  value={kpis ? formatCurrency(kpis.monthInflow) : '—'}
                  prefix={<ArrowUpOutlined className="text-emerald-500" />}
                  classNames={statisticClassNames}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<Typography.Text className={secondaryTextClassName}>Outflow</Typography.Text>}
                  value={kpis ? formatCurrency(kpis.monthOutflow) : '—'}
                  prefix={<ArrowDownOutlined className="text-amber-500" />}
                  classNames={statisticClassNames}
                />
              </Col>
            </Row>
            {kpis && (
              <Typography.Text className={`mt-1 block ${secondaryTextClassName}`} style={{ fontSize: 14 }}>
                Net: <Typography.Text strong>{formatCurrency(Number(kpis.monthInflow || 0) - Number(kpis.monthOutflow || 0))}</Typography.Text>
              </Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {PAYABLE_CARDS.map((card) => {
          const payable = payableFor(card.key);
          return (
            <Col key={card.key} xs={24} sm={12} lg={6}>
              <KpiCard
                tone="rose"
                title={card.title}
                value={payable ? formatCurrency(payable.amount) : '—'}
                icon={card.icon}
                note={payable ? `${payable.count} ${card.unit}` : 'Not available'}
                onClick={() => router.push(card.href)}
              />
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
