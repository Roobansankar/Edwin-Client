import { fetchProjects, fetchBills, fetchExpenses, fetchDailyLabourReports, fetchPayments, fetchAdvanceRequests } from '@/lib/api';
import { getUserFromToken } from '@/lib/auth';
import { ReportsClient } from '@/components/dashboard/ReportsClient';
import { Alert } from 'antd';

const REPORT_DATA_ROLES = ['admin', 'accounts_manager', 'purchase_team'];

async function loadData() {
  try {
    const user = await getUserFromToken();
    const canLoadReportData = user ? REPORT_DATA_ROLES.includes(user.role) : false;

    const [projects, bills, expenses, dailyLabourReports, payments, advanceRequests] = await Promise.all([
      fetchProjects(),
      canLoadReportData ? fetchBills() : Promise.resolve([]),
      canLoadReportData ? fetchExpenses('limit=5000') : Promise.resolve({ data: [], total: 0, page: 1, limit: 5000 }),
      canLoadReportData ? fetchDailyLabourReports() : Promise.resolve([]),
      canLoadReportData ? fetchPayments('limit=5000') : Promise.resolve({ data: [], total: 0, page: 1, limit: 5000 }),
      canLoadReportData ? fetchAdvanceRequests() : Promise.resolve([]),
    ]);

    return {
      projects,
      bills: Array.isArray(bills) ? bills : [],
      expenses: Array.isArray(expenses) ? expenses : expenses?.data || [],
      dailyLabourReports: Array.isArray(dailyLabourReports) ? dailyLabourReports : [],
      payments: Array.isArray(payments) ? payments : payments?.data || [],
      advanceRequests: Array.isArray(advanceRequests) ? advanceRequests : [],
      role: user?.role || 'viewer',
    };
  } catch (error) {
    console.error('Failed to fetch data for reports:', error);
    return null;
  }
}

export default async function ReportsPage() {
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
    <ReportsClient
      projects={data.projects}
      bills={data.bills}
      expenses={data.expenses}
      dailyLabourReports={data.dailyLabourReports}
      payments={data.payments}
      advanceRequests={data.advanceRequests}
      role={data.role}
    />
  );
}
