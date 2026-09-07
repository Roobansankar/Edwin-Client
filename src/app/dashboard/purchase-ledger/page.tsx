import { Alert } from 'antd';
import { PurchaseLedgerClient } from '@/components/dashboard/PurchaseLedgerClient';
import { fetchVendors, fetchPurchaseOrders, fetchSubcontractors, fetchSubcontractWorkOrders, fetchPayments } from '@/lib/api';

async function loadData() {
  try {
    const [vendors, purchaseOrders, subcontractors, subcontractWorkOrders, payments] = await Promise.all([
      fetchVendors(),
      fetchPurchaseOrders(),
      fetchSubcontractors(),
      fetchSubcontractWorkOrders(),
      fetchPayments('limit=5000'),
    ]);
    return {
      vendors,
      purchaseOrders,
      subcontractors,
      subcontractWorkOrders,
      payments: Array.isArray(payments) ? payments : payments?.data || [],
    };
  } catch (error) {
    return {
      vendors: [],
      purchaseOrders: [],
      subcontractors: [],
      subcontractWorkOrders: [],
      payments: [],
      error: error instanceof Error ? error.message : 'Failed to load ledger data',
    };
  }
}

export default async function PurchaseLedgerPage() {
  const { vendors, purchaseOrders, subcontractors, subcontractWorkOrders, payments, error } = await loadData();

  return (
    <>
      {error && <Alert type="warning" showIcon message={error} className="mb-4" />}
      <PurchaseLedgerClient
        vendors={vendors}
        purchaseOrders={purchaseOrders}
        subcontractors={subcontractors}
        subcontractWorkOrders={subcontractWorkOrders}
        payments={payments}
      />
    </>
  );
}
