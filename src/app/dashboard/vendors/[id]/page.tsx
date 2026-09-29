import { fetchVendors, fetchPurchaseOrders } from '@/lib/api';
import { VendorDetailsClient } from '@/components/dashboard/VendorDetailsClient';
import { Alert } from 'antd';

type Props = {
  params: Promise<{ id: string }>;
};

async function loadData(id: string) {
  try {
    const [vendors, purchaseOrders] = await Promise.all([
      fetchVendors(),
      fetchPurchaseOrders(),
    ]);
    const vendor = vendors.find((v) => v.id === id);
    if (!vendor) return null;
    const vendorPOs = purchaseOrders.filter((po) => po.vendorId === id);
    return { vendor, purchaseOrders: vendorPOs };
  } catch (error) {
    console.error('Failed to fetch vendor details:', error);
    return null;
  }
}

export default async function VendorPage({ params }: Props) {
  const { id } = await params;
  const data = await loadData(id);

  if (data === null) {
    return (
      <Alert
        message="Error"
        description="Failed to load vendor details. Please check your connection to the server."
        type="error"
        showIcon
      />
    );
  }

  return (
    <VendorDetailsClient
      vendor={data.vendor}
      purchaseOrders={data.purchaseOrders}
    />
  );
}
