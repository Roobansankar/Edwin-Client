import { fetchProjects, fetchExpenses, fetchDailyLabourReports, fetchPayments } from '@/lib/api';
import { getUserFromToken } from '@/lib/auth';
import { WeeklyReportClient } from '@/components/dashboard/WeeklyReportClient';
import { Alert } from 'antd';

const WEEKLY_REPORT_ROLES = ['admin', 'accounts_manager'];

async function loadData() {
  try {
    const user = await getUserFromToken();
    if (!user || !WEEKLY_REPORT_ROLES.includes(user.role)) {
      return { forbidden: true as const };
    }

    const [projects, expenses, dailyLabourReports, payments] = await Promise.all([
      fetchProjects(),
      fetchExpenses('limit=5000'),
      fetchDailyLabourReports(),
      fetchPayments('limit=5000'),
    ]);

    return {
      forbidden: false as const,
      projects,
      expenses: Array.isArray(expenses) ? expenses : expenses?.data || [],
      dailyLabourReports: Array.isArray(dailyLabourReports) ? dailyLabourReports : [],
      payments: Array.isArray(payments) ? payments : payments?.data || [],
    };
  } catch (error) {
    console.error('Failed to fetch data for weekly report:', error);
    return null;
  }
}

export default async function WeeklyReportPage() {
  const data = await loadData();

  if (data === null) {
    return (
      <Alert
        title="Error"
        description="Failed to load data. Please check your connection to the server."
        type="error"
        showIcon
      />
    );
  }

  if (data.forbidden) {
    return <Alert type="warning" showIcon title="Forbidden resource" className="mb-4" />;
  }

  return (
    <WeeklyReportClient
      projects={data.projects}
      expenses={data.expenses}
      dailyLabourReports={data.dailyLabourReports}
      payments={data.payments}
    />
  );
}
