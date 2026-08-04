import { fetchOfficeStaff, fetchSalaries } from '@/lib/api';
import { OfficeStaffClient } from '@/components/dashboard/OfficeStaffClient';
import { Alert } from 'antd';

async function loadData() {
  try {
    const [officeStaff, salaries] = await Promise.all([
      fetchOfficeStaff(),
      fetchSalaries(),
    ]);
    return { officeStaff, salaries };
  } catch (error) {
    console.error('Failed to fetch data for office staff:', error);
    return null;
  }
}

export default async function OfficeStaffPage() {
  const data = await loadData();

  if (data === null) {
    return (
      <Alert
        message="Error"
        description="Failed to load data. Please check your connection to the server."
        type="error"
        showIcon
      />
    );
  }

  return (
    <OfficeStaffClient
      officeStaff={data.officeStaff}
      salaries={data.salaries}
    />
  );
}
