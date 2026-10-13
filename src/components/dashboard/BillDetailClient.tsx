'use client';

import { useState, useTransition } from 'react';
import { App, Button, Card, Flex, Table, Typography, Tag } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, FilePdfOutlined, CameraOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { PurchaseBill, BillTrail, VendorQuotation } from '@/types/erp';
import { markBillDocumentChecked } from '@/actions/invoices';
import { useAuthStore } from '@/store/auth';
import { DOC_KEYS, DOC_LABEL, docChecked, type DocKey } from './BillDocumentsMenu';
// Same date + time format as the Purchase Enquiry page.
import { formatDateTime } from './PurchaseEnquiryClient';
import {
  StatusTag,
  formatCurrency,
  formatDate,
} from './ui';

type Props = {
  bill: PurchaseBill | null;
  trail?: BillTrail | null;
};

// One stage in the MR -> Enquiry -> PO -> Material Received -> Vendor Bill
// chain shown at the top of the page.
function TrailStage({
  label,
  refNo,
  sub,
  status,
  action,
  muted,
}: {
  label: string;
  refNo?: string | null;
  sub?: string | null;
  status?: string | null;
  action?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Card size="small" className={`min-w-44 flex-1 border! border-[var(--border)]! ${muted ? 'opacity-50' : ''}`}>
      <Typography.Text type="secondary" className="text-[10px] uppercase tracking-wide block">{label}</Typography.Text>
      <Typography.Text strong className="block">{refNo || '-'}</Typography.Text>
      {sub && <Typography.Text type="secondary" className="text-xs block">{sub}</Typography.Text>}
      <Flex align="center" justify="space-between" className="mt-1!">
        {status ? <StatusTag value={status} /> : <span />}
        {action}
      </Flex>
    </Card>
  );
}

// Item-wise comparison of every vendor's quotation for the same MR: one row
// per item, one Rate / Amount pair per vendor, with the bill's vendor marked.
function EnquiryComparison({
  quotations: allQuotations,
  selectedVendorId,
  billItemNames,
}: {
  quotations: VendorQuotation[];
  selectedVendorId?: string | null;
  // Item descriptions on this bill (its PO items, or bill items); only these
  // items, and only vendors who quoted for at least one of them, are compared.
  billItemNames: string[];
}) {
  const norm = (s?: string | null) => (s || '').trim().toLowerCase();
  const billItems = new Set(billItemNames.map(norm).filter(Boolean));
  const quotations = billItems.size
    ? allQuotations.filter((q) => (q.items || []).some((it) => billItems.has(norm(it.description))))
    : allQuotations;
  if (quotations.length === 0) return null;

  // Items in the order they first appear across the quotations, matched by
  // description, limited to the bill's own items.
  const itemKeys: string[] = [];
  const itemLabel = new Map<string, { description: string; quantity: number }>();
  for (const q of quotations) {
    for (const it of q.items || []) {
      const key = norm(it.description);
      if (!key || itemLabel.has(key)) continue;
      if (billItems.size && !billItems.has(key)) continue;
      itemKeys.push(key);
      itemLabel.set(key, { description: it.description, quantity: Number(it.quantity) || 0 });
    }
  }
  const itemFor = (q: VendorQuotation, key: string) =>
    (q.items || []).find((it) => (it.description || '').trim().toLowerCase() === key);

  type Row = { key: string; label: string; qty?: number; values: (string | null)[]; bold?: boolean };
  const rows: Row[] = itemKeys.map((key) => ({
    key,
    label: itemLabel.get(key)!.description,
    qty: itemLabel.get(key)!.quantity,
    values: quotations.flatMap((q) => {
      const it = itemFor(q, key);
      if (!it) return ['-', '-'];
      const rate = Number(it.rate || 0);
      return [formatCurrency(rate), formatCurrency(rate * (Number(it.quantity) || 0))];
    }),
  }));
  const totalsRow = (key: string, label: string, pick: (q: VendorQuotation) => number | null | undefined, bold = false): Row => ({
    key, label, bold, values: quotations.flatMap((q) => [null, formatCurrency(pick(q) || 0)]),
  });
  rows.push(
    {
      // When each vendor said the material would be delivered.
      key: 'expectedDate',
      label: 'Expected By',
      values: quotations.flatMap((q) => [null, q.expectedDate ? formatDateTime(q.expectedDate) : '-']),
    },
    totalsRow('basic', 'Basic Amount', (q) => Number(q.totalAmount || 0)),
    totalsRow('gst', 'GST', (q) => Number(q.gstAmount || 0)),
    totalsRow('transport', 'Transport', (q) => Number(q.transportAmount || 0)),
    totalsRow('total', 'Total', (q) => Number(q.totalWithGst || q.totalAmount || 0), true),
  );

  return (
    <Card size="small" title="Purchase Enquiry — Vendor Comparison">
      <Table<Row>
        dataSource={rows}
        rowKey="key"
        size="small"
        pagination={false}
        scroll={{ x: 300 + quotations.length * 240 }}
        columns={[
          { title: 'Item', key: 'item', fixed: 'left', width: 200, render: (_, r) => <Typography.Text strong={r.bold}>{r.label}</Typography.Text> },
          { title: 'Qty', key: 'qty', width: 70, align: 'right', render: (_, r) => (r.qty != null ? r.qty : '') },
          ...quotations.map((q, i) => ({
            key: q.id,
            title: (
              <Flex vertical gap={2}>
                <Typography.Text strong>{q.vendor?.name || 'Vendor'}</Typography.Text>
                <Flex gap={4} wrap="wrap">
                  {q.vendorId === selectedVendorId && <Tag color="green" className="m-0!">Bill vendor</Tag>}
                  <StatusTag value={q.status} />
                </Flex>
              </Flex>
            ),
            children: [
              { title: 'Rate', key: `${q.id}-rate`, width: 110, align: 'right' as const, render: (_: unknown, r: Row) => r.values[i * 2] ?? '' },
              {
                title: 'Amount', key: `${q.id}-amt`, width: 130, align: 'right' as const,
                render: (_: unknown, r: Row) => <Typography.Text strong={r.bold}>{r.values[i * 2 + 1]}</Typography.Text>,
              },
            ],
          })),
        ]}
      />
    </Card>
  );
}

