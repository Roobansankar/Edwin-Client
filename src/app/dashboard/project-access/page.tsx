import { fetchProjects, fetchProjectAccessStaff } from '@/lib/api';
import { ProjectAccessClient } from '@/components/dashboard/ProjectAccessClient';
import { Alert } from 'antd';

async function loadData() {
  try {
    const [projects, staff] = await Promise.all([
      fetchProjects(),
      fetchProjectAccessStaff(),
    ]);
    return { projects, staff };
  } catch (error) {
    console.error('Failed to fetch data for project access:', error);
    return null;
  }
}

export default async function ProjectAccessPage() {
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

  return <ProjectAccessClient projects={data.projects} initialStaff={data.staff} />;
}
