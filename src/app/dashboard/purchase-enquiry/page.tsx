import { fetchVendors, fetchProjects } from '@/lib/api';
import { VendorQuotationClient } from '@/components/dashboard/VendorQuotationClient';

export default async function PurchaseEnquiryPage() {
  const [vendors, projects] = await Promise.all([
    fetchVendors(),
    fetchProjects(),
  ]);
  return <VendorQuotationClient vendors={vendors} projects={projects} />;
}
