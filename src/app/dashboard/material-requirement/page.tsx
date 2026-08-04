import { Alert } from 'antd';
import { PurchaseEnquiryClient } from '@/components/dashboard/PurchaseEnquiryClient';
import { fetchProjects, fetchPurchaseEnquiries, fetchItemDescriptions, fetchVendors } from '@/lib/api';

async function loadPageData() {
  try {
    const [enquiries, projects, itemDescriptions, vendors] = await Promise.all([
      fetchPurchaseEnquiries(),
      fetchProjects(),
      fetchItemDescriptions(),
      fetchVendors(),
    ]);
    return { enquiries, projects, itemDescriptions, vendors };
  } catch (error) {
    return {
      enquiries: [],
      projects: [],
      itemDescriptions: [],
      vendors: [],
      error: error instanceof Error ? error.message : 'Unable to load material requirements',
    };
  }
}

export default async function MaterialRequirementPage() {
  const { enquiries, projects, itemDescriptions, vendors, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <PurchaseEnquiryClient enquiries={enquiries} projects={projects} itemDescriptions={itemDescriptions} vendors={vendors} />
    </>
  );
}
