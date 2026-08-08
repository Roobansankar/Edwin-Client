'use client';

import { useMemo, useState, useTransition } from 'react';
import { App, Button, Card, Flex, Input, Modal, Select, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ProjectOutlined, SwapOutlined, UserOutlined } from '@ant-design/icons';
import { updateSiteEngineer } from '@/actions/site-engineers';
import { useAuthStore } from '@/store/auth';
import type { Project, SiteEngineer } from '@/types/erp';
import {
  cardClassName,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

type AssignedProjectsClientProps = {
  siteEngineers: SiteEngineer[];
  projects: Project[];
};

export function AssignedProjectsClient({ siteEngineers, projects }: AssignedProjectsClientProps) {
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [isPending, startTransition] = useTransition();
  const [engineers, setEngineers] = useState<SiteEngineer[]>(siteEngineers);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [assigningEngineer, setAssigningEngineer] = useState<SiteEngineer | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  const projectOptions = useMemo(
    () => projects.map((p) => ({ label: p.name, value: p.id })),
    [projects],
  );

  const filteredEngineers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return engineers;
    return engineers.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.employeeId || '').toLowerCase().includes(q) ||
        (e.projects || []).some((p) => p.name.toLowerCase().includes(q)),
    );
  }, [engineers, search]);

  const assignedCount = useMemo(
    () => engineers.filter((e) => (e.projects || []).length > 0).length,
    [engineers],
  );

  const openAssign = (engineer: SiteEngineer) => {
    setAssigningEngineer(engineer);
    setSelectedProjectIds(engineer.projects?.map((p) => p.id) || []);
  };

  const handleClose = () => {
    setAssigningEngineer(null);
    setSelectedProjectIds([]);
  };

  const handleSave = () => {
    if (!assigningEngineer) return;
    startTransition(async () => {
      try {
        await updateSiteEngineer(assigningEngineer.id, { projectIds: selectedProjectIds });
        setEngineers((prev) =>
          prev.map((e) =>
            e.id === assigningEngineer.id
              ? { ...e, projects: projects.filter((p) => selectedProjectIds.includes(p.id)) }
              : e,
          ),
        );
        message.success(
          selectedProjectIds.length > 0
            ? `Assigned ${selectedProjectIds.length} project(s) to ${assigningEngineer.name}`
            : `Removed all project assignments from ${assigningEngineer.name}`,
        );
        handleClose();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to update assignments');
      }
    });
  };

  const columns: ColumnsType<SiteEngineer> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 70,
      render: (_, __, index) => (currentPage - 1) * pageSize + index + 1,
    },
    {
      title: 'Site Engineer',
      key: 'engineer',
      render: (_, record) => (
        <Flex vertical gap={0}>
          <Typography.Text strong>{record.name}</Typography.Text>
          <Typography.Text type="secondary" className="text-xs">
            {record.employeeId ? `ID: ${record.employeeId}` : 'No employee ID'}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Assigned Projects',
      key: 'projects',
      render: (_, record) => {
        const engineerProjects = record.projects || [];
        if (engineerProjects.length === 0) {
          return <Tag>Not assigned</Tag>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {engineerProjects.map((p) => (
              <Tag key={p.id} color="blue" className="max-w-[200px] truncate!">
                {p.name}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) =>
        isAdmin ? (
          <Button
            type="primary"
            ghost
            icon={<SwapOutlined />}
            onClick={() => openAssign(record)}
          >
            Assign Projects
          </Button>
        ) : (
          <Typography.Text type="secondary" className="text-xs">
            Admin only
          </Typography.Text>
        ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <ProjectOutlined className={titleIconClassName} /> Assigned Projects
        </Typography.Title>
        <Input.Search
          placeholder="Search by engineer, ID or project..."
          allowClear
          style={{ width: 300 }}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Flex>

      <Flex gap={16} wrap="wrap" className="mb-6!">
        {[
          { label: 'Total Engineers', value: engineers.length, color: '#3b82f6', icon: <UserOutlined /> },
          { label: 'With Projects', value: assignedCount, color: '#10b981', icon: <ProjectOutlined /> },
          { label: 'Unassigned', value: engineers.length - assignedCount, color: '#f59e0b', icon: <SwapOutlined /> },
        ].map((stat) => (
          <Card key={stat.label} className={`${cardClassName} flex-1! min-w-[180px]!`} styles={{ body: { padding: 16 } }}>
            <Flex align="center" gap={12}>
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{ backgroundColor: `${stat.color}1a`, color: stat.color }}
              >
                {stat.icon}
              </div>
              <div className="min-w-0">
                <Typography.Text type="secondary" className="block text-xs">
                  {stat.label}
                </Typography.Text>
                <Typography.Title level={4} className="m-0!">
                  {stat.value}
                </Typography.Title>
              </div>
            </Flex>
          </Card>
        ))}
      </Flex>

      <Card className={cardClassName} styles={{ body: { overflowX: 'auto' } }}>
        <Table
          dataSource={filteredEngineers}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 800 }}
          pagination={{
            current: currentPage,
            pageSize,
            showSizeChanger: true,
            showTotal: (total) => `${total} engineers`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        />
      </Card>

      <Modal
        title={assigningEngineer ? `Assign Projects — ${assigningEngineer.name}` : 'Assign Projects'}
        open={!!assigningEngineer}
        onCancel={handleClose}
        onOk={handleSave}
        okText="Save Assignments"
        cancelText="Cancel"
        confirmLoading={isPending}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary" className="mb-4">
          Select the projects that this site engineer should be assigned to. Saving will replace their
          current project assignments.
        </Typography.Paragraph>
        <Select
          mode="multiple"
          value={selectedProjectIds}
          onChange={setSelectedProjectIds}
          options={projectOptions}
          placeholder="Select projects..."
          style={{ width: '100%' }}
          optionFilterProp="label"
          maxTagCount="responsive"
          showSearch
        />
        {assigningEngineer && (
          <Flex justify="space-between" align="center" className="mt-4!">
            <Typography.Text type="secondary" className="text-xs">
              {selectedProjectIds.length} project(s) selected
            </Typography.Text>
            {selectedProjectIds.length > 0 && (
              <Button size="small" danger type="text" onClick={() => setSelectedProjectIds([])}>
                Clear all
              </Button>
            )}
          </Flex>
        )}
      </Modal>
    </div>
  );
}
