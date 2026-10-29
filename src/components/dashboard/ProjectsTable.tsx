'use client';

import { useMemo, useState } from 'react';
import { Button, Card, Col, Input, Pagination, Popconfirm, Progress, Row, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { TableProps } from 'antd';
import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import type { Project } from '@/types/erp';
import { formatCurrency, formatDate } from './ui';

// Projects section laid out like the Svasti admin Inventory page: a filter
// card, stat cards, the table card (header + scrolling table) and a separate
// pagination card. TanStack Table owns search / filters / sorting / paging;
// Ant Design renders everything.

const { Text, Title } = Typography;

const PAGE_SIZES = [5, 10, 20, 50];
const TABLE_BODY_HEIGHT = 380;

const STATUS_META: Record<string, { label: string }> = {
  planning: { label: 'Planning' },
  in_progress: { label: 'In Progress' },
  on_hold: { label: 'On Hold' },
  completed: { label: 'Completed' },
};

const budgetOf = (p: Project) => {
  const base = Number(p.estimatedBudget) || 0;
  const gst = Number(p.estimatedGst) || 0;
  return { base, gst, total: Number(p.estimatedTotal) || base + gst };
};

const equalsOrAll = (row: { getValue: (id: string) => unknown }, columnId: string, value: unknown) =>
  !value || value === 'ALL' || row.getValue(columnId) === value;

// TanStack column definitions: accessors for sorting / filtering only. The
// cells are rendered by the AntD columns below.
const tanstackColumns: ColumnDef<Project>[] = [
  { id: 'code', accessorFn: (p) => (p.projectCode || '').toLowerCase() },
  { id: 'name', accessorFn: (p) => p.name.toLowerCase() },
  { id: 'status', accessorKey: 'status', enableSorting: false, filterFn: equalsOrAll },
  { id: 'category', accessorFn: (p) => p.projectCategory?.name || '', enableSorting: false, filterFn: equalsOrAll },
  { id: 'completion', accessorFn: (p) => Number(p.completionPct) || 0 },
  { id: 'budget', accessorFn: (p) => budgetOf(p).total },
];

// Search box matches name, code, client and location.
const globalSearch = (row: { original: Project }, _columnId: string, value: string) => {
  const q = String(value || '').trim().toLowerCase();
  if (!q) return true;
  const p = row.original;
  return [p.name, p.projectCode, p.clientName, p.location]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(q));
};

// Uppercase header cells in the normal text colour.
const headerCell = () => ({
  style: {
    fontWeight: 700,
    color: 'var(--text-primary)',
    background: 'var(--card-bg)',
    borderBottom: '1px solid var(--border)',
    textTransform: 'uppercase' as const,
    fontSize: 12.5,
    letterSpacing: '0.03em',
  },
});

type Props = {
  projects: Project[];
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onRefresh: () => void;
  deleting?: boolean;
};

