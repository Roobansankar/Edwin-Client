import { Alert } from 'antd';
import { SubcontractorPaymentRequestsClient } from '@/components/dashboard/SubcontractorPaymentRequestsClient';
import { fetchPayments, fetchSubcontractorPaymentRequests } from '@/lib/api';
import type { Payment, SubcontractorPaymentRequest } from '@/types/erp';

async function loadData(): Promise<{ requests: SubcontractorPaymentRequest[]; payments: Payment[]; error?: string }> {
  try {
    const [requests, paymentsRes] = await Promise.all([
      fetchSubcontractorPaymentRequests(),
      fetchPayments('limit=5000'),
    ]);
    return {
      requests,
      payments: Array.isArray(paymentsRes) ? paymentsRes : paymentsRes?.data || [],
    };
  } catch (error) {
    return {
      requests: [],
      payments: [],
      error: error instanceof Error ? error.message : 'Unable to load subcontractor payment requests',
    };
  }
}

export default async function SubcontractorPaymentRequestsPage() {
  const { requests, payments, error } = await loadData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <SubcontractorPaymentRequestsClient requests={requests} payments={payments} />
    </>
  );
}
