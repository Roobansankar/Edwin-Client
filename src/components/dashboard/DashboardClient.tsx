'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Alert, Button, Segmented, Skeleton, Tooltip as AntTooltip } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  AuditOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  ReloadOutlined,
  RightOutlined,
  ShopOutlined,
  WalletOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import type { AccountsDashboardData, DashboardData, MasterInsights } from '@/types/erp';
import { clientApiFetch } from '@/lib/client-api';
import { formatCurrency, titleCase } from './ui';

type DashboardQueryData = {
  data: DashboardData;
  accounts: AccountsDashboardData | null;
};

const emptyDashboard: DashboardData = {
  totalProjects: 0,
  projects: [],
  revenueVsCost: { totalRevenue: 0, totalCost: 0, totalInflow: 0 },
  weeklyLabour: [],
  criticalActions: [],
};

const emptyInsights: MasterInsights = {
  receivable: 0,
  openInvoiceCount: 0,
  overdueAmount: 0,
  overdueCount: 0,
  pendingApprovals: {
    expenses: { count: 0, amount: 0 },
    purchaseBills: { count: 0, amount: 0 },
    subcontractorBills: { count: 0, amount: 0 },
  },
  projectFinancials: [],
  outflowByType: [],
  recentPayments: [],
};

const c = {
  inflow: '#10b981',
  outflow: '#f43f5e',
  net: '#6366f1',
  amber: '#f59e0b',
  sky: '#0ea5e9',
  violet: '#8b5cf6',
  slate: '#64748b',
};

const payableMeta = [
  { key: 'material', label: 'Material', color: c.sky },
  { key: 'labour', label: 'Labour', color: c.amber },
  { key: 'subcontractor', label: 'Sub Contractor', color: c.violet },
  { key: 'expenses', label: 'Expenses', color: c.outflow },
] as const;

const typeColors = [c.sky, c.amber, c.violet, c.outflow, c.inflow, c.net, '#14b8a6', c.slate];

const statusStyle: Record<string, { label: string; className: string }> = {
  in_progress: { label: 'In Progress', className: 'bg-emerald-500/12 text-emerald-500' },
  planning: { label: 'Planning', className: 'bg-sky-500/12 text-sky-500' },
  on_hold: { label: 'On Hold', className: 'bg-amber-500/15 text-amber-500' },
  completed: { label: 'Completed', className: 'bg-indigo-500/12 text-indigo-500' },
};

function ChartFrame({ height, children }: { height: number; children: (width: number, height: number) => ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="w-full min-w-0" style={{ height }}>
      {width > 0 ? children(width, height) : null}
    </div>
  );
}

async function loadDashboard(): Promise<DashboardQueryData> {
  const [data, accounts] = await Promise.all([
    clientApiFetch<DashboardData>('/dashboard/master'),
    // Payables come from the accounts summary; the page still works without it.
    clientApiFetch<AccountsDashboardData>('/dashboard/accounts').catch(() => null),
  ]);
  return { data, accounts };
}

function inr(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
}

function Panel({
  title,
  subtitle,
  extra,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-5 sm:p-6 ${className}`}>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">{title}</h3>
          {subtitle && <p className="m-0 mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>}
        </div>
        {extra}
      </header>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-32 items-center justify-center text-sm text-[var(--text-muted)]">{children}</div>;
}

function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  icon: ReactNode;
  tone: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 transition-colors hover:border-[var(--text-muted)]"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--text-muted)]">{label}</span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
          style={{ background: `${tone}1a`, color: tone }}
        >
          {icon}
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{value}</div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
        <span className="min-w-0 truncate">{hint}</span>
        <RightOutlined className="shrink-0 text-[10px] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
    </Link>
  );
}

function ActionTile({
  href,
  icon,
  tone,
  count,
  label,
  amount,
}: {
  href: string;
  icon: ReactNode;
  tone: string;
  count: number;
  label: string;
  amount: number;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 transition-colors hover:border-[var(--text-muted)]"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg"
        style={{ background: `${tone}1a`, color: tone }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[var(--text-primary)]">{count}</span>
          <span className="truncate text-sm text-[var(--text-secondary)]">{label}</span>
        </div>
        <div className="text-xs text-[var(--text-muted)]">{amount > 0 ? `${formatCurrency(amount)} involved` : 'Nothing waiting'}</div>
      </div>
      <RightOutlined className="text-xs text-[var(--text-muted)] transition group-hover:translate-x-1" />
    </Link>
  );
}

type TooltipEntry = { dataKey: string; name: string; value: number; color: string };

function CashTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const value = (key: string) => Number(payload.find((p) => p.dataKey === key)?.value || 0);
  const net = value('inflow') - value('outflow');
  return (
    <div className="min-w-48 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2.5">
      <div className="mb-1.5 text-xs font-semibold text-[var(--text-primary)]">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5 text-xs">
          <span className="flex items-center gap-2 text-[var(--text-muted)]">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(p.value)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="mt-1.5 flex justify-between border-t border-[var(--border)] pt-1.5 text-xs">
          <span className="text-[var(--text-muted)]">Net</span>
          <span className={`font-semibold ${net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {net >= 0 ? '+' : ''}
            {formatCurrency(net)}
          </span>
        </div>
      )}
    </div>
  );
}