export function ProjectsTable({ projects, onView, onEdit, onDelete, onAdd, onRefresh, deleting }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 5 });

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns non-memoizable functions by design
  const table = useReactTable({
    data: projects,
    columns: tanstackColumns,
    state: { sorting, globalFilter, columnFilters, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    globalFilterFn: globalSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const filterValue = (id: string) => (columnFilters.find((f) => f.id === id)?.value as string) || 'ALL';
  const setFilter = (id: string, value: string) =>
    table.getColumn(id)?.setFilterValue(value === 'ALL' ? undefined : value);

  const categoryOptions = useMemo(
    () => [...new Set(projects.map((p) => p.projectCategory?.name).filter(Boolean) as string[])].sort(),
    [projects],
  );

  const filteredRows = table.getFilteredRowModel().rows.map((r) => r.original);
  const filteredCount = filteredRows.length;
  const pageRows = table.getRowModel().rows.map((r) => r.original);
  const startIndex = pagination.pageIndex * pagination.pageSize;

  const sortOrderFor = (id: string): 'ascend' | 'descend' | null => {
    const s = sorting.find((x) => x.id === id);
    return s ? (s.desc ? 'descend' : 'ascend') : null;
  };

  // Status cards: project count per status (all projects).
  const statusCards = Object.entries(STATUS_META).map(([status, meta]) => ({
    status,
    label: meta.label,
    count: projects.filter((p) => p.status === status).length,
  }));

  const columns: TableProps<Project>['columns'] = [
    {
      title: 'S.No',
      key: 'sno',
      width: 70,
      onHeaderCell: headerCell,
      render: (_v, _r, index) => <Text type="secondary" style={{ fontWeight: 600 }}>{startIndex + index + 1}</Text>,
    },
    {
      title: 'Project',
      key: 'name',
      width: 280,
      sorter: true,
      sortOrder: sortOrderFor('name'),
      onHeaderCell: headerCell,
      render: (_v, record) => (
        <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => onView(record)}>
          <Tooltip title={record.name}>
            <Text strong className="block max-w-[250px] truncate text-[var(--text-primary)]!" style={{ fontSize: 15, lineHeight: 1.3 }}>
              {record.name}
            </Text>
          </Tooltip>
          <Text type="secondary" className="block max-w-[250px] truncate" style={{ fontSize: 13 }}>
            {record.clientName || record.location || 'No client assigned'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Project Code',
      key: 'code',
      width: 150,
      sorter: true,
      sortOrder: sortOrderFor('code'),
      onHeaderCell: headerCell,
      render: (_v, record) => (
        <Text style={{ fontFamily: 'monospace', fontWeight: 600 }}>{record.projectCode || '-'}</Text>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      width: 170,
      onHeaderCell: headerCell,
      render: (_v, record) => (
        <Text>{record.projectCategory?.name || '-'}</Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 150,
      onHeaderCell: headerCell,
      render: (_v, record) => {
        const meta = STATUS_META[record.status];
        return (
          <Tag style={{ fontWeight: 600, margin: 0 }}>{meta?.label || record.status}</Tag>
        );
      },
    },
    {
      title: 'Completion',
      key: 'completion',
      width: 180,
      sorter: true,
      sortOrder: sortOrderFor('completion'),
      onHeaderCell: headerCell,
      render: (_v, record) => (
        <Progress percent={Number(record.completionPct || 0)} size="small" />
      ),
    },
    {
      title: 'Budget',
      key: 'budget',
      width: 190,
      sorter: true,
      sortOrder: sortOrderFor('budget'),
      onHeaderCell: headerCell,
      render: (_v, record) => {
        const { base, gst, total } = budgetOf(record);
        return (
          <div>
            <Text strong className="text-[var(--text-primary)]!">{formatCurrency(total)}</Text>
            <Text type="secondary" className="block" style={{ fontSize: 12 }}>Amt: {formatCurrency(base)}</Text>
            <Text type="secondary" className="block" style={{ fontSize: 12 }}>GST: {formatCurrency(gst)}</Text>
          </div>
        );
      },
    },
    {
      title: 'Timeline',
      key: 'timeline',
      width: 160,
      onHeaderCell: headerCell,
      render: (_v, record) => (
        <div>
          <Text className="block" style={{ fontWeight: 600 }}>{formatDate(record.startDate)}</Text>
          <Text type="secondary" className="block" style={{ fontSize: 13 }}>to {formatDate(record.endDate)}</Text>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      align: 'center',
      onHeaderCell: headerCell,
      render: (_v, record) => (
        <Space size={0}>
          <Tooltip title="View">
            <Button type="text" icon={<EyeOutlined />} onClick={() => onView(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Delete Project"
            description="Are you sure you want to delete this project?"
            onConfirm={() => onDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true, loading: deleting }}
          >
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  const scrollX = columns.reduce((sum, c) => sum + Number(c.width || 0), 0);

  // Header clicks update TanStack sorting (one column at a time).
  const handleTableChange: TableProps<Project>['onChange'] = (_p, _f, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (!s?.order || !s.columnKey) setSorting([]);
    else setSorting([{ id: String(s.columnKey), desc: s.order === 'descend' }]);
  };

  const cardStyle = { borderRadius: 16, border: '1px solid var(--border)', boxShadow: 'none' };

  return (
    <div>
      {/* Status cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statusCards.map((item) => (
          <Col xs={24} sm={12} md={6} key={item.status}>
            <Card
              className="rounded-xl! border! border-[var(--border)]!"
              styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}
            >
              <div className="flex flex-col gap-2.5">
                <Text className="text-sm text-[var(--text-muted)]!">{item.label}</Text>
                <Title level={4} className="m-0! text-[var(--text-primary)]!">
                  {item.count}
                </Title>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Table */}
      <Card
        styles={{ body: { padding: 0 } }}
        style={{ ...cardStyle, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-[18px]">
          <div>
            <Title level={4} className="text-[var(--text-primary)]!" style={{ fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
              Project List
            </Title>
            <Text className="text-[var(--text-muted)]!" style={{ fontSize: 14 }}>
              {filteredCount} {filteredCount === 1 ? 'Project' : 'Projects'}
            </Text>
          </div>
          <Space size={8} wrap>
            <Input
              allowClear
              placeholder="Search projects..."
              prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              style={{ width: 240 }}
            />
            <Select
              allowClear
              placeholder="All Status"
              value={filterValue('status') === 'ALL' ? undefined : filterValue('status')}
              onChange={(v) => setFilter('status', v || 'ALL')}
              style={{ width: 150 }}
              options={Object.entries(STATUS_META).map(([value, meta]) => ({ label: meta.label, value }))}
            />
            <Select
              allowClear
              showSearch
              placeholder="All Categories"
              value={filterValue('category') === 'ALL' ? undefined : filterValue('category')}
              onChange={(v) => setFilter('category', v || 'ALL')}
              style={{ width: 170 }}
              optionFilterProp="label"
              options={categoryOptions.map((c) => ({ label: c, value: c }))}
            />
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
              Add Project
            </Button>
          </Space>
        </div>
        <Table<Project>
          className="projects-table"
          dataSource={pageRows}
          columns={columns}
          rowKey="id"
          pagination={false}
          onChange={handleTableChange}
          scroll={{ x: scrollX, y: TABLE_BODY_HEIGHT }}
          locale={{
            emptyText: (
              <div style={{ padding: '48px 0' }}>
                <AppstoreOutlined className="text-[var(--text-very-muted)]" style={{ fontSize: 48, marginBottom: 12, display: 'block' }} />
                <Text strong type="secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  No matching projects found
                </Text>
              </div>
            ),
          }}
        />
      </Card>

      {/* Pagination */}
      <Card styles={{ body: { padding: '12px 16px' } }} style={{ ...cardStyle, marginTop: 24 }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Text className="text-[var(--text-muted)]!" style={{ fontWeight: 600, fontSize: 14 }}>
              {filteredCount === 0 ? (
                'No projects'
              ) : (
                <>
                  Showing <Text strong>{startIndex + 1}</Text> - <Text strong>{Math.min(startIndex + pagination.pageSize, filteredCount)}</Text> of{' '}
                  <Text strong>{filteredCount}</Text> Projects
                </>
              )}
            </Text>
            <div style={{ marginTop: 6 }}>
              <Space size={8}>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>Rows:</Text>
                <Select
                  value={pagination.pageSize}
                  onChange={(v) => setPagination({ pageIndex: 0, pageSize: v })}
                  size="small"
                  style={{ width: 80 }}
                  options={PAGE_SIZES.map((v) => ({ label: <span style={{ fontWeight: 700 }}>{v}</span>, value: v }))}
                />
              </Space>
            </div>
          </div>
          <Pagination
            current={pagination.pageIndex + 1}
            total={filteredCount}
            pageSize={pagination.pageSize}
            onChange={(page) => setPagination((p) => ({ ...p, pageIndex: page - 1 }))}
            showSizeChanger={false}
            responsive
          />
        </div>
      </Card>
    </div>
  );
}
