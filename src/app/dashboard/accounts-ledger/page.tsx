import { Alert } from 'antd';
import { AccountsLedgerClient } from '@/components/dashboard/AccountsLedgerClient';
import {
  fetchBills,
  fetchDailyLabourReports,
  fetchExpensePayments,
  fetchExpenses,
  fetchLabourPayments,
  fetchPayments,
  fetchSubcontractorBills,
  fetchVendors,
} from '@/lib/api';

// Each source is loaded on its own so one failing endpoint only empties its
// own ledger tab instead of the whole page.
async function safe<T>(promise: Promise<T>, fallback: T, errors: string[], label: string): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    errors.push(`${label}: ${error instanceof Error ? error.message : 'failed to load'}`);
    return fallback;
  }
}

export default async function AccountsLedgerPage() {
  const errors: string[] = [];
  const [dailyLabourReports, labourPayments, bills, paymentsRes, vendors, subcontractorBills, expensesRes, expensePayments] = await Promise.all([
    safe(fetchDailyLabourReports(), [], errors, 'Daily labour'),
    safe(fetchLabourPayments(), [], errors, 'Labour payments'),
    safe(fetchBills(), [], errors, 'Bills'),
    safe(fetchPayments('limit=5000'), { data: [], total: 0, page: 1, limit: 5000 }, errors, 'Payments'),
    safe(fetchVendors(), [], errors, 'Vendors'),
    safe(fetchSubcontractorBills(), [], errors, 'Subcontractor bills'),
    safe(fetchExpenses('limit=5000'), { data: [], total: 0, page: 1, limit: 5000 }, errors, 'Expenses'),
    safe(fetchExpensePayments(), [], errors, 'Expense payments'),
  ]);

  const payments = Array.isArray(paymentsRes) ? paymentsRes : paymentsRes?.data || [];
  const expenses = Array.isArray(expensesRes) ? expensesRes : expensesRes?.data || [];

  return (
    <>
      {errors.length > 0 && <Alert type="warning" showIcon title={errors.join(' · ')} className="mb-4" />}
      <AccountsLedgerClient
        dailyLabourReports={Array.isArray(dailyLabourReports) ? dailyLabourReports : []}
        labourPayments={Array.isArray(labourPayments) ? labourPayments : []}
        bills={Array.isArray(bills) ? bills : []}
        payments={payments}
        vendors={Array.isArray(vendors) ? vendors : []}
        subcontractorBills={Array.isArray(subcontractorBills) ? subcontractorBills : []}
        expenses={expenses}
        expensePayments={Array.isArray(expensePayments) ? expensePayments : []}
      />
    </>
  );
}
