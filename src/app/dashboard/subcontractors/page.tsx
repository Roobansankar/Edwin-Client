import { fetchSubcontractors, fetchWorkCategories } from '@/lib/api';
import { SubcontractorsClient } from '@/components/dashboard/SubcontractorsClient';
import { Alert } from 'antd';

async function loadData() {
  try {
    const [subcontractors, workCategories] = await Promise.all([
      fetchSubcontractors(),
      fetchWorkCategories(),
    ]);
    return { subcontractors, workCategories };
  } catch (error) {
    console.error('Failed to fetch subcontractors data:', error);
    return null;
  }
}

export default async function SubcontractorsPage() {
  const data = await loadData();

  if (data === null) {
    return (
      <Alert
        message="Error"
        description="Failed to load subcontractors. Please check your connection to the server."
        type="error"
        showIcon
      />
    );
  }

  return (
    <SubcontractorsClient
      subcontractors={data.subcontractors}
      workCategories={data.workCategories}
    />
  );
}
