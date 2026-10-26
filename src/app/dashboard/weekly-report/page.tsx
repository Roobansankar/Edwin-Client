import { fetchLabourPayments, fetchExpensePayments, fetchProjects, fetchBills, fetchExpenses, fetchDailyLabourReports, fetchSubcontractorBills, fetchVendorQuotations } from '@/lib/api';
import { getUserFromToken } from '@/lib/auth';
import { ReportsClient } from '@/components/dashboard/ReportsClient';
import { Alert } from 'antd';

const REPORT_DATA_ROLES = ['admin', 'accounts_manager', 'purchase_team'];

async function loadData() {
  try {
    const user = await getUserFromToken();
    const canLoadReportData = user ? REPORT_DATA_ROLES.includes(user.role) : false;
    const canLoadPayments = !!user && ['admin', 'accounts_manager'].includes(user.role);

    const [projects, bills, expenses, dailyLabourReports, subcontractorBills, vendorQuotations, labourPayments, expensePayments] = await Promise.all([
      fetchProjects(),
      canLoadReportData ? fetchBills() : Promise.resolve([]),
      canLoadReportData ? fetchExpenses('limit=5000') : Promise.resolve({ data: [], total: 0, page: 1, limit: 5000 }),
      canLoadReportData ? fetchDailyLabourReports() : Promise.resolve([]),
      canLoadReportData ? fetchSubcontractorBills() : Promise.resolve([]),
      canLoadReportData ? fetchVendorQuotations() : Promise.resolve([]),
      canLoadPayments ? fetchLabourPayments() : Promise.resolve([]),
      canLoadPayments ? fetchExpensePayments() : Promise.resolve([]),
    ]);

    return {
      labourPayments, expensePayments,
      projects,
      bills: Array.isArray(bills) ? bills : [],
      expenses: Array.isArray(expenses) ? expenses : expenses?.data || [],
      dailyLabourReports: Array.isArray(dailyLabourReports) ? dailyLabourReports : [],
      subcontractorBills: Array.isArray(subcontractorBills) ? subcontractorBills : [],
      vendorQuotations: Array.isArray(vendorQuotations) ? vendorQuotations : [],
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
      labourPayments={data.labourPayments}
      expensePayments={data.expensePayments}
      projects={data.projects}
      bills={data.bills}
      expenses={data.expenses}
      dailyLabourReports={data.dailyLabourReports}
      subcontractorBills={data.subcontractorBills}
      vendorQuotations={data.vendorQuotations}
      role={data.role}
      hideProjectReport
    />
  );
}
