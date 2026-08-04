'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  App,
  Button,
  Card,
  Drawer,
  Flex,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  DownloadOutlined,
  FileTextOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  createOfficeReport,
  deleteOfficeReport,
} from '@/actions/office-reports';
import type { OfficeReport, Project } from '@/types/erp';
import { getApiOrigin } from '@/lib/api-url';
import {
  cardClassName,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

type OfficeReportsClientProps = {
  reports: OfficeReport[];
  categories: string[];
  projects: Project[];
};

const ALL_CATEGORIES = 'ALL';

export function OfficeReportsClient({ reports, categories, projects }: OfficeReportsClientProps) {
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const filteredReports = useMemo(() => {
    if (activeCategory === ALL_CATEGORIES) return reports;
    return reports.filter((r) => r.category === activeCategory);
  }, [reports, activeCategory]);

  const submit = async (values: {
    category: string;
    title: string;
    description?: string;
    projectId?: string;
    file: { fileList?: { originFileObj?: File }[] };
  }) => {
    const fileObj = values.file?.fileList?.[0]?.originFileObj;
    if (!fileObj) {
      message.error('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('category', values.category);
    formData.append('title', values.title);
    if (values.description) formData.append('description', values.description);
    if (values.projectId) formData.append('projectId', values.projectId);
    formData.append('file', fileObj);

    startTransition(async () => {
      try {
        await createOfficeReport(formData);
        message.success('Report uploaded successfully');
        setOpen(false);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Upload failed');
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteOfficeReport(id);
        message.success('Report deleted successfully');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Delete failed');
      }
    });
  };

  const columns: ColumnsType<OfficeReport> = [
    {
      title: 'Category',
      dataIndex: 'category',
      width: 160,
      render: (value: string) => <Tag color="purple">{value}</Tag>,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: (value: string) =>
        value ? (
          <Typography.Text type="secondary" ellipsis={{ tooltip: value }}>
            {value}
          </Typography.Text>
        ) : (
          '-'
        ),
    },
    {
      title: 'Project',
      dataIndex: ['project', 'name'],
      render: (value: string) => value || '-',
    },
    {
      title: 'File',
      key: 'file',
      render: (_, record) => (
        <Typography.Link
          href={`${getApiOrigin()}${record.fileUrl}`}
          target="_blank"
        >
          {record.fileKey}
        </Typography.Link>
      ),
    },
    {
      title: 'Uploaded At',
      dataIndex: 'createdAt',
      width: 160,
      render: (value: string) => (
        <Typography.Text type="secondary">
          {value ? new Date(value).toLocaleDateString() : '-'}
        </Typography.Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 110,
      render: (_, record) => (
        <Space>
          <Tooltip title="Open">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              href={`${getApiOrigin()}${record.fileUrl}`}
              target="_blank"
              download
            />
          </Tooltip>
          <Popconfirm
            title="Delete Report"
            description="Are you sure you want to delete this report?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true, loading: isPending }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    { key: ALL_CATEGORIES, label: 'All' },
    ...categories.map((c) => ({ key: c, label: c })),
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <FileTextOutlined className={titleIconClassName} /> Reports
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Upload Report
        </Button>
      </Flex>

      <Card className={cardClassName}>
        <Tabs
          activeKey={activeCategory}
          onChange={setActiveCategory}
          items={tabItems}
          className="mb-4"
        />
        <Table
          dataSource={filteredReports}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10, showTotal: (total) => `${total} reports` }}
          locale={{ emptyText: 'No reports in this category yet' }}
        />
      </Card>

      <Drawer
        title="Upload Report"
        size="large"
        open={open}
        onClose={() => setOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={() => form.submit()}>
              Upload
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select
              showSearch
              placeholder="Select or type a new category"
              options={categories.map((c) => ({ value: c, label: c }))}
              onSearch={(value) => {
                if (value && !categories.includes(value)) {
                  form.setFieldsValue({ category: value });
                }
              }}
            />
          </Form.Item>
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Title is required' }]}
          >
            <Input placeholder="Report title" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="Optional description" />
          </Form.Item>
          <Form.Item label="Project" name="projectId">
            <Select
              placeholder="Optional - link to a project"
              allowClear
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>
          <Form.Item
            label="File (PDF / Images / Documents)"
            name="file"
            rules={[{ required: true, message: 'Please select a file' }]}
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
          >
            <Upload.Dragger beforeUpload={() => false} maxCount={1}>
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">Click or drag a file here</p>
              <p className="ant-upload-hint">Upload a PDF, image or document</p>
            </Upload.Dragger>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
