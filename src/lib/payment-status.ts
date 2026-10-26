export function paymentStatus(paid: number, balance: number | null): string {
  if (balance === null) return paid > 0 ? 'Paid (Balance Unknown)' : 'Unpaid';
  if (paid <= 0) return 'Unpaid';
  return balance > 0.005 ? 'Partially Paid' : 'Fully Paid';
}
