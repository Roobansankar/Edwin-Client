import { Alert } from 'antd';
import { fetchVendors, fetchProjects } from '@/lib/api';
import { VendorQuotationClient } from '@/components/dashboard/VendorQuotationClient';

async function loadData() {
  try {
    const [vendors, projects] = await Promise.all([
      fetchVendors(),
      fetchProjects(),
    ]);
    return { vendors, projects };
  } catch (error) {
    console.error('Failed to fetch purchase enquiry data:', error);
    return null;
  }
}

export default async function PurchaseEnquiryPage() {
  const data = await loadData();

  if (data === null) {
    return (
      <Alert
        message="Error"
        description="Failed to load vendors and projects. Please check your connection to the server."
        type="error"
        showIcon
      />
    );
  }

  return <VendorQuotationClient vendors={data.vendors} projects={data.projects} />;
}
