import { Alert } from 'antd';
import { VendorPaymentJourneyClient } from '@/components/dashboard/VendorPaymentJourneyClient';
import { fetchAdvanceRequestTrail } from '@/lib/api';
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

export default async function VendorPaymentJourneyPage({ params }: PageProps) {
  const { id } = await params;
  const { trail, error } = await loadTrail(id);

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <VendorPaymentJourneyClient trail={trail} />
    </>
  );
}
