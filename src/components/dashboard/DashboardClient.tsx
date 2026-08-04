'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Skeleton, Space, Statistic, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DollarOutlined,
  ProjectOutlined,
  ReloadOutlined,
  RiseOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardData, DashboardProject, ExpenseSummary } from '@/types/erp';
import { clientApiFetch } from '@/lib/client-api';
import { cardClassName, formatCurrency, mutedTextClassName, secondaryTextClassName, titleCase } from './ui';

type DashboardQueryData = {
  data: DashboardData;
  expenseSummary: ExpenseSummary[];
};

const emptyDashboard: DashboardData = {
  totalProjects: 0,
  projects: [],
  revenueVsCost: { totalRevenue: 0, totalCost: 0, totalInflow: 0 },
  weeklyLabour: [],
  criticalActions: [],
};

const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4'];
const chartHeight = 300;

const statisticClassNames = { content: 'text-[var(--text-primary)]! font-bold!' };

const kpiCardClassNames = {
  blue: 'rounded-xl! border! border-blue-500/20! bg-linear-to-br! from-blue-500/15! to-blue-500/5!',
  green: 'rounded-xl! border! border-emerald-500/20! bg-linear-to-br! from-emerald-500/15! to-emerald-500/5!',
  amber: 'rounded-xl! border! border-amber-500/20! bg-linear-to-br! from-amber-500/15! to-amber-500/5!',
  violet: 'rounded-xl! border! border-violet-500/20! bg-linear-to-br! from-violet-500/15! to-violet-500/5!',
};

function ChartFrame({ children }: { children: (width: number, height: number) => ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="h-80 min-w-0 w-full">
      {width > 0 ? children(width, chartHeight) : null}
    </div>
  );
}

