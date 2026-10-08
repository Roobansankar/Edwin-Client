'use client';

import Link from 'next/link';
import { Button, Card, Descriptions, Empty, Flex, Table, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { getApiBaseUrl } from '@/lib/api-url';
import type { AdvanceRequestTrail } from '@/types/erp';
import { formatCurrency, formatDate, pageHeaderClassName, pageTitleClassName, StatusTag, titleIconClassName } from './ui';

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  advance: 'Advance',
  credit: 'Credit',
  full_payment: 'Full Payment',
};

const termsLabel = (v?: string | null) => (v ? PAYMENT_TERMS_LABELS[v] || v : '-');

// Uploaded files are stored as /uploads/...; absolute URLs are used as-is.
const fileHref = (url: string) => (url.startsWith('http') ? url : `${getApiBaseUrl().replace('/api/v1', '')}${url}`);

function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <Card
      size="small"
      className="mb-4 border-[var(--border)]"
      title={
        <Flex align="center" gap={10}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
            {step}
          </span>
          <Typography.Text strong>{title}</Typography.Text>
        </Flex>
      }
    >
      {children}
    </Card>
  );
}

// Full-page, read-only MR -> Purchase Enquiry -> Purchase Order journey for
// one vendor payment request, opened from the eye icon on Vendor Payments.
export function VendorPaymentJourneyClient({ trail }: { trail: AdvanceRequestTrail | null }) {
  const mr = trail?.materialRequirement;
  const po = trail?.purchaseOrder;
  const chosenVendorId = trail?.request.vendorId;

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <NodeIndexOutlined className={titleIconClassName} /> Full Journey
          {trail && (
            <Typography.Text type="secondary" className="ml-2 text-base">
              {[mr?.enquiryNo, po?.poNumber, trail.request.vendor?.name].filter(Boolean).join(' · ')}
            </Typography.Text>
          )}
        </Typography.Title>
        <Link href="/dashboard/advance">
          <Button icon={<ArrowLeftOutlined />}>Back to Vendor Payments</Button>
        </Link>
      </Flex>

      {trail && (
        <Card size="small" className="mb-4 border-[var(--border)]">
          <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 4 }}>
            <Descriptions.Item label="Vendor">{trail.request.vendor?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Requested Amount">{formatCurrency(trail.request.amount)}</Descriptions.Item>
            <Descriptions.Item label="Requested On">{formatDate(trail.request.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Request Status"><StatusTag value={trail.request.status} /></Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {!trail && <Empty description="This vendor payment request could not be loaded" />}

      {trail && (
        <>
          <StepCard step={1} title={`MR Request${mr ? ` — ${mr.enquiryNo}` : ''}`}>
            {mr ? (
              <>
                <Descriptions size="small" column={{ xs: 1, sm: 2 }} className="mb-3">
                  <Descriptions.Item label="Project">{mr.project?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Raised By">{mr.creator?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Raised On">{formatDate(mr.createdAt)}</Descriptions.Item>
                  <Descriptions.Item label="Status"><StatusTag value={mr.status} /></Descriptions.Item>
                  <Descriptions.Item label="Expected By">{formatDate(mr.expectedDate)}</Descriptions.Item>
                  <Descriptions.Item label="Payment Terms">{termsLabel(mr.paymentTerms)}</Descriptions.Item>
                  <Descriptions.Item label="Purpose" span={2}>{mr.purposeOfMaterial || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Notes" span={2}>{mr.notes || '-'}</Descriptions.Item>
                </Descriptions>
                <Table
                  size="small"
                  rowKey={(_, i) => String(i)}
                  pagination={false}
                  dataSource={mr.items || []}
                  columns={[
                    { title: 'S.No', key: 'sno', width: 60, render: (_, __, i) => i + 1 },
                    { title: 'Item', dataIndex: 'description' },
                    { title: 'Qty', dataIndex: 'quantity', align: 'right', width: 80 },
                    { title: 'Unit', dataIndex: 'unit', width: 80, render: (v?: string) => v || '-' },
                  ]}
                />
              </>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No MR linked to this payment request" />
            )}
          </StepCard>

          <StepCard step={2} title="Purchase Enquiry (Vendor Quotations)">
            {trail.quotations.length ? (
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                scroll={{ x: 760 }}
                dataSource={trail.quotations}
                rowClassName={(q) => (q.vendorId === chosenVendorId ? 'bg-emerald-500/10' : '')}
                columns={[
                  {
                    title: 'Vendor', key: 'vendor', width: 200,
                    render: (_, q) => (
                      <Flex vertical gap={2}>
                        <Typography.Text strong>{q.vendor?.name || q.vendorId}</Typography.Text>
                        {q.vendorId === chosenVendorId && <Tag color="green" className="m-0! w-fit">Selected vendor</Tag>}
                      </Flex>
                    ),
                  },
                  { title: 'Basic', key: 'basic', align: 'right', width: 110, render: (_, q) => formatCurrency(q.totalAmount) },
                  { title: 'GST', key: 'gst', align: 'right', width: 100, render: (_, q) => formatCurrency(q.gstAmount) },
                  { title: 'Total', key: 'total', align: 'right', width: 120, render: (_, q) => <Typography.Text strong>{formatCurrency(q.totalWithGst)}</Typography.Text> },
                  { title: 'Terms', key: 'terms', width: 110, render: (_, q) => termsLabel(q.paymentTerms) },
                  { title: 'Status', key: 'status', width: 110, render: (_, q) => <StatusTag value={q.status} /> },
                  {
                    title: 'Quotation', key: 'file', width: 100,
                    render: (_, q) => q.quotationUrl ? (
                      <Button type="link" size="small" icon={<FilePdfOutlined />} href={fileHref(q.quotationUrl)} target="_blank">View</Button>
                    ) : '-',
                  },
                ]}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No vendor quotations found for this MR" />
            )}
          </StepCard>

          <StepCard step={3} title={`Purchase Order${po ? ` — ${po.poNumber}` : ''}`}>
            {po ? (
              <>
                <Descriptions size="small" column={{ xs: 1, sm: 2 }} className="mb-3">
                  <Descriptions.Item label="Vendor">{po.vendor?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Project">{po.project?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="PO Date">{formatDate(po.createdAt)}</Descriptions.Item>
                  <Descriptions.Item label="Status"><StatusTag value={po.status} /></Descriptions.Item>
                  <Descriptions.Item label="Expected By">{formatDate(po.expectedDate)}</Descriptions.Item>
                  <Descriptions.Item label="Payment Terms">{termsLabel(po.paymentTerms)}</Descriptions.Item>
                  <Descriptions.Item label="Basic">{formatCurrency(po.totalAmount)}</Descriptions.Item>
                  <Descriptions.Item label="GST">{formatCurrency(po.gstAmount)}</Descriptions.Item>
                  <Descriptions.Item label="Transport">{formatCurrency(po.transportAmount)}</Descriptions.Item>
                  <Descriptions.Item label="Total"><Typography.Text strong>{formatCurrency(po.totalWithGst || po.totalAmount)}</Typography.Text></Descriptions.Item>
                  <Descriptions.Item label="Remarks" span={2}>{po.remarks || '-'}</Descriptions.Item>
                </Descriptions>
                <Table
                  size="small"
                  rowKey={(_, i) => String(i)}
                  pagination={false}
                  dataSource={po.items || []}
                  columns={[
                    { title: 'S.No', key: 'sno', width: 60, render: (_, __, i) => i + 1 },
                    { title: 'Item', dataIndex: 'description' },
                    { title: 'Qty', dataIndex: 'quantity', align: 'right', width: 80 },
                    { title: 'Unit', dataIndex: 'unit', width: 80, render: (v?: string) => v || '-' },
                    { title: 'Rate', dataIndex: 'rate', align: 'right', width: 110, render: (v) => formatCurrency(v) },
                    { title: 'Amount', dataIndex: 'amount', align: 'right', width: 120, render: (v) => formatCurrency(v) },
                  ]}
                />
                {po.billFileUrl && (
                  <Button className="mt-3" icon={<FilePdfOutlined />} href={fileHref(po.billFileUrl)} target="_blank">
                    View PO Document
                  </Button>
                )}
              </>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No purchase order linked to this payment request" />
            )}
          </StepCard>
        </>
      )}
    </div>
  );
}
