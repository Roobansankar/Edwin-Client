import { redirect } from 'next/navigation';

// Vendor payment requests are handled in the Payments page's Vendor Payment
// tab; older notification links still point here.
export default function AdvanceRequestsPage() {
  redirect('/dashboard/payments?tab=vendor');
}
