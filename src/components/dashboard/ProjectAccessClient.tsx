'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Flex,
  InputNumber,
  Modal,
  Row,
  Select,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircleOutlined, SafetyCertificateOutlined, StopOutlined, UserOutlined } from '@ant-design/icons';
import { approveProjectAccess, revokeProjectAccess } from '@/actions/project-access';
import type { Project, StaffAccessEntry } from '@/types/erp';
import {
  cardClassName,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleCase,
  titleIconClassName,
} from './ui';

type ProjectAccessClientProps = {
  projects: Project[];
  initialStaff: StaffAccessEntry[];
  initialProjectId?: string;
};

type AccessRecord = NonNullable<StaffAccessEntry['access']>;

const DAY_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '15 days', value: 15 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
];

function statusColor(status?: string) {
  if (status === 'active') return 'green';
  if (status === 'expired') return 'orange';
  if (status === 'revoked') return 'red';
  return 'default';
}

export function ProjectAccessClient({ projects, initialStaff, initialProjectId }: ProjectAccessClientProps) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();
  const [projectId, setProjectId] = useState<string | undefined>(initialProjectId);
  const [staff, setStaff] = useState<StaffAccessEntry[]>(initialStaff);
  const [loading, setLoading] = useState(false);

  const [approving, setApproving] = useState<StaffAccessEntry | null>(null);
  const [days, setDays] = useState<number>(30);
  const [previewExpiry, setPreviewExpiry] = useState<string>('');

  const loadStaff = useCallback(
    (targetProjectId: string) => {
      setLoading(true);
      fetch(`/api/backend/project-access/staff?projectId=${encodeURIComponent(targetProjectId)}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load staff'))))
        .then((data) => setStaff(data))
        .catch((err) => message.error(err.message || 'Failed to load staff'))
        .finally(() => setLoading(false));
    },
    [message],
  );

  const handleProjectChange = (value: string) => {
    setProjectId(value);
    loadStaff(value);
  };

  const openApprove = (entry: StaffAccessEntry) => {
    const initialDays = entry.access?.status === 'active' ? entry.access.approvedDays : 30;
    setApproving(entry);
    setDays(initialDays);
    setPreviewExpiry(new Date(Date.now() + initialDays * 86400000).toISOString());
  };

  const handleApprove = () => {
    if (!approving || !projectId) return;
    startTransition(async () => {
      try {
        await approveProjectAccess(projectId, approving.id, days);
        message.success(`Approved ${approving.name} for ${days} day(s)`);
        setApproving(null);
        setStaff((prev) =>
          prev.map((s) =>
            s.id === approving.id
              ? {
                  ...s,
                  access: {
                    id: s.access?.id || 'new',
                    approvedDays: days,
                    approvedAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
                    status: 'active',
                  },
                }
              : s,
          ),
        );
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to approve access');
      }
    });
  };

  const handleRevoke = (entry: StaffAccessEntry) => {
    if (!projectId) return;
    startTransition(async () => {
      try {
        await revokeProjectAccess(projectId, entry.id);
        message.success(`Revoked access for ${entry.name}`);
        setStaff((prev) => prev.map((s) => (s.id === entry.id ? { ...s, access: null } : s)));
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to revoke access');
      }
    });
  };

  const stats = useMemo(() => {
    const total = staff.length;
    const approved = staff.filter((s) => s.access?.status === 'active').length;
    const expired = staff.filter((s) => s.access?.status === 'expired').length;
    const notApproved = total - approved - expired;
    return { total, approved, expired, notApproved };
  }, [staff]);

  const columns: ColumnsType<StaffAccessEntry> = [
    {
      title: 'Staff',
      key: 'staff',
      width: 220,
      render: (_, record) => (
        <Flex vertical gap={0}>
          <Typography.Text strong>{record.name}</Typography.Text>
          <Typography.Text type="secondary" className="text-xs">
            {record.employeeId ? `ID: ${record.employeeId}` : record.email}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      width: 170,
      render: (v: string, record) => (
        <Tag color={record.role === 'accounts_manager' ? 'purple' : 'blue'}>{titleCase(v)}</Tag>
      ),
    },
    {
      title: 'Staff Type',
      dataIndex: 'staffType',
      width: 170,
      render: (v: string) => v || '-',
    },
    {
      title: 'Access Status',
      key: 'status',
      width: 200,
      render: (_, record) => {
        const access = record.access as AccessRecord | null | undefined;
        if (!access) return <Tag>Not approved</Tag>;
        return (
          <Flex vertical gap={2}>
            <Tag color={statusColor(access.status)}>{titleCase(access.status)}</Tag>
            {access.status === 'active' && (
              <Typography.Text type="secondary" className="text-xs">
                until {formatDate(access.expiresAt)}
              </Typography.Text>
            )}
          </Flex>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, record) =>
        record.access?.status === 'active' ? (
          <Button danger icon={<StopOutlined />} onClick={() => handleRevoke(record)} loading={isPending}>
            Revoke
          </Button>
        ) : (
          <Button type="primary" ghost icon={<CheckCircleOutlined />} onClick={() => openApprove(record)}>
            Approve Access
          </Button>
        ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <SafetyCertificateOutlined className={titleIconClassName} /> Project Access Approval
        </Typography.Title>
      </Flex>

      <Card className={`${cardClassName} mb-6`}>
        <Flex align="center" gap={12} wrap="wrap">
          <Typography.Text className="text-[var(--text-muted)]!">Select Project:</Typography.Text>
          <Select
            showSearch
            placeholder="Choose a project"
            style={{ minWidth: 320 }}
            value={projectId}
            onChange={setProjectId}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            filterOption={(input, option) =>
              String(option?.label || '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Flex>
      </Card>

      {projectId ? (
        <>
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={12} sm={6}>
              <Card className={cardClassName}>
                <Statistic title="Office & Accounts Staff" value={stats.total} prefix={<UserOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className={cardClassName}>
                <Statistic title="Approved" value={stats.approved} styles={{ content: { color: '#16a34a' } }} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className={cardClassName}>
                <Statistic title="Expired" value={stats.expired} styles={{ content: { color: '#d97706' } }} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className={cardClassName}>
                <Statistic title="Not Approved" value={stats.notApproved} styles={{ content: { color: '#6b7280' } }} />
              </Card>
            </Col>
          </Row>

          <Card className={cardClassName}>
            <Table
              dataSource={staff}
              columns={columns}
              rowKey="id"
              size="middle"
              loading={loading}
              scroll={{ x: 1000 }}
              pagination={{ pageSize: 10, showTotal: (total) => `${total} staff` }}
              locale={{ emptyText: 'No office staff or accounts managers found' }}
            />
          </Card>
        </>
      ) : (
        <Card className={cardClassName}>
          <Typography.Text type="secondary">
            Select a project above to see all office staff and accounts managers, then approve access for a
            number of days. Approved staff will be added to that project.
          </Typography.Text>
        </Card>
      )}

      <Modal
        title={approving ? `Approve Access — ${approving.name}` : 'Approve Access'}
        open={!!approving}
        onCancel={() => setApproving(null)}
        onOk={handleApprove}
        okText="Approve"
        cancelText="Cancel"
        confirmLoading={isPending}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary" className="mb-4">
          {approving?.role === 'accounts_manager' ? 'Accounts Manager' : 'Office Staff'} will be added to the
          selected project with access for the chosen number of days.
        </Typography.Paragraph>
        <Flex vertical gap={4}>
          <Typography.Text className="font-medium">Access Duration</Typography.Text>
          <Flex gap={12} wrap="wrap" align="center">
            <Select
              value={days}
              onChange={(v) => {
                setDays(v);
                setPreviewExpiry(new Date(Date.now() + v * 86400000).toISOString());
              }}
              options={DAY_OPTIONS}
              style={{ width: 140 }}
              placeholder="Days"
            />
            <InputNumber
              min={1}
              max={3650}
              value={days}
              onChange={(v) => {
                if (!v) return;
                setDays(v);
                setPreviewExpiry(new Date(Date.now() + v * 86400000).toISOString());
              }}
              style={{ width: 120 }}
            />
          </Flex>
        </Flex>
        <Typography.Paragraph type="secondary" className="mt-4 mb-0 text-xs">
          Expires on <strong>{formatDate(previewExpiry)}</strong>
        </Typography.Paragraph>
      </Modal>
    </div>
  );
}
