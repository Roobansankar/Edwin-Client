'use client';

import { Alert, Button, Card, Col, Progress, Row, Skeleton, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircleOutlined, CloseCircleOutlined, ProjectOutlined, ReloadOutlined, ShoppingCartOutlined, FileTextOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type { DashboardData, DashboardProject } from '@/types/erp';
import { clientApiFetch } from '@/lib/client-api';
import { cardClassName, secondaryTextClassName } from './ui';

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
        <Typography.Title level={3} className="m-0! text-[var(--text-primary)]!">
          My Dashboard
        </Typography.Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void refetch()}
          loading={isFetching}
        >
          Refresh
        </Button>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={8}>
          <Card className="rounded-xl! border! border-blue-500/20! bg-linear-to-br! from-blue-500/15! to-blue-500/5!">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20 text-blue-500 text-xl">
                <ProjectOutlined />
              </div>
              <div>
                <Typography.Text className={secondaryTextClassName}>Assigned Projects</Typography.Text>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{data.totalProjects}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="rounded-xl! border! border-amber-500/20! bg-linear-to-br! from-amber-500/15! to-amber-500/5!">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500 text-xl">
                <ShoppingCartOutlined />
              </div>
              <div>
                <Typography.Text className={secondaryTextClassName}>Material Requirements</Typography.Text>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{data.materialRequirementCounts?.total ?? 0}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="rounded-xl! border! border-emerald-500/20! bg-linear-to-br! from-emerald-500/15! to-emerald-500/5!">
            <Typography.Text className={secondaryTextClassName}>MR Status</Typography.Text>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircleOutlined className="text-emerald-500" />
                <span className="text-lg font-bold text-[var(--text-primary)]">{data.materialRequirementCounts?.approved ?? 0}</span>
                <span className={secondaryTextClassName}>Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <CloseCircleOutlined className="text-red-500" />
                <span className="text-lg font-bold text-[var(--text-primary)]">{data.materialRequirementCounts?.rejected ?? 0}</span>
                <span className={secondaryTextClassName}>Rejected</span>
              </div>
              <div className="flex items-center gap-2">
                <ShoppingCartOutlined className="text-orange-500" />
                <span className="text-lg font-bold text-[var(--text-primary)]">{data.materialRequirementCounts?.pending ?? 0}</span>
                <span className={secondaryTextClassName}>Pending</span>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="rounded-xl! border! border-violet-500/20! bg-linear-to-br! from-violet-500/15! to-violet-500/5!">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500/20 text-violet-500 text-xl">
                <FileTextOutlined />
              </div>
              <div>
                <Typography.Text className={secondaryTextClassName}>Timesheets (This Month)</Typography.Text>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{data.timesheetCounts?.total ?? 0}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title={<Typography.Text strong>My Active Projects</Typography.Text>} className={cardClassName} style={{ marginBottom: 24 }}>
        <Table
          dataSource={data.projects}
          columns={projectColumns}
          rowKey="id"
          pagination={false}
          size="middle"
          locale={{ emptyText: <Space>No assigned projects</Space> }}
        />
      </Card>

      <Card title={<Typography.Text strong>Recent Material Requirements</Typography.Text>} className={cardClassName}>
        <Table
          dataSource={data.recentMaterialRequirements}
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
