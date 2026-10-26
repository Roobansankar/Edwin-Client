import type { LabourPayment, LabourPaymentEntry } from '@/types/erp';

export function labourHistory(payment: LabourPayment): LabourPaymentEntry[] {
  if (payment.paymentHistory?.length) return payment.paymentHistory;
  return payment.status === 'paid' ? [{ id: payment.id, amount: Number(payment.amount), paymentDate: payment.paymentDate, paymentMode: 'Not recorded', referenceNumber: null, notes: payment.notes }] : [];
}
export function labourPaid(payment: LabourPayment): number {
  return labourHistory(payment).reduce((sum, entry) => sum + Number(entry.amount), 0);
}
export function labourPaidRatio(payment: LabourPayment): number {
  return Number(payment.amount) > 0 ? Math.min(1, labourPaid(payment) / Number(payment.amount)) : 0;
}

export function labourHistoryText(payments: LabourPayment[]): string {
  return payments.flatMap(labourHistory).map((entry) => `${entry.paymentDate}: ${entry.amount} | ${entry.paymentMode} | ${entry.referenceNumber || '-'}`).join('; ');
}