// The three documents accounts must check before a bill can be accounts
// approved. Accounts / admin can mark each one checked once it exists; the
// purchase team sees the checklist read-only.
function DocumentCheck({ bill, trail }: { bill: PurchaseBill; trail?: BillTrail | null }) {
  const router = useRouter();
  const { message } = App.useApp();
  const role = useAuthStore((s) => s.user?.role);
  const canCheck = role === 'admin' || role === 'accounts_manager';
  const [isPending, startTransition] = useTransition();
  const [checking, setChecking] = useState<DocKey | null>(null);

  const mr = trail?.materialRequirement;
  const received = trail?.materialReceived || [];
  // MRR = the material requirement the site engineer raised for this PO.
  const available: Record<DocKey, boolean> = {
    mrr: !!mr,
    enquiry: !!trail?.vendorQuotation,
    po: !!bill.purchaseOrder,
  };
  const missingNote: Record<DocKey, string> = {
    mrr: 'No material requirement (MR) found for this PO',
    enquiry: "No quotation found for this vendor's MR",
    po: 'This bill has no purchase order',
  };
  const docTitle: Record<DocKey, string> = {
    mrr: 'MRR (Material Requirement)',
    enquiry: DOC_LABEL.enquiry,
    po: DOC_LABEL.po,
  };
  const checkedCount = DOC_KEYS.filter((d) => docChecked(bill, d)).length;

  const markChecked = (doc: DocKey) => {
    setChecking(doc);
    startTransition(async () => {
      try {
        await markBillDocumentChecked(bill.id, doc);
        message.success(`${DOC_LABEL[doc]} marked as checked`);
        router.refresh();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to mark as checked');
      } finally {
        setChecking(null);
      }
    });
  };

  return (
    <Card
      size="small"
      title={
        <Flex gap={8} align="center">
          <span>Document Check</span>
          <Tag color={checkedCount === 3 ? 'success' : 'warning'}>{checkedCount}/3 checked</Tag>
        </Flex>
      }
    >
      <Flex vertical gap={8}>
        {DOC_KEYS.map((doc, i) => {
          const checked = docChecked(bill, doc);
          return (
            <div key={doc} className="rounded-lg border border-[var(--border)] px-3 py-2">
            <Flex justify="space-between" align="center" gap={12} wrap="wrap">
              <Flex vertical gap={0}>
                <Typography.Text strong>{i + 1}. {docTitle[doc]}</Typography.Text>
                {!available[doc] && <Typography.Text type="secondary" className="text-xs">{missingNote[doc]}</Typography.Text>}
                {doc === 'mrr' && mr && (
                  <Typography.Text type="secondary" className="text-xs">
                    {mr.enquiryNo}{mr.creator?.name ? ` · raised by ${mr.creator.name}` : ''}{mr.createdAt ? ` · ${formatDate(mr.createdAt)}` : ''}
                  </Typography.Text>
                )}
              </Flex>
              {checked ? (
                <Tag color="success" className="m-0!">Checked</Tag>
              ) : canCheck ? (
                <Button
                  size="small"
                  type="primary"
                  disabled={!available[doc] || isPending}
                  loading={checking === doc}
                  onClick={() => markChecked(doc)}
                >
                  Mark as checked
                </Button>
              ) : (
                <Tag className="m-0!">Not checked</Tag>
              )}
            </Flex>
            {doc === 'mrr' && mr && (mr.items || []).length > 0 && (
              // What the site engineer asked for.
              <Table
                className="mt-2"
                dataSource={mr.items}
                rowKey={(_, idx) => String(idx)}
                size="small"
                pagination={false}
                columns={[
                  { title: '#', key: 'sno', width: 40, render: (_, __, idx) => idx + 1 },
                  { title: 'Requested Item', dataIndex: 'description' },
                  { title: 'Qty', dataIndex: 'quantity', align: 'right', width: 90 },
                  { title: 'Unit', dataIndex: 'unit', width: 80, render: (v?: string) => v || '-' },
                ]}
              />
            )}
            </div>
          );
        })}
        {/* 4th, optional: for information only, not needed for approval. */}
        <Flex justify="space-between" align="center" gap={12} wrap="wrap" className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2">
          <Flex vertical gap={0}>
            <Typography.Text strong>4. Material Received <Typography.Text type="secondary">(optional)</Typography.Text></Typography.Text>
            <Typography.Text type="secondary" className="text-xs">
              {received.length
                ? received.map((m) => `${m.mrNumber}${m.receivedDate ? ` · ${formatDate(m.receivedDate)}` : ''}`).join(', ')
                : 'Not received yet — not required for approval'}
            </Typography.Text>
          </Flex>
          <Tag color={received.length ? 'success' : 'default'} className="m-0!">
            {received.length ? 'Received' : 'Not received'}
          </Tag>
        </Flex>
        {canCheck && checkedCount < 3 && (
          <Typography.Text type="secondary" className="text-xs">
            Review each document on this page, then mark it checked. All three are needed before the bill can be Accounts Approved.
          </Typography.Text>
        )}
      </Flex>
    </Card>
  );
}

