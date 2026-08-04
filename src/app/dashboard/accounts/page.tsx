import { Alert } from 'antd';
import { AccountsClient } from '@/components/dashboard/AccountsClient';
import { fetchPayables, fetchReceivables } from '@/lib/api';

async function loadPageData() {
  try {
    const [payables, receivables] = await Promise.all([
      fetchPayables(),
      fetchReceivables(),
    ]);
    return { payables, receivables };
  } catch (error) {
    return {
      payables: [],
      receivables: [],
      error: error instanceof Error ? error.message : 'Unable to load accounts data',
    };
  }
}

export default async function AccountsPage() {
  const { payables, receivables, error } = await loadPageData();

  return (
    <>
      {error && <Alert type="warning" showIcon title={error} className="mb-4" />}
      <AccountsClient payables={payables} receivables={receivables} />
    </>
  );
}
