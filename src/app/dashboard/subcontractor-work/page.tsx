import { Alert } from 'antd';
import { SubcontractorWorkClient } from '@/components/dashboard/SubcontractorWorkClient';
import { fetchSubcontractorWorks, fetchProjects, fetchSubcontractors, fetchSubcontractWorkOrders } from '@/lib/api';

async function loadPageData() {
  try {
    const [works, projects, subcontractors, subcontractWorkOrders] = await Promise.all([
      fetchSubcontractorWorks(),
      fetchProjects(),
      fetchSubcontractors(),
      fetchSubcontractWorkOrders(),
    ]);
    return { works, projects, subcontractors, subcontractWorkOrders };
  } catch (error) {
    return {
      works: [],
      projects: [],
      subcontractors: [],
      subcontractWorkOrders: [],
      error: error instanceof Error ? error.message : 'Unable to load subcontractor work data',
    };
  }
}

export default async function SubcontractorWorkPage() {
  const { works, projects, subcontractors, subcontractWorkOrders, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <SubcontractorWorkClient works={works} projects={projects} subcontractors={subcontractors} subcontractWorkOrders={subcontractWorkOrders} />
    </>
  );
}
