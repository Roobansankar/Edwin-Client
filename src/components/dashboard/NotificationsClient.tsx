'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Badge, Button, Card, Empty, Flex, Spin, Tabs, Typography } from 'antd';
import { BellOutlined, CheckOutlined, RightOutlined } from '@ant-design/icons';
import { clientApiFetch } from '@/lib/client-api';
import { pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';

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

function formatWhen(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

// Every notification for the signed-in user, with All / Unread tabs. Opening
// one marks it read and goes to the page it points at.
export function NotificationsClient() {
  const router = useRouter();
  const { message } = App.useApp();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    let cancelled = false;
    clientApiFetch<AppNotification[]>('/notifications?limit=500')
      .then((data) => { if (!cancelled) setItems(Array.isArray(data) ? data : []); })
      .catch((err) => { if (!cancelled) message.error(err instanceof Error ? err.message : 'Failed to load notifications'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [message]);

  const unread = useMemo(() => items.filter((n) => !n.isRead), [items]);
  const shown = tab === 'unread' ? unread : items;

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

  const list = (
    loading ? (
      <Flex justify="center" className="py-10"><Spin /></Flex>
    ) : shown.length === 0 ? (
      <Empty description={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'} className="py-10" />
    ) : (
      <Flex vertical gap={8}>
        {shown.map((n) => (
          <div
            key={n.id}
            role="button"
            tabIndex={0}
            onClick={() => openNotification(n)}
            onKeyDown={(e) => { if (e.key === 'Enter') openNotification(n); }}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition hover:bg-[var(--subtle-hover-bg)] ${
              n.isRead ? 'border-[var(--border)]' : 'border-blue-500/30 bg-blue-500/5'
            }`}
          >
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-blue-500'}`} />
            <div className="min-w-0 flex-1">
              <Flex justify="space-between" gap={12} wrap="wrap">
                <Typography.Text strong={!n.isRead}>{n.title}</Typography.Text>
                <Typography.Text type="secondary" className="text-xs">{formatWhen(n.createdAt)}</Typography.Text>
              </Flex>
              {n.message && <Typography.Text type="secondary" className="block text-sm">{n.message}</Typography.Text>}
              {n.actorName && <Typography.Text type="secondary" className="block text-xs">By {n.actorName}</Typography.Text>}
            </div>
            {n.link && <RightOutlined className="mt-1.5 text-[var(--text-muted)]" />}
          </div>
        ))}
      </Flex>
    )
  );

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <BellOutlined className={titleIconClassName} /> Notifications
        </Typography.Title>
        <Button icon={<CheckOutlined />} disabled={unread.length === 0} onClick={markAllRead}>
          Mark all as read
        </Button>
      </Flex>

      <Card className="rounded-xl! border! border-[var(--border)]!">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'all', label: `All (${items.length})`, children: list },
            {
              key: 'unread',
              label: <Badge count={unread.length} size="small" offset={[10, 0]}>Unread</Badge>,
              children: list,
            },
          ]}
        />
      </Card>
    </div>
  );
}
