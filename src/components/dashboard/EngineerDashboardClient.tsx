'use client';

import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Col, Progress, Row, Skeleton, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircleOutlined, ProjectOutlined, ReloadOutlined, ShoppingCartOutlined, FileTextOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type { DashboardData, DashboardProject } from '@/types/erp';
import { clientApiFetch } from '@/lib/client-api';
import { KpiCard, cardClassName, mutedTextClassName, pageTitleClassName } from './ui';

const emptyDashboard: DashboardData = {
  totalProjects: 0,
  projects: [],
  revenueVsCost: { totalRevenue: 0, totalCost: 0 },
  weeklyLabour: [],
  criticalActions: [],
};

async function loadEngineerDashboard(): Promise<DashboardData> {
  return await clientApiFetch<DashboardData>('/dashboard/engineer');
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Skeleton.Input active size="large" className="w-64!" />
        <Skeleton.Button active />
      </div>
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={8}>
          <Card className={cardClassName}>
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
        </Col>
      </Row>
      <Card className={cardClassName}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    </div>
  );
}

export function EngineerDashboardClient() {
  const router = useRouter();
  const {
    data: dashboardData,
    error,
    isError,
    isFetching,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'engineer'],
    queryFn: loadEngineerDashboard,
  });

  if (isPending) {
    return <DashboardSkeleton />;
  }

  const data = dashboardData || emptyDashboard;

  const projectColumns: ColumnsType<DashboardProject> = [
    {
      title: 'Project',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Completion',
      dataIndex: 'completionPct',
      sorter: (a, b) => Number(a.completionPct) - Number(b.completionPct),
      render: (pct: number | string) => (
        <Progress
          percent={Number(pct || 0)}
          size="small"
          strokeColor={{ from: '#3b82f6', to: '#10b981' }}
        />
      ),
    },
  ];

  return (
    <div>
      {isError && (
        <Alert
          type="error"
          showIcon
          title="Dashboard data is unavailable"
          description={error instanceof Error ? error.message : 'Unable to load dashboard data.'}
          action={
            <Button size="small" onClick={() => void refetch()} loading={isFetching}>
              Retry
            </Button>
          }
          className="mb-4"
        />
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Typography.Title level={3} className={pageTitleClassName}>
            My Dashboard
          </Typography.Title>
          <Typography.Text className={mutedTextClassName}>
            Your assigned projects, material requirements and timesheets
          </Typography.Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void refetch()}
          loading={isFetching}
        >
          Refresh
        </Button>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            tone="blue"
            title="Assigned Projects"
            value={data.totalProjects}
            icon={<ProjectOutlined className="text-blue-500" />}
            onClick={() => router.push('/dashboard/my-projects')}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            tone="amber"
            title="Material Requirements"
            value={data.materialRequirementCounts?.total ?? 0}
            icon={<ShoppingCartOutlined className="text-amber-500" />}
            onClick={() => router.push('/dashboard/material-requirement')}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            tone="green"
            title="MR Approved"
            value={data.materialRequirementCounts?.approved ?? 0}
            icon={<CheckCircleOutlined className="text-emerald-500" />}
            note={`${data.materialRequirementCounts?.pending ?? 0} pending · ${data.materialRequirementCounts?.rejected ?? 0} rejected`}
            onClick={() => router.push('/dashboard/material-requirement')}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            tone="violet"
            title="Timesheets (This Month)"
            value={data.timesheetCounts?.total ?? 0}
            icon={<FileTextOutlined className="text-violet-500" />}
            onClick={() => router.push('/dashboard/timesheet-attendance')}
          />
        </Col>
      </Row>

      <Card id="my-active-projects" title={<Typography.Text strong>My Active Projects</Typography.Text>} className={cardClassName} style={{ marginBottom: 24 }}>
        <Table
          dataSource={data.projects}
          columns={projectColumns}
          rowKey="id"
          pagination={false}
          size="middle"
          scroll={{ x: 400 }}
          locale={{ emptyText: <Space>No assigned projects</Space> }}
        />
      </Card>

      <Card title={<Typography.Text strong>Recent Material Requirements</Typography.Text>} className={cardClassName}>
        <Table
          dataSource={data.recentMaterialRequirements}
          scroll={{ x: 610 }}
          onRow={() => ({
            onClick: () => router.push('/dashboard/material-requirement'),
            style: { cursor: 'pointer' },
          })}
          columns={[
            { title: 'Enquiry No', dataIndex: 'enquiryNo', key: 'enquiryNo', width: 150 },
            { title: 'Project', dataIndex: 'projectName', key: 'projectName', width: 200 },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              width: 120,
              render: (v: string) => {
                const color: Record<string, string> = { approved: 'green', pending: 'orange', rejected: 'red', draft: 'default' };
                return <Tag color={color[v] || 'default'}>{(v || '').toUpperCase()}</Tag>;
              },
            },
            {
              title: 'Date',
              dataIndex: 'createdAt',
              key: 'createdAt',
              width: 140,
              render: (v: string) => (v ? new Date(v).toLocaleDateString() : '-'),
            },
          ]}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: <Space>No material requirements yet</Space> }}
        />
      </Card>
    </div>
  );
}
