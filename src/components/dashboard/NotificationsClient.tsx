'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { App, Pagination, Select } from 'antd';
import {
  AuditOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckOutlined,
  CreditCardOutlined,
  FileDoneOutlined,
  InboxOutlined,
  RightOutlined,
  SearchOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { clientApiFetch } from '@/lib/client-api';
import { ListSkeleton } from '@/components/dashboard/Skeletons';
import { useClientPagination } from './DataTablePanel';
import { useDashboardRouter } from '@/components/dashboard/navigation';

const PAGE_SIZES = [10, 20, 50];

type AppNotification = {
  id: string;
  type: string;
  title: string;
  message?: string | null;
  link?: string | null;
  actorName?: string | null;
  createdAt?: string;
  isRead: boolean;
};

type CategoryKey = 'payment' | 'bill' | 'timesheet' | 'expense' | 'request' | 'other';

// Category is inferred from the notification's type/title so each one gets a
// matching icon and colour, and can be filtered.
const CATEGORIES: Record<CategoryKey, { label: string; icon: ReactNode; color: string; match: RegExp }> = {
  payment: { label: 'Payments', icon: <CreditCardOutlined />, color: '#10b981', match: /payment|paid|advance/i },
  bill: { label: 'Bills', icon: <FileDoneOutlined />, color: '#f59e0b', match: /bill|invoice/i },
  timesheet: { label: 'Timesheets', icon: <CalendarOutlined />, color: '#0ea5e9', match: /week|timesheet|attendance|trade|labour/i },
  expense: { label: 'Expenses', icon: <WalletOutlined />, color: '#f43f5e', match: /expense/i },
  request: { label: 'Requests', icon: <AuditOutlined />, color: '#8b5cf6', match: /request|enquiry|material|order|query/i },
  other: { label: 'Other', icon: <BellOutlined />, color: '#64748b', match: /.^/ },
};
const CATEGORY_ORDER: CategoryKey[] = ['payment', 'bill', 'timesheet', 'expense', 'request', 'other'];

function categoryOf(n: AppNotification): CategoryKey {
  const text = `${n.type} ${n.title}`;
  return CATEGORY_ORDER.find((key) => key !== 'other' && CATEGORIES[key].match.test(text)) ?? 'other';
}

function timeAgo(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function fullTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function groupLabel(value?: string) {
  if (!value) return 'Earlier';
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = 86_400_000;
  const t = date.getTime();
  if (t >= today.getTime()) return 'Today';
  if (t >= today.getTime() - day) return 'Yesterday';
  if (t >= today.getTime() - 6 * day) return 'This week';
  return 'Earlier';
}
const GROUP_ORDER = ['Today', 'Yesterday', 'This week', 'Earlier'];

// Every notification for the signed-in user. Opening one marks it read and
// goes to the page it points at.
export function NotificationsClient() {
  const router = useDashboardRouter();
  const { message } = App.useApp();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [category, setCategory] = useState<CategoryKey | 'any'>('any');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    clientApiFetch<AppNotification[]>('/notifications?limit=500')
      .then((data) => { if (!cancelled) setItems(Array.isArray(data) ? data : []); })
      .catch((err) => { if (!cancelled) message.error(err instanceof Error ? err.message : 'Failed to load notifications'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [message]);

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);
  const categoryCounts = useMemo(() => {
    const counts = new Map<CategoryKey, number>();
    for (const n of items) counts.set(categoryOf(n), (counts.get(categoryOf(n)) || 0) + 1);
    return counts;
  }, [items]);

  const query = search.trim().toLowerCase();
  const shown = items.filter((n) => {
    if (tab === 'unread' && n.isRead) return false;
    if (category !== 'any' && categoryOf(n) !== category) return false;
    if (query && !`${n.title} ${n.message || ''} ${n.actorName || ''}`.toLowerCase().includes(query)) return false;
    return true;
  });
  const pager = useClientPagination(shown, 10);
  const groups = GROUP_ORDER
    .map((label) => ({ label, items: pager.pageRows.filter((n) => groupLabel(n.createdAt) === label) }))
    .filter((g) => g.items.length);

  const openNotification = (n: AppNotification) => {
    if (!n.isRead) {
      // Mark read right away in the list; the server call runs alongside.
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      void clientApiFetch(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
    }
    if (n.link) router.push(n.link);
  };

  const markAllRead = () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    clientApiFetch('/notifications/read-all', { method: 'PATCH' })
      .then(() => message.success('All notifications marked as read'))
      .catch((err) => message.error(err instanceof Error ? err.message : 'Failed to mark all as read'));
  };

  const pill = (active: boolean) =>
    `inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
      active
        ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--card-bg)]'
        : 'border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]'
    }`;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Notifications</h1>
          <p className="m-0 mt-1 text-sm text-[var(--text-muted)]">
            {loading ? 'Loading…' : unreadCount ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : "You're all caught up"}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--subtle-hover-bg)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckOutlined /> Mark all as read
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button type="button" className={pill(tab === 'all')} onClick={() => { setTab('all'); pager.reset(); }}>
                All <span className="opacity-60">{items.length}</span>
              </button>
              <button type="button" className={pill(tab === 'unread')} onClick={() => { setTab('unread'); pager.reset(); }}>
                Unread
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 text-[11px] leading-[18px] text-white">{unreadCount}</span>
                )}
              </button>
            </div>
            <label className="flex h-10 w-full cursor-text items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--subtle-bg)] px-3 text-[var(--text-muted)] transition-all hover:border-[var(--text-very-muted)] focus-within:border-[var(--text-secondary)] focus-within:bg-[var(--card-bg)] focus-within:text-[var(--text-primary)] focus-within:shadow-[0_0_0_3px_var(--subtle-hover-bg)] sm:w-72">
              <SearchOutlined />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); pager.reset(); }}
                placeholder="Search notifications"
                aria-label="Search notifications"
                className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--text-primary)] outline-none! placeholder:text-[var(--text-muted)]"
              />
            </label>
          </div>
          {categoryCounts.size > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setCategory('any'); pager.reset(); }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${category === 'any' ? 'bg-[var(--subtle-hover-bg)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                All types
              </button>
              {CATEGORY_ORDER.filter((key) => categoryCounts.get(key)).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setCategory(key); pager.reset(); }}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${category === key ? 'bg-[var(--subtle-hover-bg)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: CATEGORIES[key].color }} />
                  {CATEGORIES[key].label}
                  <span className="opacity-60">{categoryCounts.get(key)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="p-5"><ListSkeleton rows={6} /></div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--subtle-hover-bg)] text-2xl text-[var(--text-muted)]">
              <InboxOutlined />
            </span>
            <h3 className="m-0 mt-4 text-base font-semibold text-[var(--text-primary)]">
              {query ? 'No matches' : tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="m-0 mt-1 text-sm text-[var(--text-muted)]">
              {query ? `Nothing matches “${search}”.` : "When something needs your attention, it'll show up here."}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.label}>
              <div className="sticky top-0 z-[1] border-b border-[var(--border)] bg-[var(--card-bg)] px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-very-muted)]">
                {group.label}
              </div>
              <ul className="m-0 list-none p-0">
                {group.items.map((n) => {
                  const cat = CATEGORIES[categoryOf(n)];
                  return (
                    <li key={n.id} className="border-b border-[var(--border)] last:border-b-0">
                      <button
                        type="button"
                        onClick={() => openNotification(n)}
                        className={`group flex w-full cursor-pointer items-start gap-4 border-0 px-5 py-4 text-left transition-colors hover:bg-[var(--subtle-hover-bg)] ${n.isRead ? 'bg-transparent' : 'bg-[var(--subtle-bg)]'}`}
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base"
                          style={{ background: `${cat.color}1f`, color: cat.color }}
                        >
                          {cat.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-3">
                            <span className={`text-sm ${n.isRead ? 'font-medium text-[var(--text-secondary)]' : 'font-semibold text-[var(--text-primary)]'}`}>
                              {n.title}
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                              <span className="text-xs text-[var(--text-muted)]" title={fullTime(n.createdAt)}>{timeAgo(n.createdAt)}</span>
                              {!n.isRead && <span className="h-2 w-2 rounded-full bg-[var(--primary)]" aria-label="Unread" />}
                            </span>
                          </span>
                          {n.message && (
                            <span className="mt-0.5 block text-sm leading-relaxed text-[var(--text-muted)]">{n.message}</span>
                          )}
                          <span className="mt-1.5 flex items-center gap-2 text-xs text-[var(--text-very-muted)]">
                            <span className="rounded px-1.5 py-0.5 font-medium" style={{ background: `${cat.color}14`, color: cat.color }}>{cat.label}</span>
                            {n.actorName && <span>by {n.actorName}</span>}
                          </span>
                        </span>
                        {n.link && (
                          <RightOutlined className="mt-3 text-xs text-[var(--text-muted)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        {!loading && pager.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3">
            <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
              <span>
                Showing <strong className="text-[var(--text-primary)]">{pager.start + 1}</strong>–
                <strong className="text-[var(--text-primary)]">{Math.min(pager.start + pager.size, pager.total)}</strong> of{' '}
                <strong className="text-[var(--text-primary)]">{pager.total}</strong>
              </span>
              <Select
                size="small"
                value={pager.size}
                onChange={pager.setSize}
                aria-label="Notifications per page"
                style={{ width: 96 }}
                options={PAGE_SIZES.map((v) => ({ value: v, label: `${v} / page` }))}
              />
            </div>
            <Pagination
              size="small"
              current={pager.page}
              pageSize={pager.size}
              total={pager.total}
              showSizeChanger={false}
              hideOnSinglePage
              onChange={(page) => { pager.setPage(page); document.getElementById('main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
