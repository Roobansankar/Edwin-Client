import { Alert } from 'antd';
import { AccountsClient } from '@/components/dashboard/AccountsClient';
import { fetchPayables, fetchReceivables, fetchProjects } from '@/lib/api';

async function loadPageData() {
  try {
    const [payables, receivables, projects] = await Promise.all([
      fetchPayables(),
      fetchReceivables(),
      fetchProjects(),
    ]);
    return { payables, receivables, projects };
  } catch (error) {
    return {
      payables: [],
      receivables: [],
      projects: [],
      error: error instanceof Error ? error.message : 'Unable to load accounts data',
    };
  }
}

export default async function AccountsPage() {
  const { payables, receivables, projects, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <AccountsClient payables={payables} receivables={receivables} projects={projects} />
    </>
  );
}
