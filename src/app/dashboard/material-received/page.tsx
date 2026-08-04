import { Alert } from 'antd';
import { MaterialReceivedClient } from '@/components/dashboard/MaterialReceivedClient';
import { fetchProjects, fetchItemDescriptions, fetchMaterialReceived, fetchPurchaseOrders } from '@/lib/api';

async function loadPageData() {
  try {
    const [records, projects, itemDescriptions, purchaseOrders] = await Promise.all([
      fetchMaterialReceived(),
      fetchProjects(),
      fetchItemDescriptions(),
      fetchPurchaseOrders(),
    ]);
    return { records, projects, itemDescriptions, purchaseOrders };
  } catch (error) {
    return {
      records: [],
      projects: [],
      itemDescriptions: [],
      purchaseOrders: [],
      error: error instanceof Error ? error.message : 'Unable to load material received records',
    };
  }
}

export default async function MaterialReceivedPage() {
  const { records, projects, itemDescriptions, purchaseOrders, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <MaterialReceivedClient records={records} projects={projects} itemDescriptions={itemDescriptions} purchaseOrders={purchaseOrders} />
    </>
  );
}