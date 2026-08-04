import { fetchSalaries } from '@/lib/api';
import { SalaryClient } from '@/components/dashboard/SalaryClient';
import { Alert } from 'antd';

async function loadSalaries() {
  try {
    return await fetchSalaries();
  } catch (error) {
    return null;
  }
}

export default async function SalaryPage() {
  const salaries = await loadSalaries();

  if (salaries === null) {
    return (
      <Alert
        message="Failed to load salary data"
        type="error"
        showIcon
      />
    );
  }

  return <SalaryClient salaries={salaries} />;
}
