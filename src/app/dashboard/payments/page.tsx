import { Alert } from 'antd';
import { PaymentsClient } from '@/components/dashboard/PaymentsClient';
import { fetchPayments, fetchPaymentsSummary, fetchProjects, fetchVendors, fetchPurchaseOrders, fetchAdvanceRequests } from '@/lib/api';

async function loadPageData() {
  try {
    const [paymentsRes, summary, projects, vendors, purchaseOrders, advanceRequests] = await Promise.all([
      fetchPayments(),
      fetchPaymentsSummary(),
      fetchProjects(),
      fetchVendors(),
      fetchPurchaseOrders(),
      fetchAdvanceRequests('admin_approved'),
    ]);

    // Server-side normalization
    const payments = Array.isArray(paymentsRes)
      ? paymentsRes
      : (paymentsRes as any)?.data || [];

    return {
      payments,
      summary,
      projects,
      vendors,
      purchaseOrders,
      advanceRequests,
    };
  } catch (error) {
    console.error('Payments Page Error:', error);
    return {
      payments: [],
      summary: [],
      projects: [],
      vendors: [],
      purchaseOrders: [],
      advanceRequests: [],
      error: error instanceof Error ? error.message : 'Unable to load payments data',
    };
  }
}

export default async function PaymentsPage() {
  const { payments, summary, projects, vendors, purchaseOrders, advanceRequests, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <PaymentsClient
        payments={payments}
        summary={summary}
        projects={projects}
        vendors={vendors}
        purchaseOrders={purchaseOrders}
        advanceRequests={advanceRequests}
      />
    </>
  );
}
