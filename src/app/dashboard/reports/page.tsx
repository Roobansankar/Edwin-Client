import { redirect } from 'next/navigation';

// The Reports page moved to /dashboard/weekly-report; keep old links working.
export default function ReportsRedirectPage() {
  redirect('/dashboard/weekly-report');
}
