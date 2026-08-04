import { Alert } from 'antd';
import { BillDetailClient } from '@/components/dashboard/BillDetailClient';
import { fetchBill } from '@/lib/api';
import type { PurchaseBill } from '@/types/erp';

type PageProps = {
  params: Promise<{ id: string }>;
};

type DetailPageData = {
  bill: PurchaseBill | null;
  error?: string;
};

async function loadPageData(id: string): Promise<DetailPageData> {
  try {
    const bill = await fetchBill(id);
    return { bill };
  } catch (error) {
    return {
      bill: null,
      error: error instanceof Error ? error.message : 'Unable to load bill',
    };
  }
}

export default async function BillDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { bill, error } = await loadPageData(id);

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <BillDetailClient bill={bill} />
    </>
  );
}
