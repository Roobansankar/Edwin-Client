'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Typography, Avatar, Dropdown, Popover, Drawer, App, Badge, Flex, Tag, Breadcrumb } from 'antd';
import type { MenuProps } from 'antd';
import {
  AppstoreOutlined,
  AuditOutlined,
  BankOutlined,
  BellOutlined,
  CalendarOutlined,
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
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  NodeIndexOutlined,
  ProjectOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined,
  StarOutlined,
  SunOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { formatDate, titleCase } from '@/components/dashboard/ui';
import type { EmployeeQuery } from '@/types/erp';

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

const SIDEBAR_WIDTH = 260;
const COLLAPSED_WIDTH = 60;

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
      { key: '/dashboard/new', icon: <FormOutlined />, label: 'Daily Entry List', allowedRoles: ['site_engineer'] },

      { key: '/dashboard/expenses/new', icon: <WalletOutlined />, label: 'Expense', allowedRoles: ['site_engineer'] },
      { key: '/dashboard/timesheet-attendance', icon: <CalendarOutlined />, label: 'Timesheet', allowedRoles: ['site_engineer', 'purchase_team', 'admin'] },
      { key: '/dashboard/projects', icon: <FolderOpenOutlined />, label: 'Projects', allowedRoles: ['admin'] },
      { key: '/dashboard/vendors', icon: <TeamOutlined />, label: 'Vendors', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/subcontractors', icon: <TeamOutlined />, label: 'Subcontractors', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/site-engineers', icon: <UserOutlined />, label: 'Site Engineers', allowedRoles: ['admin'] },
      { key: '/dashboard/assigned-projects', icon: <ProjectOutlined />, label: 'Assigned Projects', allowedRoles: ['admin'] },
      { key: '/dashboard/office-staff', icon: <TeamOutlined />, label: 'Office Staff', allowedRoles: ['admin'] },
      { key: '/dashboard/employee-queries', icon: <SolutionOutlined />, label: 'Employee Queries', allowedRoles: ['admin'] },

      { key: '/dashboard/subcontract-work-orders', icon: <FileTextOutlined />, label: 'Subcontract WO', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/subcontractor-payments', icon: <DollarOutlined />, label: 'Subcontractor Payments', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/subcontractor-work', icon: <TeamOutlined />, label: 'Subcontractor Work', allowedRoles: ['site_engineer', 'purchase_team', 'admin'] },
      { key: '/dashboard/material-requirement', icon: <FileSearchOutlined />, label: 'Material Requirement', allowedRoles: ['site_engineer'] },
      { key: '/dashboard/material-received', icon: <InboxOutlined />, label: 'Material Received', allowedRoles: ['site_engineer', 'purchase_team'] },
      { key: '/dashboard/report', icon: <FileTextOutlined />, label: 'My Report', allowedRoles: ['site_engineer'] },
      { key: '/dashboard/material-requirement', icon: <FileSearchOutlined />, label: 'Material Requirement Request', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/purchase-enquiry', icon: <AuditOutlined />, label: 'Purchase Enquiry', allowedRoles: ['purchase_team'] },
      { key: '/dashboard/purchase-orders', icon: <FileProtectOutlined />, label: 'Purchase Orders', allowedRoles: ['purchase_team', 'accounts_manager'] },
      { key: '/dashboard/advance', icon: <DollarOutlined />, label: 'Vendor Payments', allowedRoles: ['purchase_team'] },
      // { key: '/dashboard/drawings', icon: <FileImageOutlined />, label: 'Drawings', allowedRoles: ['admin'] },
      { key: '/dashboard/reports', icon: <FileTextOutlined />, label: 'Reports', allowedRoles: ['admin'] },
      { key: '/dashboard/project-access', icon: <SafetyCertificateOutlined />, label: 'Project Access', allowedRoles: ['admin'] },
      { key: '/dashboard/architecture', icon: <NodeIndexOutlined />, label: 'System Architecture', allowedRoles: ['admin'] },
    ],
  },
  {
    title: 'Finance',
    allowedRoles: ['admin', 'accounts_manager', 'purchase_team'],
    items: [
      { key: '/dashboard/accounts', icon: <BankOutlined />, label: 'Accounts', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/accounts/invoices', icon: <FileProtectOutlined />, label: 'Invoices', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/accounts/bills', icon: <FileDoneOutlined />, label: 'Purchase Bills', allowedRoles: ['admin', 'accounts_manager', 'purchase_team'] },
      { key: '/dashboard/timesheet-attendance', icon: <CalendarOutlined />, label: 'Timesheet', allowedRoles: ['accounts_manager'] },
      { key: '/dashboard/site-engineer-attendance', icon: <TeamOutlined />, label: 'Timesheet Approvals', allowedRoles: ['admin'] },
      { key: '/dashboard/approvals', icon: <SafetyCertificateOutlined />, label: 'Approvals', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/advance-requests', icon: <DollarOutlined />, label: 'Vendor Payment Requests', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/subcontractor-payment-requests', icon: <DollarOutlined />, label: 'Subcontractor Payment Requests', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/expenses', icon: <WalletOutlined />, label: 'Expenses', allowedRoles: ['admin', 'accounts_manager'] },
      { key: '/dashboard/payments', icon: <CreditCardOutlined />, label: 'Payments', allowedRoles: ['admin', 'accounts_manager'] },
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

    const match = navItems
      .filter((item) => pathname === item.key || pathname.startsWith(`${item.key}/`))
      .sort((a, b) => b.key.length - a.key.length)[0];

    return match?.key || '/dashboard';
  }, [pathname, navItems]);

  const currentPageLabel = useMemo(() => {
    const found = navItems.find((item) => item.key === selectedKey);
    return typeof found?.label === 'string' ? found.label : 'Dashboard';
  }, [navItems, selectedKey]);


  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
    router.push('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: `${user?.name || 'User'} (${user?.role || ''})` },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true },
  ];

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
                  router.push(n.link || '/dashboard/advance-requests');
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
              router.push('/dashboard/employee-queries');
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
                  router.push(n.link || (user?.role === 'accounts_manager' ? '/dashboard/accounts/bills' : '/dashboard/material-requirement'));
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

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <App>
      <Layout className="min-h-screen bg-[var(--page-bg)]">
        <Sider
          trigger={null}
          collapsible
          collapsed={effectiveCollapsed}
          collapsedWidth={effectiveCollapsedWidth}
          width={SIDEBAR_WIDTH}
          className={`mantis-drawer fixed! left-0 top-0 bottom-0 z-100 h-screen overflow-hidden border-r border-[var(--border)] bg-[var(--sidebar-bg)]! transition-all duration-300 ease-in-out ${
            isMobile
              ? mobileSidebarOpen
                ? 'translate-x-0 shadow-2xl'
                : '-translate-x-full'
              : ''
          }`}
          style={isMobile ? { width: `${SIDEBAR_WIDTH}px` } : { boxShadow: effectiveCollapsed ? 'none' : 'none' }}
        >
          <div className="flex h-full flex-col">
            <div
              className={`flex h-[70px] shrink-0 items-center border-b border-[var(--border)] ${
                effectiveCollapsed ? 'justify-center px-0' : 'gap-3 px-6'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: '#1677ff' }}>
                <StarOutlined className="text-[20px]" />
              </div>
              {!effectiveCollapsed && (
                <div className="min-w-0">
                  <Text strong className="block truncate text-[15px] leading-tight! text-[var(--sidebar-text)]!">
                    Edwin ERP
                  </Text>
                  <Text className="block truncate text-xs leading-tight! text-[var(--sidebar-text-muted)]!">
                    Construction Management
                  </Text>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-4">
              {filteredNavigationSections.map((section, index) => (
                <div key={`${section.title}-${index}`} className={`${section.title ? 'mb-5' : 'mb-0'} last:mb-0`}>
                  {!effectiveCollapsed && section.title && (
                    <Text className="mb-1.5 block px-6 text-sm font-medium text-[var(--sidebar-text-muted)]!">
                      {section.title}
                    </Text>
                  )}
                  <Menu
                    mode="inline"
                    inlineCollapsed={effectiveCollapsed}
                    selectedKeys={[selectedKey]}
                    items={section.items}
                    onClick={({ key }) => router.push(key)}
                    className="mantis-nav border-none! bg-transparent!"
                  />
                </div>
              ))}
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
          className="min-w-0 transition-[margin-left,width] duration-300 ease-in-out"
          style={{
            marginLeft: sidebarWidth,
            width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
          }}
        >
          <Header className="sticky top-0 z-90 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--header-bg)]! px-4! sm:px-6! backdrop-blur-xl">
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
                  ? mobileSidebarOpen ? <CloseOutlined /> : <MenuUnfoldOutlined />
                  : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
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
                {mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              </button>

              {user?.role === 'admin' && (
                isMobile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setAdminNotifOpen(true); markPendingSeen(); markNotificationsSeen(); }}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
                      aria-label="Notifications"
                    >
                      <Badge count={pendingEqCount + unseenNotifCount} size="small" offset={[-2, 2]}>
                        <BellOutlined />
                      </Badge>
                    </button>
                    <Drawer
                      title="Notifications"
                      placement="bottom"
                      height="70vh"
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
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
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
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
                      aria-label="Notifications"
                    >
                      <Badge count={unseenResponseCount + unseenNotifCount} size="small" offset={[-2, 2]}>
                        <BellOutlined />
                      </Badge>
                    </button>
                    <Drawer
                      title="Notifications"
                      placement="bottom"
                      height="70vh"
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
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--subtle-bg)] hover:text-[var(--text-primary)]"
                      aria-label="Notifications"
                    >
                      <Badge count={unseenResponseCount + unseenNotifCount} size="small" offset={[-2, 2]}>
                        <BellOutlined />
                      </Badge>
                    </button>
                  </Popover>
                )
              )}

            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: ({ key }) => {
                  if (key === 'logout') handleLogout();
                },
              }}
              placement="bottomRight"
            >
              <button
                type="button"
                className="flex cursor-pointer items-center rounded-full px-1 py-1 transition hover:opacity-85"
                aria-label="Profile"
              >
                <Avatar
                  className="bg-[#1677ff]!"
                  icon={<UserOutlined />}
                />
              </button>
            </Dropdown>
            </div>
          </Header>

          <Content className="bg-[var(--page-bg)] px-4 pt-4 sm:px-6 sm:pt-5">
            <div className="mx-auto w-full max-w-[1600px]" style={{ marginBottom: 80 }}>
              <Breadcrumb
                className="mb-3"
                items={[{ title: 'Home' }, { title: currentPageLabel }]}
              />
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>
    </App>
);
}