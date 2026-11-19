'use client';

import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import { Tag } from 'antd';

const statusColors: Record<string, string> = {
  planning: 'blue',
  in_progress: 'processing',
  on_hold: 'warning',
  completed: 'success',
  draft: 'default',
  issued: 'processing',
  partially_received: 'orange',
  sent: 'processing',
  approved: 'success',
  paid: 'success',
  unpaid: 'error',
  partial: 'warning',
  overdue: 'error',
  cancelled: 'default',
  pending: 'warning',
  admin_approved: 'purple',
  rejected: 'error',
  staff: 'geekblue',
  office: 'purple',
  transport: 'cyan',
  travel: 'gold',
  material: 'cyan',
  labour: 'orange',
  rent: 'magenta',
  accommodation: 'blue',
  office_maintenance: 'purple',
  staff_expense: 'geekblue',
};

export const cardClassName = 'rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!';
export const pageHeaderClassName = 'mb-[13px]! flex flex-wrap items-center justify-between gap-4';
export const pageTitleClassName = 'm-0! text-[var(--text-primary)]!';
export const titleIconClassName = 'mr-2';
export const mutedTextClassName = 'text-[var(--text-very-muted)]!';
export const secondaryTextClassName = 'text-[var(--text-muted)]!';

// KPI card + Statistic styling shared by the role dashboards (Master, Purchase,
// Accounts Manager, Engineer) so every dashboard uses the same sizes and colours.
export const statisticClassNames = { content: 'text-[var(--text-primary)]! font-bold!' };

export const kpiCardClassNames = {
  blue: 'rounded-xl! border! border-blue-500/20! bg-linear-to-br! from-blue-500/15! to-blue-500/5!',
  green: 'rounded-xl! border! border-emerald-500/20! bg-linear-to-br! from-emerald-500/15! to-emerald-500/5!',
  amber: 'rounded-xl! border! border-amber-500/20! bg-linear-to-br! from-amber-500/15! to-amber-500/5!',
  violet: 'rounded-xl! border! border-violet-500/20! bg-linear-to-br! from-violet-500/15! to-violet-500/5!',
  purple: 'rounded-xl! border! border-purple-500/20! bg-linear-to-br! from-purple-500/15! to-purple-500/5!',
  orange: 'rounded-xl! border! border-orange-500/20! bg-linear-to-br! from-orange-500/15! to-orange-500/5!',
  rose: 'rounded-xl! border! border-rose-500/20! bg-linear-to-br! from-rose-500/15! to-rose-500/5!',
};

export type KpiTone = keyof typeof kpiCardClassNames;

// One KPI tile, drawn the same way on the Master, Purchase, Accounts Manager
// and Engineer dashboards: muted title, bold value, coloured icon, optional note.
const kpiToneColors: Record<KpiTone, string> = {
  blue: '#3b82f6',
  green: '#10b981',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  purple: '#a855f7',
  orange: '#f97316',
  rose: '#f43f5e',
};

export function KpiCard({
  tone,
  title,
  value,
  icon,
  note,
  onClick,
}: {
  tone: KpiTone;
  title: string;
  value: number | string;
  icon: ReactNode;
  note?: ReactNode;
  onClick?: () => void;
}) {
  const color = kpiToneColors[tone];
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`group h-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 transition-colors ${onClick ? 'cursor-pointer hover:border-[var(--text-muted)]' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--text-muted)]">{title}</span>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm [&_.anticon]:text-inherit!"
          style={{ background: `${color}1a`, color }}
        >
          {icon}
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-[var(--text-primary)]">{value}</div>
      <div className="mt-1 flex min-h-4 items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
        <span className="min-w-0 truncate">{note}</span>
      </div>
    </div>
  );
}

// Monday of the week that contains the date (weeks run Monday to Sunday).
export function weekStartOf(dateStr?: string | null) {
  const d = dayjs((dateStr || '').split('T')[0]);
  return d.isValid() ? d.subtract((d.day() + 6) % 7, 'day') : null;
}

// e.g. "Sep 7 to 13" or "Sep 28 to Oct 4".
export function weekRangeLabel(dateStr?: string | null) {
  const start = weekStartOf(dateStr);
  if (!start) return '-';
  const end = start.add(6, 'day');
  return `${start.format('MMM D')} to ${end.format(start.month() === end.month() ? 'D' : 'MMM D')}`;
}

export function formatCurrency(value: number | string | null | undefined) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}

export function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  // Intl.DateTimeFormat#format throws RangeError: Invalid time value on a bad
  // date instead of just rendering something odd — one malformed date field
  // anywhere in a table would otherwise crash the whole page's render.
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function titleCase(value?: string | null) {
  if (!value) return '-';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function StatusTag({ value }: { value?: string | null }) {
  if (!value) return <Tag>-</Tag>;
  return <Tag color={statusColors[value] || 'default'}>{titleCase(value)}</Tag>;
}

export function getPagedData<T>(result: T[] | { data?: T[] } | null | undefined): T[] {
  if (Array.isArray(result)) return result;
  return result?.data || [];
}
