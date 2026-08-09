import { Alert } from 'antd';
import { PurchaseEnquiryClient } from '@/components/dashboard/PurchaseEnquiryClient';
import { fetchProjects, fetchPurchaseEnquiries, fetchItemDescriptions, fetchVendors, fetchPurchaseOrders, fetchPayments } from '@/lib/api';

async function loadPageData() {
  try {
    const [enquiries, projects, itemDescriptions, vendors, purchaseOrders, paymentsRes] = await Promise.all([
      fetchPurchaseEnquiries(),
      fetchProjects(),
      fetchItemDescriptions(),
      fetchVendors(),
      fetchPurchaseOrders(),
      fetchPayments(),
    ]);
    const payments = Array.isArray(paymentsRes) ? paymentsRes : (paymentsRes as any)?.data || [];
    return { enquiries, projects, itemDescriptions, vendors, purchaseOrders, payments };
  } catch (error) {
    return {
      enquiries: [],
      projects: [],
      itemDescriptions: [],
      vendors: [],
      purchaseOrders: [],
      payments: [],
      error: error instanceof Error ? error.message : 'Unable to load material requirements',
    };
  }
}

export default async function MaterialRequirementPage() {
  const { enquiries, projects, itemDescriptions, vendors, purchaseOrders, payments, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <PurchaseEnquiryClient enquiries={enquiries} projects={projects} itemDescriptions={itemDescriptions} vendors={vendors} purchaseOrders={purchaseOrders} payments={payments} />
    </>
  );
}
