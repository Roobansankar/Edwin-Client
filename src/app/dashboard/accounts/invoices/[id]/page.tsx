import { Alert } from 'antd';
import { InvoiceDetailClient } from '@/components/dashboard/InvoiceDetailClient';
import { fetchInvoice, fetchInvoices } from '@/lib/api';
import type { SalesInvoice } from '@/types/erp';

type PageProps = {
  params: Promise<{ id: string }>;
};

type DetailPageData = {
  invoice: SalesInvoice | null;
  projectInvoices: SalesInvoice[];
  error?: string;
};

async function loadPageData(id: string): Promise<DetailPageData> {
  try {
    const invoice = await fetchInvoice(id);
    const projectInvoices = invoice.projectId ? await fetchInvoices(invoice.projectId) : [];
    return { invoice, projectInvoices };
  } catch (error) {
    return {
      invoice: null,
      projectInvoices: [],
      error: error instanceof Error ? error.message : 'Unable to load invoice',
    };
  }
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { invoice, projectInvoices, error } = await loadPageData(id);

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <InvoiceDetailClient invoice={invoice} projectInvoices={projectInvoices} />
    </>
  );
}
