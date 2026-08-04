import { Alert } from 'antd';
import { DrawingsClient } from '@/components/dashboard/DrawingsClient';
import { fetchDrawings, fetchProjects } from '@/lib/api';
import type { Drawing, Project } from '@/types/erp';

async function loadData(): Promise<{
  drawings: Drawing[];
  projects: Project[];
  error?: string;
}> {
  try {
    const [drawings, projects] = await Promise.all([
      fetchDrawings(),
      fetchProjects(),
    ]);
    return { drawings, projects };
  } catch (error) {
    return {
      drawings: [],
      projects: [],
      error: error instanceof Error ? error.message : 'Unable to load drawings data',
    };
  }
}

export default async function DrawingsPage() {
  const { drawings, projects, error } = await loadData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <DrawingsClient initialDrawings={drawings} projects={projects} />
    </>
  );
}
