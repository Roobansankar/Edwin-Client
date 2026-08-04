'use client';

import { useState, useTransition } from 'react';
import {
  App,
  Button,
  Card,
  DatePicker,
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
  CalendarOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileUnknownOutlined,
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { uploadDpr, deleteDpr } from '@/actions/dpr';
import type { DprReport, Project } from '@/types/erp';
import {
  cardClassName,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  secondaryTextClassName,
  titleIconClassName,
} from './ui';
import { getApiBaseUrl, getApiOrigin } from '@/lib/api-url';
import { clientApiFetch } from '@/lib/client-api';

const { RangePicker } = DatePicker;

type DprClientProps = {
  projects: Project[];
  initialDprs: { data: DprReport[]; total: number };
};

export function DprClient({ projects, initialDprs }: DprClientProps) {
  const [dprs, setDprs] = useState<DprReport[]>(initialDprs.data);
  const [total, setTotal] = useState(initialDprs.total);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  
  // Filter states
  const [projectId, setProjectId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchFilteredDprs = async (p: number = 1) => {
    setLoading(true);
    try {
      let params = `page=${p}&limit=10`;
      if (projectId) params += `&projectId=${projectId}`;
      if (dateRange) {
        params += `&dateFrom=${dateRange[0].format('YYYY-MM-DD')}&dateTo=${dateRange[1].format('YYYY-MM-DD')}`;
      }

      const result = await clientApiFetch<{ data: DprReport[]; total: number }>(`/dpr?${params}`);
      setDprs(result.data);
      setTotal(result.total);
      setPage(p);
    } catch (error) {
      message.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setProjectId(undefined);
    setDateRange(null);
    setPage(1);
    
    // Fetch initial data without filters
    setLoading(true);
    clientApiFetch<{ data: DprReport[]; total: number }>(`/dpr?page=1&limit=10`)
      .then((result) => {
        setDprs(result.data);
        setTotal(result.total);
      })
      .catch(() => message.error('Failed to load reports'))
      .finally(() => setLoading(false));
  };

  const handleUpload = async (values: any) => {
    const formData = new FormData();
    formData.append('projectId', values.projectId);
    formData.append('reportDate', values.reportDate.format('YYYY-MM-DD'));
    
    if (values.file?.fileList?.[0]?.originFileObj) {
      formData.append('file', values.file.fileList[0].originFileObj);
    } else {
      message.error('Please select a file');
      return;
    }

    startTransition(async () => {
      try {
        await uploadDpr(formData);
        message.success('DPR uploaded successfully');
        setOpen(false);
        form.resetFields();
        fetchFilteredDprs();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Upload failed');
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteDpr(id);
        message.success('Report deleted successfully');
        fetchFilteredDprs(page);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Delete failed');
      }
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FilePdfOutlined className="text-red-500" />;
    if (mimeType.includes('word') || mimeType.includes('msword')) return <FileWordOutlined className="text-blue-500" />;
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return <FileExcelOutlined className="text-green-500" />;
    if (mimeType.includes('image')) return <FileImageOutlined className="text-purple-500" />;
    return <FileUnknownOutlined className="text-gray-500" />;
  };

  const columns: ColumnsType<DprReport> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 70,
      render: (_, __, index) => (page - 1) * 10 + index + 1,
    },
    {
      title: 'Report Date',
      dataIndex: 'reportDate',
      key: 'reportDate',
      render: (date) => <Typography.Text strong>{formatDate(date)}</Typography.Text>,
      sorter: (a, b) => dayjs(a.reportDate).unix() - dayjs(b.reportDate).unix(),
    },
    {
      title: 'Project',
      dataIndex: ['project', 'name'],
      key: 'projectName',
      render: (name) => name || 'N/A',
    },
    {
      title: 'File',
      key: 'file',
      render: (_, record) => (
        <Space>
          {getFileIcon(record.fileType)}
          <Typography.Link href={`${getApiOrigin()}${record.fileUrl}`} target="_blank">
            {record.fileKey}
          </Typography.Link>
        </Space>
      ),
    },
    {
      title: 'Uploaded At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => <Typography.Text type="secondary">{formatDate(date)}</Typography.Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Download">
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
          <CalendarOutlined className={titleIconClassName} /> Daily Progress Reports
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Upload Report
        </Button>
      </Flex>

      <Card className={`${cardClassName} mb-6`}>
        <Flex gap={16} align="center" wrap="wrap">
          <Select
            placeholder="Filter by Project"
            style={{ width: 250 }}
            allowClear
            value={projectId}
            onChange={(val) => setProjectId(val)}
            options={projects.map(p => ({ label: p.name, value: p.id }))}
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as any)}
          />
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => fetchFilteredDprs(1)}
              loading={loading}
            >
              Search
            </Button>
            <Button
              onClick={handleClearFilters}
              disabled={loading}
            >
              Clear
            </Button>
          </Space>
        </Flex>
      </Card>

      <Card className={cardClassName}>
        <Table
          dataSource={dprs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total: total,
            pageSize: 10,
            onChange: (p) => fetchFilteredDprs(p),
            showTotal: (total) => `Total ${total} reports`,
          }}
        />
      </Card>

      <Drawer
        title="Upload Daily Progress Report"
        open={open}
        onClose={() => setOpen(false)}
        size="default"
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={() => form.submit()}>
              Upload
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleUpload}>
          <Form.Item
            name="projectId"
            label="Project"
            rules={[{ required: true, message: 'Please select a project' }]}
          >
            <Select
              placeholder="Select project"
              options={projects.map(p => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>

          <Form.Item
            name="reportDate"
            label="Report Date"
            rules={[{ required: true, message: 'Please select report date' }]}
            initialValue={dayjs()}
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item
            name="file"
            label="Report File"
            rules={[{ required: true, message: 'Please upload a file' }]}
          >
            <Upload.Dragger
              beforeUpload={() => false}
              maxCount={1}
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
            >
              <p className="ant-upload-drag-icon">
                <PlusOutlined />
              </p>
              <p className="ant-upload-text">Click or drag file to this area to upload</p>
              <p className="ant-upload-hint">
                Support for PDF, Word, Excel and Images.
              </p>
            </Upload.Dragger>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
