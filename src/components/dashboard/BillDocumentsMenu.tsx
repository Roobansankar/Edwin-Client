'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, App, Button, Card, Drawer, Dropdown, Flex, Spin, Tag, Typography } from 'antd';
import { CheckCircleFilled, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import { markBillDocumentChecked } from '@/actions/invoices';
import { clientApiFetch } from '@/lib/client-api';
import type { BillTrail, PurchaseBill } from '@/types/erp';
import { StatusTag, formatCurrency, formatDate } from './ui';

// The three documents accounts must open and tick before a bill can be
// accounts-approved. Shared by the Bills page and the Approvals page.
export type DocKey = 'mrr' | 'enquiry' | 'po';
export const DOC_LABEL: Record<DocKey, string> = {
  mrr: 'MRR',
  enquiry: 'Purchase Enquiry',
  po: 'Purchase Order (PO)',
};
export const DOC_KEYS: DocKey[] = ['mrr', 'enquiry', 'po'];

export const docChecked = (bill: PurchaseBill, doc: DocKey) =>
  Boolean(doc === 'mrr' ? bill.mrrChecked : doc === 'enquiry' ? bill.enquiryChecked : bill.poChecked);

export const missingDocs = (bill: PurchaseBill) =>
  DOC_KEYS.filter((d) => !docChecked(bill, d)).map((d) => DOC_LABEL[d]);

// Accounts approval step is labelled "Accounts Approved" on the bill pages.
export const BILL_STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Accounts Approved', value: 'admin_approved' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

type Props = {
  bill: PurchaseBill;
  canApprove: boolean;
};

// "Documents (n/3)" dropdown for one bill: opens MRR / Purchase Enquiry / PO
// in a drawer, and lets accounts tick each one as checked.
export function BillDocumentsMenu({ bill, canApprove }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();
  const [doc, setDoc] = useState<DocKey | null>(null);
  const [trail, setTrail] = useState<BillTrail | null>(null);
  const [trailLoading, setTrailLoading] = useState(false);

  const checkedCount = DOC_KEYS.filter((d) => docChecked(bill, d)).length;

  const openDoc = async (key: DocKey) => {
    setDoc(key);
    setTrail(null);
    setTrailLoading(true);
    try {
      setTrail(await clientApiFetch<BillTrail>(`/bills/${bill.id}/trail`));
    } catch {
      message.error('Failed to load document details');
    } finally {
      setTrailLoading(false);
    }
  };

  const handleMarkChecked = (key: DocKey) => {
    startTransition(async () => {
      try {
        await markBillDocumentChecked(bill.id, key);
        message.success(`${DOC_LABEL[key]} checked`);
        router.refresh();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to mark as checked');
      }
    });
  };

  // Read-only body of the drawer for one of the three documents.
  const renderDocBody = (key: DocKey) => {
    if (key === 'mrr') {
      const records = trail?.materialReceived || [];
      if (!records.length) {
        return <Alert type="warning" showIcon message="No Material Received (MRR) has been logged against this PO yet." />;
      }
      return (
        <Flex vertical gap={12}>
          {records.map((mr) => (
            <Card key={mr.id} size="small" title={`${mr.mrNumber} — received ${mr.receivedDate ? formatDate(mr.receivedDate) : '-'}`}>
              <Flex vertical gap={4}>
                {mr.items?.map((it, i) => (
                  <Typography.Text key={i}>{i + 1}. {it.description} — Qty: {it.quantity} {it.unit || ''}</Typography.Text>
                ))}
              </Flex>
              {mr.damageRemarks && (
                <Alert className="mt-3!" type="error" showIcon message="Damaged / Missing" description={mr.damageRemarks} />
              )}
              <Flex gap={8} wrap="wrap" className="mt-3!">
                {mr.billUrl && <Button size="small" icon={<FilePdfOutlined />} href={mr.billUrl} target="_blank">Delivery Chalan</Button>}
                {mr.photoUrls?.map((url, i) => (
                  <Button key={url} size="small" href={url} target="_blank">Photo {i + 1}</Button>
                ))}
              </Flex>
            </Card>
          ))}
        </Flex>
      );
    }

    if (key === 'enquiry') {
      const vq = trail?.vendorQuotation;
      if (!vq) {
        return <Alert type="warning" showIcon message="No Purchase Enquiry (vendor quotation) found for this vendor and MR." />;
      }
      return (
        <Card size="small" title={`Quotation from ${vq.vendor?.name || 'vendor'} — ${formatDate(vq.createdAt)}`}>
          <Flex vertical gap={4}>
            <Typography.Text>Status: <StatusTag value={vq.status} /></Typography.Text>
            <Typography.Text>Quoted total (incl. GST): <Typography.Text strong>{formatCurrency(vq.totalWithGst || vq.totalAmount || 0)}</Typography.Text></Typography.Text>
            {vq.gstPercent ? <Typography.Text>GST: {Number(vq.gstPercent)}%</Typography.Text> : null}
            {vq.transportAmount ? <Typography.Text>Transport: {formatCurrency(vq.transportAmount)}</Typography.Text> : null}
          </Flex>
          <Flex vertical gap={4} className="mt-3!">
            {vq.items?.map((it, i) => (
              <Typography.Text key={i}>{i + 1}. {it.description} — Qty: {it.quantity}{it.rate ? ` @ ${formatCurrency(it.rate)}` : ''}</Typography.Text>
            ))}
          </Flex>
          {vq.quotationUrl && (
            <Button size="small" className="mt-3!" icon={<FilePdfOutlined />} href={vq.quotationUrl} target="_blank">View quotation</Button>
          )}
        </Card>
      );
    }

    const po = bill.purchaseOrder;
    if (!po) {
      return <Alert type="warning" showIcon message="No Purchase Order is linked to this bill." />;
    }
    return (
      <Card size="small" title={`${po.poNumber}${po.createdAt ? ` — ${formatDate(po.createdAt)}` : ''}`}>
        <Flex vertical gap={4}>
          <Typography.Text>Vendor: {bill.vendor?.name || '-'}</Typography.Text>
          <Typography.Text>Status: <StatusTag value={po.status} /></Typography.Text>
          <Typography.Text>Total (incl. GST): <Typography.Text strong>{formatCurrency(po.totalWithGst || po.totalAmount)}</Typography.Text></Typography.Text>
        </Flex>
        <Flex vertical gap={4} className="mt-3!">
          {po.items?.map((it, i) => (
            <Typography.Text key={i}>{i + 1}. {it.description} — Qty: {it.quantity} {it.unit || ''} @ {formatCurrency(it.rate)}</Typography.Text>
          ))}
        </Flex>
        {po.billFileUrl && (
          <Button size="small" className="mt-3!" icon={<FilePdfOutlined />} href={po.billFileUrl} target="_blank">View PO document</Button>
        )}
      </Card>
    );
  };

  const available = doc === null
    ? false
    : doc === 'mrr'
      ? (trail?.materialReceived?.length ?? 0) > 0
      : doc === 'enquiry'
        ? !!trail?.vendorQuotation
        : !!bill.purchaseOrder;

  return (
    <>
      <Dropdown
        trigger={['click']}
        menu={{
          items: DOC_KEYS.map((d, i) => ({
            key: d,
            label: (
              <Flex justify="space-between" align="center" gap={16}>
                <span>{i + 1}. {DOC_LABEL[d]}</span>
                {docChecked(bill, d) && <CheckCircleFilled className="text-green-500" />}
              </Flex>
            ),
          })),
          onClick: ({ key }) => openDoc(key as DocKey),
        }}
      >
        <Button size="small" icon={<FileTextOutlined />}>
          Documents ({checkedCount}/3)
        </Button>
      </Dropdown>

      <Drawer
        title={doc ? `${DOC_LABEL[doc]} — ${bill.billNumber}` : ''}
        size="large"
        open={!!doc}
        onClose={() => { setDoc(null); setTrail(null); }}
        destroyOnHidden
      >
        {doc && (
          <Flex vertical gap={16}>
            <Card size="small" title="Checklist before approval">
              <Flex vertical gap={6}>
                {DOC_KEYS.map((d, i) => (
                  <Flex key={d} justify="space-between" align="center">
                    <Typography.Text>{i + 1}. {DOC_LABEL[d]}</Typography.Text>
                    {docChecked(bill, d) ? <Tag color="success">Checked</Tag> : <Tag>Not checked</Tag>}
                  </Flex>
                ))}
              </Flex>
            </Card>

            {trailLoading ? <Flex justify="center" className="py-6!"><Spin /></Flex> : renderDocBody(doc)}

            {canApprove && (
              <Flex justify="flex-end">
                <Button
                  type="primary"
                  disabled={docChecked(bill, doc) || !available || trailLoading}
                  loading={isPending}
                  onClick={() => handleMarkChecked(doc)}
                >
                  {docChecked(bill, doc) ? 'Already checked' : `Mark ${DOC_LABEL[doc]} as checked`}
                </Button>
              </Flex>
            )}
          </Flex>
        )}
      </Drawer>
    </>
  );
}
