import { Alert } from 'antd';
import { ExpensesClient } from '@/components/dashboard/ExpensesClient';
import { fetchExpenses, fetchProjects } from '@/lib/api';
import type { Expense, Project } from '@/types/erp';

type ExpensesPageData = {
  expenses: Expense[];
  projects: Project[];
  error?: string;
};

async function loadPageData(): Promise<ExpensesPageData> {
  try {
    const [expenses, projects] = await Promise.all([
      fetchExpenses('limit=100'),
      fetchProjects(),
    ]);
    return { expenses: expenses.data, projects };
  } catch (error) {
    return {
      expenses: [],
      projects: [],
      error: error instanceof Error ? error.message : 'Unable to load expenses',
    };
  }
}

export default async function ExpensesPage() {
  const { expenses, projects, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <ExpensesClient expenses={expenses} projects={projects} />
    </>
  );
}
