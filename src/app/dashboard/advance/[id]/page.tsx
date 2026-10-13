import { Alert } from 'antd';
import { redirect } from 'next/navigation';
import { VendorPaymentJourneyClient } from '@/components/dashboard/VendorPaymentJourneyClient';
import { fetchAdvanceRequestTrail, fetchBills } from '@/lib/api';
import type { AdvanceRequestTrail } from '@/types/erp';

type PageProps = {
  params: Promise<{ id: string }>;
};

async function loadTrail(id: string): Promise<{ trail: AdvanceRequestTrail | null; error?: string }> {
  try {
    return { trail: await fetchAdvanceRequestTrail(id) };
  } catch (error) {
    return {
      trail: null,
      error: error instanceof Error ? error.message : 'Unable to load the payment request journey',
    };
  }
}

// Vendor payment requests open their vendor bill's detail page. This page is
// only shown when no bill has been raised against the request's PO yet.
export default async function VendorPaymentJourneyPage({ params }: PageProps) {
  const { id } = await params;
  const { trail, error } = await loadTrail(id);

  const poId = trail?.request.purchaseOrderId;
  if (poId) {
    const bills = await fetchBills().catch(() => []);
    const bill = Array.isArray(bills) ? bills.find((b) => b.purchaseOrderId === poId) : undefined;
    if (bill) redirect(`/dashboard/accounts/bills/${bill.id}`);
  }

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <VendorPaymentJourneyClient trail={trail} />
    </>
  );
}
