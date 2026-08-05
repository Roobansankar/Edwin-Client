import { Alert } from 'antd';
import { AdvanceRequestClient } from '@/components/dashboard/AdvanceRequestClient';
import { fetchProjects, fetchVendorQuotations, fetchAdvanceRequests } from '@/lib/api';

async function loadPageData() {
  try {
    const [projects, vendorQuotations, advanceRequests] = await Promise.all([
      fetchProjects(),
      fetchVendorQuotations(),
      fetchAdvanceRequests(),
    ]);
    return { projects, vendorQuotations, advanceRequests };
  } catch (error) {
    return {
      projects: [],
      vendorQuotations: [],
      advanceRequests: [],
      error: error instanceof Error ? error.message : 'Unable to load advance requests',
    };
  }
}

export default async function AdvancePage() {
  const { projects, vendorQuotations, advanceRequests, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <AdvanceRequestClient projects={projects} vendorQuotations={vendorQuotations} advanceRequests={advanceRequests} />
    </>
  );
}
