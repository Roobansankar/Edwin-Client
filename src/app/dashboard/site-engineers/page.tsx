import { fetchSiteEngineers, fetchSalaries } from '@/lib/api';
import { SiteEngineersClient } from '@/components/dashboard/SiteEngineersClient';
import { Alert } from 'antd';

async function loadData() {
  try {
    const [siteEngineers, salaries] = await Promise.all([
      fetchSiteEngineers(),
      fetchSalaries(),
    ]);
    return { siteEngineers, salaries };
  } catch (error) {
    console.error('Failed to fetch data for site engineers:', error);
    return null;
  }
}

export default async function SiteEngineersPage() {
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
    <SiteEngineersClient
      siteEngineers={data.siteEngineers}
      salaries={data.salaries}
    />
  );
}
