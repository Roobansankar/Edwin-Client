'use client';

import { Alert, Button, Typography } from 'antd';
import {
  ReloadOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  SwapOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type { AccountsDashboardData, PayableCategory } from '@/types/erp';
import { clientApiFetch } from '@/lib/client-api';
import type { KpiTone } from './ui';
import { KpiCard, formatCurrency, mutedTextClassName, pageTitleClassName } from './ui';
import { PageSkeleton } from './Skeletons';
import { useDashboardRouter } from '@/components/dashboard/navigation';

// One card per payable category, each with its own colour. `href` is the page
// where that category gets paid; `unit` labels the count under the amount.
const PAYABLE_CARDS: Array<{ key: PayableCategory; title: string; icon: React.ReactNode; tone: KpiTone; unit: string; href: string }> = [
  { key: 'labour', title: 'Labour Payable', icon: <TeamOutlined />, tone: 'amber', unit: 'pending weekly payments', href: '/dashboard/labour-payments' },
  { key: 'material', title: 'Material Payable', icon: <ShoppingCartOutlined />, tone: 'blue', unit: 'unpaid bills', href: '/dashboard/accounts/bills' },
  { key: 'subcontractor', title: 'Sub Contractor Payable', icon: <SolutionOutlined />, tone: 'violet', unit: 'admin-approved bills unpaid', href: '/dashboard/accounts/subcontractor-bills' },
  { key: 'expenses', title: 'Expenses Payable', icon: <WalletOutlined />, tone: 'rose', unit: 'pending weekly payments', href: '/dashboard/expense-payments' },
];

async function loadAccountsDashboard(): Promise<AccountsDashboardData> {
  return await clientApiFetch<AccountsDashboardData>('/dashboard/accounts');
}

export function AccountsManagerDashboardClient() {
  const router = useDashboardRouter();
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
    return <PageSkeleton />;
  }

  const kpis = data?.kpis;
  const inflow = Number(kpis?.monthInflow || 0);
  const outflow = Number(kpis?.monthOutflow || 0);
  const net = inflow - outflow;

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
        <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
          Refresh
        </Button>
      </div>

      <div className="rise-stagger mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          tone="green"
          title="Total Receivables"
          value={formatCurrency(kpis?.totalReceivable || 0)}
          icon={<FileTextOutlined />}
          note={kpis ? `${kpis.pendingInvoiceCount} pending invoices` : 'Not available'}
          onClick={() => router.push('/dashboard/accounts/invoices')}
        />

        {/* Inflow and outflow for the current month, side by side in one card. */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => router.push('/dashboard/payments')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push('/dashboard/payments'); } }}
          className="group cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 transition-colors hover:border-[var(--text-muted)] md:col-span-2"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-[var(--text-muted)]">Inflow &amp; Outflow (This Month)</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sm text-sky-500">
              <SwapOutlined />
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 divide-x divide-[var(--border)]">
            <div className="pr-4">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Inflow
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-[var(--text-primary)]">{kpis ? formatCurrency(inflow) : '—'}</div>
            </div>
            <div className="pl-4">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Outflow
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-[var(--text-primary)]">{kpis ? formatCurrency(outflow) : '—'}</div>
            </div>
          </div>

          {/* Share of money in vs money out this month */}
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-[var(--subtle-hover-bg)]">
            {inflow + outflow > 0 && (
              <>
                <div className="h-full bg-emerald-500" style={{ width: `${(inflow / (inflow + outflow)) * 100}%` }} />
                <div className="h-full bg-amber-500" style={{ width: `${(outflow / (inflow + outflow)) * 100}%` }} />
              </>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
            {kpis ? (
              <span>
                Net this month{' '}
                <span className={`ml-1 font-semibold ${net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {net >= 0 ? '+' : ''}{formatCurrency(net)}
                </span>
              </span>
            ) : (
              <span>Not available</span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Payables</div>
      <div className="rise-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PAYABLE_CARDS.map((card) => {
          const payable = payableFor(card.key);
          return (
            <KpiCard
              key={card.key}
              tone={card.tone}
              title={card.title}
              value={payable ? formatCurrency(payable.amount) : '—'}
              icon={card.icon}
              note={payable ? `${payable.count} ${card.unit}` : 'Not available'}
              onClick={() => router.push(card.href)}
            />
          );
        })}
      </div>
    </div>
  );
}
