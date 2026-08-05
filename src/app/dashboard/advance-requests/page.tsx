import { Alert } from 'antd';
import { AdvanceRequestsClient } from '@/components/dashboard/AdvanceRequestsClient';
import { fetchAdvanceRequests } from '@/lib/api';
import type { AdvanceRequest } from '@/types/erp';

async function loadRequests(): Promise<{ requests: AdvanceRequest[]; error?: string }> {
  try {
    return { requests: await fetchAdvanceRequests() };
  } catch (error) {
    return {
      requests: [],
      error: error instanceof Error ? error.message : 'Unable to load advance requests',
    };
  }
}

export default async function AdvanceRequestsPage() {
  const { requests, error } = await loadRequests();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <AdvanceRequestsClient requests={requests} />
    </>
  );
}
