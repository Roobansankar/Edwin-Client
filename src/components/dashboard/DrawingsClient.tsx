'use client';

import { useState, useTransition } from 'react';
import {
  App,
  Button,
  Card,
  Drawer,
  Flex,
  Form,
  Input,
  Select,
  Space,
  Table,
  Typography,
  Upload,
  Tag,
  Tooltip,
  Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DownloadOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  HistoryOutlined,
  EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { uploadDrawing, deleteDrawing, updateDrawing } from '@/actions/drawings';
import type { Drawing, DrawingCategory, Project } from '@/types/erp';
import {
  cardClassName,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
  titleCase,
} from './ui';
import { getApiOrigin } from '@/lib/api-url';
import { clientApiFetch } from '@/lib/client-api';

const { Option } = Select;

const CATEGORIES: { label: string; value: DrawingCategory }[] = [
  { label: 'Structural', value: 'structural' },
  { label: 'As-Built', value: 'as_built' },
  { label: 'General Arrangement', value: 'general_arrangement' },
  { label: 'Architectural', value: 'architectural' },
  { label: 'HVAC', value: 'hvac' },
  { label: 'MEP', value: 'mep' },
];

type DrawingsClientProps = {
  projects: Project[];
  initialDrawings: Drawing[];
};

export function DrawingsClient({ projects, initialDrawings }: DrawingsClientProps) {
  const [drawings, setDrawings] = useState<Drawing[]>(initialDrawings);
  const [open, setOpen] = useState(false);
  const [editingDrawing, setEditingDrawing] = useState<Drawing | null>(null);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  
  // Filter states
  const [projectId, setProjectId] = useState<string | undefined>();
  const [category, setCategory] = useState<DrawingCategory | undefined>();
  const [loading, setLoading] = useState(false);

  const fetchFilteredDrawings = async () => {
    setLoading(true);
    try {
      let params = '';
      if (projectId) params += (params ? '&' : '?') + `projectId=${projectId}`;
      if (category) params += (params ? '&' : '?') + `category=${category}`;

      const result = await clientApiFetch<Drawing[]>(`/drawings${params}`);
      setDrawings(result);
    } catch (error) {
      message.error('Failed to load drawings');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setProjectId(undefined);
    setCategory(undefined);
    setLoading(true);
    clientApiFetch<Drawing[]>(`/drawings`)
      .then(setDrawings)
      .catch(() => message.error('Failed to load drawings'))
      .finally(() => setLoading(false));
  };

  const handleEdit = (record: Drawing) => {
    setEditingDrawing(record);
    form.setFieldsValue({
      projectId: record.projectId,
      title: record.title,
      category: record.category,
      revision: record.revision,
    });
    setOpen(true);
  };

  const handleAdd = () => {
    setEditingDrawing(null);
    form.resetFields();
    setOpen(true);
  };

  const handleSubmit = async (values: any) => {
    const formData = new FormData();
    formData.append('title', values.title);
    formData.append('category', values.category);
    formData.append('revision', values.revision || 'Rev A');
    
    if (values.file?.fileList?.[0]?.originFileObj) {
      formData.append('file', values.file.fileList[0].originFileObj);
    }

    if (editingDrawing) {
      startTransition(async () => {
        try {
          await updateDrawing(editingDrawing.id, formData);
          message.success('Drawing updated successfully');
          setOpen(false);
          setEditingDrawing(null);
          form.resetFields();
          fetchFilteredDrawings();
        } catch (error) {
          message.error(error instanceof Error ? error.message : 'Update failed');
        }
      });
    } else {
      formData.append('projectId', values.projectId);
      
      if (!values.file?.fileList?.[0]?.originFileObj) {
        message.error('Please select a file');
        return;
      }

      startTransition(async () => {
        try {
          await uploadDrawing(formData);
          message.success('Drawing uploaded successfully');
          setOpen(false);
          form.resetFields();
          fetchFilteredDrawings();
        } catch (error) {
          message.error(error instanceof Error ? error.message : 'Upload failed');
        }
      });
    }
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteDrawing(id);
        message.success('Drawing deleted successfully');
        fetchFilteredDrawings();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Delete failed');
      }
    });
  };

  const getCategoryColor = (cat: DrawingCategory) => {
    const colors: Record<DrawingCategory, string> = {
      structural: 'blue',
      as_built: 'green',
      general_arrangement: 'orange',
      architectural: 'purple',
      hvac: 'cyan',
      mep: 'magenta',
    };
    return colors[cat] || 'default';
  };

  const columns: ColumnsType<Drawing> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 65,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Flex vertical gap={0}>
          <Typography.Text strong>{text}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
            {record.fileKey}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: DrawingCategory) => (
        <Tag color={getCategoryColor(cat)}>{titleCase(cat)}</Tag>
      ),
    },
    {
      title: 'Revision',
      dataIndex: 'revision',
      key: 'revision',
      render: (rev) => (
        <Tag icon={<HistoryOutlined />} color="processing">
          {rev}
        </Tag>
      ),
    },
    {
      title: 'Project',
      dataIndex: ['project', 'name'],
      key: 'projectName',
      render: (name) => name || 'N/A',
    },
    {
      title: 'Uploaded At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => formatDate(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View/Download">
            <Button
              type="primary"
              ghost
              size="small"
              icon={<DownloadOutlined />}
              href={`${getApiOrigin()}${record.fileUrl}`}
              target="_blank"
            >
              View
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Drawing"
            description="Are you sure you want to delete this drawing?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true, loading: isPending }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <FileImageOutlined className={titleIconClassName} /> Project Drawings
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Drawing
        </Button>
      </Flex>

      <Card className={`${cardClassName} mb-6`}>
        <Flex gap={16} align="center" wrap="wrap">
          <Select
            placeholder="All Projects"
            style={{ minWidth: 220 }}
            className="w-full sm:w-auto"
            allowClear
            value={projectId}
            onChange={(val) => setProjectId(val)}
            options={projects.map(p => ({ label: p.name, value: p.id }))}
          />
          <Select
            placeholder="All Categories"
            style={{ minWidth: 200 }}
            className="w-full sm:w-auto"
            allowClear
            value={category}
            onChange={(val) => setCategory(val)}
            options={CATEGORIES}
          />
          <Space wrap>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={fetchFilteredDrawings}
              loading={loading}
            >
              Filter
            </Button>
            <Button
              onClick={handleClearFilters}
              disabled={loading}
            >
              Reset
            </Button>
          </Space>
        </Flex>
      </Card>

      <Card className={cardClassName}>
        <Table
          dataSource={drawings}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 900 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} drawings`,
          }}
        />
      </Card>

      <Drawer
        title={editingDrawing ? "Edit Project Drawing" : "Add New Project Drawing"}
        open={open}
        onClose={() => setOpen(false)}
        size="default"
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={() => form.submit()}>
              {editingDrawing ? "Update" : "Upload"}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="projectId"
            label="Project"
            rules={[{ required: true, message: 'Please select a project' }]}
          >
            <Select
              placeholder="Select project"
              disabled={!!editingDrawing}
              options={projects.map(p => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>

          <Form.Item
            name="title"
            label="Drawing Title"
            rules={[{ required: true, message: 'Please enter drawing title' }]}
          >
            <Input placeholder="e.g. Ground Floor Plan" />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select category' }]}
          >
            <Select placeholder="Select category">
              {CATEGORIES.map(cat => (
                <Option key={cat.value} value={cat.value}>{cat.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="revision"
            label="Revision"
            initialValue="Rev A"
          >
            <Input placeholder="e.g. Rev A, Rev B, IFC" />
          </Form.Item>

          <Form.Item
            name="file"
            label={editingDrawing ? "Update Drawing File (Optional)" : "Drawing File (PDF/Image)"}
            rules={[{ required: !editingDrawing, message: 'Please upload a file' }]}
          >
            <Upload.Dragger
              beforeUpload={() => false}
              maxCount={1}
              accept=".pdf,image/*"
            >
              <p className="ant-upload-drag-icon">
                <FilePdfOutlined />
              </p>
              <p className="ant-upload-text">Click or drag drawing to this area</p>
              <p className="ant-upload-hint">
                {editingDrawing ? "Leave empty to keep the current file." : "Support for PDF and Images."}
              </p>
            </Upload.Dragger>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
