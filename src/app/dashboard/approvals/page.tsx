import { Alert } from 'antd';
import { ApprovalsClient } from '@/components/dashboard/ApprovalsClient';
import { fetchBills, fetchExpenses, fetchSubcontractWorkOrders, fetchDailyLabourReports, fetchTimesheets } from '@/lib/api';
import type { PurchaseBill, Expense, SubcontractWorkOrder, DailyLabourReport, WeeklyTimesheet } from '@/types/erp';

type PageData = {
  bills: PurchaseBill[];
  expenses: Expense[];
  subcontractWorkOrders: SubcontractWorkOrder[];
  dailyReports: DailyLabourReport[];
  timesheets: WeeklyTimesheet[];
  error?: string;
};

async function loadPageData(): Promise<PageData> {
  try {
    const [bills, expensesResult, subcontractWorkOrders, dailyReports, tsResult] = await Promise.all([
      fetchBills(),
      fetchExpenses(),
      fetchSubcontractWorkOrders(),
      fetchDailyLabourReports(),
      fetchTimesheets(),
    ]);
    return { bills, expenses: expensesResult.data, subcontractWorkOrders, dailyReports, timesheets: tsResult.data };
  } catch (error) {
    return {
      bills: [], expenses: [], subcontractWorkOrders: [], dailyReports: [], timesheets: [],
      error: error instanceof Error ? error.message : 'Failed to load data',
    };
  }
}

export default async function ApprovalsPage() {
  const { bills, expenses, subcontractWorkOrders, dailyReports, timesheets, error } = await loadPageData();
  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <ApprovalsClient
        bills={bills} expenses={expenses}
        subcontractWorkOrders={subcontractWorkOrders} dailyReports={dailyReports}
        timesheets={timesheets}
      />
    </>
  );
}
