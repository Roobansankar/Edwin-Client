'use client';

import { useState, useTransition } from 'react';
import { App, Button, Card, Flex, Table, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, CameraOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { markSubcontractorBillDocumentChecked } from '@/actions/subcontractor-bills';
import { useAuthStore } from '@/store/auth';
import type { SubcontractorBill, SubcontractorBillTrail, SubcontractorEnquiry } from '@/types/erp';
import {
  StatusTag,
  formatCurrency,
  formatDate,
} from './ui';

type Props = {
  bill: SubcontractorBill | null;
  trail?: SubcontractorBillTrail | null;
};

// Mirrors the TrailStage card used on the Vendor Bill detail page:
// Enquiry (SCR) -> Work Order -> Subcontractor Bill -> Work Done.
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

type SubDocKey = 'enquiry' | 'workOrder';
const SUB_DOC_KEYS: SubDocKey[] = ['enquiry', 'workOrder'];
const SUB_DOC_TITLE: Record<SubDocKey, string> = {
  enquiry: 'Subcontractor Enquiry (SCR)',
  workOrder: 'Subcontract Work Order',
};

// Accounts' document check, the subcontract equivalent of the vendor bill's
// MRR / Enquiry / PO check: Enquiry (SCR) and Work Order must be ticked before
// the bill can be Accounts Approved; Work Done is shown for information.
function DocumentCheck({ bill, trail }: { bill: SubcontractorBill; trail?: SubcontractorBillTrail | null }) {
  const router = useRouter();
  const { message } = App.useApp();
  const role = useAuthStore((s) => s.user?.role);
  const canCheck = role === 'admin' || role === 'accounts_manager';
  const [isPending, startTransition] = useTransition();
  const [checking, setChecking] = useState<SubDocKey | null>(null);

  const wo = trail?.subcontractWorkOrder || bill.subcontractWorkOrder;
  const enquiry = trail?.enquiry || null;
  const works = trail?.works || [];
  const checkedFlag: Record<SubDocKey, boolean> = { enquiry: !!bill.enquiryChecked, workOrder: !!bill.woChecked };
  const available: Record<SubDocKey, boolean> = { enquiry: !!enquiry, workOrder: !!wo };
  const missingNote: Record<SubDocKey, string> = {
    enquiry: 'No enquiry found for this work order — not required',
    workOrder: 'This bill has no work order',
  };
  const detail: Record<SubDocKey, string> = {
    enquiry: enquiry
      ? [
          enquiry.scrNo,
          enquiry.totalWithGst || enquiry.totalAmount ? `Quoted ${formatCurrency(enquiry.totalWithGst || enquiry.totalAmount || 0)}` : '',
          enquiry.createdAt ? formatDate(enquiry.createdAt) : '',
          enquiry.scopeOfWork || '',
          (trail?.enquiries?.length || 0) > 1 ? `${trail?.enquiries?.length} quotations compared below` : '',
        ].filter(Boolean).join(' · ')
      : '',
    workOrder: wo
      ? [wo.woNumber, formatCurrency(wo.totalAmount), wo.description || ''].filter(Boolean).join(' · ')
      : '',
  };
  const docUrl: Record<SubDocKey, string | null | undefined> = {
    enquiry: enquiry?.quotationUrl,
    workOrder: wo?.workorderUrl,
  };
  // Only documents that exist count toward the total.
  const required = SUB_DOC_KEYS.filter((d) => available[d]);
  const checkedCount = required.filter((d) => checkedFlag[d]).length;

  const markChecked = (doc: SubDocKey) => {
    setChecking(doc);
    startTransition(async () => {
      try {
        await markSubcontractorBillDocumentChecked(bill.id, doc);
        message.success(`${SUB_DOC_TITLE[doc]} marked as checked`);
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
          <Tag color={checkedCount === required.length ? 'success' : 'warning'}>{checkedCount}/{required.length} checked</Tag>
        </Flex>
      }
    >
      <Flex vertical gap={8}>
        {SUB_DOC_KEYS.map((doc, i) => {
          const url = docUrl[doc];
          return (
            <Flex key={doc} justify="space-between" align="center" gap={12} wrap="wrap" className="rounded-lg border border-[var(--border)] px-3 py-2">
              <Flex vertical gap={0}>
                <Typography.Text strong>{i + 1}. {SUB_DOC_TITLE[doc]}</Typography.Text>
                <Typography.Text type="secondary" className="text-xs">{available[doc] ? detail[doc] : missingNote[doc]}</Typography.Text>
              </Flex>
              <Flex gap={8} align="center">
                {url && <Button size="small" icon={<FilePdfOutlined />} href={url} target="_blank">View</Button>}
                {checkedFlag[doc] ? (
                  <Tag color="success" className="m-0!">Checked</Tag>
                ) : !available[doc] ? (
                  <Tag className="m-0!">Not available</Tag>
                ) : canCheck ? (
                  <Button size="small" type="primary" disabled={isPending} loading={checking === doc} onClick={() => markChecked(doc)}>
                    Mark as checked
                  </Button>
                ) : (
                  <Tag className="m-0!">Not checked</Tag>
                )}
              </Flex>
            </Flex>
          );
        })}
        {/* 3rd, optional: for information only, not needed for approval. */}
        <div className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2">
          <Flex justify="space-between" align="center" gap={12} wrap="wrap">
            <Flex vertical gap={0}>
              <Typography.Text strong>3. Work Done <Typography.Text type="secondary">(optional)</Typography.Text></Typography.Text>
              <Typography.Text type="secondary" className="text-xs">
                {works.length
                  ? `${works.length} work ${works.length === 1 ? 'entry' : 'entries'} logged against this work order`
                  : 'No work logged yet — not required for approval'}
              </Typography.Text>
            </Flex>
            <Tag color={works.length ? 'success' : 'default'} className="m-0!">{works.length ? 'Logged' : 'Not logged'}</Tag>
          </Flex>
          {works.length > 0 && (
            <Flex vertical gap={4} className="mt-2!">
              {works.map((w) => (
                <Flex key={w.id} gap={8} align="center" wrap="wrap">
                  <Typography.Text className="text-xs">{w.createdAt ? formatDate(w.createdAt) : '-'}</Typography.Text>
                  <StatusTag value={w.status} />
                  <Typography.Text type="secondary" className="text-xs">
                    {[w.createdBy?.name ? `by ${w.createdBy.name}` : '', w.notes || ''].filter(Boolean).join(' · ')}
                  </Typography.Text>
                  {(w.photoUrls || []).map((url, idx) => (
                    <Button key={url} size="small" type="link" className="px-0!" icon={<CameraOutlined />} href={url} target="_blank">
                      Photo {idx + 1}
                    </Button>
                  ))}
                </Flex>
              ))}
            </Flex>
          )}
        </div>
        {canCheck && checkedCount < required.length && (
          <Typography.Text type="secondary" className="text-xs">
            Review each document, then mark it checked. They are needed before the bill can be Accounts Approved.
          </Typography.Text>
        )}
      </Flex>
    </Card>
  );
}

// Every subcontractor quoted on the Work Order's SCR, side by side (the
// subcontract equivalent of the vendor bill's enquiry comparison). The
// subcontractor this bill is for is highlighted.
function EnquiryComparison({ bill, trail }: { bill: SubcontractorBill; trail?: SubcontractorBillTrail | null }) {
  const enquiries = trail?.enquiries || [];
  if (!enquiries.length) return null;
  const selectedId = trail?.enquiry?.id;
  const totalOf = (e: SubcontractorEnquiry) => Number(e.totalWithGst || e.totalAmount || 0);
  const lowest = Math.min(...enquiries.map(totalOf).filter((v) => v > 0));

  return (
    <Card size="small" title={`Subcontractor Enquiry — Comparison (${enquiries[0].scrNo}, ${enquiries.length} ${enquiries.length === 1 ? 'quotation' : 'quotations'})`}>
      <Table
        dataSource={enquiries}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: 900 }}
        rowClassName={(e) => (e.id === selectedId || e.subcontractorId === bill.subcontractorId ? 'bg-emerald-500/10' : '')}
        columns={[
          { title: '#', key: 'sno', width: 40, render: (_, __, i) => i + 1 },
          {
            title: 'Subcontractor', key: 'subcontractor', width: 200,
            render: (_, e) => (
              <Flex gap={6} align="center" wrap="wrap">
                <Typography.Text strong>{e.subcontractor?.name || '-'}</Typography.Text>
                {e.subcontractorId === bill.subcontractorId && <Tag color="success" className="m-0!">This bill</Tag>}
              </Flex>
            ),
          },
          { title: 'Work Category', key: 'category', width: 140, render: (_, e) => e.workCategory?.name || '-' },
          { title: 'Scope of Work', dataIndex: 'scopeOfWork', width: 220, ellipsis: true, render: (v?: string | null) => v || '-' },
          { title: 'Amount', key: 'amount', width: 120, align: 'right', render: (_, e) => (e.totalAmount != null ? formatCurrency(e.totalAmount) : '-') },
          {
            title: 'GST', key: 'gst', width: 120, align: 'right',
            render: (_, e) => (e.gstPercent ? `${Number(e.gstPercent)}% (${formatCurrency(e.gstAmount || 0)})` : '-'),
          },
          {
            title: 'Total w/ GST', key: 'total', width: 140, align: 'right',
            render: (_, e) => (
              <Flex gap={6} justify="flex-end" align="center">
                <Typography.Text strong>{totalOf(e) ? formatCurrency(totalOf(e)) : '-'}</Typography.Text>
                {totalOf(e) > 0 && totalOf(e) === lowest && enquiries.length > 1 && <Tag color="blue" className="m-0!">Lowest</Tag>}
              </Flex>
            ),
          },
          {
            title: 'Period', key: 'period', width: 190,
            render: (_, e) => (e.startDate || e.endDate ? `${e.startDate ? formatDate(e.startDate) : '-'} → ${e.endDate ? formatDate(e.endDate) : '-'}` : '-'),
          },
          { title: 'Status', dataIndex: 'status', width: 110, render: (v: string) => <StatusTag value={v} /> },
          {
            title: 'Quotation', key: 'quotation', width: 100,
            render: (_, e) => (e.quotationUrl ? (
              <Button type="link" size="small" className="px-0!" icon={<FilePdfOutlined />} href={e.quotationUrl} target="_blank">View</Button>
            ) : <Typography.Text type="secondary">-</Typography.Text>),
          },
        ]}
      />
    </Card>
  );
}

export function SubcontractorBillDetailClient({ bill, trail }: Props) {
  const router = useRouter();

  if (!bill) {
    return (
      <div className="p-10 text-center text-[var(--text-very-muted)]">
        Bill not found.
      </div>
    );
  }

  const wo = trail?.subcontractWorkOrder || bill.subcontractWorkOrder;

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
        <Card size="small" title="Document Trail — Enquiry → Work Order → Subcontractor Bill → Work Done">
          <Flex gap={8} align="stretch" wrap="wrap">
            <TrailStage
              label="Subcontractor Enquiry"
              refNo={trail?.enquiry?.scrNo || wo?.scrNo}
              sub={trail?.enquiry ? formatCurrency(trail.enquiry.totalWithGst || trail.enquiry.totalAmount || 0) : null}
              status={trail?.enquiry?.status}
              muted={!trail?.enquiry}
              action={trail?.enquiry?.quotationUrl ? (
                <Button type="link" size="small" icon={<FilePdfOutlined />} href={trail.enquiry.quotationUrl} target="_blank" />
              ) : undefined}
            />
            <Flex align="center"><ArrowRightOutlined className="text-[var(--text-very-muted)]" /></Flex>
            <TrailStage
              label="Subcontract Work Order"
              refNo={wo?.woNumber}
              sub={wo ? formatCurrency(wo.totalAmount) : null}
              status={wo?.status}
              muted={!wo}
              action={wo?.workorderUrl ? (
                <Button type="link" size="small" icon={<FilePdfOutlined />} href={wo.workorderUrl} target="_blank" />
              ) : undefined}
            />
            <Flex align="center"><ArrowRightOutlined className="text-[var(--text-very-muted)]" /></Flex>
            <TrailStage
              label="Subcontractor Bill"
              refNo={bill.billNumber}
              sub={formatCurrency(bill.amount)}
              status={bill.status}
              action={bill.billFileUrl ? (
                <Button type="link" size="small" icon={<FilePdfOutlined />} href={bill.billFileUrl} target="_blank" />
              ) : undefined}
            />
            <Flex align="center"><ArrowRightOutlined className="text-[var(--text-very-muted)]" /></Flex>
            <TrailStage
              label="Work Done"
              refNo={trail?.works?.length ? `${trail.works.length} ${trail.works.length === 1 ? 'entry' : 'entries'}` : null}
              sub={trail?.works?.[0]?.createdAt ? `Latest ${formatDate(trail.works[0].createdAt)}` : null}
              muted={!trail?.works?.length}
            />
          </Flex>
        </Card>

        <DocumentCheck bill={bill} trail={trail} />

        <EnquiryComparison bill={bill} trail={trail} />

        <Card size="small" title="Bill Information">
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="pr-6 py-1.5 text-[var(--text-muted)] w-40">Subcontractor</td><td>{bill.subcontractor?.name || '-'}</td></tr>
              <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Project</td><td>{bill.project?.name || wo?.project?.name || '-'}</td></tr>
              <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Bill Amount</td><td><Typography.Text strong>{formatCurrency(bill.amount)}</Typography.Text></td></tr>
              {!!bill.gstPercent && <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">GST</td><td>{Number(bill.gstPercent)}% ({formatCurrency(bill.gstAmount || 0)})</td></tr>}
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

        {wo && (
          <Card size="small" title={`Subcontract Work Order — ${wo.woNumber}`}>
            <table className="w-full text-sm">
              <tbody>
                <tr><td className="pr-6 py-1.5 text-[var(--text-muted)] w-40">Description</td><td>{wo.description || '-'}</td></tr>
                <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Work Order Amount</td><td>{formatCurrency(wo.amount)}</td></tr>
                <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Total w/ GST</td><td><Typography.Text strong>{formatCurrency(wo.totalAmount)}</Typography.Text></td></tr>
                <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Paid So Far</td><td>{formatCurrency(wo.paidAmount || 0)}</td></tr>
                {wo.startDate && <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Start Date</td><td>{formatDate(wo.startDate)}</td></tr>}
                {wo.endDate && <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">End Date</td><td>{formatDate(wo.endDate)}</td></tr>}
              </tbody>
            </table>
          </Card>
        )}
      </Flex>
    </div>
  );
}
