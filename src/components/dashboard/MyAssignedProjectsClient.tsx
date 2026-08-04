'use client';

import { useEffect, useState } from 'react';
import { Card, Table, Typography, Progress, Alert, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ProjectOutlined } from '@ant-design/icons';
import { fetchPurchaseAssignedProjects } from '@/lib/client-api';
import { StatusTag, cardClassName, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';

type AssignedProject = {
  id: string;
  name: string;
  projectCode?: string;
  status: string;
  completionPct: number;
  location?: string | null;
  clientName?: string | null;
};

export function MyAssignedProjectsClient() {
  const [projects, setProjects] = useState<AssignedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPurchaseAssignedProjects()
      .then((data) => setProjects(data as AssignedProject[]))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  const columns: ColumnsType<AssignedProject> = [
    { title: 'Project', dataIndex: 'name', render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'Code', dataIndex: 'projectCode', render: (v?: string) => v || '-' },
    { title: 'Client', dataIndex: 'clientName', render: (v?: string | null) => v || '-' },
    { title: 'Location', dataIndex: 'location', render: (v?: string | null) => v || '-' },
    { title: 'Status', dataIndex: 'status', render: (v: string) => <StatusTag value={v} /> },
    {
      title: 'Completion',
      dataIndex: 'completionPct',
      render: (pct: number) => <Progress percent={Number(pct || 0)} size="small" strokeColor={{ from: '#3b82f6', to: '#10b981' }} />,
    },
  ];

  return (
    <div>
      <div className={pageHeaderClassName}>
        <Typography.Title level={3} className={pageTitleClassName}>
          <ProjectOutlined className={titleIconClassName} /> Assigned Projects
        </Typography.Title>
      </div>

      {error && <Alert type="error" showIcon message={error} className="mb-4" />}

      <Card className={cardClassName}>
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Spin size="large" /></div>
        ) : (
          <Table
            dataSource={projects}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="middle"
            locale={{ emptyText: 'No projects assigned yet' }}
          />
        )}
      </Card>
    </div>
  );
}
