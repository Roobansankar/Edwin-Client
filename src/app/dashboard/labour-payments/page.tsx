import { Alert } from 'antd';
import { LabourPaymentsClient } from '@/components/dashboard/LabourPaymentsClient';
import { fetchLabourPayments, fetchUnpaidLabourWeeklySummary } from '@/lib/api';

async function loadData() {
  try {
    const [payments, unpaidSummary] = await Promise.all([
      fetchLabourPayments(),
      fetchUnpaidLabourWeeklySummary(),
    ]);
    return { payments, unpaidSummary };
  } catch (error) {
    return {
      payments: [],
      unpaidSummary: [],
      error: error instanceof Error ? error.message : 'Failed to load labour payments',
    };
  }
}

export default async function LabourPaymentsPage() {
  const { payments, unpaidSummary, error } = await loadData();

  return (
    <>
      {error && <Alert type="warning" showIcon message={error} className="mb-4" />}
      <LabourPaymentsClient payments={payments} unpaidSummary={unpaidSummary} />
    </>
  );
}
