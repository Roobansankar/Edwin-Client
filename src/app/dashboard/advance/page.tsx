import { Alert } from 'antd';
import { AdvanceRequestClient } from '@/components/dashboard/AdvanceRequestClient';
import { fetchProjects, fetchAdvanceRequests, fetchPurchaseOrders } from '@/lib/api';

async function loadPageData() {
  try {
    const [projects, advanceRequests, purchaseOrders] = await Promise.all([
      fetchProjects(),
      fetchAdvanceRequests(),
      fetchPurchaseOrders(),
    ]);
    return { projects, advanceRequests, purchaseOrders };
  } catch (error) {
    return {
      projects: [],
      advanceRequests: [],
      purchaseOrders: [],
      error: error instanceof Error ? error.message : 'Unable to load advance requests',
    };
  }
}

export default async function AdvancePage() {
  const { projects, advanceRequests, purchaseOrders, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <AdvanceRequestClient projects={projects} advanceRequests={advanceRequests} purchaseOrders={purchaseOrders} />
    </>
  );
}
