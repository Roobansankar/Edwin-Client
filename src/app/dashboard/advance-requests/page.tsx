import { Alert } from 'antd';
import { AdvanceRequestsClient } from '@/components/dashboard/AdvanceRequestsClient';
import { fetchAdvanceRequests, fetchBills, fetchPayments } from '@/lib/api';
import type { AdvanceRequest, Payment, PurchaseBill } from '@/types/erp';

async function loadData(): Promise<{ requests: AdvanceRequest[]; bills: PurchaseBill[]; payments: Payment[]; error?: string }> {
  try {
    const [requests, bills, paymentsRes] = await Promise.all([
      fetchAdvanceRequests(),
      fetchBills(),
      fetchPayments('limit=5000'),
    ]);
    return {
      requests,
      bills: Array.isArray(bills) ? bills : [],
      payments: Array.isArray(paymentsRes) ? paymentsRes : paymentsRes?.data || [],
    };
  } catch (error) {
    return {
      requests: [],
      bills: [],
      payments: [],
      error: error instanceof Error ? error.message : 'Unable to load advance requests',
    };
  }
}

export default async function AdvanceRequestsPage() {
  const { requests, bills, payments, error } = await loadData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <AdvanceRequestsClient requests={requests} bills={bills} payments={payments} />
    </>
  );
}
