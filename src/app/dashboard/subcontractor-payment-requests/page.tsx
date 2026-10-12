import { redirect } from 'next/navigation';

// Subcontractor payment requests are handled in the Payments page's
// Subcontractor Payment tab; older notification links still point here.
export default function SubcontractorPaymentRequestsPage() {
  redirect('/dashboard/payments?tab=subcontractor');
}
