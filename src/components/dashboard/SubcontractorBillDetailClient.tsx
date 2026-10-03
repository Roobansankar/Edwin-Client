'use client';

import { Button, Card, Flex, Typography } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { SubcontractorBill, SubcontractorBillTrail } from '@/types/erp';
import {
  StatusTag,
  formatCurrency,
  formatDate,
} from './ui';

type Props = {
  bill: SubcontractorBill | null;
  trail?: SubcontractorBillTrail | null;
};

// Mirrors the TrailStage card used on the Vendor Bill detail page, but the
// subcontractor-bill chain has only two stages - there's no MR / Enquiry /
// Material Received equivalent for subcontract labour, just the Work Order
// that was billed.
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
        <Card size="small" title="Document Trail — Work Order → Subcontractor Bill">
          <Flex gap={8} align="stretch" wrap="wrap">
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
          </Flex>
        </Card>

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
