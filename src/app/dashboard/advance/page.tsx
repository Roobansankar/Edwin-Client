import { Alert } from 'antd';
import { AdvanceRequestClient } from '@/components/dashboard/AdvanceRequestClient';
import { fetchProjects, fetchVendorQuotations, fetchAdvanceRequests, fetchPurchaseOrders } from '@/lib/api';

async function loadPageData() {
  try {
    const [projects, vendorQuotations, advanceRequests, purchaseOrders] = await Promise.all([
      fetchProjects(),
      fetchVendorQuotations(),
      fetchAdvanceRequests(),
      fetchPurchaseOrders(),
    ]);
    return { projects, vendorQuotations, advanceRequests, purchaseOrders };
  } catch (error) {
    return {
      projects: [],
      vendorQuotations: [],
      advanceRequests: [],
      purchaseOrders: [],
      error: error instanceof Error ? error.message : 'Unable to load advance requests',
    };
  }
}

export default async function AdvancePage() {
  const { projects, vendorQuotations, advanceRequests, purchaseOrders, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <AdvanceRequestClient projects={projects} vendorQuotations={vendorQuotations} advanceRequests={advanceRequests} purchaseOrders={purchaseOrders} />
    </>
  );
}
