import { Alert } from 'antd';
import { ExpensePaymentsClient } from '@/components/dashboard/ExpensePaymentsClient';
import { fetchExpensePayments, fetchUnpaidExpenseWeeklySummary } from '@/lib/api';

async function loadData() {
  try {
    const [payments, unpaidSummary] = await Promise.all([
      fetchExpensePayments(),
      fetchUnpaidExpenseWeeklySummary(),
    ]);
    return { payments, unpaidSummary };
  } catch (error) {
    return {
      payments: [],
      unpaidSummary: [],
      error: error instanceof Error ? error.message : 'Failed to load expense payments',
    };
  }
}

export default async function ExpensePaymentsPage() {
  const { payments, unpaidSummary, error } = await loadData();

  return (
    <>
      {error && <Alert type="warning" showIcon message={error} className="mb-4" />}
      <ExpensePaymentsClient payments={payments} unpaidSummary={unpaidSummary} />
    </>
  );
}
