'use client';

import { useMemo, useState } from 'react';
import { Card, Col, DatePicker, Flex, Input, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { BankOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import type { Vendor, PurchaseOrder, Subcontractor, SubcontractWorkOrder, Payment, LineItem } from '@/types/erp';
import { StatusTag, cardClassName, formatCurrency, formatDate, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';

type Props = {
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  subcontractors: Subcontractor[];
  subcontractWorkOrders: SubcontractWorkOrder[];
  payments: Payment[];
};

const itemColumns: ColumnsType<LineItem> = [
  { title: 'Description', dataIndex: 'description' },
  { title: 'Qty', dataIndex: 'quantity', align: 'right', width: 80 },
  { title: 'Unit', dataIndex: 'unit', width: 80 },
  { title: 'Rate', dataIndex: 'rate', align: 'right', width: 110, render: (v) => formatCurrency(v) },
  { title: 'Amount', dataIndex: 'amount', align: 'right', width: 120, render: (v) => formatCurrency(v) },
];

type LedgerRow = {
  key: string;
  date: string;
  type: 'Debit' | 'Credit';
  entityName?: string;
  refNo: string;
  items: string;
  credit: number;
  debit: number;
  balance: number;
  narration: string;
};

function buildLedgerColumns(refLabel: string, entityLabel?: string): ColumnsType<LedgerRow> {
  return [
    { title: 'S.No', key: 'sno', width: 60, render: (_text, _record, index) => index + 1 },
    { title: 'Date', dataIndex: 'date', width: 110, render: formatDate },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 90,
      render: (v: LedgerRow['type']) => <Tag color={v === 'Debit' ? 'red' : 'green'}>{v}</Tag>,
    },
    ...(entityLabel ? [{ title: entityLabel, dataIndex: 'entityName', width: 160 } as ColumnsType<LedgerRow>[number]] : []),
    { title: refLabel, dataIndex: 'refNo', width: 130, render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'Purchase Items', dataIndex: 'items', ellipsis: { showTitle: true } },
    { title: 'Credit', dataIndex: 'credit', align: 'right', width: 120, render: (v: number) => v ? formatCurrency(v) : <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Debit', dataIndex: 'debit', align: 'right', width: 120, render: (v: number) => v ? formatCurrency(v) : <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Balance', dataIndex: 'balance', align: 'right', width: 130, render: (v: number) => <Typography.Text strong>{formatCurrency(v)}</Typography.Text> },
    { title: 'Short Narration', dataIndex: 'narration', render: (v: string) => <Typography.Text type="secondary" className="text-xs">{v}</Typography.Text> },
  ];
}

const paymentHistoryColumns: ColumnsType<Payment> = [
  { title: 'Date', dataIndex: 'paymentDate', width: 120, render: formatDate },
  { title: 'Amount', dataIndex: 'amount', align: 'right', width: 130, render: (v: number | string) => formatCurrency(v) },
  { title: 'Mode', dataIndex: 'paymentMode', width: 100, render: (v: string) => v?.toUpperCase() },
  { title: 'Reference', dataIndex: 'referenceNumber', width: 140, render: (v?: string | null) => v || '-' },
  { title: 'Notes', dataIndex: 'notes', render: (v?: string | null) => v || '-' },
];

const ALL = 'all';

export function PurchaseLedgerClient({ vendors, purchaseOrders, subcontractors, subcontractWorkOrders, payments }: Props) {
  // Defaults to "All" so the page is useful without picking a specific
  // vendor/subcontractor first; picking one from the dropdown narrows it.
  const [vendorId, setVendorId] = useState<string>(ALL);
  const [subcontractorId, setSubcontractorId] = useState<string>(ALL);
  const showingAllVendors = vendorId === ALL;
  const showingAllSubcontractors = subcontractorId === ALL;

  const [vendorSearchText, setVendorSearchText] = useState('');
  const [vendorDateRange, setVendorDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [subSearchText, setSubSearchText] = useState('');
  const [subDateRange, setSubDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  const vendorPOs = useMemo(() => {
    const base = showingAllVendors ? purchaseOrders : purchaseOrders.filter((po) => po.vendorId === vendorId);
    const from = vendorDateRange[0]?.format('YYYY-MM-DD');
    const to = vendorDateRange[1]?.format('YYYY-MM-DD');
    const q = vendorSearchText.trim().toLowerCase();
    return base.filter((po) => {
      if (from && to) {
        const created = po.createdAt ? po.createdAt.split('T')[0] : '';
        if (created < from || created > to) return false;
      }
      if (q) {
        const haystack = [po.poNumber, po.project?.name, po.materialRequirementNo, po.vendor?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [purchaseOrders, vendorId, showingAllVendors, vendorSearchText, vendorDateRange]);

  const vendorSummary = useMemo(() => {
    let total = 0;
    let paid = 0;
    for (const po of vendorPOs) {
      total += Number(po.totalWithGst || po.totalAmount || 0);
      paid += Number(po.paidAmount || 0);
    }
    return { count: vendorPOs.length, total, paid, balance: total - paid };
  }, [vendorPOs]);

  // Running statement of every PO (Debit) and payment against it (Credit),
  // oldest first, with a cumulative Balance - a classic passbook-style
  // ledger alongside the PO-by-PO breakdown above.
  const vendorLedgerRows = useMemo<LedgerRow[]>(() => {
    type RawTxn = { date: string; type: LedgerRow['type']; entityName: string; refNo: string; items: string; amount: number; narration: string };
    const txns: RawTxn[] = [];
    for (const po of vendorPOs) {
      txns.push({
        date: po.createdAt || '',
        type: 'Debit',
        entityName: po.vendor?.name || '-',
        refNo: po.poNumber,
        items: (po.items || []).map((i) => i.description).filter(Boolean).join(', ') || '-',
        amount: Number(po.totalWithGst || po.totalAmount || 0),
        narration: `Purchase Order raised${po.materialRequirementNo ? ` against ${po.materialRequirementNo}` : ''}`,
      });
      for (const p of payments.filter((pay) => pay.purchaseOrderId === po.id)) {
        txns.push({
          date: p.paymentDate,
          type: 'Credit',
          entityName: po.vendor?.name || '-',
          refNo: po.poNumber,
          items: '-',
          amount: Number(p.amount || 0),
          narration: `Payment${p.paymentMode ? ` via ${p.paymentMode.toUpperCase()}` : ''}${p.referenceNumber ? ` (Ref: ${p.referenceNumber})` : ''}`,
        });
      }
    }
    txns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    return txns.map((t, i) => {
      balance += t.type === 'Debit' ? t.amount : -t.amount;
      return {
        key: `${t.refNo}-${i}`,
        date: t.date,
        type: t.type,
        entityName: t.entityName,
        refNo: t.refNo,
        items: t.items,
        credit: t.type === 'Credit' ? t.amount : 0,
        debit: t.type === 'Debit' ? t.amount : 0,
        balance,
        narration: t.narration,
      };
    });
  }, [vendorPOs, payments]);

  const subcontractorWOs = useMemo(() => {
    const base = showingAllSubcontractors ? subcontractWorkOrders : subcontractWorkOrders.filter((wo) => wo.subcontractorId === subcontractorId);
    const from = subDateRange[0]?.format('YYYY-MM-DD');
    const to = subDateRange[1]?.format('YYYY-MM-DD');
    const q = subSearchText.trim().toLowerCase();
    return base.filter((wo) => {
      if (from && to) {
        const created = wo.createdAt ? wo.createdAt.split('T')[0] : '';
        if (created < from || created > to) return false;
      }
      if (q) {
        const haystack = [wo.woNumber, wo.project?.name, wo.description, wo.subcontractor?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [subcontractWorkOrders, subcontractorId, showingAllSubcontractors, subSearchText, subDateRange]);

  const subcontractorSummary = useMemo(() => {
    let total = 0;
    let paid = 0;
    for (const wo of subcontractorWOs) {
      total += Number(wo.totalAmount || 0);
      paid += Number(wo.paidAmount || 0);
    }
    return { count: subcontractorWOs.length, total, paid, balance: total - paid };
  }, [subcontractorWOs]);

  const subcontractorLedgerRows = useMemo<LedgerRow[]>(() => {
    type RawTxn = { date: string; type: LedgerRow['type']; entityName: string; refNo: string; items: string; amount: number; narration: string };
    const txns: RawTxn[] = [];
    for (const wo of subcontractorWOs) {
      txns.push({
        date: wo.createdAt || '',
        type: 'Debit',
        entityName: wo.subcontractor?.name || '-',
        refNo: wo.woNumber,
        items: wo.description || '-',
        amount: Number(wo.totalAmount || 0),
        narration: 'Work Order raised',
      });
      for (const p of payments.filter((pay) => pay.subcontractWorkOrderId === wo.id)) {
        txns.push({
          date: p.paymentDate,
          type: 'Credit',
          entityName: wo.subcontractor?.name || '-',
          refNo: wo.woNumber,
          items: '-',
          amount: Number(p.amount || 0),
          narration: `Payment${p.paymentMode ? ` via ${p.paymentMode.toUpperCase()}` : ''}${p.referenceNumber ? ` (Ref: ${p.referenceNumber})` : ''}`,
        });
      }
    }
    txns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    return txns.map((t, i) => {
      balance += t.type === 'Debit' ? t.amount : -t.amount;
      return {
        key: `${t.refNo}-${i}`,
        date: t.date,
        type: t.type,
        entityName: t.entityName,
        refNo: t.refNo,
        items: t.items,
        credit: t.type === 'Credit' ? t.amount : 0,
        debit: t.type === 'Debit' ? t.amount : 0,
        balance,
        narration: t.narration,
      };
    });
  }, [subcontractorWOs, payments]);

  const poColumns: ColumnsType<PurchaseOrder> = [
    { title: 'S.No', key: 'sno', width: 60, render: (_text, _record, index) => index + 1 },
    { title: 'PO Number', dataIndex: 'poNumber', width: 150, render: (v) => <Typography.Text strong>{v}</Typography.Text> },
    ...(showingAllVendors ? [{ title: 'Vendor', key: 'vendor', width: 160, render: (_: unknown, po: PurchaseOrder) => po.vendor?.name || '-' } as ColumnsType<PurchaseOrder>[number]] : []),
    { title: 'Project', key: 'project', width: 180, render: (_, po) => po.project?.name || '-' },
    { title: 'MR Ref', dataIndex: 'materialRequirementNo', width: 120, render: (v?: string | null) => v || '-' },
    { title: 'Total', key: 'total', align: 'right', width: 130, render: (_, po) => formatCurrency(po.totalWithGst || po.totalAmount) },
    { title: 'Paid', dataIndex: 'paidAmount', align: 'right', width: 120, render: (v) => formatCurrency(v || 0) },
    {
      title: 'Balance',
      key: 'balance',
      align: 'right',
      width: 120,
      render: (_, po) => formatCurrency(Number(po.totalWithGst || po.totalAmount || 0) - Number(po.paidAmount || 0)),
    },
    { title: 'Status', dataIndex: 'status', width: 130, render: (v) => <StatusTag value={v} /> },
  ];

  const woColumns: ColumnsType<SubcontractWorkOrder> = [
    { title: 'S.No', key: 'sno', width: 60, render: (_text, _record, index) => index + 1 },
    { title: 'WO Number', dataIndex: 'woNumber', width: 150, render: (v) => <Typography.Text strong>{v}</Typography.Text> },
    ...(showingAllSubcontractors ? [{ title: 'Subcontractor', key: 'subcontractor', width: 160, render: (_: unknown, wo: SubcontractWorkOrder) => wo.subcontractor?.name || '-' } as ColumnsType<SubcontractWorkOrder>[number]] : []),
    { title: 'Project', key: 'project', width: 180, render: (_, wo) => wo.project?.name || '-' },
    { title: 'Description', dataIndex: 'description', render: (v?: string | null) => v || '-' },
    { title: 'Total', dataIndex: 'totalAmount', align: 'right', width: 130, render: (v) => formatCurrency(v) },
    { title: 'Paid', dataIndex: 'paidAmount', align: 'right', width: 120, render: (v) => formatCurrency(v || 0) },
    {
      title: 'Balance',
      key: 'balance',
      align: 'right',
      width: 120,
      render: (_, wo) => formatCurrency(Number(wo.totalAmount || 0) - Number(wo.paidAmount || 0)),
    },
    { title: 'Status', dataIndex: 'status', width: 130, render: (v) => <StatusTag value={v} /> },
  ];

  const vendorLedgerColumns = useMemo(
    () => buildLedgerColumns('PO No', showingAllVendors ? 'Vendor' : undefined),
    [showingAllVendors],
  );
  const subcontractorLedgerColumns = useMemo(
    () => buildLedgerColumns('WO No', showingAllSubcontractors ? 'Subcontractor' : undefined),
    [showingAllSubcontractors],
  );

  const tabItems = [
    {
      key: 'vendor',
      label: (
        <span>
          <BankOutlined className="mr-1" /> Vendor Ledger
        </span>
      ),
      children: (
        <div>
          <Flex gap={12} wrap="wrap" className="mb-4!">
            <Select
              showSearch
              placeholder="Choose a vendor"
              style={{ minWidth: 260 }}
              value={vendorId}
              onChange={setVendorId}
              options={[{ value: ALL, label: 'All Vendors' }, ...vendors.map((v) => ({ value: v.id, label: v.name }))]}
              filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
            />
            <Input.Search
              placeholder="Search PO, project, MR ref..."
              allowClear
              value={vendorSearchText}
              onChange={(e) => setVendorSearchText(e.target.value)}
              prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
              style={{ width: 240 }}
            />
            <DatePicker.RangePicker
              value={vendorDateRange[0] || vendorDateRange[1] ? vendorDateRange : [null, null]}
              onChange={(dates) => setVendorDateRange(dates ? [dates[0], dates[1]] : [null, null])}
              allowClear
              placeholder={['From date', 'To date']}
            />
          </Flex>

          <>
              <Row gutter={[16, 16]} className="mb-4">
                <Col xs={12} sm={6}>
                  <Card className={cardClassName} variant="borderless">
                    <Statistic title="Purchase Orders" value={vendorSummary.count} />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card className={cardClassName} variant="borderless">
                    <Statistic title="Total Value" value={vendorSummary.total} precision={2} formatter={(v) => formatCurrency(v as number)} />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card className={cardClassName} variant="borderless">
                    <Statistic title="Paid" value={vendorSummary.paid} precision={2} styles={{ content: { color: '#059669' } }} formatter={(v) => formatCurrency(v as number)} />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card className={cardClassName} variant="borderless">
                    <Statistic title="Balance" value={vendorSummary.balance} precision={2} styles={{ content: { color: '#d97706' } }} formatter={(v) => formatCurrency(v as number)} />
                  </Card>
                </Col>
              </Row>

              <Tabs
                size="small"
                items={[
                  {
                    key: 'orders',
                    label: 'Purchase Orders',
                    children: (
                      <Card className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!" styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}>
                        <Table
                          dataSource={vendorPOs}
                          columns={poColumns}
                          rowKey="id"
                          size="middle"
                          scroll={{ x: showingAllVendors ? 1160 : 1010 }}
                          pagination={{ pageSize: 10 }}
                          locale={{ emptyText: 'No purchase orders for this vendor yet' }}
                          expandable={{
                            expandedRowRender: (po) => {
                              const history = payments.filter((p) => p.purchaseOrderId === po.id);
                              const items = (po.items || []).map((item, i) => ({ ...item, _key: item.id || `${po.id}-item-${i}` }));
                              return (
                                <Space orientation="vertical" size={16} className="w-full">
                                  <div>
                                    <Typography.Text strong className="mb-2 block">Items</Typography.Text>
                                    <Table
                                      size="small"
                                      dataSource={items}
                                      columns={itemColumns}
                                      rowKey="_key"
                                      pagination={false}
                                      locale={{ emptyText: 'No items recorded' }}
                                    />
                                  </div>
                                  <div>
                                    <Typography.Text strong className="mb-2 block">Payment History</Typography.Text>
                                    <Table
                                      size="small"
                                      dataSource={history}
                                      columns={paymentHistoryColumns}
                                      rowKey="id"
                                      pagination={false}
                                      locale={{ emptyText: 'No payments recorded yet' }}
                                    />
                                  </div>
                                </Space>
                              );
                            },
                          }}
                        />
                      </Card>
                    ),
                  },
                  {
                    key: 'ledger',
                    label: 'Ledger',
                    children: (
                      <Card className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!" styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}>
                        <Table
                          dataSource={vendorLedgerRows}
                          columns={vendorLedgerColumns}
                          rowKey="key"
                          size="middle"
                          scroll={{ x: showingAllVendors ? 1320 : 1160 }}
                          pagination={{ pageSize: 15 }}
                          locale={{ emptyText: 'No transactions for this vendor yet' }}
                        />
                      </Card>
                    ),
                  },
                ]}
              />
            </>
        </div>
      ),
    },
    {
      key: 'subcontractor',
      label: (
        <span>
          <TeamOutlined className="mr-1" /> Subcontractor Ledger
        </span>
      ),
      children: (
        <div>
          <Flex gap={12} wrap="wrap" className="mb-4!">
            <Select
              showSearch
              placeholder="Choose a subcontractor"
              style={{ minWidth: 260 }}
              value={subcontractorId}
              onChange={setSubcontractorId}
              options={[{ value: ALL, label: 'All Subcontractors' }, ...subcontractors.map((s) => ({ value: s.id, label: s.name }))]}
              filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
            />
            <Input.Search
              placeholder="Search WO, project, description..."
              allowClear
              value={subSearchText}
              onChange={(e) => setSubSearchText(e.target.value)}
              prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
              style={{ width: 240 }}
            />
            <DatePicker.RangePicker
              value={subDateRange[0] || subDateRange[1] ? subDateRange : [null, null]}
              onChange={(dates) => setSubDateRange(dates ? [dates[0], dates[1]] : [null, null])}
              allowClear
              placeholder={['From date', 'To date']}
            />
          </Flex>

          <>
              <Row gutter={[16, 16]} className="mb-4">
                <Col xs={12} sm={6}>
                  <Card className={cardClassName} variant="borderless">
                    <Statistic title="Work Orders" value={subcontractorSummary.count} />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card className={cardClassName} variant="borderless">
                    <Statistic title="Total Value" value={subcontractorSummary.total} precision={2} formatter={(v) => formatCurrency(v as number)} />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card className={cardClassName} variant="borderless">
                    <Statistic title="Paid" value={subcontractorSummary.paid} precision={2} styles={{ content: { color: '#059669' } }} formatter={(v) => formatCurrency(v as number)} />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card className={cardClassName} variant="borderless">
                    <Statistic title="Balance" value={subcontractorSummary.balance} precision={2} styles={{ content: { color: '#d97706' } }} formatter={(v) => formatCurrency(v as number)} />
                  </Card>
                </Col>
              </Row>

              <Tabs
                size="small"
                items={[
                  {
                    key: 'orders',
                    label: 'Work Orders',
                    children: (
                      <Card className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!" styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}>
                        <Table
                          dataSource={subcontractorWOs}
                          columns={woColumns}
                          rowKey="id"
                          size="middle"
                          scroll={{ x: showingAllSubcontractors ? 1160 : 1010 }}
                          pagination={{ pageSize: 10 }}
                          locale={{ emptyText: 'No work orders for this subcontractor yet' }}
                          expandable={{
                            expandedRowRender: (wo) => {
                              const history = payments.filter((p) => p.subcontractWorkOrderId === wo.id);
                              return (
                                <div>
                                  <Typography.Text strong className="mb-2 block">Payment History</Typography.Text>
                                  <Table
                                    size="small"
                                    dataSource={history}
                                    columns={paymentHistoryColumns}
                                    rowKey="id"
                                    pagination={false}
                                    locale={{ emptyText: 'No payments recorded yet' }}
                                  />
                                </div>
                              );
                            },
                          }}
                        />
                      </Card>
                    ),
                  },
                  {
                    key: 'ledger',
                    label: 'Ledger',
                    children: (
                      <Card className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!" styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}>
                        <Table
                          dataSource={subcontractorLedgerRows}
                          columns={subcontractorLedgerColumns}
                          rowKey="key"
                          size="middle"
                          scroll={{ x: showingAllSubcontractors ? 1320 : 1160 }}
                          pagination={{ pageSize: 15 }}
                          locale={{ emptyText: 'No transactions for this subcontractor yet' }}
                        />
                      </Card>
                    ),
                  },
                ]}
              />
            </>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <BankOutlined className={titleIconClassName} /> Ledger
        </Typography.Title>
      </Flex>

      <Card className={cardClassName}>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
