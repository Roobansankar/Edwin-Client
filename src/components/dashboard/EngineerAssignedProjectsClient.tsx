'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input, Typography, Progress, Alert, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ProjectOutlined, SearchOutlined } from '@ant-design/icons';
import { fetchEngineerAssignedProjects } from '@/lib/client-api';
import { StatusTag, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';
import { PagedTableCard, StatusCards } from './DataTablePanel';

type AssignedProject = {
  id: string;
  name: string;
  projectCode?: string;
  status: string;
  completionPct: number;
  location?: string | null;
  clientName?: string | null;
};

export function EngineerAssignedProjectsClient() {
  const [projects, setProjects] = useState<AssignedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchEngineerAssignedProjects()
      .then((data) => setProjects(data as AssignedProject[]))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.name, p.projectCode, p.clientName, p.location].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [projects, searchText]);

  // S.No follows the filtered list, so numbering continues across pages.
  const serialById = new Map(filteredProjects.map((p, i) => [p.id, i + 1]));

  const columns: ColumnsType<AssignedProject> = [
    { title: 'S.No', key: 'sno', width: 70, render: (_text, record) => serialById.get(record.id) },
    { title: 'Project', dataIndex: 'name', width: 260, render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'Code', dataIndex: 'projectCode', width: 120, render: (v?: string) => v || '-' },
    { title: 'Client', dataIndex: 'clientName', width: 180, render: (v?: string | null) => v || '-' },
    { title: 'Location', dataIndex: 'location', width: 180, render: (v?: string | null) => v || '-' },
    { title: 'Status', dataIndex: 'status', width: 140, render: (v: string) => <StatusTag value={v} /> },
    {
      title: 'Completion',
      dataIndex: 'completionPct',
      width: 180,
      render: (pct: number) => <Progress percent={Number(pct || 0)} size="small" strokeColor="#10b981" />,
    },
  ];

  const countOf = (status: string) => projects.filter((p) => p.status === status).length;

  return (
    <div>
      <div className={pageHeaderClassName}>
        <Typography.Title level={3} className={pageTitleClassName}>
          <ProjectOutlined className={titleIconClassName} /> Assigned Projects
        </Typography.Title>
      </div>

      {error && <Alert type="error" showIcon message={error} className="mb-4" />}

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Spin size="large" /></div>
      ) : (
        <>
          <StatusCards
            items={[
              { key: 'assigned', label: 'Assigned', value: projects.length },
              { key: 'in_progress', label: 'In Progress', value: countOf('in_progress') },
              { key: 'planning', label: 'Planning', value: countOf('planning') },
              { key: 'completed', label: 'Completed', value: countOf('completed') },
            ]}
          />
          <PagedTableCard
            title="My Projects"
            subtitle={`${filteredProjects.length} ${filteredProjects.length === 1 ? 'project' : 'projects'}`}
            toolbar={(
              <Input
                allowClear
                placeholder="Search project, code, client, location..."
                prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 280 }}
              />
            )}
            noun="projects"
            dataSource={filteredProjects}
            columns={columns}
            rowKey="id"
            size="middle"
            scroll={{ x: 1130 }}
            locale={{ emptyText: 'No projects assigned yet' }}
          />
        </>
      )}
    </div>
  );
}
