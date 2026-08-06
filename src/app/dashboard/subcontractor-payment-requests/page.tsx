import { Alert } from 'antd';
import { SubcontractorPaymentRequestsClient } from '@/components/dashboard/SubcontractorPaymentRequestsClient';
import { fetchSubcontractorPaymentRequests } from '@/lib/api';
import type { SubcontractorPaymentRequest } from '@/types/erp';

async function loadRequests(): Promise<{ requests: SubcontractorPaymentRequest[]; error?: string }> {
  try {
    return { requests: await fetchSubcontractorPaymentRequests() };
  } catch (error) {
    return {
      requests: [],
      error: error instanceof Error ? error.message : 'Unable to load subcontractor payment requests',
    };
  }
}

export default async function SubcontractorPaymentRequestsPage() {
  const { requests, error } = await loadRequests();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <SubcontractorPaymentRequestsClient requests={requests} />
    </>
  );
}
