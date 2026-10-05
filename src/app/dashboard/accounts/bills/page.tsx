import { Alert } from 'antd';
import { BillsClient } from '@/components/dashboard/BillsClient';
import { fetchBills, fetchVendors, fetchProjects, fetchPurchaseOrders, fetchVendorQuotations } from '@/lib/api';
import { getUserFromToken } from '@/lib/auth';

async function loadPageData() {
  try {
    const [bills, vendors, projects, purchaseOrders, vendorQuotations] = await Promise.all([
      fetchBills(),
      fetchVendors(),
      fetchProjects(),
      fetchPurchaseOrders(),
      fetchVendorQuotations(),
    ]);
    return { bills, vendors, projects, purchaseOrders, vendorQuotations };
  } catch (error) {
    return {
      bills: [],
      vendors: [],
      projects: [],
      purchaseOrders: [],
      vendorQuotations: [],
      error: error instanceof Error ? error.message : 'Unable to load bills',
    };
  }
}

export default async function BillsPage() {
  const { bills, vendors, projects, purchaseOrders, vendorQuotations, error } = await loadPageData();
  const user = await getUserFromToken();
  const userRole = user?.role || '';

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <BillsClient
        bills={bills}
        vendors={vendors}
        projects={projects}
        purchaseOrders={purchaseOrders}
        vendorQuotations={vendorQuotations}
        userRole={userRole}
      />
    </>
  );
}