function StackedBar({ parts }: { parts: Array<{ key: string; value: number; color: string; label: string }> }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (!total) return <div className="h-3 rounded-full bg-[var(--subtle-bg)]" />;
  return (
    <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
      {parts
        .filter((p) => p.value > 0)
        .map((p) => (
          <AntTooltip key={p.key} title={`${p.label}: ${formatCurrency(p.value)}`}>
            <div style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
          </AntTooltip>
        ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton.Node active className="h-16! w-full! rounded-xl!">
        <span />
      </Skeleton.Node>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] p-4">
            <Skeleton active avatar paragraph={{ rows: 1 }} title={false} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] p-6 xl:col-span-2">
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
        <div className="rounded-xl border border-[var(--border)] p-6">
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      </div>
    </div>
  );
}

export function DashboardClient() {
  const [range, setRange] = useState<6 | 12>(12);
  const { data: result, error, isError, isFetching, isPending, refetch } = useQuery({
    queryKey: ['dashboard', 'master'],
    queryFn: loadDashboard,
  });

  if (isPending) return <DashboardSkeleton />;

  const data = result?.data || emptyDashboard;
  const ins = data.insights || emptyInsights;
  const kpis = result?.accounts?.kpis;

  const totalInflow = Number(data.revenueVsCost.totalInflow || 0);
  const totalCost = Number(data.revenueVsCost.totalCost || 0);
  const net = totalInflow - totalCost;
  const payable = kpis?.payableByCategory
    ? payableMeta.reduce((s, p) => s + Number(kpis.payableByCategory?.[p.key]?.amount || 0), 0)
    : Number(kpis?.totalPayable || 0);

  const trend = data.monthlyTrend || [];
  const thisMonth = trend[trend.length - 1];
  const lastMonth = trend[trend.length - 2];
  const monthNet = thisMonth ? thisMonth.inflow - thisMonth.outflow : 0;

  const cashData = trend.slice(-range).map((t) => ({ label: monthLabel(t.month), inflow: t.inflow, outflow: t.outflow }));
  const periodInflow = cashData.reduce((sum, d) => sum + d.inflow, 0);
  const periodOutflow = cashData.reduce((sum, d) => sum + d.outflow, 0);

  const approvals = ins.pendingApprovals;

  const budgetRows = [...ins.projectFinancials]
    .sort((a, b) => b.spent - a.spent || b.budget - a.budget)
    .slice(0, 6);
  const overBudget = ins.projectFinancials.filter((p) => p.budget > 0 && p.spent > p.budget).length;

  const typeTotal = ins.outflowByType.reduce((s, t) => s + t.amount, 0);

  const labourData = [...(data.weeklyLabour || [])]
    .reverse()
    .map((w) => ({
      week: w.weekStart ? new Date(w.weekStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '',
      headcount: w.headcount,
    }));
  const latestHeadcount = labourData[labourData.length - 1]?.headcount || 0;
  const prevHeadcount = labourData[labourData.length - 2]?.headcount || 0;

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
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
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-[var(--text-primary)]">Master Dashboard</h1>
          <div className="mt-0.5 text-sm text-[var(--text-muted)]">{today}</div>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Net Position"
          href="/dashboard/accounts-ledger"
          value={inr(net)}
          icon={<WalletOutlined />}
          tone={net >= 0 ? c.net : c.outflow}
          hint={
            thisMonth ? (
              <span className={monthNet >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                {monthNet >= 0 ? '+' : ''}
                {inr(monthNet)} this month
              </span>
            ) : undefined
          }
        />
        <StatCard
          label="Total Inflow"
          href="/dashboard/payments"
          value={inr(totalInflow)}
          icon={<ArrowDownOutlined />}
          tone={c.inflow}
          hint={thisMonth ? `${inr(thisMonth.inflow)} this month` : undefined}
        />
        <StatCard
          label="Total Outflow"
          href="/dashboard/payments"
          value={inr(totalCost)}
          icon={<ArrowUpOutlined />}
          tone={c.outflow}
          hint={thisMonth ? `${inr(thisMonth.outflow)} this month` : undefined}
        />
        <StatCard
          label="To Receive"
          href="/dashboard/accounts/invoices"
          value={inr(ins.receivable)}
          icon={<FileDoneOutlined />}
          tone={c.sky}
          hint={`${ins.openInvoiceCount} open invoices`}
        />
        <StatCard
          label="To Pay"
          href="/dashboard/accounts"
          value={kpis ? inr(payable) : '—'}
          icon={<ShopOutlined />}
          tone={c.amber}
          hint={kpis ? 'Approved, unpaid' : 'Unavailable'}
        />
      </div>

      {/* Action centre: things that need the admin */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Needs your attention
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            href="/dashboard/accounts/invoices"
            icon={<WarningOutlined />}
            tone={c.outflow}
            count={ins.overdueCount}
            label="Overdue invoices"
            amount={ins.overdueAmount}
          />
          <ActionTile
            href="/dashboard/approvals"
            icon={<AuditOutlined />}
            tone={c.amber}
            count={approvals.expenses.count}
            label="Expenses to approve"
            amount={approvals.expenses.amount}
          />
          <ActionTile
            href="/dashboard/accounts/bills"
            icon={<ClockCircleOutlined />}
            tone={c.sky}
            count={approvals.purchaseBills.count}
            label="Purchase bills pending"
            amount={approvals.purchaseBills.amount}
          />
          <ActionTile
            href="/dashboard/accounts/subcontractor-bills"
            icon={<TeamOutlined />}
            tone={c.violet}
            count={approvals.subcontractorBills.count}
            label="Sub-con bills pending"
            amount={approvals.subcontractorBills.amount}
          />
        </div>
      </div>

      {/* Cash flow + money position */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Cash Flow"
          subtitle={`Money in vs money out · last ${range} months`}
          extra={
            <Segmented
              size="small"
              value={range}
              onChange={(v) => setRange(v as 6 | 12)}
              options={[
                { label: '6M', value: 6 },
                { label: '12M', value: 12 },
              ]}
            />
          }
        >
          <div className="mb-5 flex flex-wrap gap-x-8 gap-y-3">
            {[
              { label: 'Inflow', value: periodInflow, color: c.inflow },
              { label: 'Outflow', value: periodOutflow, color: c.outflow },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </div>
                <div className="mt-0.5 text-lg font-semibold text-[var(--text-primary)]">{inr(s.value)}</div>
              </div>
            ))}
            <div>
              <div className="text-xs text-[var(--text-muted)]">Net</div>
              <div
                className={`mt-0.5 text-lg font-semibold ${periodInflow - periodOutflow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
              >
                {periodInflow - periodOutflow >= 0 ? '+' : ''}
                {inr(periodInflow - periodOutflow)}
              </div>
            </div>
          </div>
          {cashData.some((d) => d.inflow || d.outflow) ? (
            <ChartFrame height={280}>
              {(width, height) => (
                <AreaChart width={width} height={height} data={cashData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                    dy={6}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={60}
                    tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                    tickFormatter={(v: number) => inr(v)}
                  />
                  <Tooltip
                    content={<CashTooltip />}
                    cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="inflow"
                    name="Inflow"
                    stroke={c.inflow}
                    strokeWidth={2}
                    fill={c.inflow}
                    fillOpacity={0.08}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card-bg)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="outflow"
                    name="Outflow"
                    stroke={c.outflow}
                    strokeWidth={2}
                    fill={c.outflow}
                    fillOpacity={0.05}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card-bg)' }}
                  />
                </AreaChart>
              )}
            </ChartFrame>
          ) : (
            <Empty>No payments recorded in this period</Empty>
          )}
          {thisMonth && lastMonth && (
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-4 text-center">
              {[
                { label: 'Inflow vs last month', now: thisMonth.inflow, prev: lastMonth.inflow, good: true },
                { label: 'Outflow vs last month', now: thisMonth.outflow, prev: lastMonth.outflow, good: false },
                { label: 'Payments this month', now: thisMonth.count, prev: lastMonth.count, good: true, plain: true },
              ].map((m) => {
                const diff = m.prev ? ((m.now - m.prev) / m.prev) * 100 : null;
                const up = (diff ?? 0) >= 0;
                const positive = m.good ? up : !up;
                return (
                  <div key={m.label}>
                    <div className="text-lg font-bold text-[var(--text-primary)]">{m.plain ? m.now : inr(m.now)}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{m.label}</div>
                    {diff !== null && (
                      <div className={`text-xs font-semibold ${positive ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {up ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Receivables vs Payables" subtitle="What is owed to us against what we owe">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-4">
              <div className="text-xs font-medium text-emerald-500">To receive</div>
              <div className="mt-1 text-xl font-bold text-[var(--text-primary)]">{inr(ins.receivable)}</div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {ins.overdueCount > 0 ? `${inr(ins.overdueAmount)} overdue` : 'Nothing overdue'}
              </div>
            </div>
            <div className="rounded-xl bg-rose-500/10 p-4">
              <div className="text-xs font-medium text-rose-500">To pay</div>
              <div className="mt-1 text-xl font-bold text-[var(--text-primary)]">{kpis ? inr(payable) : '—'}</div>
              <div className="text-[11px] text-[var(--text-muted)]">Approved, unpaid</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-[var(--text-muted)]">
              <span>Coverage</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {payable > 0 ? `${((ins.receivable / payable) * 100).toFixed(0)}% of payables` : '—'}
              </span>
            </div>
            <StackedBar
              parts={[
                { key: 'r', label: 'To receive', value: ins.receivable, color: c.inflow },
                { key: 'p', label: 'To pay', value: payable, color: c.outflow },
              ]}
            />
          </div>

          <div className="mt-6">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Payables breakdown</div>
            {kpis?.payableByCategory ? (
              <>
                <StackedBar
                  parts={payableMeta.map((p) => ({
                    key: p.key,
                    label: p.label,
                    color: p.color,
                    value: Number(kpis.payableByCategory?.[p.key]?.amount || 0),
                  }))}
                />
                <div className="mt-4 space-y-2.5">
                  {payableMeta.map((p) => {
                    const row = kpis.payableByCategory?.[p.key];
                    return (
                      <div key={p.key} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                          {p.label}
                          <span className="text-xs text-[var(--text-muted)]">· {row?.count || 0}</span>
                        </span>
                        <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(row?.amount || 0)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <Empty>Payables summary unavailable</Empty>
            )}
          </div>
        </Panel>
      </div>

      {/* Project budget health */}
      <Panel
        title="Project Budget Health"
        subtitle={`Spend against estimated budget · ${data.totalProjects} projects${overBudget ? ` · ${overBudget} over budget` : ''}`}
        extra={
          <Link href="/dashboard/projects" className="text-xs font-medium text-indigo-500 hover:underline">
            All projects →
          </Link>
        }
      >
        {budgetRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="pb-3 font-medium">Project</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Progress</th>
                  <th className="pb-3 font-medium">Budget used</th>
                  <th className="pb-3 text-right font-medium">Spent</th>
                  <th className="pb-3 text-right font-medium">Received</th>
                </tr>
              </thead>
              <tbody>
                {budgetRows.map((p) => {
                  const used = p.budget > 0 ? (p.spent / p.budget) * 100 : null;
                  const usedColor = used === null ? c.slate : used > 100 ? c.outflow : used > 85 ? c.amber : c.inflow;
                  const st = statusStyle[p.status] || { label: titleCase(p.status), className: 'bg-slate-500/10 text-slate-500' };
                  return (
                    <tr key={p.id} className="[&>td]:border-t [&>td]:border-[var(--border)] [&>td]:py-3.5">
                      <td className="max-w-56 truncate pr-4 font-medium text-[var(--text-primary)]">{p.name}</td>
                      <td className="pr-4">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.className}`}>{st.label}</span>
                      </td>
                      <td className="w-40 pr-6">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--subtle-bg)]">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(p.completionPct, 100)}%` }} />
                          </div>
                          <span className="w-9 text-right text-xs text-[var(--text-muted)]">{p.completionPct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="w-48 pr-6">
                        {used === null ? (
                          <span className="text-xs text-[var(--text-muted)]">No budget set</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--subtle-bg)]">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(used, 100)}%`, background: usedColor }} />
                            </div>
                            <span className="w-11 text-right text-xs font-semibold" style={{ color: usedColor }}>
                              {used.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="text-right font-semibold text-[var(--text-primary)]">{inr(p.spent)}</td>
                      <td className="text-right text-[var(--text-secondary)]">{inr(p.received)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No projects yet</Empty>
        )}
      </Panel>

      {/* Spend mix, labour, recent activity */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Where Money Goes" subtitle="Outflow by payment type (all time)">
          {ins.outflowByType.length ? (
            <div className="space-y-4">
              {ins.outflowByType.slice(0, 7).map((t, i) => {
                const pct = typeTotal ? (t.amount / typeTotal) * 100 : 0;
                return (
                  <div key={t.type}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">{titleCase(t.type)}</span>
                      <span className="text-[var(--text-primary)]">
                        <span className="font-semibold">{inr(t.amount)}</span>
                        <span className="ml-2 text-xs text-[var(--text-muted)]">{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--subtle-bg)]">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: typeColors[i % typeColors.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty>No outflow recorded yet</Empty>
          )}
        </Panel>

        <Panel
          title="Site Labour"
          subtitle="Total headcount logged per week"
          extra={
            labourData.length ? (
              <div className="text-right">
                <div className="text-xl font-bold text-[var(--text-primary)]">{latestHeadcount}</div>
                {prevHeadcount > 0 && (
                  <div className={`text-[11px] font-semibold ${latestHeadcount >= prevHeadcount ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {latestHeadcount >= prevHeadcount ? '▲' : '▼'} {Math.abs(latestHeadcount - prevHeadcount)} vs prev week
                  </div>
                )}
              </div>
            ) : null
          }
        >
          {labourData.length ? (
            <ChartFrame height={240}>
              {(width, height) => (
                <BarChart width={width} height={height} data={labourData} margin={{ top: 8, right: 0, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip
                    cursor={{ fill: 'var(--subtle-bg)' }}
                    contentStyle={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Bar dataKey="headcount" name="Headcount" fill={c.amber} radius={[8, 8, 8, 8]} maxBarSize={28} />
                </BarChart>
              )}
            </ChartFrame>
          ) : (
            <Empty>No attendance logged yet</Empty>
          )}
        </Panel>

        <Panel
          title="Recent Transactions"
          subtitle="Latest payments in and out"
          className="lg:col-span-2 xl:col-span-1"
          extra={
            <Link href="/dashboard/payments" className="text-xs font-medium text-indigo-500 hover:underline">
              View all →
            </Link>
          }
        >
          {ins.recentPayments.length ? (
            <ul className="m-0 list-none space-y-1 p-0">
              {ins.recentPayments.map((p) => {
                const incoming = p.type === 'revenue';
                return (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-[var(--subtle-bg)]">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm ${
                        incoming ? 'bg-emerald-500/12 text-emerald-500' : 'bg-rose-500/12 text-rose-500'
                      }`}
                    >
                      {incoming ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {p.payee || titleCase(p.type)}
                      </div>
                      <div className="truncate text-[11px] text-[var(--text-muted)]">
                        {[titleCase(p.type), p.projectName].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${incoming ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                        {incoming ? '+' : '−'}
                        {inr(p.amount)}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>No transactions yet</Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}
