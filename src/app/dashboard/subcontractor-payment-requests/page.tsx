import { redirect } from 'next/navigation';

// Subcontractor payment request approvals live on the Approvals page.
export default function SubcontractorPaymentRequestsPage() {
  redirect('/dashboard/approvals?tab=subcontractor');
}
