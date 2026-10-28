import { Alert } from 'antd';
import { ApprovalsClient } from '@/components/dashboard/ApprovalsClient';
import { fetchAdvanceRequests, fetchSubcontractorPaymentRequests, fetchPayments, fetchBills, fetchExpenses, fetchDailyLabourReports, fetchSubcontractorBills, fetchVendorQuotations } from '@/lib/api';
import type { AdvanceRequest, SubcontractorPaymentRequest, Payment, PurchaseBill, Expense, DailyLabourReport, SubcontractorBill, VendorQuotation } from '@/types/erp';

type PageData = {
  bills: PurchaseBill[];
  subcontractorBills: SubcontractorBill[];
  vendorQuotations: VendorQuotation[];
  expenses: Expense[];
  dailyReports: DailyLabourReport[];
  advanceRequests: AdvanceRequest[];
  subcontractorPaymentRequests: SubcontractorPaymentRequest[];
  payments: Payment[];
  error?: string;
};

async function loadPageData(): Promise<PageData> {
  try {
    const [bills, subcontractorBills, vendorQuotations, expensesResult, dailyReports, advanceRequests, subcontractorPaymentRequests, paymentsResult] = await Promise.all([
      fetchBills(),
      fetchSubcontractorBills(),
      fetchVendorQuotations(),
      fetchExpenses('limit=5000'),
      fetchDailyLabourReports(),
      fetchAdvanceRequests(),
      fetchSubcontractorPaymentRequests(),
      fetchPayments('limit=5000'),
    ]);
    return { bills, subcontractorBills, vendorQuotations, expenses: expensesResult.data, dailyReports, advanceRequests, subcontractorPaymentRequests, payments: Array.isArray(paymentsResult) ? paymentsResult : paymentsResult.data || [] };
  } catch (error) {
    return {
      bills: [], subcontractorBills: [], vendorQuotations: [], expenses: [], dailyReports: [], advanceRequests: [], subcontractorPaymentRequests: [], payments: [],
      error: error instanceof Error ? error.message : 'Failed to load data',
    };
  }
}

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function ApprovalsPage({ searchParams }: PageProps) {
  // Notification links select the matching approval tab, including vendor and subcontractor requests.
  const { tab } = await searchParams;
  const { bills, subcontractorBills, vendorQuotations, expenses, dailyReports, advanceRequests, subcontractorPaymentRequests, payments, error } = await loadPageData();
  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <ApprovalsClient
        bills={bills}
        expenses={expenses}
        subcontractorBills={subcontractorBills}
        vendorQuotations={vendorQuotations}
        dailyReports={dailyReports}
        advanceRequests={advanceRequests}
        subcontractorPaymentRequests={subcontractorPaymentRequests}
        payments={payments}
        initialTab={tab}
      />
    </>
  );
}
