import { Alert } from 'antd';
import { AdvanceRequestClient } from '@/components/dashboard/AdvanceRequestClient';
import { fetchProjects, fetchAdvanceRequests, fetchPurchaseOrders, fetchBills, fetchPayments } from '@/lib/api';

async function loadPageData() {
  try {
    const [projects, advanceRequests, purchaseOrders, bills, paymentsRes] = await Promise.all([
      fetchProjects(),
      fetchAdvanceRequests(),
      fetchPurchaseOrders(),
      fetchBills(),
      fetchPayments('limit=5000'),
    ]);
    return { projects, advanceRequests, purchaseOrders, bills, payments: paymentsRes.data };
  } catch (error) {
    return {
      projects: [],
      advanceRequests: [],
      purchaseOrders: [],
      bills: [],
      payments: [],
      error: error instanceof Error ? error.message : 'Unable to load advance requests',
    };
  }
}

export default async function AdvancePage() {
  const { projects, advanceRequests, purchaseOrders, bills, payments, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <AdvanceRequestClient
        projects={projects}
        advanceRequests={advanceRequests}
        purchaseOrders={purchaseOrders}
        bills={bills}
        payments={payments}
      />
    </>
  );
}
