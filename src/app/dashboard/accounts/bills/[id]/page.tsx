import { Alert } from 'antd';
import { BillDetailClient } from '@/components/dashboard/BillDetailClient';
import { fetchBill, fetchBillTrail } from '@/lib/api';
import type { PurchaseBill, BillTrail } from '@/types/erp';

type PageProps = {
  params: Promise<{ id: string }>;
};

type DetailPageData = {
  bill: PurchaseBill | null;
  trail: BillTrail | null;
  error?: string;
};

async function loadPageData(id: string): Promise<DetailPageData> {
  try {
    const [bill, trail] = await Promise.all([
      fetchBill(id),
      // Trail is a nice-to-have on top of the bill itself — don't let a
      // trail-lookup failure take down the whole page.
      fetchBillTrail(id).catch(() => null),
    ]);
    return { bill, trail };
  } catch (error) {
    return {
      bill: null,
      trail: null,
      error: error instanceof Error ? error.message : 'Unable to load bill',
    };
  }
}

export default async function BillDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { bill, trail, error } = await loadPageData(id);

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <BillDetailClient bill={bill} trail={trail} />
    </>
  );
}
