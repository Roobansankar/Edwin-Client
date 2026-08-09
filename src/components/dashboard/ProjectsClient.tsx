'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AutoComplete, Button, Card, Col, DatePicker, Divider, Drawer, Flex, Form, Input, InputNumber, Popconfirm, Progress, Row, Select, Space, Statistic, Table, Tag, Typography, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ProjectOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import dayjs from 'dayjs';
import { createProject, deleteProject, updateProject } from '@/actions/projects';
import { createProjectCategory } from '@/actions/project-categories';
import type { AppUser, Project, ProjectCategory } from '@/types/erp';
import {
  StatusTag,
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  secondaryTextClassName,
  titleIconClassName,
} from './ui';

function generateFinancialYears(): string[] {
  const currentYear = dayjs().year();
  const years: string[] = [];
  for (let i = -1; i <= 5; i++) {
    years.push(`${currentYear + i}-${currentYear + i + 1}`);
  }
  return years;
}

const projectSchema = z.object({
  name: z.string().min(3, 'Project name is required'),
  projectCode: z.string().min(1, 'Project code is required'),
  clientName: z.string().min(1, 'Client name is required'),
  location: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['planning', 'in_progress', 'on_hold', 'completed']),
  estimatedBudget: z.number().nonnegative().optional(),
  estimatedGst: z.number().nonnegative().optional(),
  estimatedTotal: z.number().nonnegative().optional(),
  gstPercent: z.number().min(0).max(100).optional(),
  startDate: z.any().optional(),
  endDate: z.any().optional(),
  completionPct: z.number().min(0).max(100).optional(),
  projectCategoryId: z.string().optional(),
  projectNature: z.enum(['brownfield', 'greenfield']).optional(),
  jobType: z.enum(['contracting', 'design_build', 'design']).optional(),
  jobStatus: z.enum(['bidding', 'awarded']).optional(),
  financialYear: z.string().optional(),
  dateOfCreation: z.any().optional(),
  resourceIds: z.array(z.string()).optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

type ProjectsClientProps = {
  projects: Project[];
  projectCategories: ProjectCategory[];
  users: AppUser[];
};

export function ProjectsClient({ projects, projectCategories, users }: ProjectsClientProps) {
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const router = useRouter();

  // For adding a new project category inline
  const [newCategoryName, setNewCategoryName] = useState('');
  const categoryInputRef = useRef<any>(null);

  const onCategoryNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewCategoryName(event.target.value);
  };

  const addCategory = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    startTransition(async () => {
      try {
        await createProjectCategory({ name: newCategoryName });
        setNewCategoryName('');
        message.success('Category added');
        setTimeout(() => {
          categoryInputRef.current?.focus();
        }, 0);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to add category');
      }
    });
  };

  const financialYearOptions = generateFinancialYears().map((year) => ({ value: year }));

  const {
    control,
    handleSubmit,
    reset,
    setValue,
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      projectCode: '',
      clientName: '',
      location: '',
      email: '',
      phone1: '',
      phone2: '',
      description: '',
      status: 'planning',
      estimatedBudget: 0,
      estimatedGst: 0,
      estimatedTotal: 0,
      gstPercent: 18,
      completionPct: 0,
      jobStatus: 'bidding',
      resourceIds: [],
    },
  });

  const estimatedBudgetWatch = useWatch({ control, name: 'estimatedBudget' }) || 0;
  const gstPercentWatch = useWatch({ control, name: 'gstPercent' }) || 0;

  useEffect(() => {
    if (editingProject) {
      setValue('name', editingProject.name);
      setValue('projectCode', editingProject.projectCode || '');
      setValue('clientName', editingProject.clientName || '');
      setValue('location', editingProject.location || '');
      setValue('email', editingProject.email || '');
      setValue('phone1', editingProject.phone1 || '');
      setValue('phone2', editingProject.phone2 || '');
      setValue('description', editingProject.description || '');
      setValue('status', editingProject.status);
      setValue('estimatedBudget', Number(editingProject.estimatedBudget) || 0);
      setValue('estimatedGst', Number(editingProject.estimatedGst) || 0);
      setValue('estimatedTotal', Number(editingProject.estimatedTotal) || 0);
      setValue(
        'gstPercent',
        Number(editingProject.estimatedBudget || 0) > 0
          ? Math.round((Number(editingProject.estimatedGst || 0) / Number(editingProject.estimatedBudget)) * 100)
          : 18,
      );
      setValue('completionPct', Number(editingProject.completionPct) || 0);
      setValue('startDate', editingProject.startDate ? dayjs(editingProject.startDate) : undefined);
      setValue('endDate', editingProject.endDate ? dayjs(editingProject.endDate) : undefined);
      setValue('projectCategoryId', editingProject.projectCategoryId || editingProject.projectCategory?.id || undefined);
      setValue('projectNature', editingProject.projectNature || undefined);
      setValue('jobType', editingProject.jobType || undefined);
      setValue('jobStatus', editingProject.jobStatus || 'bidding');
      setValue('financialYear', editingProject.financialYear || undefined);
      setValue('dateOfCreation', editingProject.dateOfCreation ? dayjs(editingProject.dateOfCreation) : undefined);
      setValue('resourceIds', editingProject.resources?.map((u) => u.id) || []);
    } else {
      reset({
        name: '',
        projectCode: '',
        clientName: '',
        location: '',
        email: '',
        phone1: '',
        phone2: '',
        description: '',
        status: 'planning',
        estimatedBudget: 0,
        estimatedGst: 0,
        estimatedTotal: 0,
        gstPercent: 18,
        completionPct: 0,
        startDate: undefined,
        endDate: undefined,
        projectCategoryId: undefined,
        projectNature: undefined,
        jobType: undefined,
        jobStatus: 'bidding',
        financialYear: undefined,
        dateOfCreation: dayjs(),
        resourceIds: [],
      });
    }
  }, [editingProject, setValue, reset]);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteProject(id);
        message.success('Project deleted successfully');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to delete project');
      }
    });
  };

  const columns: ColumnsType<Project> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 60,
      render: (_text, _record, index) => index + 1,
    },
    {
      title: 'Code',
      dataIndex: 'projectCode',
      width: 120,
      sorter: (a, b) => (a.projectCode || '').localeCompare(b.projectCode || ''),
    },
    {
      title: 'Project',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (value: string, record) => (
        <Flex vertical gap={0}>
          <Typography.Text strong>{value}</Typography.Text>
          <Typography.Text type="secondary" className={`${secondaryTextClassName} text-xs`}>
            {record.clientName || record.location || 'No client assigned'}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      width: 130,
      render: (_, record) => record.projectCategory?.name || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      filters: [
        { text: 'Planning', value: 'planning' },
        { text: 'In Progress', value: 'in_progress' },
        { text: 'On Hold', value: 'on_hold' },
        { text: 'Completed', value: 'completed' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (value: string) => <StatusTag value={value} />,
    },
    {
      title: 'Completion',
      dataIndex: 'completionPct',
      width: 150,
      sorter: (a, b) => Number(a.completionPct) - Number(b.completionPct),
      render: (value: number | string) => (
        <Progress
          percent={Number(value || 0)}
          size="small"
          strokeColor={{ from: '#3b82f6', to: '#10b981' }}
        />
      ),
    },
    {
      title: 'Budget',
      key: 'budget',
      align: 'right',
      sorter: (a, b) => Number(a.estimatedTotal || a.estimatedBudget) - Number(b.estimatedTotal || b.estimatedBudget),
      render: (_, record) => {
        const base = Number(record.estimatedBudget) || 0;
        const gst = Number(record.estimatedGst) || 0;
        const total = Number(record.estimatedTotal) || base + gst;
        return (
          <Flex vertical gap={0} className="items-end">
            <Typography.Text strong>{formatCurrency(total)}</Typography.Text>
            <Typography.Text type="secondary" className={`${secondaryTextClassName} text-[10px]`}>
              Amount: {formatCurrency(base)} · GST: {formatCurrency(gst)}
            </Typography.Text>
          </Flex>
        );
      },
    },
    {
      title: 'Timeline',
      key: 'timeline',
      render: (_, record) => (
        <Flex vertical gap={0}>
          <Typography.Text>{formatDate(record.startDate)}</Typography.Text>
          <Typography.Text type="secondary" className={`${secondaryTextClassName} text-xs`}>
            to {formatDate(record.endDate)}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined className="text-emerald-500" />}
            onClick={() => router.push(`/dashboard/projects/${record.id}`)}
          />
          <Button
            type="text"
            icon={<EditOutlined className="text-sky-500" />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete Project"
            description="Are you sure you want to delete this project?"
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

  const submit = (values: ProjectFormValues) => {
    const base = Number(values.estimatedBudget || 0);
    const pct = Number(values.gstPercent || 0);
    const gst = values.estimatedGst != null && values.estimatedGst > 0 && values.estimatedGst !== base * (pct / 100)
      ? Number(values.estimatedGst)
      : Math.round((base * pct) / 100);
    const { gstPercent, ...restValues } = values;
    const data = {
      ...restValues,
      estimatedBudget: base,
      estimatedGst: gst,
      estimatedTotal: base + gst,
      startDate: values.startDate ? values.startDate.toISOString() : undefined,
      endDate: values.endDate ? values.endDate.toISOString() : undefined,
      dateOfCreation: values.dateOfCreation ? values.dateOfCreation.toISOString() : undefined,
    };

    startTransition(async () => {
      try {
        if (editingProject) {
          await updateProject(editingProject.id, data);
          message.success('Project updated successfully');
        } else {
          await createProject(data);
          message.success('Project created successfully');
        }
        setOpen(false);
        setEditingProject(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to save project');
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    setEditingProject(null);
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <ProjectOutlined className={titleIconClassName} /> Projects
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Project
        </Button>
      </Flex>
      <Card className={cardClassName} styles={{ body: { overflowX: 'auto' } }}>
        <Row gutter={[10, 10]} className="mb-4">
          {[
            { status: 'planning', label: 'Planning', color: 'processing' },
            { status: 'in_progress', label: 'In Progress', color: 'success' },
            { status: 'on_hold', label: 'On Hold', color: 'warning' },
            { status: 'completed', label: 'Completed', color: 'default' },
          ].map((item) => (
            <Col xs={12} sm={12} md={6} key={item.status}>
              <Card className={cardClassName} size="small">
                <Statistic
                  title={<Tag color={item.color}>{item.label}</Tag>}
                  value={projects.filter((p) => p.status === item.status).length}
                  styles={{ content: { fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' } }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Table
          dataSource={projects}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} projects` }}
        />
      </Card>

      <Drawer
        title={editingProject ? 'Edit Project' : 'Add New Project'}
        size="large"
        open={open}
        onClose={handleClose}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(submit)}>
              {editingProject ? 'Update Project' : 'Save Project'}
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" onFinish={handleSubmit(submit)}>
          <Flex gap={16}>
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Project Name"
                  className="flex-1"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Input {...field} placeholder="e.g. Skyline Apartments Phase 2" />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="projectCode"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Project Code"
                  className="flex-1"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Input {...field} placeholder="e.g. PRJ-2026-001" />
                </Form.Item>
              )}
            />
          </Flex>

          <Flex gap={16}>
            <Controller
              control={control}
              name="clientName"
              render={({ field, fieldState }) => (
                <Form.Item 
                  label="Client Name" 
                  className="flex-1"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Input {...field} placeholder="Organization or person" />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="location"
              render={({ field }) => (
                <Form.Item label="Location" className="flex-1">
                  <Input {...field} placeholder="City or specific site" />
                </Form.Item>
              )}
            />
          </Flex>

          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <Form.Item label="Description">
                <Input.TextArea {...field} rows={3} placeholder="Project scope and details..." />
              </Form.Item>
            )}
          />

          <Flex gap={16}>
            <Controller
              control={control}
              name="email"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Email Address"
                  className="flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Input {...field} placeholder="contact@project.com" />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="phone1"
              render={({ field }) => (
                <Form.Item label="Phone Number 1" className="flex-1">
                  <Input {...field} placeholder="+91..." />
                </Form.Item>
              )}
            />
          </Flex>

          <Flex gap={16}>
            <Controller
              control={control}
              name="phone2"
              render={({ field }) => (
                <Form.Item label="Phone Number 2" className="flex-1">
                  <Input {...field} placeholder="+91..." />
                </Form.Item>
              )}
            />
            <div className="flex-1" />
          </Flex>

          <Flex gap={16}>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Form.Item label="Status" className="flex-1">
                  <Select {...field} options={[
                    { label: 'Planning', value: 'planning' },
                    { label: 'In Progress', value: 'in_progress' },
                    { label: 'On Hold', value: 'on_hold' },
                    { label: 'Completed', value: 'completed' },
                  ]} />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="completionPct"
              render={({ field }) => (
                <Form.Item label="Completion %" className="flex-1">
                  <InputNumber {...field} min={0} max={100} className="w-full" />
                </Form.Item>
              )}
            />
          </Flex>

          <Flex gap={16}>
            <Controller
              control={control}
              name="estimatedBudget"
              render={({ field }) => (
                <Form.Item label="Estimated Amount" className="flex-1">
                  <InputNumber
                    {...field}
                    min={0}
                    className="w-full"
                    formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => Number(value!.replace(/₹\s?|(,*)/g, ''))}
                  />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="gstPercent"
              render={({ field }) => (
                <Form.Item label="GST %" className="flex-1">
                  <InputNumber
                    {...field}
                    min={0}
                    max={100}
                    className="w-full"
                    formatter={(value) => `${value}%`}
                    parser={(value) => Number(String(value).replace('%', ''))}
                  />
                </Form.Item>
              )}
            />
          </Flex>
          <Typography.Text type="secondary" className="mb-2 block text-xs">
            GST Amount: {formatCurrency(Math.round((Number(estimatedBudgetWatch) * Number(gstPercentWatch)) / 100) * 1)} · Total Estimated:{' '}
            {formatCurrency(Number(estimatedBudgetWatch) + Math.round((Number(estimatedBudgetWatch) * Number(gstPercentWatch)) / 100))}
          </Typography.Text>

          <Flex gap={16}>
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <Form.Item label="Start Date" className="flex-1">
                  <DatePicker {...field} className="w-full" />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="endDate"
              render={({ field }) => (
                <Form.Item label="Expected End Date" className="flex-1">
                  <DatePicker {...field} className="w-full" />
                </Form.Item>
              )}
            />
          </Flex>

          <Divider>Classification</Divider>

          <Flex gap={16}>
            <Controller
              control={control}
              name="projectCategoryId"
              render={({ field }) => (
                <Form.Item label="Project Category" className="flex-1">
                  <Select
                    {...field}
                    allowClear
                    placeholder="Select category"
                    popupRender={(menu) => (
                      <>
                        {menu}
                        <Divider style={{ margin: '8px 0' }} />
                        <Space style={{ padding: '0 8px 4px' }}>
                          <Input
                            placeholder="New category"
                            ref={categoryInputRef}
                            value={newCategoryName}
                            onChange={onCategoryNameChange}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                          <Button type="text" icon={<PlusOutlined />} onClick={addCategory}>
                            Add
                          </Button>
                        </Space>
                      </>
                    )}
                    options={projectCategories.map((c) => ({ label: c.name, value: c.id }))}
                  />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="projectNature"
              render={({ field }) => (
                <Form.Item label="Project Nature" className="flex-1">
                  <Select
                    {...field}
                    allowClear
                    placeholder="Select nature"
                    options={[
                      { label: 'Brownfield', value: 'brownfield' },
                      { label: 'Greenfield', value: 'greenfield' },
                    ]}
                  />
                </Form.Item>
              )}
            />
          </Flex>

          <Flex gap={16}>
            <Controller
              control={control}
              name="jobType"
              render={({ field }) => (
                <Form.Item label="Job Type" className="flex-1">
                  <Select
                    {...field}
                    allowClear
                    placeholder="Select job type"
                    options={[
                      { label: 'Contracting', value: 'contracting' },
                      { label: 'Design & Build', value: 'design_build' },
                      { label: 'Design', value: 'design' },
                    ]}
                  />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="jobStatus"
              render={({ field }) => (
                <Form.Item label="Job Status" className="flex-1">
                  <Select
                    {...field}
                    options={[
                      { label: 'Bidding', value: 'bidding' },
                      { label: 'Awarded', value: 'awarded' },
                    ]}
                  />
                </Form.Item>
              )}
            />
          </Flex>

          <Flex gap={16}>
            <Controller
              control={control}
              name="financialYear"
              render={({ field }) => (
                <Form.Item label="Financial Year" className="flex-1">
                  <AutoComplete
                    {...field}
                    options={financialYearOptions}
                    placeholder="e.g. 2026-2027"
                    className="w-full"
                  />
                </Form.Item>
              )}
            />
            <Controller
              control={control}
              name="dateOfCreation"
              render={({ field }) => (
                <Form.Item label="Date of Creation" className="flex-1">
                  <DatePicker {...field} className="w-full" />
                </Form.Item>
              )}
            />
          </Flex>

          <Controller
            control={control}
            name="resourceIds"
            render={({ field }) => (
              <Form.Item label="Resources Assigned (White Collars)">
                <Select
                  {...field}
                  mode="multiple"
                  allowClear
                  placeholder="Select staff assigned to this project"
                  options={users.map((u) => ({ label: `${u.name} (${u.role})`, value: u.id }))}
                />
              </Form.Item>
            )}
          />
        </Form>
      </Drawer>
    </div>
  );
}
