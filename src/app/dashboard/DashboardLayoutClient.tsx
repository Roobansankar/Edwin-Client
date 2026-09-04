'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { App } from 'antd';
import {
  Bell,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileCheck,
  FileCheck2,
  FileSearch,
  FileText,
  FolderKanban,
  FolderOpen,
  Image as ImageIcon,
  Inbox,
  IndianRupee,
  Landmark,
  LayoutGrid,
  LogOut,
  Moon,
  MessageSquareText,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Sun,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { formatDate, titleCase } from '@/components/dashboard/ui';
import type { EmployeeQuery } from '@/types/erp';

const SIDEBAR_WIDTH = 280;
const COLLAPSED_WIDTH = 60;

type NavItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  allowedRoles?: string[];
  allowedStaffTypes?: string[];
};

type AppNotification = {
  id: string;
  type: string;
  title: string;
  message?: string | null;
  link?: string | null;
  entityId?: string | null;
  actorName?: string | null;
  createdAt?: string;
  isRead: boolean;
};

const navigationSections: Array<{ title: string; items: NavItem[]; allowedRoles?: string[] }> = [
  {
    title: 'Workspace',
    items: [
      { key: '/dashboard', icon: <LayoutGrid />, label: 'Dashboard', allowedRoles: ['admin', 'accounts_manager', 'site_engineer', 'purchase_team'] },
      { key: '/dashboard/new', icon: <ClipboardList />, label: 'Daily Entry List', allowedRoles: ['site_engineer'] },
      { key: '/dashboard/expenses/new', icon: <Wallet />, label: 'Expense', allowedRoles: ['site_engineer'] },
      { key: '/dashboard/timesheet-attendance', icon: <Calendar />, label: 'Timesheet', allowedRoles: ['site_engineer', 'purchase_team', 'admin'] },
      { key: '/dashboard/projects', icon: <FolderOpen />, label: 'Projects', allowedRoles: ['admin'] },
      { key: '/dashboard/vendors', icon: <Users />, label: 'Vendors', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/material-requirement', icon: <FileSearch />, label: 'Material Requirement Request', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/purchase-enquiry', icon: <ClipboardCheck />, label: 'Purchase Enquiry', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/purchase-orders', icon: <FileCheck2 />, label: 'Purchase Orders', allowedRoles: ['purchase_team', 'accounts_manager'] },
      { key: '/dashboard/material-received', icon: <Inbox />, label: 'Material Received', allowedRoles: ['site_engineer', 'purchase_team'] },
      { key: '/dashboard/subcontractors', icon: <Users />, label: 'Subcontractors', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/subcontract-work-orders', icon: <FileText />, label: 'Subcontract WO', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/site-engineers', icon: <User />, label: 'Site Engineers', allowedRoles: ['admin'] },
      { key: '/dashboard/assigned-projects', icon: <FolderKanban />, label: 'Assigned Projects', allowedRoles: ['admin'] },
      { key: '/dashboard/office-staff', icon: <Users />, label: 'Office Staff', allowedRoles: ['admin'] },
      { key: '/dashboard/employee-queries', icon: <MessageSquareText />, label: 'Employee Queries', allowedRoles: ['admin'] },
      { key: '/dashboard/subcontractor-work', icon: <Users />, label: 'Subcontractor Work', allowedRoles: ['site_engineer', 'purchase_team'] },
      { key: '/dashboard/material-requirement', icon: <FileSearch />, label: 'Material Requirement', allowedRoles: ['site_engineer'] },
      { key: '/dashboard/report', icon: <FileText />, label: 'My Report', allowedRoles: ['site_engineer'] },
      { key: '/dashboard/reports', icon: <FileText />, label: 'Reports', allowedRoles: ['admin'] },
      { key: '/dashboard/project-access', icon: <ShieldCheck />, label: 'Project Access', allowedRoles: ['admin'] },
      { key: '/dashboard/architecture', icon: <Network />, label: 'System Architecture', allowedRoles: ['admin'] },
    ],
  },
  {
    title: 'Payments',
    allowedRoles: ['purchase_team'],
    items: [
      { key: '/dashboard/advance', icon: <IndianRupee />, label: 'Vendor Payments', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/subcontractor-payments', icon: <IndianRupee />, label: 'Subcontractor Payments', allowedRoles: ['purchase_team'] },
    ],
  },
  {
    title: 'Finance',
    allowedRoles: ['admin', 'accounts_manager', 'purchase_team'],
    items: [
      { key: '/dashboard/accounts', icon: <Landmark />, label: 'Accounts', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/accounts/invoices', icon: <FileCheck2 />, label: 'Invoices', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/accounts/bills', icon: <FileCheck />, label: 'Purchase Bills', allowedRoles: ['admin', 'accounts_manager', 'purchase_team'] },
      { key: '/dashboard/timesheet-attendance', icon: <Calendar />, label: 'Timesheet', allowedRoles: ['accounts_manager'] },
      { key: '/dashboard/site-engineer-attendance', icon: <Users />, label: 'Timesheet Approvals', allowedRoles: ['admin'] },
      { key: '/dashboard/approvals', icon: <ShieldCheck />, label: 'Approvals', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/advance-requests', icon: <IndianRupee />, label: 'Vendor Payment Requests', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/subcontractor-payment-requests', icon: <IndianRupee />, label: 'Subcontractor Payment Requests', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/expenses', icon: <Wallet />, label: 'Expenses', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/payments', icon: <CreditCard />, label: 'Payments', allowedRoles: ['admin', 'accounts_manager'] },
    ],
  },
  {
    title: 'For Office Staff',
    allowedRoles: ['admin', 'office_staff'],
    items: [
      { key: '/dashboard/timesheet-attendance', icon: <Calendar />, label: 'Timesheet', allowedRoles: ['office_staff'] },
      { key: '/dashboard/dpr', icon: <Calendar />, label: 'Daily Reports (DPR)', allowedRoles: ['office_staff'] },
      { key: '/dashboard/expenses/new', icon: <Wallet />, label: 'Expense', allowedRoles: ['office_staff'] },
      { key: '/dashboard/drawings', icon: <ImageIcon />, label: 'Drawings', allowedRoles: ['office_staff'] },
      { key: '/dashboard/accounts/invoices', icon: <FileCheck2 />, label: 'Invoice', allowedRoles: ['office_staff'], allowedStaffTypes: ['Project Coordinator'] },
    ],
  },
  {
    title: 'Settings',
    allowedRoles: ['admin'],
    items: [
      { key: '/dashboard/profile', icon: <User />, label: 'Profile', allowedRoles: ['admin'] },
      { key: '/dashboard/salary', icon: <IndianRupee />, label: 'Salary', allowedRoles: ['admin'] },
    ],
  },
];

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const { mode, toggle: toggleTheme } = useThemeStore();

  const [pendingEqCount, setPendingEqCount] = useState(0);
  const [pendingQueries, setPendingQueries] = useState<EmployeeQuery[]>([]);
  const [adminNotifOpen, setAdminNotifOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setPendingEqCount(0);
      setPendingQueries([]);
      return;
    }

    if (pathname === '/dashboard/employee-queries') {
      localStorage.setItem('eq_last_seen_at', new Date().toISOString());
      setPendingEqCount(0);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/backend/employee-queries?status=pending');
        if (!res.ok || cancelled) return;
        const data: EmployeeQuery[] = await res.json();
        setPendingQueries(data);
        const lastSeenAt = localStorage.getItem('eq_last_seen_at');
        const unseen = lastSeenAt ? data.filter((q) => !q.createdAt || q.createdAt > lastSeenAt) : data;
        if (!cancelled) setPendingEqCount(unseen.length);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [user?.role, pathname]);

  const markPendingSeen = () => {
    localStorage.setItem('eq_last_seen_at', new Date().toISOString());
    setPendingEqCount(0);
  };

  const [notifOpen, setNotifOpen] = useState(false);
  const [responses, setResponses] = useState<EmployeeQuery[]>([]);
  const [unseenResponseCount, setUnseenResponseCount] = useState(0);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [unseenNotifCount, setUnseenNotifCount] = useState(0);
  const canSeeNotifications = user?.role === 'site_engineer' || user?.role === 'purchase_team' || user?.role === 'accounts_manager';
  const fetchesAppNotifications = canSeeNotifications || user?.role === 'admin';

  useEffect(() => {
    if (!canSeeNotifications || !user) {
      setUnseenResponseCount(0);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/backend/employee-queries');
        if (!res.ok || cancelled) return;
        const data: EmployeeQuery[] = await res.json();
        const responded = data.filter((q) => q.status !== 'pending');
        if (cancelled) return;
        setResponses(responded);
        const seenAt = localStorage.getItem(`eq_notif_seen_${user.id}`);
        const unseen = seenAt
          ? responded.filter((q) => q.respondedAt && q.respondedAt > seenAt)
          : responded;
        setUnseenResponseCount(unseen.length);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [canSeeNotifications, user, pathname]);

  const markResponsesSeen = () => {
    if (!user) return;
    localStorage.setItem(`eq_notif_seen_${user.id}`, new Date().toISOString());
    setUnseenResponseCount(0);
  };

  useEffect(() => {
    if (!fetchesAppNotifications || !user) {
      setAppNotifications([]);
      setUnseenNotifCount(0);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/backend/notifications');
        if (!res.ok || cancelled) return;
        const data: AppNotification[] = await res.json();
        if (cancelled) return;
        setAppNotifications(data);
        setUnseenNotifCount(data.filter((n) => !n.isRead).length);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [fetchesAppNotifications, user, pathname]);

  const markNotificationsSeen = () => {
    if (!user) return;
    setUnseenNotifCount(0);
    void fetch('/api/backend/notifications/read-all', { method: 'PATCH' }).catch(() => {});
  };

  const [dismissedNotifIds, setDismissedNotifIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(`dismissed_notifs_${user.id}`);
      setDismissedNotifIds(raw ? new Set(JSON.parse(raw)) : new Set());
    } catch {
      setDismissedNotifIds(new Set());
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(`dismissed_notifs_${user.id}`, JSON.stringify([...dismissedNotifIds]));
    } catch { /* ignore */ }
  }, [dismissedNotifIds, user]);

  const dismissNotification = (id: string) => {
    setDismissedNotifIds((prev) => new Set(prev).add(id));
    setAppNotifications((prev) => prev.filter((n) => n.id !== id));
    setResponses((prev) => prev.filter((r) => r.id !== id));
    setPendingQueries((prev) => prev.filter((q) => q.id !== id));
  };

  const visibleAppNotifications = appNotifications.filter((n) => !dismissedNotifIds.has(n.id));
  const visibleResponses = responses.filter((r) => !dismissedNotifIds.has(r.id));
  const visiblePendingQueries = pendingQueries.filter((q) => !dismissedNotifIds.has(q.id));

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 992);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  const sidebarWidth = isMobile ? 0 : (collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH);
  const effectiveCollapsed = isMobile ? false : collapsed;

  const filteredNavigationSections = useMemo(() => {
    const role = user?.role || 'viewer';
    const staffType = user?.staffType || '';
    const matchesStaffType = (item: NavItem) => !item.allowedStaffTypes || item.allowedStaffTypes.includes(staffType);

    const mappedSections = navigationSections
      .filter((section) => !section.allowedRoles || section.allowedRoles.includes(role))
      .map((section) => ({
        ...section,
        title: role === 'office_staff' && section.title === 'For Office Staff' ? '' : section.title,
        items: section.items.filter((item) => (!item.allowedRoles || item.allowedRoles.includes(role)) && matchesStaffType(item)),
      }))
      .filter((section) => section.items.length > 0);

    // A section whose title was blanked out for this role (e.g. "For Office
    // Staff" shown to an office_staff user) has nothing to label it, so fold
    // its items into the previous section instead of rendering a second,
    // visually-gapped nav block right under it.
    return mappedSections.reduce<typeof mappedSections>((acc, section) => {
      if (!section.title && acc.length > 0) {
        acc[acc.length - 1].items = [...acc[acc.length - 1].items, ...section.items];
        return acc;
      }
      acc.push(section);
      return acc;
    }, []);
  }, [user]);

  const navItems = useMemo(() => {
    return filteredNavigationSections.flatMap((section) => section.items);
  }, [filteredNavigationSections]);

  const selectedKey = useMemo(() => {
    // Daily labour entry form (/dashboard/new) and detail (/dashboard/daily-labour/:id)
    // should both highlight "Daily Entry List" in the sidebar
    if (pathname.startsWith('/dashboard/daily-labour/')) {
      return '/dashboard/new';
    }

    const match = navItems
      .filter((item) => pathname === item.key || pathname.startsWith(`${item.key}/`))
      .sort((a, b) => b.key.length - a.key.length)[0];

    return match?.key || '/dashboard';
  }, [pathname, navItems]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
    router.push('/login');
  };

  const adminNotifBody = (
    <>
      {visibleAppNotifications.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-very-muted)]">
            Updates
          </p>
          <div className="flex flex-col gap-2">
            {visibleAppNotifications.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className={`relative cursor-pointer rounded-lg border p-2 pr-7 transition hover:bg-[var(--subtle-hover-bg)] ${
                  n.isRead ? 'border-[var(--border)] opacity-70' : 'border-[var(--primary)]/40 bg-[var(--primary-lighter)]'
                }`}
                onClick={() => {
                  setAdminNotifOpen(false);
                  router.push(n.link || '/dashboard/advance-requests');
                }}
              >
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismissNotification(n.id); }}
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
                  aria-label="Dismiss notification"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
                <p className="text-sm">
                  {n.actorName && <strong>{n.actorName}: </strong>}
                  {n.title} — {n.message}
                </p>
                {n.createdAt && (
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {formatDate(n.createdAt)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-very-muted)]">
        Edit Requests
      </p>
      {visiblePendingQueries.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No pending edit requests</p>
      ) : (
        <div className="flex flex-col gap-2">
          {visiblePendingQueries.slice(0, 20).map((q) => (
            <div
              key={q.id}
              className="relative cursor-pointer rounded-lg border border-[var(--border)] p-2 pr-7 transition hover:bg-[var(--subtle-hover-bg)]"
              onClick={() => {
                setAdminNotifOpen(false);
                router.push('/dashboard/employee-queries');
              }}
            >
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismissNotification(q.id); }}
                className="absolute right-1.5 top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
                aria-label="Dismiss notification"
              >
                <X className="h-2.5 w-2.5" />
              </button>
              <p className="text-sm">
                <strong>{q.siteEngineer?.name || 'Someone'}</strong>
                {q.siteEngineer?.role && ` (${titleCase(q.siteEngineer.role)})`} requested edit access for timesheet
              </p>
              {q.timesheet && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Week: {formatDate(q.timesheet.weekStart)} - {formatDate(q.timesheet.weekEnd)}
                </p>
              )}
              <p className="mt-1 text-xs italic text-[var(--text-muted)]">&ldquo;{q.reason}&rdquo;</p>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const notifBody = (
    <>
      {visibleAppNotifications.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-very-muted)]">
            Updates
          </p>
          <div className="flex flex-col gap-2">
            {visibleAppNotifications.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className={`relative cursor-pointer rounded-lg border p-2 pr-7 transition hover:bg-[var(--subtle-hover-bg)] ${
                  n.isRead ? 'border-[var(--border)] opacity-70' : 'border-[var(--primary)]/40 bg-[var(--primary-lighter)]'
                }`}
                onClick={() => {
                  setNotifOpen(false);
                  router.push(n.link || (user?.role === 'accounts_manager' ? '/dashboard/accounts/bills' : '/dashboard/material-requirement'));
                }}
              >
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismissNotification(n.id); }}
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
                  aria-label="Dismiss notification"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
                <p className="text-sm">
                  {n.actorName && <strong>{n.actorName}: </strong>}
                  {n.title} — {n.message}
                </p>
                {n.createdAt && (
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {formatDate(n.createdAt)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-very-muted)]">
        Edit Request Updates
      </p>
      {visibleResponses.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No responses yet</p>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleResponses.slice(0, 20).map((r) => (
            <div key={r.id} className="relative rounded-lg border border-[var(--border)] p-2 pr-7">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismissNotification(r.id); }}
                className="absolute right-1.5 top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
                aria-label="Dismiss notification"
              >
                <X className="h-2.5 w-2.5" />
              </button>
              <div className="flex items-center justify-between">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${r.status === 'approved' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'}`}>
                  {r.status.toUpperCase()}
                </span>
                <span className="text-xs text-[var(--text-muted)]">{formatDate(r.respondedAt)}</span>
              </div>
              <p className="mt-1 text-xs">{r.reason}</p>
              {r.timesheet && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Week: {formatDate(r.timesheet.weekStart)} - {formatDate(r.timesheet.weekEnd)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  const sidebarLogo = (collapsedMode: boolean) => (
    <div
      className={`flex h-[70px] shrink-0 items-center border-b border-[var(--border)] ${
        collapsedMode ? 'justify-center px-0' : 'gap-3 px-6'
      }`}
    >
      <img src="/logo.png" alt="Edwin Constructions" className="h-12 w-12 shrink-0 object-contain" />
      {!collapsedMode && <span className="truncate text-sm font-semibold text-white">Edwin Constructions</span>}
    </div>
  );

  const sidebarNav = (collapsedMode: boolean) => (
    <div className="min-h-0 flex-1 overflow-y-auto py-4">
      {filteredNavigationSections.map((section, index) => (
        <div key={`${section.title}-${index}`} className={`${section.title ? 'mb-5' : 'mb-0'} last:mb-0`}>
          {!collapsedMode && section.title && (
            <p className="mb-1.5 px-6 text-sm font-medium text-[var(--sidebar-text-muted)]">{section.title}</p>
          )}
          <nav className="flex flex-col gap-0.5 px-2">
            {section.items.map((item) => {
              const isSelected = selectedKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  title={collapsedMode ? item.label : undefined}
                  onClick={() => router.push(item.key)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm transition [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:shrink-0 ${
                    collapsedMode ? 'justify-center px-0' : ''
                  } ${
                    isSelected
                      ? 'bg-[rgba(56,189,248,0.14)] text-[#e0f2fe]'
                      : 'text-[#cbd5e1] hover:bg-white/10 hover:text-[#f8fafc]'
                  }`}
                >
                  {item.icon}
                  {!collapsedMode && (
                    <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                      <span className="truncate">{item.label}</span>
                      {item.key === '/dashboard/employee-queries' && pendingEqCount > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                          {pendingEqCount}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <App>
      <div className="min-h-screen bg-[var(--page-bg)]">
        {!isMobile && (
          <aside
            style={{ width: sidebarWidth }}
            className="fixed left-0 top-0 bottom-0 z-100 flex h-screen flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--sidebar-bg)] transition-[width] duration-300 ease-in-out"
          >
            {sidebarLogo(effectiveCollapsed)}
            {sidebarNav(effectiveCollapsed)}
          </aside>
        )}

        {isMobile && (
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="left" showClose={false} className="flex w-[280px] flex-col bg-[var(--sidebar-bg)] p-0">
              {sidebarLogo(false)}
              {sidebarNav(false)}
            </SheetContent>
          </Sheet>
        )}

        <div
          className="min-w-0 transition-[margin-left,width] duration-300 ease-in-out"
          style={{
            marginLeft: sidebarWidth,
            width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
          }}
        >
          <header className="sticky top-0 z-90 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--header-bg)] px-4 backdrop-blur-xl sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => isMobile ? setMobileSidebarOpen(!mobileSidebarOpen) : setCollapsed(!collapsed)}
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition hover:bg-[var(--subtle-bg)] ${
                  effectiveCollapsed ? 'bg-[var(--subtle-bg)]' : 'bg-transparent'
                } text-[var(--text-secondary)] hover:text-[var(--text-primary)]`}
                aria-label={isMobile ? (mobileSidebarOpen ? 'Close sidebar' : 'Open sidebar') : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
              >
                {isMobile
                  ? mobileSidebarOpen ? <X className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />
                  : collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />
                }
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
                aria-label="Toggle theme"
              >
                {mode === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </button>

              {user?.role === 'admin' && (
                isMobile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setAdminNotifOpen(true); markPendingSeen(); markNotificationsSeen(); }}
                      className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
                      aria-label="Notifications"
                    >
                      <Bell className="h-[18px] w-[18px]" />
                      <NotificationBadge count={pendingEqCount + unseenNotifCount} />
                    </button>
                    <Sheet open={adminNotifOpen} onOpenChange={setAdminNotifOpen}>
                      <SheetContent side="bottom" className="bg-[var(--card-bg)] text-[var(--text-primary)]">
                        <div className="shrink-0 border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">Notifications</div>
                        <div className="overflow-y-auto p-4">{adminNotifBody}</div>
                      </SheetContent>
                    </Sheet>
                  </>
                ) : (
                  <Popover
                    open={adminNotifOpen}
                    onOpenChange={(open) => {
                      setAdminNotifOpen(open);
                      if (open) { markPendingSeen(); markNotificationsSeen(); }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
                        aria-label="Notifications"
                      >
                        <Bell className="h-[18px] w-[18px]" />
                        <NotificationBadge count={pendingEqCount + unseenNotifCount} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[340px] max-h-[360px] overflow-y-auto p-3 text-[var(--text-primary)]">
                      <p className="mb-2 text-sm font-semibold">Notifications</p>
                      {adminNotifBody}
                    </PopoverContent>
                  </Popover>
                )
              )}

              {canSeeNotifications && (
                isMobile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setNotifOpen(true); markResponsesSeen(); markNotificationsSeen(); }}
                      className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
                      aria-label="Notifications"
                    >
                      <Bell className="h-[18px] w-[18px]" />
                      <NotificationBadge count={unseenResponseCount + unseenNotifCount} />
                    </button>
                    <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
                      <SheetContent side="bottom" className="bg-[var(--card-bg)] text-[var(--text-primary)]">
                        <div className="shrink-0 border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">Notifications</div>
                        <div className="overflow-y-auto p-4">{notifBody}</div>
                      </SheetContent>
                    </Sheet>
                  </>
                ) : (
                  <Popover
                    open={notifOpen}
                    onOpenChange={(open) => {
                      setNotifOpen(open);
                      if (open) { markResponsesSeen(); markNotificationsSeen(); }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
                        aria-label="Notifications"
                      >
                        <Bell className="h-[18px] w-[18px]" />
                        <NotificationBadge count={unseenResponseCount + unseenNotifCount} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[340px] max-h-[380px] overflow-y-auto p-3 text-[var(--text-primary)]">
                      <p className="mb-2 text-sm font-semibold">Notifications</p>
                      {notifBody}
                    </PopoverContent>
                  </Popover>
                )
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex cursor-pointer items-center rounded-full px-1 py-1 transition hover:opacity-85"
                    aria-label="Profile"
                  >
                    <Avatar>
                      <AvatarFallback>
                        <User className="h-[18px] w-[18px]" />
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user?.name || 'User'} ({user?.role || ''})</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="bg-[var(--page-bg)] px-4 pt-4 sm:px-6 sm:pt-5">
            <div className="mx-auto w-full max-w-[1600px]" style={{ marginBottom: 80 }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </App>
  );
}
