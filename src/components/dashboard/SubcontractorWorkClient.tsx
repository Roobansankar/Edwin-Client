'use client';

import { useMemo, useState, useTransition } from 'react';
import { App, Button, Card, Drawer, Flex, Form, Image, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography, Upload } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import { DeleteOutlined, DownloadOutlined, FileExcelOutlined, FilePdfOutlined, FileTextOutlined, FileUnknownOutlined, HistoryOutlined, PlusOutlined, TeamOutlined, UploadOutlined } from '@ant-design/icons';
import { createSubcontractorWork, deleteSubcontractorWork, updateSubcontractorWorkStatus } from '@/actions/subcontractor-work';
import type { Payment, Project, Subcontractor, SubcontractorWork, SubcontractWorkOrder } from '@/types/erp';
import { useAuthStore } from '@/store/auth';
import { getApiOrigin } from '@/lib/api-url';
import {
  cardClassName,
  formatCurrency,
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

const getFileIcon = (filename: string) => {
  const ext = filename?.toLowerCase() || '';
  if (ext.endsWith('.pdf')) return <FilePdfOutlined className="text-red-500" />;
  if (ext.endsWith('.xls') || ext.endsWith('.xlsx')) return <FileExcelOutlined className="text-green-500" />;
  if (ext.endsWith('.doc') || ext.endsWith('.docx')) return <FileTextOutlined className="text-blue-500" />;
  return <FileUnknownOutlined className="text-gray-500" />;
};

type Props = {
  works: SubcontractorWork[];
  projects: Project[];
  subcontractors: Subcontractor[];
  subcontractWorkOrders?: SubcontractWorkOrder[];
};

export function SubcontractorWorkClient({ works, projects, subcontractors, subcontractWorkOrders = [] }: Props) {
  const user = useAuthStore((s) => s.user);
  const canAdd = user?.role === 'admin' || user?.role === 'site_engineer';
  const canUpdateStatus = user?.role === 'admin' || user?.role === 'purchase_team';
  const [open, setOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [selectedWoId, setSelectedWoId] = useState<string | undefined>(undefined);

  const woById = useMemo(() => new Map(subcontractWorkOrders.map((w) => [w.id, w])), [subcontractWorkOrders]);
  const selectedWo = selectedWoId ? woById.get(selectedWoId) : undefined;

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyWo, setHistoryWo] = useState<SubcontractWorkOrder | null>(null);
  const [historyPayments, setHistoryPayments] = useState<Payment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openHistory = async (wo: SubcontractWorkOrder) => {
    setHistoryWo(wo);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/backend/payments?subcontractWorkOrderId=${wo.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryPayments(data?.data || []);
      }
    } catch { /* silent */ }
    finally { setHistoryLoading(false); }
  };

  const handleAdd = () => {
    form.resetFields();
    setFileList([]);
    setSelectedWoId(undefined);
    setOpen(true);
  };

  const handleWoChange = (woId: string | undefined) => {
    setSelectedWoId(woId);
    const wo = woId ? woById.get(woId) : undefined;
    if (wo) {
      form.setFieldsValue({ projectId: wo.projectId, subcontractorId: wo.subcontractorId });
    }
  };

  const handleSubmit = (values: { projectId: string; subcontractorId: string; notes?: string }) => {
    const formData = new FormData();
    formData.append('projectId', values.projectId);
    formData.append('subcontractorId', values.subcontractorId);
    if (selectedWoId) formData.append('subcontractWorkOrderId', selectedWoId);
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
        setSelectedWoId(undefined);
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
      title: 'WO Number',
      key: 'woNumber',
      width: 130,
      render: (_, r) => r.subcontractWorkOrder?.woNumber ? <Typography.Text strong>{r.subcontractWorkOrder.woNumber}</Typography.Text> : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'Category',
      key: 'category',
      width: 140,
      responsive: ['lg'],
      render: (_, r) => r.subcontractWorkOrder?.workCategory?.name || <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'Amount',
      key: 'amount',
      align: 'right',
      width: 120,
      responsive: ['lg'],
      render: (_, r) => r.subcontractWorkOrder ? formatCurrency(r.subcontractWorkOrder.amount) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'Total Amount',
      key: 'totalAmount',
      align: 'right',
      width: 130,
      responsive: ['lg'],
      render: (_, r) => r.subcontractWorkOrder ? <Typography.Text strong>{formatCurrency(r.subcontractWorkOrder.totalAmount)}</Typography.Text> : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'Paid',
      key: 'paid',
      align: 'right',
      width: 110,
      responsive: ['lg'],
      render: (_, r) => {
        const wo = r.subcontractWorkOrderId ? woById.get(r.subcontractWorkOrderId) : undefined;
        return wo?.paidAmount ? formatCurrency(wo.paidAmount) : <Typography.Text type="secondary">-</Typography.Text>;
      },
    },
    {
      title: 'Balance',
      key: 'balance',
      align: 'right',
      width: 120,
      responsive: ['lg'],
      render: (_, r) => {
        const wo = r.subcontractWorkOrderId ? woById.get(r.subcontractWorkOrderId) : undefined;
        if (!wo) return <Typography.Text type="secondary">-</Typography.Text>;
        const balance = Number(wo.totalAmount) - Number(wo.paidAmount || 0);
        return <Typography.Text strong={balance > 0}>{formatCurrency(balance)}</Typography.Text>;
      },
    },
    {
      title: 'History',
      key: 'history',
      width: 90,
      render: (_, r) => r.subcontractWorkOrder ? (
        <Button size="small" icon={<HistoryOutlined />} onClick={() => openHistory(r.subcontractWorkOrder!)}>History</Button>
      ) : null,
    },
    {
      title: 'Description',
      key: 'description',
      width: 180,
      ellipsis: true,
      responsive: ['lg'],
      render: (_, r) => r.subcontractWorkOrder?.description || '-',
    },
    {
      title: 'Work Order',
      key: 'workorder',
      width: 100,
      responsive: ['md'],
      render: (_, r) =>
        r.subcontractWorkOrder?.workorderUrl ? (
          <Space>
            {getFileIcon(r.subcontractWorkOrder.workorderKey || '')}
            <Tooltip title="View">
              <Button type="link" size="small" icon={<FilePdfOutlined />} href={`${getApiOrigin()}${r.subcontractWorkOrder.workorderUrl}`} target="_blank" />
            </Tooltip>
            <Tooltip title="Download">
              <Button type="link" size="small" icon={<DownloadOutlined />} href={`${getApiOrigin()}${r.subcontractWorkOrder.workorderUrl}`} target="_blank" download />
            </Tooltip>
          </Space>
        ) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'Photos',
      key: 'photos',
      width: 160,
      responsive: ['md'],
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
    { title: 'Notes', dataIndex: 'notes', width: 180, ellipsis: true, render: (v) => v || '-' },
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
          scroll={{ x: 2100 }}
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
          <Form.Item label="Work Order (optional)">
            <Select
              allowClear
              showSearch
              placeholder="Choose the WO this entry is against"
              optionFilterProp="label"
              value={selectedWoId}
              onChange={handleWoChange}
              options={subcontractWorkOrders.map((wo) => ({ label: `${wo.woNumber} — ${wo.subcontractor?.name || ''}`, value: wo.id }))}
            />
          </Form.Item>

          {selectedWo && (
            <Card size="small" className="mb-4 border! border-blue-500/20! bg-blue-500/5!">
              <Flex vertical gap={4}>
                <Flex justify="space-between"><Typography.Text type="secondary">Category</Typography.Text><Typography.Text>{selectedWo.workCategory?.name || '-'}</Typography.Text></Flex>
                <Flex justify="space-between"><Typography.Text type="secondary">Amount</Typography.Text><Typography.Text>{formatCurrency(selectedWo.amount)}</Typography.Text></Flex>
                <Flex justify="space-between"><Typography.Text type="secondary">Total Amount</Typography.Text><Typography.Text strong>{formatCurrency(selectedWo.totalAmount)}</Typography.Text></Flex>
                <Flex justify="space-between"><Typography.Text type="secondary">Paid</Typography.Text><Typography.Text>{selectedWo.paidAmount ? formatCurrency(selectedWo.paidAmount) : '-'}</Typography.Text></Flex>
                <Flex justify="space-between"><Typography.Text type="secondary">Balance</Typography.Text><Typography.Text strong>{formatCurrency(Number(selectedWo.totalAmount) - Number(selectedWo.paidAmount || 0))}</Typography.Text></Flex>
                {selectedWo.description && (
                  <Flex vertical gap={2}><Typography.Text type="secondary">Description</Typography.Text><Typography.Text>{selectedWo.description}</Typography.Text></Flex>
                )}
                {selectedWo.workorderUrl && (
                  <Button size="small" icon={<FilePdfOutlined />} href={`${getApiOrigin()}${selectedWo.workorderUrl}`} target="_blank">
                    View Work Order
                  </Button>
                )}
              </Flex>
            </Card>
          )}

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

      <Modal
        title={historyWo ? `Payment History — ${historyWo.woNumber}` : 'Payment History'}
        open={historyOpen}
        onCancel={() => { setHistoryOpen(false); setHistoryWo(null); }}
        footer={null}
      >
        <Table
          dataSource={historyPayments}
          rowKey="id"
          size="small"
          loading={historyLoading}
          pagination={false}
          locale={{ emptyText: 'No payments recorded yet' }}
          columns={[
            { title: 'Date', dataIndex: 'paymentDate', render: formatDate },
            { title: 'Amount', dataIndex: 'amount', align: 'right', render: (v: number | string) => formatCurrency(v) },
            { title: 'Mode', dataIndex: 'paymentMode', render: (v: string) => v?.toUpperCase() },
            { title: 'Reference', dataIndex: 'referenceNumber', render: (v?: string | null) => v || '-' },
          ]}
        />
      </Modal>
    </div>
  );
}
