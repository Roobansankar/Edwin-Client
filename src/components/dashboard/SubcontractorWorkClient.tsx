'use client';

import { useState, useTransition } from 'react';
import { App, Button, Card, Drawer, Flex, Form, Image, Input, Popconfirm, Select, Space, Table, Tag, Typography, Upload } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import { DeleteOutlined, PlusOutlined, TeamOutlined, UploadOutlined } from '@ant-design/icons';
import { createSubcontractorWork, deleteSubcontractorWork, updateSubcontractorWorkStatus } from '@/actions/subcontractor-work';
import type { Project, Subcontractor, SubcontractorWork } from '@/types/erp';
import { useAuthStore } from '@/store/auth';
import { getApiOrigin } from '@/lib/api-url';
import {
  cardClassName,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

type Props = {
  works: SubcontractorWork[];
  projects: Project[];
  subcontractors: Subcontractor[];
};

export function SubcontractorWorkClient({ works, projects, subcontractors }: Props) {
  const user = useAuthStore((s) => s.user);
  const canAdd = user?.role === 'admin' || user?.role === 'site_engineer';
  const canUpdateStatus = user?.role === 'admin' || user?.role === 'purchase_team';
  const [open, setOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const handleAdd = () => {
    form.resetFields();
    setFileList([]);
    setOpen(true);
  };

  const handleSubmit = (values: { projectId: string; subcontractorId: string; notes?: string }) => {
    const formData = new FormData();
    formData.append('projectId', values.projectId);
    formData.append('subcontractorId', values.subcontractorId);
    if (values.notes) formData.append('notes', values.notes);
    for (const file of fileList) {
      if (file.originFileObj) formData.append('photos', file.originFileObj);
    }

    startTransition(async () => {
      try {
        await createSubcontractorWork(formData);
        message.success('Subcontractor work submitted');
        setOpen(false);
        form.resetFields();
        setFileList([]);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to submit');
      }
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      try {
        await updateSubcontractorWorkStatus(id, status);
        message.success('Status updated');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to update status');
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteSubcontractorWork(id);
        message.success('Entry deleted');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to delete');
      }
    });
  };

  const columns: ColumnsType<SubcontractorWork> = [
    { title: 'S.No', key: 'sno', width: 60, render: (_text, _record, index) => index + 1 },
    { title: 'Date', dataIndex: 'createdAt', width: 110, render: formatDate, sorter: (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime() },
    { title: 'Project', key: 'project', width: 180, render: (_, r) => r.project?.name || '-' },
    { title: 'Subcontractor', key: 'subcontractor', width: 180, render: (_, r) => r.subcontractor?.name || '-' },
    {
      title: 'Photos',
      key: 'photos',
      width: 160,
      render: (_, r) => r.photoUrls && r.photoUrls.length > 0 ? (
        <Image.PreviewGroup>
          <Space>
            {r.photoUrls.slice(0, 3).map((url, i) => (
              <Image key={i} src={`${getApiOrigin()}${url}`} width={36} height={36} className="rounded object-cover border border-[var(--border)]" />
            ))}
            {r.photoUrls.length > 3 && <Typography.Text type="secondary" className="text-xs">+{r.photoUrls.length - 3}</Typography.Text>}
          </Space>
        </Image.PreviewGroup>
      ) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    { title: 'Notes', dataIndex: 'notes', render: (v) => v || '-' },
    ...(user?.role !== 'site_engineer' ? [{
      title: 'Submitted By', key: 'createdBy', width: 160, render: (_: unknown, r: SubcontractorWork) => r.createdBy?.name || '-',
    }] : []),
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (_, r) => canUpdateStatus ? (
        <Select
          defaultValue={r.status}
          size="small"
          variant="borderless"
          className="w-full"
          onChange={(newStatus) => handleStatusChange(r.id, newStatus)}
          options={STATUS_OPTIONS}
          popupMatchSelectWidth={false}
          disabled={isPending}
        />
      ) : (
        <Tag color={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'error' : 'warning'}>
          {r.status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, r) => (canAdd && (user?.role === 'admin' || r.createdById === user?.id)) ? (
        <Popconfirm title="Delete this entry?" onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No" okButtonProps={{ danger: true, loading: isPending }}>
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ) : null,
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <TeamOutlined className={titleIconClassName} /> Subcontractor Work
        </Typography.Title>
        {canAdd && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Entry
          </Button>
        )}
      </Flex>

      <Card className={cardClassName} styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={works}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} entries` }}
        />
      </Card>

      <Drawer
        title="Add Subcontractor Work Entry"
        open={open}
        onClose={() => setOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={() => form.submit()}>
              Submit
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="projectId" label="Project" rules={[{ required: true, message: 'Please select a project' }]}>
            <Select
              showSearch
              placeholder="Select project"
              optionFilterProp="label"
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>

          <Form.Item name="subcontractorId" label="Subcontractor" rules={[{ required: true, message: 'Please select a subcontractor' }]}>
            <Select
              showSearch
              placeholder="Select subcontractor"
              optionFilterProp="label"
              options={subcontractors.map((s) => ({ label: s.name, value: s.id }))}
            />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={4} placeholder="Describe the work observed..." />
          </Form.Item>

          <Form.Item label="Photos">
            <Upload
              beforeUpload={() => false}
              listType="picture"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              multiple
              accept="image/*"
            >
              <Button icon={<UploadOutlined />}>Select Photos</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
