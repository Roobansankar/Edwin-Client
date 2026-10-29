'use client';

import { useState, useEffect, useMemo } from 'react';
import { App, Button, DatePicker, Flex, Input, Select, Tag, Typography, Table, Space, Drawer, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CalendarOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteDailyLabourReport } from '@/actions/daily-labour';
import { DpwForm } from './DpwForm';
import type { DailyLabourReport, Project, Trade, Team, DailyWorker } from '@/types/erp';
import { pageHeaderClassName, pageTitleClassName, titleIconClassName, weekRangeLabel, weekStartOf } from './ui';
import { PagedTableCard, StatusCards } from './DataTablePanel';

// One row of the weekly Daily Entry List: a site engineer's reports for one
// project in one Monday-to-Sunday week.
type WeekRow = { key: string; weekStart: string; reports: DailyLabourReport[] };

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
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const filteredReports = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const from = dateRange[0]?.format('YYYY-MM-DD');
    const to = dateRange[1]?.format('YYYY-MM-DD');
    return reports.filter((r) => {
      if (statusFilter && (r.status || 'pending') !== statusFilter) return false;
      if (from && to) {
        const d = (r.reportDate || '').split('T')[0];
        if (d < from || d > to) return false;
      }
      if (q) {
        const haystack = [
          r.project?.name,
          r.project?.projectCode,
          r.createdBy?.name,
          r.remarks,
          ...(r.workers || []).flatMap((w) => [w.trade, w.tradeRel?.team?.name]),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [reports, searchText, dateRange, statusFilter]);

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

  // Reports grouped by week, project and site engineer (same grouping as the
  // Approvals page's Daily Labour List), newest week first.
  const weekRows = useMemo<WeekRow[]>(() => {
    const groups = new Map<string, WeekRow>();
    for (const r of filteredReports) {
      const weekStart = weekStartOf(r.reportDate)?.format('YYYY-MM-DD') || '';
      const key = `${weekStart}|${r.projectId || ''}|${r.createdById || r.createdBy?.id || ''}`;
      const group = groups.get(key);
      if (group) group.reports.push(r);
      else groups.set(key, { key, weekStart, reports: [r] });
    }
    return [...groups.values()]
      .map((g) => ({ ...g, reports: [...g.reports].sort((a, b) => (a.reportDate || '').localeCompare(b.reportDate || '')) }))
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  }, [filteredReports]);

  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);

  // S.No follows the filtered list, so numbering continues across pages.
  const weekSerial = new Map(weekRows.map((w, i) => [w.key, i + 1]));

  const weekColumns: ColumnsType<WeekRow> = [
    { title: 'S.No', key: 'sno', width: 70, render: (_, w) => weekSerial.get(w.key) },
    { title: 'Week', key: 'week', width: 150, render: (_, w) => <Typography.Text strong>{weekRangeLabel(w.weekStart)}</Typography.Text> },
    { title: 'Project Code', key: 'project', width: 150, render: (_, w) => w.reports[0]?.project?.projectCode || 'N/A' },
    { title: 'Site Engineer', key: 'engineer', width: 180, render: (_, w) => w.reports[0]?.createdBy?.name || '-' },
    { title: 'Days', key: 'days', width: 80, align: 'right', render: (_, w) => w.reports.length },
    {
      title: 'Headcount', key: 'headcount', width: 110, align: 'right',
      render: (_, w) => w.reports.reduce((sum, r) => sum + getTotalCount(r.workers || []), 0),
    },
    {
      title: 'Total Shift', key: 'totalShift', width: 110, align: 'right',
      render: (_, w) => w.reports.reduce(
        (sum, r) => sum + (r.workers || []).reduce((s, x) => s + (Number(x.count) || 1) * (Number(x.shift) || 0), 0),
        0,
      ),
    },
    {
      title: 'Status', key: 'status', width: 130,
      render: (_, w) => {
        // Rejected if any day is rejected, pending if any is still pending.
        const status = w.reports.some((r) => r.status === 'rejected')
          ? 'rejected'
          : w.reports.some((r) => r.status !== 'approved') ? 'pending' : 'approved';
        const color = status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'default';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Action', key: 'action', width: 150,
      render: (_, w) => {
        const open = expandedWeeks.includes(w.key);
        return (
          <Button
            size="small"
            type={open ? 'default' : 'primary'}
            ghost={!open}
            onClick={() => setExpandedWeeks((keys) => (open ? keys.filter((k) => k !== w.key) : [...keys, w.key]))}
          >
            {open ? 'Hide days' : `Review (${w.reports.length})`}
          </Button>
        );
      },
    },
  ];

  const columns: ColumnsType<DailyLabourReport> = [
    {
      title: '#',
      key: 'sno',
      width: 80,
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
      title: 'Project Code',
      dataIndex: ['project', 'projectCode'],
      key: 'projectCode',
      width: 160,
      render: (code) => code || 'N/A',
    },
    {
      // A report can have trades from more than one team, so list each team once.
      title: 'Team',
      key: 'team',
      width: 200,
      render: (_, record: DailyLabourReport) => {
        const teams = Array.from(
          new Set((record.workers || []).map((w) => w.tradeRel?.team?.name).filter((name): name is string => !!name)),
        );
        if (teams.length === 0) return '-';
        return (
          <Space wrap size={[4, 4]}>
            {teams.map((team) => (
              <Tag key={team} color="cyan" style={{ margin: 0 }}>{team}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Headcount',
      key: 'workers',
      width: 220,
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
      title: 'Overall Remarks',
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
      render: (status: string, record: DailyLabourReport) => {
        const colorMap: Record<string, string> = { pending: 'default', admin_approved: 'processing', approved: 'success', rejected: 'error' };
        const tag = <Tag color={colorMap[status] || 'default'}>{status ? status.replace('_', ' ') : 'pending'}</Tag>;

        const rejectedWorkers = record.workers?.filter((w) => w.status === 'rejected') || [];
        if (status !== 'rejected' || rejectedWorkers.length === 0) return tag;

        return (
          <Tooltip
            title={
              <Space orientation="vertical" size={4}>
                {rejectedWorkers.map((w) => (
                  <div key={w.id}>
                    <strong>{w.trade}</strong>{w.reviewRemarks ? `: ${w.reviewRemarks}` : ' — no remark given'}
                  </div>
                ))}
              </Space>
            }
          >
            {tag}
          </Tooltip>
        );
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

      <StatusCards
        items={[
          { key: 'weeks', label: 'Weeks', value: weekRows.length },
          { key: 'reports', label: 'Daily Reports', value: filteredReports.length },
          { key: 'pending', label: 'Pending', value: filteredReports.filter((r) => r.status !== 'approved' && r.status !== 'rejected').length },
          { key: 'rejected', label: 'Rejected', value: filteredReports.filter((r) => r.status === 'rejected').length },
        ]}
      />

      <PagedTableCard
        title="Weekly Entries"
        subtitle={`${weekRows.length} weeks · ${filteredReports.length} reports`}
        toolbar={(
          <>
            <Input
              placeholder="Search project, team, trade, remarks..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
              style={{ width: 260 }}
            />
            <DatePicker.RangePicker
              value={dateRange[0] || dateRange[1] ? dateRange : [null, null]}
              onChange={(dates) => setDateRange(dates ? [dates[0], dates[1]] : [null, null])}
              allowClear
              format="DD-MM-YYYY"
              placeholder={['From date', 'To date']}
            />
            <Select
              allowClear
              placeholder="Filter by status"
              style={{ width: 170 }}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v || undefined)}
              options={[
                { label: 'Pending', value: 'pending' },
                { label: 'Approved', value: 'approved' },
                { label: 'Rejected', value: 'rejected' },
              ]}
            />
          </>
        )}
        noun="weeks"
        className="mantis-table"
        dataSource={weekRows}
        columns={weekColumns}
        rowKey="key"
        size="middle"
        scroll={{ x: 1100 }}
        expandable={{
          expandedRowKeys: expandedWeeks,
          onExpand: (expanded, w) =>
            setExpandedWeeks((keys) => (expanded ? [...keys, w.key] : keys.filter((k) => k !== w.key))),
          // The week's daily reports, with the usual view / edit / delete actions.
          expandedRowRender: (w) => (
            <Table
              dataSource={w.reports}
              columns={columns}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 1000 }}
            />
          ),
        }}
      />

      <Drawer
        title={editingReport ? "Edit Daily Labour Report" : "Daily Labour Entry"}
        open={open}
        onClose={handleClose}
        size={500}
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
        size={600}
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
