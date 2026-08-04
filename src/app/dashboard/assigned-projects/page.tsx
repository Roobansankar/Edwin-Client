import { fetchSiteEngineers, fetchProjects } from '@/lib/api';
import { AssignedProjectsClient } from '@/components/dashboard/AssignedProjectsClient';
import { Alert } from 'antd';

async function loadData() {
  try {
    const [siteEngineers, projects] = await Promise.all([
      fetchSiteEngineers(),
      fetchProjects(),
    ]);
    return { siteEngineers, projects };
  } catch (error) {
    console.error('Failed to fetch data for assigned projects:', error);
    return null;
  }
}

export default async function AssignedProjectsPage() {
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
    <AssignedProjectsClient
      siteEngineers={data.siteEngineers}
      projects={data.projects}
    />
  );
}
