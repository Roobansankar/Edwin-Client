import { Alert } from 'antd';
import { InvoicesClient } from '@/components/dashboard/InvoicesClient';
import { fetchInvoices, fetchProjects } from '@/lib/api';
import type { Project, SalesInvoice } from '@/types/erp';

type InvoicesPageData = {
  invoices: SalesInvoice[];
  projects: Project[];
  error?: string;
};

async function loadPageData(): Promise<InvoicesPageData> {
  try {
    const [invoices, projects] = await Promise.all([
      fetchInvoices(),
      fetchProjects(),
    ]);
    return { invoices, projects };
  } catch (error) {
    return {
      invoices: [],
      projects: [],
      error: error instanceof Error ? error.message : 'Unable to load invoices',
    };
  }
}

export default async function InvoicesPage() {
  const { invoices, projects, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <InvoicesClient invoices={invoices} projects={projects} />
    </>
  );
}
