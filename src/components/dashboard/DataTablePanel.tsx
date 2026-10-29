'use client';

import { useState, type ReactNode } from 'react';
import { Card, Col, Pagination, Row, Select, Space, Table, Typography } from 'antd';
import type { TableProps } from 'antd';

// Shared list layout used by Projects-style pages (Approvals tabs, vendor /
// subcontractor payment requests): grey status cards, a table card with the
// filters in its header, and a separate pagination card. Presentation only —
// callers keep their own data, filters and columns.

const { Text, Title } = Typography;

export const DEFAULT_PAGE_SIZE = 5;
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
// Fixed table body height; the table scrolls inside it.
export const TABLE_BODY_HEIGHT = 420;

const CARD_STYLE = { borderRadius: 16, border: '1px solid var(--border)', boxShadow: 'none' };

// Client-side paging of already-filtered rows. The page is clamped, so it
// never points past the end after a filter shrinks the list.
export function useClientPagination<T>(rows: T[], defaultSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [size, setSizeState] = useState(defaultSize);
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * size;
  return {
    page: current,
    size,
    total,
    start,
    pageRows: rows.slice(start, start + size),
    setPage,
    setSize: (next: number) => { setSizeState(next); setPage(1); },
    reset: () => setPage(1),
  };
}

export function StatusCards({ items }: { items: { key: string; label: ReactNode; value: ReactNode }[] }) {
  return (
    <Row gutter={[16, 16]} className="mb-6!">
      {items.map((item) => (
        <Col key={item.key} xs={12} sm={12} md={6}>
          <Card
            className="rounded-xl! border! border-[var(--border)]!"
            styles={{ body: { padding: '18px 20px', background: 'var(--subtle-bg)', borderRadius: 12 } }}
          >
            <div className="flex flex-col gap-2.5">
              <Text className="text-sm text-[var(--text-muted)]!">{item.label}</Text>
              <Title level={4} className="m-0! text-[var(--text-primary)]!">{item.value}</Title>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

// White card: title + count on the left, filters on the right, then the table.
// Give the table className="approvals-table" and scroll={{ y: TABLE_BODY_HEIGHT }}.
export function TableCard({
  title,
  subtitle,
  toolbar,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card
      styles={{ body: { padding: 0 } }}
      style={{ ...CARD_STYLE, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-[18px]">
        <div>
          <Title level={4} className="text-[var(--text-primary)]!" style={{ fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
            {title}
          </Title>
          {subtitle != null && (
            <Text className="text-[var(--text-muted)]!" style={{ fontSize: 14 }}>{subtitle}</Text>
          )}
        </div>
        {toolbar && <Space size={8} wrap>{toolbar}</Space>}
      </div>
      {children}
    </Card>
  );
}

export function PaginationCard({
  total,
  start,
  page,
  size,
  onPageChange,
  onSizeChange,
  noun = 'records',
}: {
  total: number;
  start: number;
  page: number;
  size: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  noun?: string;
}) {
  return (
    <Card styles={{ body: { padding: '12px 16px' } }} style={{ ...CARD_STYLE, marginTop: 24 }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Text className="text-[var(--text-muted)]!" style={{ fontWeight: 600, fontSize: 14 }}>
            {total === 0 ? (
              `No ${noun}`
            ) : (
              <>
                Showing <Text strong>{start + 1}</Text> - <Text strong>{Math.min(start + size, total)}</Text> of{' '}
                <Text strong>{total}</Text> {noun}
              </>
            )}
          </Text>
          <div style={{ marginTop: 6 }}>
            <Space size={8}>
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>Rows:</Text>
              <Select
                value={size}
                onChange={onSizeChange}
                size="small"
                style={{ width: 80 }}
                options={PAGE_SIZE_OPTIONS.map((v) => ({ label: v, value: v }))}
              />
            </Space>
          </div>
        </div>
        <Pagination
          current={page}
          total={total}
          pageSize={size}
          onChange={onPageChange}
          showSizeChanger={false}
          responsive
        />
      </div>
    </Card>
  );
}

// AntD sorts / filters only the rows it is given, which on a paged table is
// just the current page. This applies the columns' sorter and onFilter to the
// whole list instead, before it is split into pages.
type SortableColumn<T> = {
  key?: unknown;
  dataIndex?: unknown;
  sorter?: unknown;
  onFilter?: (value: unknown, record: T) => boolean;
};

const columnKeyOf = (col: { key?: unknown; dataIndex?: unknown }, index: number) => {
  if (col.key != null) return String(col.key);
  if (Array.isArray(col.dataIndex)) return col.dataIndex.join('.');
  if (col.dataIndex != null) return String(col.dataIndex);
  return String(index);
};

function useSortFilter<T>(rows: T[], columns: TableProps<T>['columns']) {
  const [sort, setSort] = useState<{ compare: (a: T, b: T) => number; desc: boolean } | null>(null);
  const [filters, setFilters] = useState<Record<string, unknown[] | null>>({});

  const cols = (columns || []) as SortableColumn<T>[];
  let result = rows;
  cols.forEach((col, i) => {
    const values = filters[columnKeyOf(col, i)];
    if (col.onFilter && values && values.length) {
      result = result.filter((row) => values.some((v) => col.onFilter!(v, row)));
    }
  });
  if (sort) {
    result = [...result].sort((a, b) => (sort.desc ? -sort.compare(a, b) : sort.compare(a, b)));
  }

  const onChange = (nextFilters: Record<string, unknown[] | null>, sorter: unknown) => {
    setFilters(nextFilters || {});
    const s = (Array.isArray(sorter) ? sorter[0] : sorter) as
      | { order?: 'ascend' | 'descend' | null; column?: { sorter?: unknown } }
      | undefined;
    const fn = s?.column?.sorter;
    const compare = typeof fn === 'function'
      ? (fn as (a: T, b: T) => number)
      : fn && typeof fn === 'object' && typeof (fn as { compare?: unknown }).compare === 'function'
        ? (fn as { compare: (a: T, b: T) => number }).compare
        : null;
    setSort(s?.order && compare ? { compare, desc: s.order === 'descend' } : null);
  };

  return { rows: result, onChange };
}

// Drop-in replacement for an AntD Table on list pages: same props, but the
// body scrolls inside a fixed height and a pagination card is shown below it.
export function PagedTable<T extends object>({
  dataSource,
  className,
  scroll,
  noun,
  defaultPageSize,
  ...rest
}: Omit<TableProps<T>, 'pagination'> & { noun?: string; defaultPageSize?: number }) {
  const sortFilter = useSortFilter<T>([...(dataSource || [])], rest.columns);
  const pager = useClientPagination<T>(sortFilter.rows, defaultPageSize);
  return (
    <>
      <Table<T>
        {...rest}
        className={`${className || ''} approvals-table`}
        dataSource={pager.pageRows}
        pagination={false}
        scroll={{ ...scroll, y: TABLE_BODY_HEIGHT }}
        onChange={(pagination, filters, sorter, extra) => {
          sortFilter.onChange(filters as Record<string, unknown[] | null>, sorter);
          pager.reset();
          rest.onChange?.(pagination, filters, sorter, extra);
        }}
      />
      <PaginationCard
        total={pager.total}
        start={pager.start}
        page={pager.page}
        size={pager.size}
        onPageChange={pager.setPage}
        onSizeChange={pager.setSize}
        noun={noun}
      />
    </>
  );
}

// Table card (title, count, filters in the header) + scrolling table + its
// own pagination card underneath. Same table props as an AntD Table.
export function PagedTableCard<T extends object>({
  title,
  subtitle,
  toolbar,
  noun,
  dataSource,
  className,
  scroll,
  ...rest
}: Omit<TableProps<T>, 'pagination' | 'title'> & {
  title: ReactNode;
  subtitle?: ReactNode;
  toolbar?: ReactNode;
  noun?: string;
}) {
  const sortFilter = useSortFilter<T>([...(dataSource || [])], rest.columns);
  const pager = useClientPagination<T>(sortFilter.rows);
  return (
    <div>
      <TableCard title={title} subtitle={subtitle} toolbar={toolbar}>
        <Table<T>
          {...rest}
          className={`${className || ''} approvals-table`}
          dataSource={pager.pageRows}
          pagination={false}
          scroll={{ ...scroll, y: TABLE_BODY_HEIGHT }}
          onChange={(pagination, filters, sorter, extra) => {
            sortFilter.onChange(filters as Record<string, unknown[] | null>, sorter);
            pager.reset();
            rest.onChange?.(pagination, filters, sorter, extra);
          }}
        />
      </TableCard>
      <PaginationCard
        total={pager.total}
        start={pager.start}
        page={pager.page}
        size={pager.size}
        onPageChange={pager.setPage}
        onSizeChange={pager.setSize}
        noun={noun}
      />
    </div>
  );
}
