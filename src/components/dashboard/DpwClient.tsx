'use client';

import { useState, useEffect } from 'react';
import { App, Button, Card, Flex, Select, Tag, Typography, Table, Space, Drawer } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CalendarOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteDailyLabourReport } from '@/actions/daily-labour';
import { DpwForm } from './DpwForm';
import type { DailyLabourReport, Project, Trade, Team, DailyWorker } from '@/types/erp';
import { cardClassName, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';
import { getApiOrigin } from '@/lib/api-url';

type Props = {
  reports: DailyLabourReport[];
  projects: Project[];
  trades: Trade[];
  teams?: Team[];
  onRefresh?: () => void;
  defaultOpen?: boolean;
  title?: string;
  showActions?: boolean;
};

export function DpwClient({
  reports,
  projects,
  trades,
  teams = [],
  onRefresh,
  defaultOpen = false,
  title = 'Daily Entry List',
  showActions = true
}: Props) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyLabourReport | undefined>(undefined);
  const [viewingReport, setViewingReport] = useState<DailyLabourReport | undefined>(undefined);

  // Sync open state when defaultOpen prop changes (e.g. sidebar navigation)
  useEffect(() => {
    setOpen(defaultOpen);
    if (!defaultOpen) setEditingReport(undefined);
  }, [defaultOpen]);

  const handleEdit = (report: DailyLabourReport) => {
    setEditingReport(report);
    setOpen(true);
  };

  const handleView = (report: DailyLabourReport) => {
    router.push(`/dashboard/daily-labour/${report.id}`);
  };

  const handleAdd = () => {
    setEditingReport(undefined);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingReport(undefined);
  };

  const handleViewClose = () => {
    setViewOpen(false);
    setViewingReport(undefined);
  };

  const handleDelete = async (id: string) => {
    modal.confirm({
      title: 'Delete report?',
      content: 'Are you sure you want to delete this report?',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        setIsDeleting(id);
        try {
          await deleteDailyLabourReport(id);
          message.success('Report deleted');
          if (onRefresh) onRefresh();
        } catch (error) {
          message.error('Failed to delete report');
        } finally {
          setIsDeleting(null);
        }
      }
    });
  };

  const getTradeSummary = (workers: DailyWorker[]) => {
    const summary: Record<string, number> = {};
    workers.forEach(w => {
      summary[w.trade] = (summary[w.trade] || 0) + (Number(w.count) || 1);
    });
    return summary;
  };

  const getTotalCount = (workers: DailyWorker[]) => {
    return workers.reduce((acc, w) => acc + (Number(w.count) || 1), 0);
  };

  const columns: ColumnsType<DailyLabourReport> = [
    {
      title: '#',
      key: 'sno',
      width: 60,
      render: (_, __, index) => <Typography.Text>{index + 1}</Typography.Text>,
    },
    {
      title: 'Date',
      dataIndex: 'reportDate',
      key: 'reportDate',
      width: 120,
      render: (date) => <Typography.Text strong>{dayjs(date).format('DD-MM-YYYY')}</Typography.Text>,
      sorter: (a, b) => dayjs(a.reportDate).unix() - dayjs(b.reportDate).unix(),
    },
    {
      title: 'Project',
      dataIndex: ['project', 'name'],
      key: 'projectName',
      render: (name) => name || 'N/A',
    },
    {
      title: 'Headcount',
      key: 'workers',
      render: (_, record) => {
        const tradeSummary = getTradeSummary(record.workers);
        const total = getTotalCount(record.workers);
        return (
          <Space orientation="vertical" size={0}>
            <Typography.Text strong className="text-sky-400">
              Total: {total}
            </Typography.Text>
            <Space wrap size={[4, 4]}>
              {Object.entries(tradeSummary).map(([trade, count]) => (
                <Tag key={trade} color="blue" style={{ margin: 0, fontSize: '10px' }}>
                  {trade}: {count}
                </Tag>
              ))}
            </Space>
          </Space>
        );
      },
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      ellipsis: true,
      render: (remarks) => remarks || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => {
        const colorMap: Record<string, string> = { pending: 'default', admin_approved: 'processing', approved: 'success', rejected: 'error' };
        return <Tag color={colorMap[status] || 'default'}>{status ? status.replace('_', ' ') : 'pending'}</Tag>;
      },
    },
  ];

  if (showActions) {
    columns.push({
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => handleView(record)}
          />
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            loading={isDeleting === record.id}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    });
  }

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <CalendarOutlined className={titleIconClassName} /> {title}
        </Typography.Title>
        {showActions && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Daily Labour Entry
          </Button>
        )}
      </Flex>

      <Card className={cardClassName} style={{marginTop:"14px"}}>
        <Table
          dataSource={reports}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} reports`,
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      <Drawer
        title={editingReport ? "Edit Daily Labour Report" : "Daily Labour Entry"}
        open={open}
        onClose={handleClose}
        width={500}
        destroyOnClose
        styles={{ body: { padding: 0 } }}
      >
        <DpwForm
          projects={projects}
          trades={trades}
          teams={teams}
          initialValues={editingReport}
          onSuccess={() => {
            handleClose();
            if (onRefresh) onRefresh();
          }}
          onCancel={handleClose}
        />
      </Drawer>

      <Drawer
        title="Report Details"
        open={viewOpen}
        onClose={handleViewClose}
        width={600}
        destroyOnClose
      >
        {viewingReport && (
          <Space orientation="vertical" size={24} style={{ width: '100%' }}>
            <div>
              <Typography.Title level={5} className="text-sky-400 mb-1">Basic Information</Typography.Title>
              <div className="grid grid-cols-2 gap-4 bg-[var(--subtle-bg)] p-4 rounded-lg">
                <div>
                  <Typography.Text type="secondary" className="block text-xs uppercase">Project</Typography.Text>
                  <Typography.Text strong>{viewingReport.project?.name || 'N/A'}</Typography.Text>
                </div>
                <div>
                  <Typography.Text type="secondary" className="block text-xs uppercase">Date</Typography.Text>
                  <Typography.Text strong>{dayjs(viewingReport.reportDate).format('DD MMMM YYYY')}</Typography.Text>
                </div>
                <div className="col-span-2">
                  <Typography.Text type="secondary" className="block text-xs uppercase">Remarks</Typography.Text>
                  <Typography.Text>{viewingReport.remarks || '-'}</Typography.Text>
                </div>
              </div>
            </div>

            <div>
              <Typography.Title level={5} className="text-sky-400 mb-3">Attendance Breakdown</Typography.Title>
              <Table
                dataSource={viewingReport.workers}
                pagination={false}
                size="small"
                rowKey="id"
                className="border border-[var(--border)] rounded-lg overflow-hidden"
                columns={[
                  { title: 'Trade', dataIndex: 'trade', key: 'trade', render: (t) => <Tag color="blue">{t}</Tag> },
                  { title: 'Count', dataIndex: 'count', key: 'count', render: (c) => <Typography.Text strong>{c}</Typography.Text> },
                  { title: 'Shift', dataIndex: 'shift', key: 'shift' },
                  { title: 'In Time', dataIndex: 'inTime', key: 'inTime' },
                  { title: 'Out Time', dataIndex: 'outTime', key: 'outTime' },
                ]}
              />
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
