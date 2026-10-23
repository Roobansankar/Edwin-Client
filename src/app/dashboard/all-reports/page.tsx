import { Alert } from 'antd';
import { fetchPayments, fetchLabourPayments, fetchExpensePayments, fetchBills, fetchSubcontractorBills, fetchDailyLabourReports, fetchExpenses } from '@/lib/api';
import { getUserFromToken } from '@/lib/auth';
import { PaidReportsClient } from '@/components/dashboard/PaidReportsClient';

async function loadPaidReports() {
  try {
    const [first, labourPayments, expensePayments, bills, subcontractorBills, dailyLabourReports, expensesResult] = await Promise.all([
      fetchPayments('limit=5000'), fetchLabourPayments(), fetchExpensePayments(),
      fetchBills(), fetchSubcontractorBills(), fetchDailyLabourReports(), fetchExpenses('limit=5000'),
    ]);
    const payments = Array.isArray(first) ? first : [...first.data];
    if (!Array.isArray(first)) {
      for (let page = 2; payments.length < first.total; page += 1) {
        const next = await fetchPayments(`limit=5000&page=${page}`);
        const rows = Array.isArray(next) ? next : next.data;
        if (!rows.length) break;
        payments.push(...rows);
      }
    }
    const expenses = Array.isArray(expensesResult) ? expensesResult : [...expensesResult.data];
    if (!Array.isArray(expensesResult)) {
      for (let page = 2; expenses.length < expensesResult.total; page += 1) {
        const next = await fetchExpenses(`limit=5000&page=${page}`);
        if (!next.data.length) break;
        expenses.push(...next.data);
      }
    }
    return { payments, labourPayments, expensePayments, bills, subcontractorBills, dailyLabourReports, expenses };
  } catch (error) {
    console.error('Failed to load paid reports:', error);
    return null;
  }
}

export default async function AllReportsPage() {
  const user = await getUserFromToken();
  if (!user || !['admin', 'accounts_manager'].includes(user.role)) {
    return <Alert type="info" showIcon title="Paid reports are available to accounts and admin." />;
  }
  const data = await loadPaidReports();
  if (!data) return <Alert type="error" showIcon title="Unable to load paid reports. Please try again." />;
  return <PaidReportsClient {...data} />;
}
