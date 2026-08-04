import { Alert } from 'antd';
import { PurchaseOrdersClient } from '@/components/dashboard/PurchaseOrdersClient';
import { fetchProjects, fetchPurchaseOrders, fetchVendors, fetchItemDescriptions, fetchVendorQuotations } from '@/lib/api';

async function loadPageData() {
  try {
    const [purchaseOrders, projects, vendors, itemDescriptions, vendorQuotations] = await Promise.all([
      fetchPurchaseOrders(),
      fetchProjects(),
      fetchVendors(),
      fetchItemDescriptions(),
      fetchVendorQuotations(),
    ]);

    return { 
      purchaseOrders, 
      projects, 
      vendors,
      itemDescriptions,
      vendorQuotations,
    };
  } catch (error) {
    return {
      purchaseOrders: [],
      projects: [],
      vendors: [],
      itemDescriptions: [],
      vendorQuotations: [],
      error: error instanceof Error ? error.message : 'Unable to load purchase orders',
    };
  }
}

export default async function PurchaseOrdersPage() {
  const { purchaseOrders, projects, vendors, itemDescriptions, vendorQuotations, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <PurchaseOrdersClient 
        purchaseOrders={purchaseOrders} 
        projects={projects} 
        vendors={vendors}
        itemDescriptions={itemDescriptions}
        vendorQuotations={vendorQuotations}
      />
    </>
  );
}
