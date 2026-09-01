'use client';

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

export const cardClassName = 'rounded-xl! border! border-[var(--border)]! bg-[var(--subtle-bg)]!';
export const pageHeaderClassName = 'mb-[13px]! flex flex-wrap items-center justify-between gap-4';
export const pageTitleClassName = 'm-0! text-[var(--text-primary)]!';
export const titleIconClassName = 'mr-2';
export const mutedTextClassName = 'text-[var(--text-very-muted)]!';
export const secondaryTextClassName = 'text-[var(--text-muted)]!';

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
