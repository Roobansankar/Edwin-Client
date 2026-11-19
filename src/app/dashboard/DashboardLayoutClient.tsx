'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { flushSync } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { ConfigProvider, Layout, Typography, Dropdown, Popover, Drawer, App, Badge, Flex, Tag } from 'antd';
import type { MenuProps } from 'antd';
import {
  AppstoreOutlined,
  AuditOutlined,
  BankOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckOutlined,
  CloseOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FileDoneOutlined,
  FileImageOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FormOutlined,
  InboxOutlined,
  LogoutOutlined,
  MoonOutlined,
  NodeIndexOutlined,
  ProjectOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined,
  SunOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/auth';
import { PageLoader } from '@/components/dashboard/Skeletons';
import { DashboardNavigationProvider } from '@/components/dashboard/navigation';
import { useThemeStore } from '@/store/theme';
import { formatDate, titleCase } from '@/components/dashboard/ui';
import type { EmployeeQuery } from '@/types/erp';
import styles from '@/components/dashboard/layout/reference.module.css';
import { ReferencePanelIcon } from '@/components/dashboard/layout/ReferencePanelIcon';
import { PageSearch } from '@/components/dashboard/layout/PageSearch';

const { Sider, Content, Header } = Layout;

const SIDEBAR_WIDTH = 256;

// Payment pages reached from the Payments page (not listed in the sidebar).
const PAYMENTS_SUB_PAGES = [
  '/dashboard/advance-requests',
  '/dashboard/subcontractor-payment-requests',
  '/dashboard/expense-payments',
  '/dashboard/labour-payments',
];
const COLLAPSED_WIDTH = 72;

// Each sidebar icon gets its own colour, grouped by meaning (money = greens,
// bills = orange/red, reports = sky/indigo, people = pink/purple). Mid-tone
// shades so they read on both the light and the black sidebar.
const NAV_ICON_COLORS: Record<string, string> = {
  '/dashboard': '#8b5cf6',
  '/dashboard/ai': '#ec4899',
  '/dashboard/notifications': '#f59e0b',
  '/dashboard/timesheet-attendance': '#14b8a6',
  '/dashboard/my-todos': '#84cc16',
  '/dashboard/expenses/new': '#f97316',
  '/dashboard/expenses': '#f97316',
  '/dashboard/vendors': '#06b6d4',
  '/dashboard/material-requirement': '#eab308',
  '/dashboard/purchase-enquiry': '#a855f7',
  '/dashboard/purchase-orders': '#6366f1',
  '/dashboard/material-received': '#22c55e',
  '/dashboard/subcontractors': '#f43f5e',
  '/dashboard/subcontractor-enquiry': '#d946ef',
  '/dashboard/subcontract-work-orders': '#0ea5e9',
  '/dashboard/subcontractor-work': '#fb7185',
  '/dashboard/site-engineer-attendance': '#2dd4bf',
  '/dashboard/approvals': '#10b981',
  '/dashboard/weekly-report': '#38bdf8',
  '/dashboard/all-reports': '#818cf8',
  '/dashboard/my-projects': '#fb923c',
  '/dashboard/projects': '#fb923c',
  '/dashboard/new': '#a3e635',
  '/dashboard/site-engineers': '#60a5fa',
  '/dashboard/assigned-projects': '#c084fc',
  '/dashboard/office-staff': '#f472b6',
  '/dashboard/employee-queries': '#facc15',
  '/dashboard/report': '#818cf8',
  '/dashboard/project-access': '#34d399',
  '/dashboard/architecture': '#94a3b8',
  '/dashboard/accounts': '#10b981',
  '/dashboard/payments': '#22c55e',
  '/dashboard/accounts-ledger': '#14b8a6',
  '/dashboard/accounts/invoices': '#0ea5e9',
  '/dashboard/accounts/bills': '#f97316',
  '/dashboard/accounts/subcontractor-bills': '#f43f5e',
  '/dashboard/purchase-ledger': '#14b8a6',
  '/dashboard/advance': '#22c55e',
  '/dashboard/subcontractor-payments': '#f43f5e',
  '/dashboard/dpr': '#38bdf8',
  '/dashboard/drawings': '#a855f7',
  '/dashboard/profile': '#8b5cf6',
  '/dashboard/salary': '#eab308',
};
const NAV_ICON_FALLBACK = ['#8b5cf6', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#14b8a6'];
const navIconColor = (key: string) =>
  NAV_ICON_COLORS[key] ??
  NAV_ICON_FALLBACK[[...key].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % NAV_ICON_FALLBACK.length];

type NavItem = {
  key: string;
  icon?: React.ReactNode;
  label: string;
  children?: NavItem[];
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
      { key: '/dashboard', icon: <AppstoreOutlined />, label: 'Dashboard', allowedRoles: ['admin', 'accounts_manager', 'site_engineer', 'purchase_team'] },
      { key: '/dashboard/ai', icon: <RobotOutlined />, label: 'AI Dashboard', allowedRoles: ['admin'] },
      // Every role: full notification history with All / Unread.
      { key: '/dashboard/notifications', icon: <BellOutlined />, label: 'Notifications' },
      { key: '/dashboard/timesheet-attendance', icon: <CalendarOutlined />, label: 'Timesheet', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/my-todos', icon: <FormOutlined />, label: 'To Do List', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/expenses/new', icon: <WalletOutlined />, label: 'My Expenses', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/vendors', icon: <TeamOutlined />, label: 'Vendors', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/material-requirement', icon: <FileSearchOutlined />, label: 'Material Request', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/purchase-enquiry', icon: <AuditOutlined />, label: 'Purchase Enquiry', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/purchase-orders', icon: <FileProtectOutlined />, label: 'Purchase Order', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/material-received', icon: <InboxOutlined />, label: 'Material Received', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/subcontractors', icon: <TeamOutlined />, label: 'Subcontractors', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/subcontractor-enquiry', icon: <AuditOutlined />, label: 'Subcontractors Enquiry', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/subcontract-work-orders', icon: <FileTextOutlined />, label: 'Subcontract WO', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/subcontractor-work', icon: <TeamOutlined />, label: 'Subcontractor Work', allowedRoles: ['purchase_team'] },

      { key: '/dashboard/site-engineer-attendance', icon: <TeamOutlined />, label: 'All User Timesheets', allowedRoles: ['admin'] },
      { key: '/dashboard/approvals', icon: <SafetyCertificateOutlined />, label: 'Approvals', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/weekly-report', icon: <FileTextOutlined />, label: 'Weekly Report', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/all-reports', icon: <FileTextOutlined />, label: 'Report', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/my-projects', icon: <ProjectOutlined />, label: 'My Projects', allowedRoles: ['site_engineer'] },
      { key: '/dashboard/new', icon: <FormOutlined />, label: 'Daily Entry List', allowedRoles: ['site_engineer'] },
      { key: '/dashboard/expenses/new', icon: <WalletOutlined />, label: 'Expense', allowedRoles: ['site_engineer'] },
      { key: '/dashboard/timesheet-attendance', icon: <CalendarOutlined />, label: 'Timesheet', allowedRoles: ['site_engineer', 'admin'] },
      { key: '/dashboard/material-received', icon: <InboxOutlined />, label: 'Material Received', allowedRoles: ['site_engineer'] },
      { key: '/dashboard/projects', icon: <FolderOpenOutlined />, label: 'Projects', allowedRoles: ['admin'] },
      { key: '/dashboard/site-engineers', icon: <UserOutlined />, label: 'Site Engineers', allowedRoles: ['admin'] },
      { key: '/dashboard/assigned-projects', icon: <ProjectOutlined />, label: 'Assigned Projects', allowedRoles: ['admin'] },
      { key: '/dashboard/office-staff', icon: <TeamOutlined />, label: 'Office Staff', allowedRoles: ['admin'] },
      { key: '/dashboard/employee-queries', icon: <SolutionOutlined />, label: 'Employee Queries', allowedRoles: ['admin'] },
      { key: '/dashboard/subcontractor-work', icon: <TeamOutlined />, label: 'Subcontractor Work', allowedRoles: ['site_engineer'] },
      { key: '/dashboard/material-requirement', icon: <FileSearchOutlined />, label: 'Material Requirement', allowedRoles: ['site_engineer'] },
      { key: '/dashboard/report', icon: <FileTextOutlined />, label: 'My Report', allowedRoles: ['site_engineer'] },
      { key: '/dashboard/project-access', icon: <SafetyCertificateOutlined />, label: 'Project Access', allowedRoles: ['admin'] },
      { key: '/dashboard/architecture', icon: <NodeIndexOutlined />, label: 'System Architecture', allowedRoles: ['admin'] },
    ],
  },
  {
    title: 'Finance',
    allowedRoles: ['admin', 'accounts_manager', 'purchase_team'],
    items: [
      { key: '/dashboard/accounts', icon: <BankOutlined />, label: 'Accounts', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/expenses', icon: <WalletOutlined />, label: 'My Expenses', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/payments', icon: <CreditCardOutlined />, label: 'Payments', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/accounts-ledger', icon: <BankOutlined />, label: 'Ledger', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/timesheet-attendance', icon: <CalendarOutlined />, label: 'Timesheet', allowedRoles: ['accounts_manager'] },
      { key: '/dashboard/accounts/invoices', icon: <FileProtectOutlined />, label: 'Invoices', allowedRoles: ['admin'] },
      { key: '/dashboard/accounts/bills', icon: <FileDoneOutlined />, label: 'Vendor Bills', allowedRoles: ['admin', 'purchase_team'] },
      { key: '/dashboard/accounts/subcontractor-bills', icon: <FileDoneOutlined />, label: 'Subcontractor Bills', allowedRoles: ['admin', 'purchase_team'] },
    ],
  },
  {
    title: 'Payments',
    allowedRoles: ['purchase_team'],
    items: [
      { key: '/dashboard/purchase-ledger', icon: <BankOutlined />, label: 'Ledger', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/advance', icon: <DollarOutlined />, label: 'Vendor Payments', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/subcontractor-payments', icon: <DollarOutlined />, label: 'Subcontractor Payments', allowedRoles: ['purchase_team'] },
    ],
  },
  {
    title: 'For Office Staff',
    allowedRoles: ['admin', 'office_staff'],
    items: [
      { key: '/dashboard/timesheet-attendance', icon: <CalendarOutlined />, label: 'Timesheet', allowedRoles: ['office_staff'] },
      { key: '/dashboard/dpr', icon: <CalendarOutlined />, label: 'Daily Reports (DPR)', allowedRoles: ['office_staff'] },
      { key: '/dashboard/expenses/new', icon: <WalletOutlined />, label: 'Expense', allowedRoles: ['office_staff'] },
      { key: '/dashboard/drawings', icon: <FileImageOutlined />, label: 'Drawings', allowedRoles: ['office_staff'] },
      { key: '/dashboard/accounts/invoices', icon: <FileProtectOutlined />, label: 'Invoice', allowedRoles: ['office_staff'], allowedStaffTypes: ['Project Coordinator'] },
    ],
  },
  {
    title: 'Settings',
    allowedRoles: ['admin'],
    items: [
      { key: '/dashboard/profile', icon: <UserOutlined />, label: 'Profile', allowedRoles: ['admin'] },
      { key: '/dashboard/salary', icon: <DollarOutlined />, label: 'Salary', allowedRoles: ['admin'] },
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
  // True from a sidebar/search click until the new page has rendered; covers
  // server-rendered pages that would otherwise show no loader at all.
  const [navigating, startNavigation] = useTransition();
  const navigateTo = useCallback((href: string) => {
    setMobileSidebarOpen(false);
    const targetPath = href.split(/[?#]/)[0];
    if (targetPath === pathname) {
      // Same page (maybe a different ?tab=): navigate without the loader.
      if (href !== pathname) router.push(href);
      return;
    }
    startNavigation(() => router.push(href));
  }, [pathname, router]);

  // Any plain click on an internal dashboard link (next/link renders <a>)
  // goes through navigateTo, so in-page links also show the loader. Runs in
  // the capture phase, before next/link's own handler, which then skips
  // because the event is already handled.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('/dashboard')) return;
      event.preventDefault();
      navigateTo(href);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigateTo]);

  const { mode, darkStyle, setMode, setDarkStyle } = useThemeStore();
  const themeChoice = mode === 'light' ? 'light' : darkStyle === 'navy' ? 'navy' : 'black';

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

  // Opening the bell no longer marks everything read: notifications stay
  // unread (and listed under Unread on the Notifications page) until each one
  // is opened.
  const markNotificationsSeen = () => {};

  const markNotificationRead = (id: string) => {
    setAppNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnseenNotifCount((count) => Math.max(count - 1, 0));
    void fetch(`/api/backend/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
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
  const effectiveCollapsedWidth = isMobile ? SIDEBAR_WIDTH : COLLAPSED_WIDTH;

  const filteredNavigationSections = useMemo(() => {
    const role = user?.role || 'viewer';
    const staffType = user?.staffType || '';
    const matchesStaffType = (item: NavItem) => !item.allowedStaffTypes || item.allowedStaffTypes.includes(staffType);


    const mappedSections = navigationSections
      .filter((section) => !section.allowedRoles || section.allowedRoles.includes(role))
      .map((section) => ({
        ...section,
        title: role === 'office_staff' && section.title === 'For Office Staff' ? '' : section.title,
        items: section.items
          .filter((item) => (!item.allowedRoles || item.allowedRoles.includes(role)) && matchesStaffType(item))
          .map((item) => {
             // eslint-disable-next-line @typescript-eslint/no-unused-vars
             const { allowedRoles, allowedStaffTypes, children, ...restItem } = item;
             const label = item.key === '/dashboard/employee-queries' && pendingEqCount > 0
               ? (
                   <Flex align="center" gap={8}>
                     <span>{item.label}</span>
                     <Badge count={pendingEqCount} size="small" />
                   </Flex>
                 )
               : item.label;
             if (children) {
               return {
                 ...restItem,
                 label,
                 children: children
                   .filter((child) => (!child.allowedRoles || child.allowedRoles.includes(role)) && matchesStaffType(child))
                   // eslint-disable-next-line @typescript-eslint/no-unused-vars
                   .map(({ allowedRoles: _childRoles, allowedStaffTypes: _childStaffTypes, ...restChild }) => restChild)
               }
             }
             return { ...restItem, label };
          })
      }))
      .filter(section => section.items.length > 0);

    // A section whose title was blanked out for this role (e.g. "For Office
    // Staff" shown to an office_staff user) has nothing to label it, so fold
    // its items into the previous section instead of rendering a second,
    // visually-gapped <Menu> block right under it.
    return mappedSections.reduce<typeof mappedSections>((acc, section) => {
      if (!section.title && acc.length > 0) {
        acc[acc.length - 1].items = [...acc[acc.length - 1].items, ...section.items];
        return acc;
      }
      acc.push(section);
      return acc;
    }, []);
  }, [user, pendingEqCount]);

  const navItems = useMemo(() => {
    return filteredNavigationSections.flatMap((section) => section.items);
  }, [filteredNavigationSections]);

  const selectedKey = useMemo(() => {
    // Daily labour entry form (/dashboard/new) and detail (/dashboard/daily-labour/:id)
    // should both highlight "Daily Entry List" in the sidebar
    if (pathname.startsWith('/dashboard/daily-labour/')) {
      return '/dashboard/new';
    }

    // These pages are opened from the Payments page, not the sidebar, so keep
    // "Payments" highlighted while on them.
    if (PAYMENTS_SUB_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return '/dashboard/payments';
    }

    const match = navItems
      .filter((item) => pathname === item.key || pathname.startsWith(`${item.key}/`))
      .sort((a, b) => b.key.length - a.key.length)[0];

    return match?.key || '/dashboard';
  }, [pathname, navItems]);


  const searchPages = filteredNavigationSections.flatMap((section) =>
    section.items.map((item) => ({
      key: item.key,
      label: navigationSections.flatMap((group) => group.items).find((entry) => entry.key === item.key)?.label || item.key,
    })),
  );

  const userInitials = (user?.name || 'U')
    .split(/s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const themeButtonRef = useRef<HTMLButtonElement>(null);

  // Theme change with a full-page circular reveal that grows out of the theme
  // button (View Transitions API). Falls back to an instant switch when the
  // browser lacks it or the user prefers reduced motion.
  const switchTheme = (choice: 'light' | 'black' | 'navy') => {
    if (choice === themeChoice) return;
    const apply = () => {
      const nextMode = choice === 'light' ? 'light' : 'dark';
      if (choice !== 'light') setDarkStyle(choice);
      setMode(nextMode);
      // Set the attributes now so the new frame is fully themed.
      document.documentElement.dataset.theme = nextMode;
      if (choice !== 'light') document.documentElement.dataset.darkStyle = choice;
    };
    const doc = document as Document & {
      startViewTransition?: (update: () => void) => { ready: Promise<void> };
    };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || reduce) {
      apply();
      return;
    }
    const rect = themeButtonRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 40;
    const y = rect ? rect.top + rect.height / 2 : 40;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = doc.startViewTransition(() => {
      flushSync(apply);
    });
    void transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    });
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
    router.push('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'who',
      disabled: true,
      label: (
        <div className="py-0.5 leading-tight">
          <div className="text-sm font-semibold text-[var(--text-primary)]">{user?.name || 'User'}</div>
          <div className="text-xs text-[var(--text-muted)]">{titleCase(user?.role || '')}</div>
        </div>
      ),
    },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true },
  ];
  const onUserMenu: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') void handleLogout();
  };

  const adminNotifBody = (
    <>
      {visibleAppNotifications.length > 0 && (
        <div className="mb-2">
          <Typography.Text className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-very-muted)]">
            Updates
          </Typography.Text>
          <Flex vertical gap={8}>
            {visibleAppNotifications.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className={`relative cursor-pointer rounded-lg border p-2 pr-7 transition hover:bg-[var(--subtle-hover-bg)] ${
                  n.isRead ? 'border-[var(--border)] opacity-70' : 'border-[var(--primary)]/40 bg-[var(--primary-lighter)]'
                }`}
                onClick={() => {
                  setAdminNotifOpen(false);
                  if (!n.isRead) markNotificationRead(n.id);
                  navigateTo(n.link || '/dashboard/advance-requests');
                }}
              >
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismissNotification(n.id); }}
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
                  aria-label="Dismiss notification"
                >
                  <CloseOutlined style={{ fontSize: 11 }} />
                </button>
                <Typography.Text className="block text-sm">
                  {n.actorName && <strong>{n.actorName}: </strong>}
                  {n.title} — {n.message}
                </Typography.Text>
                {n.createdAt && (
                  <Typography.Text type="secondary" className="mt-0.5 block text-xs">
                    {formatDate(n.createdAt)}
                  </Typography.Text>
                )}
              </div>
            ))}
          </Flex>
        </div>
      )}
      <Typography.Text className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-very-muted)]">
        Edit Requests
      </Typography.Text>
      {visiblePendingQueries.length === 0 ? (
        <Typography.Text type="secondary" className="text-sm">
          No pending edit requests
        </Typography.Text>
      ) : (
      <Flex vertical gap={8}>
        {visiblePendingQueries.slice(0, 20).map((q) => (
          <div
            key={q.id}
            className="relative cursor-pointer rounded-lg border border-[var(--border)] p-2 pr-7 transition hover:bg-[var(--subtle-hover-bg)]"
            onClick={() => {
              setAdminNotifOpen(false);
              navigateTo('/dashboard/employee-queries');
            }}
          >
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismissNotification(q.id); }}
              className="absolute right-1.5 top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
              aria-label="Dismiss notification"
            >
              <CloseOutlined style={{ fontSize: 11 }} />
            </button>
            <Typography.Text className="block text-sm">
              <strong>{q.siteEngineer?.name || 'Someone'}</strong>
              {q.siteEngineer?.role && ` (${titleCase(q.siteEngineer.role)})`} requested edit access for timesheet
            </Typography.Text>
            {q.timesheet && (
              <Typography.Text type="secondary" className="mt-1 block text-xs">
                Week: {formatDate(q.timesheet.weekStart)} - {formatDate(q.timesheet.weekEnd)}
              </Typography.Text>
            )}
            <Typography.Text type="secondary" className="mt-1 block text-xs italic">
              &ldquo;{q.reason}&rdquo;
            </Typography.Text>
          </div>
        ))}
      </Flex>
      )}
    </>
  );

  const notifBody = (
    <>
      {visibleAppNotifications.length > 0 && (
        <div className="mb-2">
          <Typography.Text className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-very-muted)]">
            Updates
          </Typography.Text>
          <Flex vertical gap={8}>
            {visibleAppNotifications.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className={`relative cursor-pointer rounded-lg border p-2 pr-7 transition hover:bg-[var(--subtle-hover-bg)] ${
                  n.isRead ? 'border-[var(--border)] opacity-70' : 'border-[var(--primary)]/40 bg-[var(--primary-lighter)]'
                }`}
                onClick={() => {
                  setNotifOpen(false);
                  if (!n.isRead) markNotificationRead(n.id);
                  navigateTo(n.link || (user?.role === 'accounts_manager' ? '/dashboard/accounts/bills' : '/dashboard/material-requirement'));
                }}
              >
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismissNotification(n.id); }}
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
                  aria-label="Dismiss notification"
                >
                  <CloseOutlined style={{ fontSize: 11 }} />
                </button>
                <Typography.Text className="block text-sm">
                  {n.actorName && <strong>{n.actorName}: </strong>}
                  {n.title} — {n.message}
                </Typography.Text>
                {n.createdAt && (
                  <Typography.Text type="secondary" className="mt-0.5 block text-xs">
                    {formatDate(n.createdAt)}
                  </Typography.Text>
                )}
              </div>
            ))}
          </Flex>
        </div>
      )}
      <Typography.Text className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-very-muted)]">
        Edit Request Updates
      </Typography.Text>
      {visibleResponses.length === 0 ? (
        <Typography.Text type="secondary" className="text-sm">
          No responses yet
        </Typography.Text>
      ) : (
        <Flex vertical gap={8}>
          {visibleResponses.slice(0, 20).map((r) => (
            <div key={r.id} className="relative rounded-lg border border-[var(--border)] p-2 pr-7">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismissNotification(r.id); }}
                className="absolute right-1.5 top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
                aria-label="Dismiss notification"
              >
                <CloseOutlined style={{ fontSize: 11 }} />
              </button>
              <Flex justify="space-between" align="center">
                <Tag color={r.status === 'approved' ? 'green' : 'red'}>{r.status.toUpperCase()}</Tag>
                <Typography.Text type="secondary" className="text-xs">
                  {formatDate(r.respondedAt)}
                </Typography.Text>
              </Flex>
              <Typography.Text className="mt-1 block text-xs">{r.reason}</Typography.Text>
              {r.timesheet && (
                <Typography.Text type="secondary" className="mt-1 block text-xs">
                  Week: {formatDate(r.timesheet.weekStart)} - {formatDate(r.timesheet.weekEnd)}
                </Typography.Text>
              )}
            </div>
          ))}
        </Flex>
      )}
    </>
  );

  // Brief first paint before the layout mounts: plain background, no loader.
  if (!mounted) {
    return <div className="min-h-screen bg-[var(--page-bg)]" />;
  }

  return (
    <ConfigProvider theme={{ token: { borderRadius: 6, colorBgContainer: mode === 'dark' ? (darkStyle === 'navy' ? '#0b1120' : '#0a0a0a') : '#fff', colorBgLayout: mode === 'dark' ? (darkStyle === 'navy' ? '#0b1120' : '#0a0a0a') : '#fff' } }}>
    <App>
    <DashboardNavigationProvider value={navigateTo}>
      <Layout className={styles.root}>
        <Sider
          trigger={null}
          inert={isMobile && !mobileSidebarOpen}
          collapsible
          collapsed={effectiveCollapsed}
          collapsedWidth={effectiveCollapsedWidth}
          width={SIDEBAR_WIDTH}
          className={`${styles.sidebar} ${effectiveCollapsed ? styles.collapsed : ''} fixed! left-0 top-0 bottom-0 z-100 h-screen overflow-hidden transition-all duration-300 ease-in-out ${
            isMobile
              ? mobileSidebarOpen
                ? 'translate-x-0 shadow-2xl'
                : '-translate-x-full'
              : ''
          }`}
          style={isMobile ? { width: `${SIDEBAR_WIDTH}px` } : { boxShadow: effectiveCollapsed ? 'none' : 'none' }}
        >
          <div className={styles.sidebarBox}>
            <div className={styles.brand}>
              <span className={styles.brandMark}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Edwin Constructions" />
              </span>
              {!effectiveCollapsed && (
                <span className={styles.brandText}>
                  <span className={styles.brandName}>Edwin Constructions</span>
                  <span className={styles.brandTag}>{titleCase(user?.role || '') || 'ERP'}</span>
                </span>
              )}
              {!effectiveCollapsed && !isMobile && <span className={styles.brandBadge}>ERP</span>}
              {isMobile && <button type="button" className={styles.brandClose} aria-label="Close sidebar" onClick={() => setMobileSidebarOpen(false)}><CloseOutlined /></button>}
            </div>
            <div className={styles.sidebarBody}>
              <nav id="workspace-navigation" aria-label="Main navigation">
                {filteredNavigationSections.map((section, index) => (
                  <div key={`${section.title}-${index}`} className={styles.section}>
                    {!effectiveCollapsed && section.title && <p className={styles.sectionTitle}>{section.title}</p>}
                    {section.items.map((item) => (
                      <button key={item.key} type="button" className={`${styles.navItem} ${selectedKey === item.key ? styles.active : ''}`}
                        aria-current={selectedKey === item.key ? 'page' : undefined}
                        title={navigationSections.flatMap((group) => group.items).find((entry) => entry.key === item.key)?.label}
                        onClick={() => navigateTo(item.key)}>
                        <span className={styles.navIcon} style={{ color: navIconColor(item.key) }}>{item.icon}</span>
                        {!effectiveCollapsed && <span>{item.label}</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </nav>
            </div>

            <div className={styles.sidebarFooter}>
              <Dropdown menu={{ items: userMenuItems, onClick: onUserMenu }} placement="topRight" trigger={['click']}>
                <button type="button" className={styles.profile} aria-label="Account menu" aria-haspopup="menu" title={user?.name || 'Account'}>
                  <span className={styles.avatar}>{userInitials}</span>
                  {!effectiveCollapsed && (
                    <>
                      <span className={styles.profileMeta}>
                        <span className={styles.profileName}>{user?.name || 'User'}</span>
                        <span className={styles.profileEmail}>{user?.email || titleCase(user?.role || '')}</span>
                      </span>
                      <svg className={styles.profileChevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" />
                      </svg>
                    </>
                  )}
                </button>
              </Dropdown>
            </div>
          </div>
        </Sider>

        {isMobile && mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-99 bg-[var(--overlay-bg)] backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <Layout
          className={`${styles.main} transition-[margin-left,width] duration-300 ease-in-out`}
          style={{
            marginLeft: isMobile ? 0 : sidebarWidth + 8,
            marginRight: isMobile ? 0 : 8,
            width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px - 16px)`,
          }}
        >
          <Header className={styles.header}>
            <div className={styles.headerTitle}>
              <button type="button" className={styles.iconButton}
                onClick={() => isMobile ? setMobileSidebarOpen(!mobileSidebarOpen) : setCollapsed(!collapsed)}
                aria-controls="workspace-navigation" aria-expanded={isMobile ? mobileSidebarOpen : !collapsed}
                aria-label={isMobile ? (mobileSidebarOpen ? 'Close sidebar' : 'Open sidebar') : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}>
                <ReferencePanelIcon collapsed={isMobile ? !mobileSidebarOpen : collapsed} />
              </button>
              <span className={styles.headerDivider} aria-hidden="true" />
              <PageSearch pages={searchPages} onNavigate={navigateTo} />
            </div>
            <div className={styles.actions}>
              <Dropdown
                trigger={['click']}
                placement="bottomRight"
                menu={{
                  selectedKeys: [themeChoice],
                  items: [
                    { key: 'light', label: 'Light', swatch: '#ffffff' },
                    { key: 'black', label: 'Dark – Black', swatch: '#0a0a0a' },
                    { key: 'navy', label: 'Dark – Blue', swatch: '#0b1120' },
                  ].map((option) => ({
                    key: option.key,
                    label: (
                      <span className={styles.themeOption}>
                        <span className={styles.themeSwatch} style={{ background: option.swatch }} />
                        {option.label}
                        {themeChoice === option.key && <CheckOutlined className={styles.themeCheck} />}
                      </span>
                    ),
                  })),
                  onClick: ({ key }) => switchTheme(key as 'light' | 'black' | 'navy'),
                }}
              >
                <button ref={themeButtonRef} type="button" className={styles.iconButton} aria-label="Change theme" aria-haspopup="menu" title="Theme">
                  {mode === 'dark' ? <MoonOutlined /> : <SunOutlined />}
                </button>
              </Dropdown>

              {user?.role === 'admin' && (
                isMobile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setAdminNotifOpen(true); markPendingSeen(); markNotificationsSeen(); }}
                      className={styles.iconButton}
                      aria-label="Notifications"
                    >
                      <Badge count={pendingEqCount + unseenNotifCount} size="small" offset={[-2, 2]}>
                        <BellOutlined />
                      </Badge>
                    </button>
                    <Drawer
                      title="Notifications"
                      placement="bottom"
                      size="large"
                      open={adminNotifOpen}
                      onClose={() => setAdminNotifOpen(false)}
                    >
                      {adminNotifBody}
                    </Drawer>
                  </>
                ) : (
                  <Popover
                    trigger="click"
                    placement="bottomRight"
                    open={adminNotifOpen}
                    onOpenChange={(open) => {
                      setAdminNotifOpen(open);
                      if (open) { markPendingSeen(); markNotificationsSeen(); }
                    }}
                    title="Notifications"
                    content={
                      <div style={{ width: 340, maxHeight: 360, overflowY: 'auto' }}>
                        {adminNotifBody}
                      </div>
                    }
                  >
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label="Notifications"
                    >
                      <Badge count={pendingEqCount + unseenNotifCount} size="small" offset={[-2, 2]}>
                        <BellOutlined />
                      </Badge>
                    </button>
                  </Popover>
                )
              )}

              {canSeeNotifications && (
                isMobile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setNotifOpen(true); markResponsesSeen(); markNotificationsSeen(); }}
                      className={styles.iconButton}
                      aria-label="Notifications"
                    >
                      <Badge count={unseenResponseCount + unseenNotifCount} size="small" offset={[-2, 2]}>
                        <BellOutlined />
                      </Badge>
                    </button>
                    <Drawer
                      title="Notifications"
                      placement="bottom"
                      size="large"
                      open={notifOpen}
                      onClose={() => setNotifOpen(false)}
                    >
                      {notifBody}
                    </Drawer>
                  </>
                ) : (
                  <Popover
                    trigger="click"
                    placement="bottomRight"
                    open={notifOpen}
                    onOpenChange={(open) => {
                      setNotifOpen(open);
                      if (open) {
                        markResponsesSeen();
                        markNotificationsSeen();
                      }
                    }}
                    title="Notifications"
                    content={
                      <div style={{ width: 340, maxHeight: 380, overflowY: 'auto' }}>
                        {notifBody}
                      </div>
                    }
                  >
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label="Notifications"
                    >
                      <Badge count={unseenResponseCount + unseenNotifCount} size="small" offset={[-2, 2]}>
                        <BellOutlined />
                      </Badge>
                    </button>
                  </Popover>
                )
              )}

            </div>
          </Header>

          <Content id="main-scroll" className={styles.content}>
            <div className={`${styles.contentInner} page-anim`}>
              {navigating ? <PageLoader /> : children}
            </div>
          </Content>
        </Layout>
      </Layout>
    </DashboardNavigationProvider>
    </App>
    </ConfigProvider>
);
}
