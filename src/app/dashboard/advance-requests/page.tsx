import { redirect } from 'next/navigation';

// Vendor payment request approvals live on the Approvals page.
export default function AdvanceRequestsPage() {
  redirect('/dashboard/approvals?tab=vendor');
}
