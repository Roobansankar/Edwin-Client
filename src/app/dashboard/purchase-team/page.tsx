import { fetchPurchaseTeam, fetchProjects, fetchSalaries } from '@/lib/api';
import { PurchaseTeamClient } from '@/components/dashboard/PurchaseTeamClient';
import { Alert } from 'antd';

async function loadData() {
  try {
    const [purchaseTeamMembers, projects, salaries] = await Promise.all([
      fetchPurchaseTeam(),
      fetchProjects(),
      fetchSalaries(),
    ]);
    return { purchaseTeamMembers, projects, salaries };
  } catch (error) {
    console.error('Failed to fetch data for purchase team:', error);
    return null;
  }
}

export default async function PurchaseTeamPage() {
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
    <PurchaseTeamClient
      purchaseTeamMembers={data.purchaseTeamMembers}
      projects={data.projects}
      salaries={data.salaries}
    />
  );
}
