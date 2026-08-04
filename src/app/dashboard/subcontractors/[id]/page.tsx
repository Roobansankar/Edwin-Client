import { fetchSubcontractor, fetchSubcontractWorkOrders } from '@/lib/api';
import { SubcontractorDetailsClient } from '@/components/dashboard/SubcontractorDetailsClient';
import { Alert } from 'antd';

type Props = {
  params: Promise<{ id: string }>;
};

async function loadData(id: string) {
  try {
    const [subcontractor, workOrders] = await Promise.all([
      fetchSubcontractor(id),
      fetchSubcontractWorkOrders(id),
    ]);
    return { subcontractor, workOrders };
  } catch (error) {
    console.error('Failed to fetch subcontractor details:', error);
    return null;
  }
}

export default async function SubcontractorPage({ params }: Props) {
  const { id } = await params;
  const data = await loadData(id);

  if (data === null) {
    return (
      <Alert
        message="Error"
        description="Failed to load subcontractor details. Please check your connection to the server."
        type="error"
        showIcon
      />
    );
  }

  return (
    <SubcontractorDetailsClient
      subcontractor={data.subcontractor}
      workOrders={data.workOrders}
    />
  );
}
