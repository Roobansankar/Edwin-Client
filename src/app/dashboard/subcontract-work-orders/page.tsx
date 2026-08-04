import {
  fetchProjects,
  fetchSubcontractors,
  fetchWorkCategories,
  fetchSubcontractWorkOrders,
} from '@/lib/api';
import { SubcontractWorkOrdersClient } from '@/components/dashboard/SubcontractWorkOrdersClient';
import { Alert } from 'antd';

async function loadData() {
  try {
    const [workOrders, projects, subcontractors, workCategories] = await Promise.all([
      fetchSubcontractWorkOrders(),
      fetchProjects(),
      fetchSubcontractors(),
      fetchWorkCategories(),
    ]);
    return { workOrders, projects, subcontractors, workCategories };
  } catch (error) {
    console.error('Failed to fetch data for subcontract work orders:', error);
    return null;
  }
}

export default async function SubcontractWorkOrdersPage() {
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
    <SubcontractWorkOrdersClient
      workOrders={data.workOrders}
      projects={data.projects}
      subcontractors={data.subcontractors}
      workCategories={data.workCategories}
    />
  );
}
