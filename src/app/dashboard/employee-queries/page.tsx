import { Alert } from 'antd';
import { EmployeeQueriesClient } from '@/components/dashboard/EmployeeQueriesClient';
import { fetchEmployeeQueries } from '@/lib/api';
import type { EmployeeQuery } from '@/types/erp';

async function loadQueries(): Promise<{ queries: EmployeeQuery[]; error?: string }> {
  try {
    return { queries: await fetchEmployeeQueries() };
  } catch (error) {
    return {
      queries: [],
      error: error instanceof Error ? error.message : 'Unable to load edit requests',
    };
  }
}

export default async function EmployeeQueriesPage() {
  const { queries, error } = await loadQueries();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <EmployeeQueriesClient queries={queries} />
    </>
  );
}
