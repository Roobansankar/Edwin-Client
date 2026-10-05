'use client';

import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import { Card, Statistic, Tag, Typography } from 'antd';

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

export const cardClassName = 'rounded-xl! border! border-[var(--border)]! bg-[var(--subtle-bg)]!';
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
  return (
    <Card
      className={`${kpiCardClassNames[tone]} h-full ${onClick ? 'cursor-pointer' : ''}`}
      size="small"
      hoverable={!!onClick}
      onClick={onClick}
    >
      <Statistic
        title={<Typography.Text className={secondaryTextClassName}>{title}</Typography.Text>}
        value={value}
        prefix={icon}
        classNames={statisticClassNames}
      />
      {note && (
        <Typography.Text className={`mt-1 block ${secondaryTextClassName}`} style={{ fontSize: 14 }}>
          {note}
        </Typography.Text>
      )}
    </Card>
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
