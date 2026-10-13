import { Alert } from 'antd';
import { ExpenseWeekDetailClient } from '@/components/dashboard/ExpenseWeekDetailClient';
import { fetchExpensePayments, fetchExpenses } from '@/lib/api';
import type { Expense, ExpensePayment } from '@/types/erp';

type PageProps = {
  searchParams: Promise<{ week?: string; user?: string; project?: string }>;
};

// Monday of the week (YYYY-MM-DD) for a date string, same rule as Approvals.
function mondayOf(dateStr: string) {
  const d = new Date(`${dateStr.split('T')[0]}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().split('T')[0];
}

// One week of one engineer's expenses for one project, opened from the eye
// icon on the Approvals page's Expenses tab.
export default async function ExpenseWeekPage({ searchParams }: PageProps) {
  const { week = '', user = '', project = 'none' } = await searchParams;

  let expenses: Expense[] = [];
  let expensePayments: ExpensePayment[] = [];
  let error: string | undefined;
  try {
    const [expensesRes, paymentsRes] = await Promise.all([
      fetchExpenses('limit=5000'),
      fetchExpensePayments().catch(() => [] as ExpensePayment[]),
    ]);
    const all = Array.isArray(expensesRes) ? expensesRes : expensesRes?.data || [];
    expenses = all.filter(
      (e) =>
        (e.createdBy || e.creator?.id || '') === user &&
        (e.projectId || 'none') === project &&
        mondayOf(e.expenseDate) === week,
    );
    expensePayments = Array.isArray(paymentsRes) ? paymentsRes : [];
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unable to load expenses';
  }

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <ExpenseWeekDetailClient weekStart={week} expenses={expenses} expensePayments={expensePayments} />
    </>
  );
}
