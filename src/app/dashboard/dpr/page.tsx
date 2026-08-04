import { Alert } from 'antd';
import { DprClient } from '@/components/dashboard/DprClient';
import { fetchProjects, fetchDpr } from '@/lib/api';
import type { Project, DprReport } from '@/types/erp';

async function loadData() {
  try {
    const [projects, dprs] = await Promise.all([
      fetchProjects(),
      fetchDpr('page=1&limit=10') as Promise<{ data: DprReport[]; total: number }>,
    ]);
    return { projects, dprs, error: null };
  } catch (error) {
    return {
      projects: [],
      dprs: { data: [], total: 0 },
      error: error instanceof Error ? error.message : 'Unable to load DPR data',
    };
  }
}

export default async function DprPage() {
  const { projects, dprs, error } = await loadData();

  return (
    <>
      {error && <Alert type="warning" showIcon message={error} className="mb-4" />}
      <DprClient projects={projects} initialDprs={dprs} />
    </>
  );
}
