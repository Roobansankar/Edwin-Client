import { Alert } from 'antd';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { PaymentsClient } from '@/components/dashboard/PaymentsClient';
import { fetchPayments, fetchPaymentsSummary, fetchProjects, fetchVendors, fetchPurchaseOrders, fetchAdvanceRequests, fetchSubcontractWorkOrders, fetchSubcontractorPaymentRequests, fetchUnpaidLabourWeeklySummary, fetchUnpaidExpenseWeeklySummary, fetchBills } from '@/lib/api';

async function loadPageData() {
  try {
    const [paymentsRes, summary, projects, vendors, purchaseOrders, advanceRequests, subcontractWorkOrders, subcontractorPaymentRequests, unpaidLabourSummary, unpaidExpenseSummary, bills] = await Promise.all([
      fetchPayments('limit=5000'),
      fetchPaymentsSummary(),
      fetchProjects(),
      fetchVendors(),
      fetchPurchaseOrders(),
      // All requests: the Payment Options tabs approve them and then pay them.
      fetchAdvanceRequests(),
      fetchSubcontractWorkOrders(),
      fetchSubcontractorPaymentRequests(),
      fetchUnpaidLabourWeeklySummary(),
      fetchUnpaidExpenseWeeklySummary(),
      fetchBills(),
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
      subcontractWorkOrders,
      subcontractorPaymentRequests,
      unpaidLabourSummary,
      unpaidExpenseSummary,
      bills: Array.isArray(bills) ? bills : [],
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
      subcontractWorkOrders: [],
      subcontractorPaymentRequests: [],
      unpaidLabourSummary: [],
      unpaidExpenseSummary: [],
      bills: [],
      error: error instanceof Error ? error.message : 'Unable to load payments data',
    };
  }
}

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function PaymentsPage({ searchParams }: PageProps) {
  // ?tab=vendor / labour / subcontractor / expenses opens that Payment Options tab (used by notification links).
  const { tab } = await searchParams;

  // Payments is accounts/admin only; the purchase team lands here from old
  // notification links, so send them to their own payment pages instead.
  const user = await getUserFromToken();
  if (user?.role === 'purchase_team') {
    redirect(tab === 'subcontractor' ? '/dashboard/subcontractor-payments' : '/dashboard/advance');
  }
  const {
    payments, summary, projects, vendors, purchaseOrders, advanceRequests, subcontractWorkOrders,
    subcontractorPaymentRequests, unpaidLabourSummary, unpaidExpenseSummary, bills, error,
  } = await loadPageData();

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
        subcontractWorkOrders={subcontractWorkOrders}
        subcontractorPaymentRequests={subcontractorPaymentRequests}
        unpaidLabourSummary={unpaidLabourSummary}
        unpaidExpenseSummary={unpaidExpenseSummary}
        bills={bills}
        initialTab={tab}
      />
    </>
  );
}
