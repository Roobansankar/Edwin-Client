import { Alert } from 'antd';
import { WorkOrdersClient } from '@/components/dashboard/WorkOrdersClient';
import { fetchProjects, fetchVendors, fetchWorkOrders } from '@/lib/api';
import type { Project, Vendor, WorkOrder } from '@/types/erp';

type WorkOrdersPageData = {
  workOrders: WorkOrder[];
  projects: Project[];
  vendors: Vendor[];
  error?: string;
};

async function loadPageData(): Promise<WorkOrdersPageData> {
  try {
    const [workOrders, projects, vendors] = await Promise.all([
      fetchWorkOrders('limit=100'),
      fetchProjects(),
      fetchVendors(),
    ]);
    return { workOrders: workOrders.data, projects, vendors };
  } catch (error) {
    return {
      workOrders: [],
      projects: [],
      vendors: [],
      error: error instanceof Error ? error.message : 'Unable to load work orders',
    };
  }
}

export default async function WorkOrdersPage() {
  const { workOrders, projects, vendors, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <WorkOrdersClient workOrders={workOrders} projects={projects} vendors={vendors} />
    </>
  );
}
