'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Badge, Card, Col, Empty, Flex, Input, Row, Tabs, Tag, Typography } from 'antd';
import { SearchOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import type { WeeklyTimesheet } from '@/types/erp';
import { cardClassName, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';

const TAB_ROLES = [
  { key: 'site_engineer', label: 'Site Engineers' },
  { key: 'purchase_team', label: 'Purchase Team' },
  { key: 'office_staff', label: 'Office Team' },
  { key: 'accounts_manager', label: 'Accounts' },
];

type Props = {
  timesheets: WeeklyTimesheet[];
};

type PersonSummary = {
  id: string;
  name: string;
  email?: string;
  count: number;
  pendingCount: number;
};

export function SiteEngineerAttendanceClient({ timesheets }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('site_engineer');
  const [peopleSearch, setPeopleSearch] = useState('');

  const timesheetsByRole = useMemo(() => {
    const map: Record<string, WeeklyTimesheet[]> = { site_engineer: [], purchase_team: [], office_staff: [], accounts_manager: [] };
    for (const ts of timesheets) {
      const role = ts.siteEngineer?.role || '';
      if (map[role]) map[role].push(ts);
    }
    return map;
  }, [timesheets]);

  const currentRoleList = useMemo(() => timesheetsByRole[activeTab] || [], [timesheetsByRole, activeTab]);

  const people = useMemo(() => {
    const map = new Map<string, PersonSummary>();
    for (const ts of currentRoleList) {
      if (!ts.siteEngineer) continue;
      const existing = map.get(ts.siteEngineer.id);
      const isPendingStatus = ts.status === 'pending';
      if (existing) {
        existing.count += 1;
        if (isPendingStatus) existing.pendingCount += 1;
      } else {
        map.set(ts.siteEngineer.id, {
          id: ts.siteEngineer.id,
          name: ts.siteEngineer.name,
          email: ts.siteEngineer.email,
          count: 1,
          pendingCount: isPendingStatus ? 1 : 0,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [currentRoleList]);

  const filteredPeople = useMemo(() => {
    if (!peopleSearch) return people;
    const q = peopleSearch.toLowerCase();
    return people.filter((p) => p.name.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q));
  }, [people, peopleSearch]);

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <TeamOutlined className={titleIconClassName} /> Attendance
        </Typography.Title>
      </Flex>

      <Card className={cardClassName}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => { setActiveTab(key); setPeopleSearch(''); }}
          items={TAB_ROLES.map((tab) => ({
            key: tab.key,
            label: (
              <span>
                {tab.label}
                {(timesheetsByRole[tab.key] || []).length > 0 && (
                  <Tag className="ml-2" bordered={false}>
                    {new Set((timesheetsByRole[tab.key] || []).map((t) => t.siteEngineerId)).size}
                  </Tag>
                )}
              </span>
            ),
            children: (
              <>
                <Input.Search
                  placeholder="Search by name or email..."
                  allowClear
                  value={peopleSearch}
                  onChange={(e) => setPeopleSearch(e.target.value)}
                  prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
                  className="mb-4 max-w-sm"
                />

                {filteredPeople.length === 0 ? (
                  <Empty description={`No ${TAB_ROLES.find((t) => t.key === activeTab)?.label.toLowerCase()} timesheets yet`} />
                ) : (
                  <Row gutter={[16, 16]}>
                    {filteredPeople.map((person) => (
                      <Col key={person.id} xs={24} sm={12} md={8} lg={6}>
                        <Card
                          hoverable
                          className={`${cardClassName} cursor-pointer h-full`}
                          onClick={() => router.push(`/dashboard/site-engineer-attendance/${person.id}`)}
                        >
                          <Flex align="center" gap={12}>
                            <Badge count={person.pendingCount} size="small">
                              <Avatar size={44} icon={<UserOutlined />} className="bg-sky-500/20! text-sky-300!" />
                            </Badge>
                            <div className="min-w-0 flex-1">
                              <Typography.Text strong className="block truncate text-[var(--text-primary)]">
                                {person.name}
                              </Typography.Text>
                              <Typography.Text className="block truncate text-xs text-[var(--text-muted)]">
                                {person.email || '-'}
                              </Typography.Text>
                            </div>
                          </Flex>
                          <Flex justify="space-between" align="center" className="mt-3! pt-3! border-t border-[var(--border)]">
                            <Typography.Text className="text-xs text-[var(--text-muted)]">
                              {person.count} timesheet{person.count > 1 ? 's' : ''}
                            </Typography.Text>
                            {person.pendingCount > 0 ? (
                              <Tag color="orange">{person.pendingCount} pending</Tag>
                            ) : (
                              <Tag color="green">Up to date</Tag>
                            )}
                          </Flex>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
