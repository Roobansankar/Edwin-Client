import { Alert } from 'antd';
import { SubcontractorPaymentRequestClient } from '@/components/dashboard/SubcontractorPaymentRequestClient';
import { fetchProjects, fetchSubcontractWorkOrders, fetchSubcontractorPaymentRequests, fetchSubcontractorBills, fetchPayments } from '@/lib/api';

async function loadPageData() {
  try {
    const [projects, workOrders, requests, subcontractorBills, paymentsRes] = await Promise.all([
      fetchProjects(),
      fetchSubcontractWorkOrders(),
      fetchSubcontractorPaymentRequests(),
      fetchSubcontractorBills(),
      fetchPayments('limit=5000'),
    ]);
    return { projects, workOrders, requests, subcontractorBills, payments: paymentsRes.data };
  } catch (error) {
    return {
      projects: [],
      workOrders: [],
      requests: [],
      subcontractorBills: [],
      payments: [],
      error: error instanceof Error ? error.message : 'Unable to load subcontractor payment requests',
    };
  }
}

export default async function SubcontractorPaymentsPage() {
  const { projects, workOrders, requests, subcontractorBills, payments, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <SubcontractorPaymentRequestClient
        projects={projects}
        workOrders={workOrders}
        requests={requests}
        subcontractorBills={subcontractorBills}
        payments={payments}
      />
    </>
  );
}
