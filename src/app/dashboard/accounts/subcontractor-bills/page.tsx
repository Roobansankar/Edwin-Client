import { Alert } from 'antd';
import { SubcontractorBillsClient } from '@/components/dashboard/SubcontractorBillsClient';
import { fetchSubcontractorBills, fetchProjects, fetchSubcontractors, fetchSubcontractWorkOrders } from '@/lib/api';
import { getUserFromToken } from '@/lib/auth';

async function loadPageData() {
  try {
    const [bills, subcontractors, projects, workOrders] = await Promise.all([
      fetchSubcontractorBills(),
      fetchSubcontractors(),
      fetchProjects(),
      fetchSubcontractWorkOrders(),
    ]);
    return { bills, subcontractors, projects, workOrders };
  } catch (error) {
    return {
      bills: [],
      subcontractors: [],
      projects: [],
      workOrders: [],
      error: error instanceof Error ? error.message : 'Unable to load subcontractor bills',
    };
  }
}

export default async function SubcontractorBillsPage() {
  const { bills, subcontractors, projects, workOrders, error } = await loadPageData();
  const user = await getUserFromToken();
  const userRole = user?.role || '';

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <SubcontractorBillsClient
        bills={bills}
        subcontractors={subcontractors}
        projects={projects}
        workOrders={workOrders}
        userRole={userRole}
      />
    </>
  );
}
