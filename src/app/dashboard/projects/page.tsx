import { Alert } from 'antd';
import { ProjectsClient } from '@/components/dashboard/ProjectsClient';
import { fetchProjects, fetchProjectCategories, fetchUsers } from '@/lib/api';
import type { Project, ProjectCategory, AppUser } from '@/types/erp';

async function loadProjects(): Promise<{
  projects: Project[];
  projectCategories: ProjectCategory[];
  users: AppUser[];
  error?: string;
}> {
  // projectCategories/users are only needed for the admin-only create/edit form,
  // so failures there (e.g. non-admin viewers) shouldn't block the project list itself.
  const [projectCategories, users] = await Promise.all([
    fetchProjectCategories().catch(() => []),
    fetchUsers().catch(() => []),
  ]);

  try {
    const projects = await fetchProjects();
    return { projects, projectCategories, users };
  } catch (error) {
    return {
      projects: [],
      projectCategories,
      users,
      error: error instanceof Error ? error.message : 'Unable to load projects',
    };
  }
}

export default async function ProjectsPage() {
  const { projects, projectCategories, users, error } = await loadProjects();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <ProjectsClient projects={projects} projectCategories={projectCategories} users={users} />
    </>
  );
}
