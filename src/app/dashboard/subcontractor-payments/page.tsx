import { Alert } from 'antd';
import { SubcontractorPaymentRequestClient } from '@/components/dashboard/SubcontractorPaymentRequestClient';
import { fetchProjects, fetchSubcontractWorkOrders, fetchSubcontractorPaymentRequests } from '@/lib/api';

async function loadPageData() {
  try {
    const [projects, workOrders, requests] = await Promise.all([
      fetchProjects(),
      fetchSubcontractWorkOrders(),
      fetchSubcontractorPaymentRequests(),
    ]);
    return { projects, workOrders, requests };
  } catch (error) {
    return {
      projects: [],
      workOrders: [],
      requests: [],
      error: error instanceof Error ? error.message : 'Unable to load subcontractor payment requests',
    };
  }
}

export default async function SubcontractorPaymentsPage() {
  const { projects, workOrders, requests, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <SubcontractorPaymentRequestClient projects={projects} workOrders={workOrders} requests={requests} />
    </>
  );
}
