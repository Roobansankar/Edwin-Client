'use client';

import { useMemo, useState } from 'react';
import { Card, Col, Flex, Row, Select, Space, Statistic, Table, Tabs, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BankOutlined, TeamOutlined } from '@ant-design/icons';
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

const paymentHistoryColumns: ColumnsType<Payment> = [
  { title: 'Date', dataIndex: 'paymentDate', width: 120, render: formatDate },
  { title: 'Amount', dataIndex: 'amount', align: 'right', width: 130, render: (v: number | string) => formatCurrency(v) },
  { title: 'Mode', dataIndex: 'paymentMode', width: 100, render: (v: string) => v?.toUpperCase() },
  { title: 'Reference', dataIndex: 'referenceNumber', width: 140, render: (v?: string | null) => v || '-' },
  { title: 'Notes', dataIndex: 'notes', render: (v?: string | null) => v || '-' },
];

export function PurchaseLedgerClient({ vendors, purchaseOrders, subcontractors, subcontractWorkOrders, payments }: Props) {
  const [vendorId, setVendorId] = useState<string | undefined>();
  const [subcontractorId, setSubcontractorId] = useState<string | undefined>();

  const vendorPOs = useMemo(
    () => (vendorId ? purchaseOrders.filter((po) => po.vendorId === vendorId) : []),
    [purchaseOrders, vendorId],
  );

  const vendorSummary = useMemo(() => {
    let total = 0;
    let paid = 0;
    for (const po of vendorPOs) {
      total += Number(po.totalWithGst || po.totalAmount || 0);
      paid += Number(po.paidAmount || 0);
    }
    return { count: vendorPOs.length, total, paid, balance: total - paid };
  }, [vendorPOs]);

  const subcontractorWOs = useMemo(
    () => (subcontractorId ? subcontractWorkOrders.filter((wo) => wo.subcontractorId === subcontractorId) : []),
    [subcontractWorkOrders, subcontractorId],
  );

  const subcontractorSummary = useMemo(() => {
    let total = 0;
    let paid = 0;
    for (const wo of subcontractorWOs) {
      total += Number(wo.totalAmount || 0);
      paid += Number(wo.paidAmount || 0);
    }
    return { count: subcontractorWOs.length, total, paid, balance: total - paid };
  }, [subcontractorWOs]);

  const poColumns: ColumnsType<PurchaseOrder> = [
    { title: 'PO Number', dataIndex: 'poNumber', width: 150, render: (v) => <Typography.Text strong>{v}</Typography.Text> },
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
    { title: 'WO Number', dataIndex: 'woNumber', width: 150, render: (v) => <Typography.Text strong>{v}</Typography.Text> },
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
          <Select
            showSearch
            placeholder="Choose a vendor"
            style={{ minWidth: 320 }}
            className="mb-4"
            value={vendorId}
            onChange={setVendorId}
            options={vendors.map((v) => ({ value: v.id, label: v.name }))}
            filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
          />

          {!vendorId ? (
            <Typography.Text type="secondary">Choose a vendor to see their purchase orders, items, and payment history.</Typography.Text>
          ) : (
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

              <Card className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!" styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}>
                <Table
                  dataSource={vendorPOs}
                  columns={poColumns}
                  rowKey="id"
                  size="middle"
                  scroll={{ x: 950 }}
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
            </>
          )}
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
          <Select
            showSearch
            placeholder="Choose a subcontractor"
            style={{ minWidth: 320 }}
            className="mb-4"
            value={subcontractorId}
            onChange={setSubcontractorId}
            options={subcontractors.map((s) => ({ value: s.id, label: s.name }))}
            filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
          />

          {!subcontractorId ? (
            <Typography.Text type="secondary">Choose a subcontractor to see their work orders and payment history.</Typography.Text>
          ) : (
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

              <Card className="rounded-xl! border! border-[var(--border)]! bg-[var(--card-bg)]!" styles={{ body: { padding: '8px 0', overflowX: 'auto' } }}>
                <Table
                  dataSource={subcontractorWOs}
                  columns={woColumns}
                  rowKey="id"
                  size="middle"
                  scroll={{ x: 950 }}
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
            </>
          )}
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
