import { fetchAccountsManagers, fetchProjects, fetchSalaries } from '@/lib/api';
import { AccountsManagersClient } from '@/components/dashboard/AccountsManagersClient';
import { Alert } from 'antd';

async function loadData() {
  try {
    const [accountsManagers, projects, salaries] = await Promise.all([
      fetchAccountsManagers(),
      fetchProjects(),
      fetchSalaries(),
    ]);
    return { accountsManagers, projects, salaries };
  } catch (error) {
    console.error('Failed to fetch data for accounts managers:', error);
    return null;
  }
}

export default async function AccountsManagersPage() {
  const data = await loadData();

  if (data === null) {
    return (
      <Alert
        message="Error"
        description="Failed to load data. Please check your connection to the server."
        type="error"
        showIcon
      />
    );
  }

  return (
    <AccountsManagersClient
      accountsManagers={data.accountsManagers}
      projects={data.projects}
      salaries={data.salaries}
    />
  );
}
