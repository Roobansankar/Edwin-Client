import { Alert } from 'antd';
import { ApprovalsClient } from '@/components/dashboard/ApprovalsClient';
import { fetchBills, fetchExpenses, fetchDailyLabourReports, fetchSubcontractorBills, fetchVendorQuotations } from '@/lib/api';
import type { PurchaseBill, Expense, DailyLabourReport, SubcontractorBill, VendorQuotation } from '@/types/erp';

type PageData = {
  bills: PurchaseBill[];
  subcontractorBills: SubcontractorBill[];
  vendorQuotations: VendorQuotation[];
  expenses: Expense[];
  dailyReports: DailyLabourReport[];
  error?: string;
};

async function loadPageData(): Promise<PageData> {
  try {
    const [bills, subcontractorBills, vendorQuotations, expensesResult, dailyReports] = await Promise.all([
      fetchBills(),
      fetchSubcontractorBills(),
      fetchVendorQuotations(),
      fetchExpenses('limit=5000'),
      fetchDailyLabourReports(),
    ]);
    return { bills, subcontractorBills, vendorQuotations, expenses: expensesResult.data, dailyReports };
  } catch (error) {
    return {
      bills: [], subcontractorBills: [], vendorQuotations: [], expenses: [], dailyReports: [],
      error: error instanceof Error ? error.message : 'Failed to load data',
    };
  }
}

export default async function ApprovalsPage() {
  const { bills, subcontractorBills, vendorQuotations, expenses, dailyReports, error } = await loadPageData();
  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <ApprovalsClient
        bills={bills}
        expenses={expenses}
        subcontractorBills={subcontractorBills}
        vendorQuotations={vendorQuotations}
        dailyReports={dailyReports}
      />
    </>
  );
}