export function BillDetailClient({ bill, trail }: Props) {
  const router = useRouter();

  if (!bill) {
    return (
      <div className="p-10 text-center text-[var(--text-very-muted)]">
        Bill not found.
      </div>
    );
  }

  const po = bill.purchaseOrder;
  const mr = trail?.materialRequirement;
  const vq = trail?.vendorQuotation;
  const mrReceived = trail?.materialReceived || [];

  return (
    <div>
      <Flex align="center" gap={12} className="mb-6!">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
          Back to Bills
        </Button>
        <Typography.Title level={4} className="m-0!">
          Bill Details — {bill.billNumber}
        </Typography.Title>
        <StatusTag value={bill.status} />
      </Flex>

      <Flex gap={16} vertical>
        <Card size="small" title="Document Trail — MR → Enquiry → PO → Vendor Bill → Material Received">
          <Flex gap={8} align="stretch" wrap="wrap">
            <TrailStage
              label="Material Requirement"
              refNo={mr?.enquiryNo}
              sub={mr?.project?.name}
              status={mr?.status}
              muted={!mr}
            />
            <Flex align="center"><ArrowRightOutlined className="text-[var(--text-very-muted)]" /></Flex>
            <TrailStage
              label="Enquiry (Quotation)"
              refNo={vq ? vq.vendor?.name || '-' : null}
              sub={vq ? formatCurrency(vq.totalWithGst || vq.totalAmount || 0) : null}
              status={vq?.status}
              muted={!vq}
              action={vq?.quotationUrl ? (
                <Button type="link" size="small" icon={<FilePdfOutlined />} href={vq.quotationUrl} target="_blank" />
              ) : undefined}
            />
            <Flex align="center"><ArrowRightOutlined className="text-[var(--text-very-muted)]" /></Flex>
            <TrailStage
              label="Purchase Order"
              refNo={po?.poNumber}
              sub={po ? formatCurrency(po.totalWithGst || po.totalAmount) : null}
              status={po?.status}
              muted={!po}
              action={po?.billFileUrl ? (
                <Button type="link" size="small" icon={<FilePdfOutlined />} href={po.billFileUrl} target="_blank" />
              ) : undefined}
            />
            <Flex align="center"><ArrowRightOutlined className="text-[var(--text-very-muted)]" /></Flex>
            <TrailStage
              label="Vendor Bill"
              refNo={bill.billNumber}
              sub={formatCurrency(bill.amount)}
              status={bill.status}
              action={bill.billFileUrl ? (
                <Button type="link" size="small" icon={<FilePdfOutlined />} href={bill.billFileUrl} target="_blank" />
              ) : undefined}
            />
            <Flex align="center"><ArrowRightOutlined className="text-[var(--text-very-muted)]" /></Flex>
            <TrailStage
              label={`Material Received${mrReceived.length > 1 ? ` (${mrReceived.length})` : ''}`}
              refNo={mrReceived[0]?.mrNumber}
              sub={mrReceived[0]?.receivedDate ? formatDate(mrReceived[0].receivedDate) : null}
              status={mrReceived[0]?.status}
              muted={mrReceived.length === 0}
              action={mrReceived[0]?.billUrl ? (
                <Button type="link" size="small" icon={<FilePdfOutlined />} href={mrReceived[0].billUrl} target="_blank" />
              ) : mrReceived[0]?.photoUrls?.length ? (
                <Button type="link" size="small" icon={<CameraOutlined />} href={mrReceived[0].photoUrls[0]} target="_blank" />
              ) : undefined}
            />
          </Flex>
        </Card>

        <DocumentCheck bill={bill} trail={trail} />

        <EnquiryComparison
          quotations={trail?.quotations || []}
          selectedVendorId={bill.vendorId}
          billItemNames={
            (po?.items?.length ? po.items.map((i) => i.description) : (bill.billItems || []).map((i) => i.description || ''))
          }
        />

        <Card size="small" title="Bill Information">
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="pr-6 py-1.5 text-[var(--text-muted)] w-40">Vendor</td><td>{bill.vendor?.name || '-'}</td></tr>
              <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Project</td><td>{bill.project?.name || '-'}</td></tr>
              <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Bill Amount</td><td><Typography.Text strong>{formatCurrency(bill.amount)}</Typography.Text></td></tr>
              <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Paid Amount</td><td>{formatCurrency(bill.paidAmount)}</td></tr>
              <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Bill Date</td><td>{formatDate(bill.billDate)}</td></tr>
              <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Due Date</td><td>{bill.dueDate ? formatDate(bill.dueDate) : '-'}</td></tr>
              {bill.notes && <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Notes</td><td>{bill.notes}</td></tr>}
              {bill.billFileUrl && (
                <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Bill File</td><td><Button type="link" size="small" icon={<FilePdfOutlined />} href={bill.billFileUrl} target="_blank">View Document</Button></td></tr>
              )}
            </tbody>
          </table>
        </Card>

        {po && (
          <>
            <Card
              size="small"
              title={
                <Flex gap={8} align="center">
                  <span>Purchase Order — {po.poNumber}</span>
                  <Tag color="blue">PO Items</Tag>
                  {po.billFileUrl && (
                    <Button type="link" size="small" icon={<FilePdfOutlined />} href={po.billFileUrl} target="_blank">
                      PO
                    </Button>
                  )}
                </Flex>
              }
            >
              <Table
                dataSource={po.items || []}
                pagination={false}
                size="small"
                rowKey="id"
                columns={[
                  { title: '#', key: 'sno', width: 40, render: (_, __, i) => i + 1 },
                  { title: 'Description', dataIndex: 'description' },
                  { title: 'Qty', dataIndex: 'quantity', align: 'right', render: (v: any) => Number(v).toLocaleString() },
                  { title: 'Unit', dataIndex: 'unit' },
                  { title: 'Rate', dataIndex: 'rate', align: 'right', render: (v: any) => formatCurrency(v) },
                  { title: 'Amount', dataIndex: 'amount', align: 'right', render: (v: any) => formatCurrency(v) },
                ]}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5} align="right">
                      <Typography.Text strong>PO Total</Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <Typography.Text strong>{formatCurrency(po.totalAmount)}</Typography.Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </Card>

            {/* Material received against this PO, right after the PO itself. */}
            <Card
              size="small"
              title={
                <Flex gap={8} align="center">
                  <span>Material Received</span>
                  <Tag color="purple">Against {po.poNumber}</Tag>
                </Flex>
              }
            >
              {mrReceived.length === 0 ? (
                <div className="py-4 text-center text-[var(--text-very-muted)]">No material received has been logged against this PO yet.</div>
              ) : (
                <Flex vertical gap={16}>
                  {mrReceived.map((m) => (
                    <div key={m.id} className="rounded-lg border border-[var(--border)] p-3">
                      <Flex justify="space-between" align="center" gap={8} wrap="wrap" className="mb-2!">
                        <Typography.Text strong>{m.mrNumber}</Typography.Text>
                        <Flex gap={8} align="center">
                          <Typography.Text type="secondary" className="text-xs">
                            Received {m.receivedDate ? formatDate(m.receivedDate) : '-'}
                            {m.creator?.name ? ` · by ${m.creator.name}` : ''}
                          </Typography.Text>
                          <StatusTag value={m.status} />
                        </Flex>
                      </Flex>
                      <Table
                        dataSource={m.items || []}
                        pagination={false}
                        size="small"
                        rowKey={(_, i) => String(i)}
                        columns={[
                          { title: '#', key: 'sno', width: 40, render: (_, __, i) => i + 1 },
                          { title: 'Description', dataIndex: 'description' },
                          { title: 'Received Qty', dataIndex: 'quantity', align: 'right', width: 120 },
                          { title: 'Unit', dataIndex: 'unit', width: 80, render: (v?: string) => v || '-' },
                        ]}
                      />
                      {(m.notes || m.damageRemarks) && (
                        <Flex vertical gap={2} className="mt-2!">
                          {m.notes && <Typography.Text type="secondary" className="text-xs">Notes: {m.notes}</Typography.Text>}
                          {m.damageRemarks && <Typography.Text type="danger" className="text-xs">Damage: {m.damageRemarks}</Typography.Text>}
                        </Flex>
                      )}
                      {(m.billUrl || m.photoUrls?.length > 0) && (
                        <Flex gap={8} wrap="wrap" className="mt-2!">
                          {m.billUrl && (
                            <Button size="small" icon={<FilePdfOutlined />} href={m.billUrl} target="_blank">Delivery Bill</Button>
                          )}
                          {(m.photoUrls || []).map((url, i) => (
                            <Button key={url} size="small" icon={<CameraOutlined />} href={url} target="_blank">Photo {i + 1}</Button>
                          ))}
                        </Flex>
                      )}
                    </div>
                  ))}
                </Flex>
              )}
            </Card>

            <Card
              size="small"
              title={
                <Flex gap={8} align="center">
                  <span>Billed Items</span>
                  <Tag color="green">This Bill</Tag>
                </Flex>
              }
            >
              {bill.billItems && bill.billItems.length > 0 ? (
                <Table
                  dataSource={bill.billItems.map((bi) => {
                    const poItem = po?.items?.find((i) => i.id === bi.poItemId);
                    return {
                      ...bi,
                      description: bi.description || poItem?.description || '',
                      unit: bi.unit || poItem?.unit || 'nos',
                      rate: Number(bi.rate) || Number(poItem?.rate || 0),
                    };
                  })}
                  pagination={false}
                  size="small"
                  rowKey="id"
                  columns={[
                    { title: '#', key: 'sno', width: 40, render: (_, __, i) => i + 1 },
                    { title: 'Description', dataIndex: 'description' },
                    { title: 'Billed Qty', dataIndex: 'quantity', align: 'right', render: (v: any) => Number(v).toLocaleString() },
                    { title: 'Unit', dataIndex: 'unit' },
                    { title: 'Rate', dataIndex: 'rate', align: 'right', render: (v: any) => formatCurrency(v) },
                    { title: 'Amount', dataIndex: 'amount', align: 'right', render: (_, r) => formatCurrency(Number(r.quantity) * Number(r.rate)) },
                  ]}
                  summary={() => {
                    const total = (bill.billItems || []).reduce((s, i) => {
                      const poItem = po?.items?.find((p) => p.id === i.poItemId);
                      const rate = Number(i.rate) || Number(poItem?.rate || 0);
                      return s + Number(i.quantity) * rate;
                    }, 0);
                    return (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={5} align="right">
                          <Typography.Text strong>Bill Total</Typography.Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5} align="right">
                          <Typography.Text strong>{formatCurrency(total)}</Typography.Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    );
                  }}
                />
              ) : (
                <div className="py-4 text-center text-[var(--text-very-muted)]">No billed items recorded for this bill.</div>
              )}
            </Card>

            {bill.billItems && bill.billItems.length > 0 && (
              <Card
                size="small"
                title={
                  <Flex gap={8} align="center">
                    <span>Comparison</span>
                    <Tag color="orange">PO vs Bill</Tag>
                  </Flex>
                }
              >
                <Table
                  dataSource={po.items!.map((poItem) => {
                    const billItem = bill.billItems!.find((bi) => bi.poItemId === poItem.id);
                    return {
                      key: poItem.id,
                      description: poItem.description,
                      unit: poItem.unit,
                      poQty: Number(poItem.quantity),
                      poRate: Number(poItem.rate),
                      poAmount: Number(poItem.amount),
                      billQty: billItem ? Number(billItem.quantity) : 0,
                      billRate: billItem ? Number(billItem.rate) : 0,
                      billAmount: billItem ? Number(billItem.quantity) * Number(billItem.rate) : 0,
                    };
                  })}
                  pagination={false}
                  size="small"
                  rowKey="key"
                  columns={[
                    { title: '#', key: 'sno', width: 40, render: (_, __, i) => i + 1 },
                    { title: 'Description', dataIndex: 'description' },
                    { title: 'Unit', dataIndex: 'unit', width: 60 },
                    {
                      title: 'PO Qty',
                      dataIndex: 'poQty',
                      align: 'right',
                      render: (v: any) => Number(v).toLocaleString(),
                    },
                    {
                      title: 'PO Rate',
                      dataIndex: 'poRate',
                      align: 'right',
                      render: (v: any) => formatCurrency(v),
                    },
                    {
                      title: 'PO Amt',
                      dataIndex: 'poAmount',
                      align: 'right',
                      render: (v: any) => formatCurrency(v),
                    },
                    {
                      title: 'Bill Qty',
                      dataIndex: 'billQty',
                      align: 'right',
                      render: (v: any) => Number(v).toLocaleString(),
                    },
                    {
                      title: 'Bill Rate',
                      dataIndex: 'billRate',
                      align: 'right',
                      render: (v: any) => formatCurrency(v),
                    },
                    {
                      title: 'Bill Amt',
                      dataIndex: 'billAmount',
                      align: 'right',
                      render: (v: any) => formatCurrency(v),
                    },
                  ]}
                  summary={() => {
                    const totalPo = (po.items || []).reduce((s, i) => s + Number(i.amount), 0);
                    const totalBill = (bill.billItems || []).reduce((s, i) => s + Number(i.quantity) * Number(i.rate), 0);
                    return (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={5} align="right">
                          <Typography.Text strong>Totals</Typography.Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5} align="right">
                          <Typography.Text strong>{formatCurrency(totalPo)}</Typography.Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={6} />
                        <Table.Summary.Cell index={7} />
                        <Table.Summary.Cell index={8} align="right">
                          <Typography.Text strong>{formatCurrency(totalBill)}</Typography.Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    );
                  }}
                />
              </Card>
            )}
          </>
        )}

        {!po && (
          <Card size="small" title="Billed Items">
            {bill.billItems && bill.billItems.length > 0 ? (
              <Table
                dataSource={bill.billItems}
                pagination={false}
                size="small"
                rowKey="id"
                columns={[
                  { title: '#', key: 'sno', width: 40, render: (_, __, i) => i + 1 },
                  { title: 'Description', dataIndex: 'description' },
                  { title: 'Qty', dataIndex: 'quantity', align: 'right', render: (v: any) => Number(v).toLocaleString() },
                  { title: 'Unit', dataIndex: 'unit' },
                  { title: 'Rate', dataIndex: 'rate', align: 'right', render: (v: any) => formatCurrency(v) },
                  { title: 'Amount', render: (_, r: any) => formatCurrency(Number(r.quantity) * Number(r.rate)) },
                ]}
              />
            ) : (
              <div className="py-4 text-center text-[var(--text-very-muted)]">No items recorded for this bill.</div>
            )}
          </Card>
        )}
      </Flex>
    </div>
  );
}