async function loadDashboard(): Promise<DashboardQueryData> {
  const [data, expenseSummary] = await Promise.all([
    clientApiFetch<DashboardData>('/dashboard/master'),
    clientApiFetch<ExpenseSummary[]>('/expenses/summary'),
  ]);

  return { data, expenseSummary };
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Skeleton.Input active size="large" className="w-64!" />
        <Skeleton.Button active />
      </div>
      <Row gutter={[16, 16]} className="mb-6">
        {[0, 1, 2, 3].map((item) => (
          <Col key={item} xs={24} sm={12} lg={6}>
            <Card className={cardClassName}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card className={cardClassName}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className={cardClassName}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs text-[var(--text-muted)]">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function DashboardClient() {
  const {
    data: dashboardResult,
    error,
    isError,
    isFetching,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'master'],
    queryFn: loadDashboard,
  });

  if (isPending) {
    return <DashboardSkeleton />;
  }

  const data = dashboardResult?.data || emptyDashboard;
  const expenseSummary = dashboardResult?.expenseSummary || [];
  const totalRevenue = Number(data.revenueVsCost.totalRevenue || 0);
  const totalCost = Number(data.revenueVsCost.totalCost || 0);
  const totalInflow = Number(data.revenueVsCost.totalInflow || 0);
  const profit = totalInflow - totalCost;
  const profitPct = totalCost > 0 ? ((profit / totalCost) * 100).toFixed(1) : '0';
  const isProfitable = profit >= 0;

  const inflowOutflowData = [
    { name: 'Inflow', amount: totalInflow, fill: '#10b981' },
    { name: 'Outflow', amount: totalCost, fill: '#ef4444' },
  ];

  const expenseChartData = expenseSummary.map((item) => ({
    name: item.category ? titleCase(item.category) : 'Expense',
    value: Number(item.total || 0),
  }));

  const weeklyLabourData = (data.weeklyLabour || []).map((w) => ({
    week: w.weekStart ? new Date(w.weekStart).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '',
    headcount: w.headcount,
  }));

  const maxRevenueCost = Math.max(totalInflow, totalCost, 1);

  const projectColumns: ColumnsType<DashboardProject> = [
    {
      title: 'Project',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (value: string) => (
        <Typography.Text strong className="text-[var(--text-primary)]!">
          {value}
        </Typography.Text>
      ),
    },
    {
      title: 'Completion',
      dataIndex: 'completionPct',
      width: 200,
      sorter: (a, b) => Number(a.completionPct) - Number(b.completionPct),
      render: (pct: number | string) => (
        <Progress
          percent={Number(pct || 0)}
          size="small"
          strokeColor={{ from: '#3b82f6', to: '#10b981' }}
          format={(p) => `${p}%`}
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
          <Typography.Title level={3} className="m-0! text-[var(--text-primary)]!">
            Master Dashboard
          </Typography.Title>
          <Typography.Text className={mutedTextClassName}>
            Executive overview of projects, finances, and operations
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
          Refresh
        </Button>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card className={kpiCardClassNames.blue} size="small">
            <Statistic
              title={<Typography.Text className={secondaryTextClassName}>Total Projects</Typography.Text>}
              value={data.totalProjects}
              prefix={<ProjectOutlined className="text-blue-500" />}
              classNames={statisticClassNames}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={kpiCardClassNames.green} size="small">
            <Statistic
              title={<Typography.Text className={secondaryTextClassName}>Total Inflow</Typography.Text>}
              value={formatCurrency(totalInflow)}
              prefix={<DollarOutlined className="text-emerald-500" />}
              classNames={statisticClassNames}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={kpiCardClassNames.amber} size="small">
            <Statistic
              title={<Typography.Text className={secondaryTextClassName}>Total Outflow</Typography.Text>}
              value={formatCurrency(totalCost)}
              prefix={<RiseOutlined className="text-amber-500" />}
              classNames={statisticClassNames}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={kpiCardClassNames.violet} size="small">
            <Statistic
              title={<Typography.Text className={secondaryTextClassName}>Net Profit</Typography.Text>}
              value={formatCurrency(profit)}
              prefix={
                isProfitable
                  ? <ArrowUpOutlined className="text-emerald-500" />
                  : <ArrowDownOutlined className="text-red-500" />
              }
              suffix={
                <Typography.Text className={isProfitable ? 'text-emerald-500' : 'text-red-500'} style={{ fontSize: 14 }}>
                  {isProfitable ? '+' : ''}{profitPct}%
                </Typography.Text>
              }
              classNames={statisticClassNames}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={14}>
          <Card
            title={<Typography.Text strong className="text-[var(--text-primary)]!">Inflow vs Outflow</Typography.Text>}
            className={cardClassName}
          >
            <ChartFrame>
              {(width, height) => (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inflowOutflowData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 14 }} />
                    <YAxis
                      stroke="var(--text-muted)"
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--subtle-bg)' }} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {inflowOutflowData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartFrame>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={<Typography.Text strong className="text-[var(--text-primary)]!">Expenses by Category</Typography.Text>}
            className={cardClassName}
          >
            <ChartFrame>
              {(width, height) => (
                expenseChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {expenseChartData.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => (
                          <span className="text-[var(--text-secondary)]" style={{ fontSize: 12 }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Typography.Text type="secondary">No expense data yet</Typography.Text>
                  </div>
                )
              )}
            </ChartFrame>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={8}>
          <Card
            title={<Typography.Text strong className="text-[var(--text-primary)]!">Financial Summary</Typography.Text>}
            className={cardClassName}
          >
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between">
                  <Typography.Text className={mutedTextClassName}>Inflow vs Outflow Ratio</Typography.Text>
                  <Typography.Text strong className="text-[var(--text-primary)]!">
                    {totalInflow > 0 ? ((totalInflow - totalCost) / totalInflow * 100).toFixed(1) : '0'}%
                  </Typography.Text>
                </div>
                <Progress
                  percent={totalInflow > 0 ? Math.min((totalInflow / maxRevenueCost) * 100, 100) : 0}
                  showInfo={false}
                  strokeColor="#10b981"
                  size="small"
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between">
                  <Typography.Text className={mutedTextClassName}>Cost Ratio</Typography.Text>
                  <Typography.Text strong className="text-[var(--text-primary)]!">
                    {totalInflow > 0 ? ((totalCost / totalInflow) * 100).toFixed(1) : '0'}%
                  </Typography.Text>
                </div>
                <Progress
                  percent={totalInflow > 0 ? Math.min((totalCost / maxRevenueCost) * 100, 100) : 0}
                  showInfo={false}
                  strokeColor="#ef4444"
                  size="small"
                />
              </div>
              <div className="border-t border-[var(--border)] pt-3">
                <div className="flex justify-between">
                  <Typography.Text className={mutedTextClassName}>Total Revenue</Typography.Text>
                  <Typography.Text strong className="text-[var(--text-primary)]!">{formatCurrency(totalRevenue)}</Typography.Text>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card
            title={<Typography.Text strong className="text-[var(--text-primary)]!">Active Projects</Typography.Text>}
            className={cardClassName}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              dataSource={data.projects}
              columns={projectColumns}
              rowKey="id"
              pagination={false}
              size="middle"
              locale={{ emptyText: <Space>No active projects</Space> }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}