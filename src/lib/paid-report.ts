import type { DailyLabourReport, Expense, ExpensePayment, LabourPayment, Payment, PurchaseBill, SubcontractorBill } from '@/types/erp';
import { weekStartOf } from '@/components/dashboard/ui';

export type PaidReportSources = {
  payments: Payment[]; labourPayments: LabourPayment[]; expensePayments: ExpensePayment[];
  bills: PurchaseBill[]; subcontractorBills: SubcontractorBill[]; dailyLabourReports: DailyLabourReport[]; expenses: Expense[];
};
export type PaidReportRow = {
  key: string; category: string; week: string; project: string; item: string; type: string;
  name: string; description: string; gst: string; billNo: string; withoutGst: number;
  gstAmount: number; total: number; paid: number; balance: number | null;
};

export function buildPaidReport(sources: PaidReportSources): PaidReportRow[] {
  const grouped = new Map<string, PaidReportRow>();
  const add = (source: string, date: string, row: Omit<PaidReportRow, 'key' | 'week'>) => {
    const week = weekStartOf(date)?.format('YYYY-MM-DD') || date.split('T')[0];
    const key = JSON.stringify([source, week, row.project, row.name, row.type, row.description]);
    const existing = grouped.get(key);
    if (existing) {
      existing.paid += row.paid;
      existing.withoutGst += row.withoutGst;
      existing.gstAmount += row.gstAmount;
      existing.total += row.total;
    } else grouped.set(key, { ...row, key, week });
  };
  const bills = new Map(sources.bills.map((bill) => [bill.id, bill]));
  const subBills = new Map(sources.subcontractorBills.map((bill) => [bill.id, bill]));
  const paymentSource = (p: Payment) => p.subcontractorBillId ? `subBill:${p.subcontractorBillId}`
    : p.purchaseBillId ? `bill:${p.purchaseBillId}` : p.purchaseOrderId ? `po:${p.purchaseOrderId}`
      : p.subcontractWorkOrderId ? `wo:${p.subcontractWorkOrderId}`
        : p.advanceRequestId ? `advance:${p.advanceRequestId}`
          : p.subcontractorPaymentRequestId ? `subRequest:${p.subcontractorPaymentRequestId}` : `payment:${p.id}`;
  const paidBySource = new Map<string, number>();
  for (const p of sources.payments) paidBySource.set(paymentSource(p), (paidBySource.get(paymentSource(p)) || 0) + Number(p.amount));
  for (const p of sources.payments) {
    if (p.salesInvoiceId || p.salesInvoice || p.expenseId || p.expense || Number(p.amount) <= 0) continue;
    const bill = p.purchaseBillId ? bills.get(p.purchaseBillId) || p.purchaseBill : p.purchaseBill;
    const subBill = p.subcontractorBillId ? subBills.get(p.subcontractorBillId) || p.subcontractorBill : p.subcontractorBill;
    const po = p.purchaseOrder || bill?.purchaseOrder || p.advanceRequest?.purchaseOrder;
    const wo = p.subcontractWorkOrder || subBill?.subcontractWorkOrder || p.subcontractorPaymentRequest?.subcontractWorkOrder;
    const sub = !!(subBill || wo || p.subcontractorPaymentRequestId);
    const vendor = !sub && !!(p.vendorId || bill || po || p.advanceRequestId);
    const paid = Number(p.amount);
    const fullTotal = bill ? Number(bill.amount) : subBill ? Number(subBill.amount) + Number(subBill.gstAmount || 0)
      : po ? Number(po.totalWithGst || po.totalAmount) : wo ? Number(wo.totalAmount)
        : p.advanceRequest ? Number(p.advanceRequest.approvedAmount ?? p.advanceRequest.amount)
          : p.subcontractorPaymentRequest ? Number(p.subcontractorPaymentRequest.approvedAmount ?? p.subcontractorPaymentRequest.amount) : null;
    const fullTax = Number(bill?.gstAmount ?? subBill?.gstAmount ?? po?.gstAmount ?? 0);
    const tax = fullTotal && fullTax ? Math.round(paid * fullTax / fullTotal * 100) / 100 : 0;
    // Bill paidAmount includes its complete payment history, including older payments.
    const paidTotal = bill ? Number(bill.paidAmount) : subBill ? Number(subBill.paidAmount)
      : po?.paidAmount != null ? Number(po.paidAmount) : paidBySource.get(paymentSource(p)) || 0;
    add(paymentSource(p), p.paymentDate, {
      category: sub ? 'subcontractor' : vendor ? 'vendor' : p.paymentType === 'labour' ? 'labour' : 'expenses',
      project: p.project?.name || bill?.project?.name || subBill?.project?.name || po?.project?.name || p.advanceRequest?.project?.name || p.subcontractorPaymentRequest?.project?.name || '-',
      item: sub ? 'Subcontractor' : vendor ? 'Material' : p.paymentType === 'labour' ? 'Labour' : 'Expenses',
      type: sub ? 'Subcontractor Work' : vendor ? 'Material' : p.paymentType.replaceAll('_', ' '),
      name: p.vendor?.name || bill?.vendor?.name || po?.vendor?.name || p.advanceRequest?.vendor?.name || wo?.subcontractor?.name || subBill?.subcontractor?.name || p.subcontractorPaymentRequest?.subcontractor?.name || p.payeeName || '-',
      description: bill?.billItems?.map((item) => item.description).join(', ') || bill?.notes || subBill?.notes || p.notes || '-',
      gst: fullTax > 0 ? 'GST' : 'Non GST', billNo: bill?.billNumber || subBill?.billNumber || '-',
      withoutGst: paid - tax, gstAmount: tax, total: paid, paid,
      balance: fullTotal === null ? null : Math.max(0, fullTotal - paidTotal),
    });
  }
  for (const payment of sources.labourPayments) {
    if (payment.status !== 'paid' || Number(payment.amount) <= 0) continue;
    let linked = false;
    for (const report of sources.dailyLabourReports) for (const worker of report.workers || []) {
      if (worker.labourPaymentId !== payment.id) continue;
      linked = true;
      const amount = (Number(worker.count) || 1) * Number(worker.shift || 0) * Number(worker.shiftAmount ?? worker.tradeRel?.shiftWiseAmount ?? 0);
      add(`labour:${payment.id}`, payment.weekStart, {
        category: 'labour', project: report.project?.name || '-', item: 'Labour', type: 'Civil Labour',
        name: worker.tradeRel?.team?.name || payment.userName, description: `${worker.trade} (${worker.count} × ${worker.shift} shifts)`,
        gst: 'Non GST', billNo: '-', withoutGst: amount, gstAmount: 0, total: amount, paid: amount, balance: 0,
      });
    }
    if (!linked) add(`labour:${payment.id}`, payment.weekStart, {
      category: 'labour', project: '-', item: 'Labour', type: 'Civil Labour', name: payment.userName, description: payment.notes || '-',
      gst: 'Non GST', billNo: '-', withoutGst: Number(payment.amount), gstAmount: 0, total: Number(payment.amount), paid: Number(payment.amount), balance: 0,
    });
  }
  for (const payment of sources.expensePayments) {
    if (payment.status !== 'paid' || Number(payment.amount) <= 0) continue;
    const entries = sources.expenses.filter((expense) => expense.expensePaymentId === payment.id);
    for (const expense of entries) add(`expense:${payment.id}:${expense.id}`, payment.weekStart, {
      category: 'expenses', project: expense.project?.name || '-', item: 'Expenses', type: expense.expenseType?.name || expense.category || 'Company Expense',
      name: expense.creator?.name || payment.userName, description: expense.description || expense.remarks || '-', gst: 'Non GST', billNo: '-',
      withoutGst: Number(expense.amount), gstAmount: 0, total: Number(expense.amount), paid: Number(expense.amount), balance: 0,
    });
    if (!entries.length) add(`expense:${payment.id}`, payment.weekStart, {
      category: 'expenses', project: '-', item: 'Expenses', type: 'Company Expense', name: payment.userName, description: payment.notes || '-', gst: 'Non GST', billNo: '-',
      withoutGst: Number(payment.amount), gstAmount: 0, total: Number(payment.amount), paid: Number(payment.amount), balance: 0,
    });
  }
  return [...grouped.values()].sort((a, b) => b.week.localeCompare(a.week) || a.project.localeCompare(b.project) || a.name.localeCompare(b.name));
}
