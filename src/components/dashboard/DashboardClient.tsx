'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Alert, Button, Dropdown, Select } from 'antd';
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  ProjectOutlined,
  RiseOutlined,
  ThunderboltOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  AuditOutlined,
  FileDoneOutlined,
  ReloadOutlined,
  ShopOutlined,
  WalletOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { AccountsDashboardData, DashboardData, MasterInsights } from '@/types/erp';
import { clientApiFetch } from '@/lib/client-api';
import { formatCurrency, titleCase } from './ui';
import { PageSkeleton } from './Skeletons';
import { useAuthStore } from '@/store/auth';
import { exportToExcel } from '@/lib/excel';
import { exportTableToPdf, type ExportFormat } from '@/lib/pdf-export';

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
    <section className={`flex flex-col rounded-xl border border-[var(--border)] bg-transparent p-5 sm:p-6 ${className}`}>
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

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const length = reduce ? 0 : duration;
    const startValue = from.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = length ? Math.min(1, (now - start) / length) : 1;
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(startValue + (target - startValue) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

function CountUp({ value, format }: { value: number; format: (v: number) => string }) {
  return <>{format(useCountUp(value))}</>;
}

type DonutPart = { key: string; label: string; value: number; color: string };

// Hover card for a donut slice: solid background, colour dot, name, amount
// and share of the total. Rendered above the centre label so it stays legible.
function DonutTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ payload: DonutPart }>;
  total: number;
}) {
  const slice = active ? payload?.[0]?.payload : undefined;
  if (!slice) return null;
  return (
    <div className="min-w-44 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
        {slice.label}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-4">
        <span className="text-base font-bold text-[var(--text-primary)]">{formatCurrency(slice.value)}</span>
        <span className="text-xs font-semibold" style={{ color: slice.color }}>
          {total > 0 ? `${((slice.value / total) * 100).toFixed(0)}%` : ''}
        </span>
      </div>
    </div>
  );
}

// Round (donut) chart with a label in the middle. Hovering a slice (or a
// legend row, via activeKey) fades the other slices and shows a hover card.
// Shows an empty ring when every value is zero.
function Donut({
  parts,
  size,
  thickness,
  center,
  activeKey,
  onActiveChange,
}: {
  parts: DonutPart[];
  size: number;
  thickness: number;
  center?: ReactNode;
  activeKey?: string | null;
  onActiveChange?: (key: string | null) => void;
}) {
  const signature = JSON.stringify(parts.filter((p) => p.value > 0));
  const data = useMemo(() => JSON.parse(signature) as DonutPart[], [signature]);
  const empty = data.length === 0;
  const total = data.reduce((sum, p) => sum + p.value, 0);
  const slices = empty ? [{ key: 'empty', label: 'None', value: 1, color: 'var(--subtle-hover-bg)' }] : data;
  const active = empty ? undefined : data.find((p) => p.key === activeKey);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} onMouseLeave={() => onActiveChange?.(null)}>
      {/* Centre label sits underneath the chart so the hover card covers it cleanly. */}
      <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center px-6 text-center">
        {center}
      </div>
      <div className="relative z-10">
        <PieChart width={size} height={size}>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            innerRadius={size / 2 - thickness}
            outerRadius={size / 2}
            startAngle={90}
            endAngle={-270}
            paddingAngle={0}
            stroke="var(--page-bg)"
            strokeWidth={data.length > 1 ? 4 : 0}
            isAnimationActive={!empty}
            animationBegin={150}
            animationDuration={1000}
            animationEasing="ease-out"
            onMouseEnter={(_, index) => { if (!empty) onActiveChange?.(data[index]?.key ?? null); }}
          >
            {slices.map((p) => (
              <Cell
                key={p.key}
                fill={p.color}
                fillOpacity={active && active.key !== p.key ? 0.25 : 1}
                style={{ cursor: empty ? 'default' : 'pointer', transition: 'fill-opacity .15s', outline: 'none' }}
              />
            ))}
          </Pie>
          {!empty && (
            <Tooltip
              content={<DonutTooltip total={total} />}
              allowEscapeViewBox={{ x: true, y: true }}
              offset={18}
              wrapperStyle={{ zIndex: 30, outline: 'none', pointerEvents: 'none' }}
              isAnimationActive={false}
            />
          )}
        </PieChart>
      </div>
    </div>
  );
}

