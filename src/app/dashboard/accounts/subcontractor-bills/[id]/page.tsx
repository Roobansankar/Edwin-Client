import { Alert } from 'antd';
import { SubcontractorBillDetailClient } from '@/components/dashboard/SubcontractorBillDetailClient';
import { fetchSubcontractorBill, fetchSubcontractorBillTrail } from '@/lib/api';
import type { SubcontractorBill, SubcontractorBillTrail } from '@/types/erp';

type PageProps = {
  params: Promise<{ id: string }>;
};

type DetailPageData = {
  bill: SubcontractorBill | null;
  trail: SubcontractorBillTrail | null;
  error?: string;
};

async function loadPageData(id: string): Promise<DetailPageData> {
  try {
    const [bill, trail] = await Promise.all([
      fetchSubcontractorBill(id),
      fetchSubcontractorBillTrail(id).catch(() => null),
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

export default async function SubcontractorBillDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { bill, trail, error } = await loadPageData(id);

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <SubcontractorBillDetailClient bill={bill} trail={trail} />
    </>
  );
}
