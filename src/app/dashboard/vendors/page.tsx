import { fetchVendors } from '@/lib/api';
import { VendorsClient } from '@/components/dashboard/VendorsClient';
import { Alert } from 'antd';

async function loadVendors() {
  try {
    return await fetchVendors();
  } catch (error) {
    console.error('Failed to fetch vendors:', error);
    return null;
  }
}

export default async function VendorsPage() {
  const vendors = await loadVendors();

  if (vendors === null) {
    return (
      <Alert
        message="Error"
        description="Failed to load vendors. Please check your connection to the server."
        type="error"
        showIcon
      />
    );
  }

  return <VendorsClient vendors={vendors} />;
}
