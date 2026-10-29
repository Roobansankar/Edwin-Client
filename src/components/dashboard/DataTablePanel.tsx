'use client';

import { useState, type ReactNode } from 'react';
import { Card, Col, Pagination, Row, Select, Space, Typography } from 'antd';

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
