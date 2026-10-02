import { Alert } from 'antd';
import { fetchSubcontractors, fetchProjects, fetchWorkCategories } from '@/lib/api';
import { SubcontractorEnquiryClient } from '@/components/dashboard/SubcontractorEnquiryClient';

async function loadData() {
  try {
    const [subcontractors, projects, workCategories] = await Promise.all([
      fetchSubcontractors(),
      fetchProjects(),
      fetchWorkCategories(),
    ]);
    return { subcontractors, projects, workCategories };
  } catch (error) {
    console.error('Failed to fetch subcontractor enquiry data:', error);
    return null;
  }
}

export default async function SubcontractorEnquiryPage() {
  const data = await loadData();

  if (data === null) {
    return (
      <Alert
        message="Error"
        description="Failed to load subcontractors and projects. Please check your connection to the server."
        type="error"
        showIcon
      />
    );
  }

  return <SubcontractorEnquiryClient subcontractors={data.subcontractors} projects={data.projects} workCategories={data.workCategories} />;
}
