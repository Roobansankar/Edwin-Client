import { fetchVendors, fetchVendorCategories } from '@/lib/api';
import { VendorsClient } from '@/components/dashboard/VendorsClient';
import { Alert } from 'antd';

async function loadVendors() {
  try {
    const [vendors, categories] = await Promise.all([
      fetchVendors(),
      fetchVendorCategories(),
    ]);
    return { vendors, categories };
  } catch (error) {
    console.error('Failed to fetch vendors:', error);
    return null;
  }
}

export default async function VendorsPage() {
  const data = await loadVendors();

  if (data === null) {
    return (
      <Alert
        message="Error"
        description="Failed to load vendors. Please check your connection to the server."
        type="error"
        showIcon
      />
    );
  }

  return <VendorsClient vendors={data.vendors} categories={data.categories} />;
}
