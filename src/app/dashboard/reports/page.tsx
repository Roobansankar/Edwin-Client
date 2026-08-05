import { fetchOfficeReports, fetchOfficeReportCategories, fetchProjects, fetchBills, fetchTimesheets, fetchExpenses } from '@/lib/api';
import { getUserFromToken } from '@/lib/auth';
import { ReportsClient } from '@/components/dashboard/ReportsClient';
import { Alert } from 'antd';

const REPORT_DATA_ROLES = ['admin', 'accounts_manager', 'purchase_team'];

async function loadData() {
  try {
    const user = await getUserFromToken();
    const canLoadReportData = user ? REPORT_DATA_ROLES.includes(user.role) : false;

    const [reports, categories, projects, bills, timesheets, expenses] = await Promise.all([
      fetchOfficeReports(),
      fetchOfficeReportCategories(),
      fetchProjects(),
      canLoadReportData ? fetchBills() : Promise.resolve([]),
      canLoadReportData ? fetchTimesheets('limit=5000') : Promise.resolve({ data: [], total: 0, page: 1, limit: 5000 }),
      canLoadReportData ? fetchExpenses('limit=5000') : Promise.resolve({ data: [], total: 0, page: 1, limit: 5000 }),
    ]);

    return {
      reports,
      categories,
      projects,
      bills: Array.isArray(bills) ? bills : [],
      timesheets: Array.isArray(timesheets) ? timesheets : timesheets?.data || [],
      expenses: Array.isArray(expenses) ? expenses : expenses?.data || [],
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
      reports={data.reports}
      categories={data.categories}
      projects={data.projects}
      bills={data.bills}
      timesheets={data.timesheets}
      expenses={data.expenses}
      role={data.role}
    />
  );
}
