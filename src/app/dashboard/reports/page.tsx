import { fetchOfficeReports, fetchOfficeReportCategories, fetchProjects } from '@/lib/api';
import { OfficeReportsClient } from '@/components/dashboard/OfficeReportsClient';
import { Alert } from 'antd';

async function loadData() {
  try {
    const [reports, categories, projects] = await Promise.all([
      fetchOfficeReports(),
      fetchOfficeReportCategories(),
      fetchProjects(),
    ]);
    return { reports, categories, projects };
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
    <OfficeReportsClient
      reports={data.reports}
      categories={data.categories}
      projects={data.projects}
    />
  );
}