export function DashboardClient() {
  const user = useAuthStore((state) => state.user);
  const [range, setRange] = useState<6 | 12>(12);
  const [moneyHover, setMoneyHover] = useState<string | null>(null);
  const { data: result, error, isError, isFetching, isPending, refetch } = useQuery({
    queryKey: ['dashboard', 'master'],
    queryFn: loadDashboard,
  });

  if (isPending) return <PageSkeleton />;

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

  const firstName = (user?.name || '').split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingIcon = hour < 17 ? '☀️' : '🌙';
  // Compare complete months: the current month is still running.
  const lastFull = trend[trend.length - 2];
  const prevFull = trend[trend.length - 3];
  const changeOf = (key: 'inflow' | 'outflow') =>
    lastFull && prevFull && prevFull[key] ? ((lastFull[key] - prevFull[key]) / prevFull[key]) * 100 : null;
  const pendingApprovalCount = approvals.expenses.count + approvals.purchaseBills.count + approvals.subcontractorBills.count;
  const outlineBtn = 'inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-transparent px-3 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--subtle-hover-bg)]';

  const overviewTiles = [
    { label: 'Projects', value: data.totalProjects, icon: <ProjectOutlined />, href: '/dashboard/projects' },
    { label: 'Pending approvals', value: pendingApprovalCount, icon: <AuditOutlined />, href: '/dashboard/approvals' },
    { label: 'Overdue invoices', value: ins.overdueCount, icon: <WarningOutlined />, href: '/dashboard/accounts/invoices' },
    { label: 'Workers this week', value: latestHeadcount, icon: <TeamOutlined />, href: '/dashboard/site-engineer-attendance' },
  ];

  const statCells = [
    {
      label: 'To Receive',
      value: inr(ins.receivable),
      badge: ins.receivable > 0 ? { text: ins.overdueCount ? `${inr(ins.overdueAmount)} overdue` : 'On time', good: ins.overdueCount === 0 } : null,
      icon: <FileDoneOutlined />,
      href: '/dashboard/accounts/invoices',
    },
    {
      label: 'To Pay',
      value: kpis ? inr(payable) : '—',
      badge: kpis && pendingApprovalCount ? { text: `${pendingApprovalCount} awaiting approval`, good: false } : null,
      icon: <ShopOutlined />,
      href: '/dashboard/accounts',
    },
    {
      label: 'Net Position',
      value: inr(net),
      badge: thisMonth ? { text: `${monthNet >= 0 ? '+' : ''}${inr(monthNet)} this month`, good: monthNet >= 0 } : null,
      icon: <WalletOutlined />,
      href: '/dashboard/accounts-ledger',
    },
  ];

  const exportSummary = (format: ExportFormat) => {
    const spec = {
      filename: 'Dashboard-Summary',
      sheetName: 'Dashboard Summary',
      headers: ['Month', 'Inflow', 'Outflow', 'Net', 'Payments'],
      rows: [
        ...trend.map((t) => [monthLabel(t.month) + ' ' + t.month.slice(0, 4), t.inflow, t.outflow, t.inflow - t.outflow, t.count]),
        ['Total (all time)', totalInflow, totalCost, net, ''],
        ['To receive', ins.receivable, '', '', ''],
        ['To pay', payable, '', '', ''],
      ],
    };
    if (format === 'excel') exportToExcel(spec);
    else void exportTableToPdf({ ...spec, subtitle: 'Master Dashboard' });
  };

  return (
    <div className="rise-stagger space-y-5">
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

      {/* Greeting + actions */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {greeting}{firstName ? `, ${firstName}` : ''} <span aria-hidden="true">{greetingIcon}</span>
          </h1>
          <p className="m-0 mt-1 text-sm text-[var(--text-muted)]">Stay on top of projects, money and approvals · {today}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label="Refresh"
            title="Refresh"
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--subtle-hover-bg)] disabled:opacity-60 ${isFetching ? '[&_.anticon]:animate-spin' : ''}`}
          >
            <ReloadOutlined />
          </button>
          <Select
            value={range}
            onChange={(v) => setRange(v)}
            aria-label="Period"
            style={{ width: 150 }}
            suffixIcon={<CalendarOutlined />}
            options={[
              { value: 6, label: 'Last 6 months' },
              { value: 12, label: 'Last 12 months' },
            ]}
          />
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                { key: 'pdf', icon: <FilePdfOutlined />, label: 'Export as PDF' },
                { key: 'excel', icon: <FileExcelOutlined />, label: 'Export as Excel' },
              ],
              onClick: ({ key }) => exportSummary(key as ExportFormat),
            }}
          >
            <Button type="primary" icon={<DownloadOutlined />}>Export</Button>
          </Dropdown>
        </div>
      </div>

      {/* Main block: sections divided by dashed lines */}
      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-transparent">
        {/* Update banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-[var(--border)] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${monthNet >= 0 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
              <ThunderboltOutlined />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {lastFull ? `${monthLabel(lastFull.month)} closed ${lastFull.inflow - lastFull.outflow >= 0 ? 'in profit' : 'in loss'}` : 'Cash update'}
                <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="truncate text-sm text-[var(--text-muted)]">
                {lastFull ? (
                  <>
                    Net{' '}
                    <span className={`font-semibold ${lastFull.inflow - lastFull.outflow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {lastFull.inflow - lastFull.outflow >= 0 ? '+' : ''}{inr(lastFull.inflow - lastFull.outflow)}
                    </span>
                    {' '}· this month so far{' '}
                    <span className={`font-semibold ${monthNet >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{monthNet >= 0 ? '+' : ''}{inr(monthNet)}</span>
                  </>
                ) : 'No payments recorded yet'}
              </div>
            </div>
          </div>
          <Link href="/dashboard/accounts-ledger" className={outlineBtn}>See ledger <ArrowRightOutlined /></Link>
        </div>

        {/* Cash flow chart + overview tiles */}
        <div className="grid grid-cols-1 border-b border-dashed border-[var(--border)] xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="min-w-0 xl:border-r xl:border-[var(--border)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><RiseOutlined /> Cash Flow</span>
              <Select
                size="small"
                value={range}
                onChange={(v) => setRange(v)}
                aria-label="Chart period"
                popupMatchSelectWidth={false}
                className="min-w-[132px]"
                options={[
                  { value: 6, label: 'Last 6 months' },
                  { value: 12, label: 'Last 12 months' },
                ]}
              />
            </div>
            <div className="px-5 pb-4 pt-4">
              {/* Money in / money out / net */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
                {[
                  { label: 'Money In', value: periodInflow, change: changeOf('inflow'), color: c.inflow, goodWhenUp: true },
                  { label: 'Money Out', value: periodOutflow, change: changeOf('outflow'), color: c.outflow, goodWhenUp: false },
                ].map((block) => (
                  <div key={block.label} className="rounded-xl border border-[var(--border)] px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: block.color }} /> {block.label}
                      </span>
                      {block.change !== null && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${(block.change >= 0) === block.goodWhenUp ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}
                          title={lastFull && prevFull ? `${monthLabel(lastFull.month)} vs ${monthLabel(prevFull.month)}` : undefined}
                        >
                          {block.change >= 0 ? '▲' : '▼'} {Math.abs(block.change).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-[var(--text-primary)]">
                      <CountUp value={block.value} format={(v) => inr(v)} />
                    </div>
                    <div className="text-[11px] text-[var(--text-very-muted)]">
                      last {range} months{lastFull && prevFull ? ` · ${monthLabel(lastFull.month)} vs ${monthLabel(prevFull.month)}` : ''}
                    </div>
                  </div>
                ))}
                <div className="flex flex-col justify-center rounded-xl border border-dashed border-[var(--border)] px-4 py-3 sm:min-w-[120px]">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Net</span>
                  <span className={`mt-1.5 text-xl font-bold tabular-nums ${periodInflow - periodOutflow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {periodInflow - periodOutflow >= 0 ? '+' : ''}{inr(periodInflow - periodOutflow)}
                  </span>
                </div>
              </div>

              {cashData.some((d) => d.inflow || d.outflow) ? (
                <div className="mt-4">
                  <ChartFrame height={240}>
                    {(width, height) => (
                      <AreaChart width={width} height={height} data={cashData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={6} />
                        <YAxis axisLine={false} tickLine={false} width={56} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(v: number) => inr(v)} />
                        <Tooltip content={<CashTooltip />} cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '4 4' }} />
                        <Area type="monotone" dataKey="inflow" name="Money In" stroke={c.inflow} strokeWidth={2.25} fill={c.inflow} fillOpacity={0.1} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--page-bg)' }} />
                        <Area type="monotone" dataKey="outflow" name="Money Out" stroke={c.outflow} strokeWidth={2.25} fill={c.outflow} fillOpacity={0.06} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--page-bg)' }} />
                      </AreaChart>
                    )}
                  </ChartFrame>
                </div>
              ) : (
                <Empty>No payments recorded in this period</Empty>
              )}
            </div>
          </div>

          <div className="min-w-0 border-t border-[var(--border)] xl:border-t-0">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3.5 text-sm font-semibold text-[var(--text-primary)]">
              <AppstoreOutlined /> Overview
            </div>
            <div className="grid grid-cols-2">
              {overviewTiles.map((tile, i) => (
                <Link
                  key={tile.label}
                  href={tile.href}
                  className={`group flex min-h-[150px] flex-col justify-between p-5 transition-colors hover:bg-[var(--subtle-bg)] ${i % 2 === 0 ? 'border-r border-[var(--border)]' : ''} ${i < 2 ? 'border-b border-[var(--border)]' : ''}`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-primary)]">{tile.icon}</span>
                  <span>
                    <span className="block text-2xl font-bold tabular-nums text-[var(--text-primary)]"><CountUp value={tile.value} format={(v) => Math.round(v).toLocaleString('en-IN')} /></span>
                    <span className="mt-0.5 block text-sm text-[var(--text-secondary)]">{tile.label}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Three stat cells */}
        <div className="grid grid-cols-1 divide-y divide-[var(--border)] md:grid-cols-3 md:divide-x md:divide-y-0">
          {statCells.map((cell) => (
            <div key={cell.label} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-[var(--text-secondary)]">{cell.label}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-bold tracking-tight tabular-nums text-[var(--text-primary)]">{cell.value}</span>
                    {cell.badge && (
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${cell.badge.good ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>{cell.badge.text}</span>
                    )}
                  </div>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-primary)]">{cell.icon}</span>
              </div>
              <Link href={cell.href} className={`${outlineBtn} mt-4`}>See details <ArrowRightOutlined /></Link>
            </div>
          ))}
        </div>
      </section>

      {/* Money position + project budgets */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel title="Receivables vs Payables" subtitle="Still to receive vs still to pay (not yet settled)">
          {(() => {
            const slices = [
              { key: 'receive', label: 'To receive', color: '#10b981', value: ins.receivable },
              { key: 'material', label: 'Material payable', color: '#06b6d4', value: Number(kpis?.payableByCategory?.material?.amount || 0) },
              { key: 'subcontractor', label: 'Sub Contractor payable', color: '#3b82f6', value: Number(kpis?.payableByCategory?.subcontractor?.amount || 0) },
              { key: 'labour', label: 'Labour payable', color: '#f59e0b', value: Number(kpis?.payableByCategory?.labour?.amount || 0) },
              { key: 'expenses', label: 'Expenses payable', color: '#a855f7', value: Number(kpis?.payableByCategory?.expenses?.amount || 0) },
            ];
            const net = ins.receivable - payable;
            return (
              <>
                <div className="flex justify-center py-2">
                  <Donut
                    size={196}
                    thickness={32}
                    parts={slices}
                    activeKey={moneyHover}
                    onActiveChange={setMoneyHover}
                    center={
                      <>
                        <span className={`text-2xl font-bold tabular-nums ${net >= 0 ? 'text-[var(--text-primary)]' : 'text-rose-500'}`}><CountUp value={net} format={inr} /></span>
                        <span className="mt-0.5 text-xs text-[var(--text-muted)]">Net outstanding</span>
                      </>
                    }
                  />
                </div>

                <div className="mt-6 space-y-1.5">
                  {slices.map((slice, i) => (
                    <div
                      key={slice.key}
                      style={{ animationDelay: `${350 + i * 80}ms` }}
                      onMouseEnter={() => setMoneyHover(slice.value > 0 ? slice.key : null)}
                      onMouseLeave={() => setMoneyHover(null)}
                      className={`animate-rise -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-sm transition-opacity ${moneyHover && moneyHover !== slice.key ? 'opacity-40' : ''} ${moneyHover === slice.key ? 'bg-[var(--subtle-bg)]' : ''}`}
                    >
                      <span className="flex min-w-0 items-center gap-3 text-[var(--text-secondary)]">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: slice.color }} />
                        <span className="truncate">{slice.label}</span>
                      </span>
                      <span className="shrink-0 font-bold tabular-nums text-[var(--text-primary)]"><CountUp value={slice.value} format={inr} /></span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4 text-sm">
                  <span className="text-[var(--text-muted)]">
                    {ins.overdueCount > 0 ? `${inr(ins.overdueAmount)} of receivables overdue` : 'No receivables overdue'}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {payable > 0 ? `${((ins.receivable / payable) * 100).toFixed(0)}% covered` : '—'}
                  </span>
                </div>
                {!kpis && <div className="mt-2 text-xs text-[var(--text-muted)]">Payables summary unavailable</div>}
              </>
            );
          })()}
        </Panel>

      <Panel
        className="xl:col-span-2"
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
      </div>

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
