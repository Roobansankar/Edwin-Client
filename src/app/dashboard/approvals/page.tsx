import { Alert } from 'antd';
import { ApprovalsClient } from '@/components/dashboard/ApprovalsClient';
import { fetchBills, fetchExpenses, fetchDailyLabourReports } from '@/lib/api';
import type { PurchaseBill, Expense, DailyLabourReport } from '@/types/erp';

type PageData = {
  bills: PurchaseBill[];
  expenses: Expense[];
  dailyReports: DailyLabourReport[];
  error?: string;
};

async function loadPageData(): Promise<PageData> {
  try {
    const [bills, expensesResult, dailyReports] = await Promise.all([
      fetchBills(),
      fetchExpenses(),
      fetchDailyLabourReports(),
    ]);
    return { bills, expenses: expensesResult.data, dailyReports };
  } catch (error) {
    return {
      bills: [], expenses: [], dailyReports: [],
      error: error instanceof Error ? error.message : 'Failed to load data',
    };
  }
}

export default async function ApprovalsPage() {
  const { bills, expenses, dailyReports, error } = await loadPageData();
  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <ApprovalsClient
        bills={bills} expenses={expenses}
        dailyReports={dailyReports}
      />
    </>
  );
}
