'use client';

import { useMemo, useState } from 'react';
import { Button, Card, Flex, Select, Table, Tabs, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BookOutlined, FileExcelOutlined } from '@ant-design/icons';
import type {
  DailyLabourReport,
  DailyWorker,
  Expense,
  ExpensePayment,
  LabourPayment,
  Payment,
  PurchaseBill,
  SubcontractorBill,
  Vendor,
} from '@/types/erp';
import { exportToExcel } from '@/lib/excel';
import {
  cardClassName,
  formatCurrency,
  formatDate,
  mutedTextClassName,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
  weekRangeLabel,
  weekStartOf,
} from './ui';

type Props = {
  dailyLabourReports: DailyLabourReport[];
  labourPayments: LabourPayment[];
  bills: PurchaseBill[];
  payments: Payment[];
  vendors: Vendor[];
  subcontractorBills: SubcontractorBill[];
  expenses: Expense[];
  expensePayments: ExpensePayment[];
};

// One ledger line. Credit = amount owed once approved, Debit = amount paid.
type Entry = {
  key: string;
  date: string;
  ref: string;
  nameKey: string;
  name: string;
  credit: number;
  debit: number;
};

type LedgerRow = Entry & { sno: number; balance: number };

// Statuses that make a record payable.
const APPROVED_BILL_STATUSES = ['admin_approved', 'approved'];
const APPROVED_TRADE_STATUSES = ['approved', 'admin_approved'];

const dayOf = (value?: string | null) => (value || '').split('T')[0];

// Count x shift x rate; the rate falls back to the trade's shift amount.
function tradeAmount(worker: DailyWorker) {
  const rate = Number(worker.shiftAmount) || Number(worker.tradeRel?.shiftWiseAmount) || 0;
  return (Number(worker.count) || 1) * (Number(worker.shift) || 0) * rate;
}

// Sorts by name then date (credits before debits on the same day) and adds a
// running balance that restarts for each name.
function buildLedger(entries: Entry[]): LedgerRow[] {
  const sorted = [...entries].sort(
    (a, b) =>
      a.name.localeCompare(b.name) ||
      a.date.localeCompare(b.date) ||
      (b.credit > 0 ? 1 : 0) - (a.credit > 0 ? 1 : 0),
  );
  const balances = new Map<string, number>();
  return sorted.map((e, i) => {
    const balance = (balances.get(e.nameKey) || 0) + e.credit - e.debit;
    balances.set(e.nameKey, balance);
    return { ...e, sno: i + 1, balance };
  });
}

export function AccountsLedgerClient({
  dailyLabourReports,
  labourPayments,
  bills,
  payments,
  vendors,
  subcontractorBills,
  expenses,
  expensePayments,
}: Props) {
  // 1. Labour, team-wise: combine all trades in a team per week and payment.
  const labourEntries = useMemo<Entry[]>(() => {
    const paymentById = new Map(labourPayments.map((p) => [p.id, p]));
    const credits = new Map<string, Entry>();
    const debits = new Map<string, Entry>();
    for (const report of dailyLabourReports) {
      for (const w of report.workers || []) {
        if (!APPROVED_TRADE_STATUSES.includes(w.status || '')) continue;
        const amount = tradeAmount(w);
        if (!amount) continue;
        const nameKey = w.tradeRel?.team?.id || w.tradeRel?.teamId || '__unassigned_team__';
        const name = w.tradeRel?.team?.name || 'Unassigned Team';
        const weekStart = weekStartOf(report.reportDate)?.format('YYYY-MM-DD') || dayOf(report.reportDate);

        const creditKey = `${nameKey}|${weekStart}`;
        const credit = credits.get(creditKey) || {
          key: `lc-${creditKey}`, date: weekStart, ref: weekRangeLabel(weekStart), nameKey, name, credit: 0, debit: 0,
        };
        credit.credit += amount;
        credits.set(creditKey, credit);

        const payment = w.labourPaymentId ? paymentById.get(w.labourPaymentId) : undefined;
        if (payment && payment.status === 'paid') {
          const debitKey = `${nameKey}|${payment.id}`;
          const debit = debits.get(debitKey) || {
            key: `ld-${debitKey}`, date: dayOf(payment.paymentDate), ref: weekRangeLabel(payment.weekStart), nameKey, name, credit: 0, debit: 0,
          };
          debit.debit += amount;
          debits.set(debitKey, debit);
        }
      }
    }
    return [...credits.values(), ...debits.values()];
  }, [dailyLabourReports, labourPayments]);

  // 2. Material, vendor-wise: approved purchase bills are credits, vendor
  // payments are debits.
  const materialEntries = useMemo<Entry[]>(() => {
    const vendorName = new Map(vendors.map((v) => [v.id, v.name]));
    const billNoByPo = new Map<string, string>();
    for (const b of bills) if (b.purchaseOrderId && !billNoByPo.has(b.purchaseOrderId)) billNoByPo.set(b.purchaseOrderId, b.billNumber);

    const entries: Entry[] = bills
      .filter((b) => APPROVED_BILL_STATUSES.includes(b.status))
      .map((b) => ({
        key: `mc-${b.id}`,
        date: dayOf(b.billDate || b.createdAt),
        ref: b.billNumber,
        nameKey: b.vendorId,
        name: b.vendor?.name || vendorName.get(b.vendorId) || '-',
        credit: Number(b.amount || 0),
        debit: 0,
      }));

    for (const p of payments) {
      if (p.salesInvoice || p.expenseId || p.timesheetId) continue;
      if (p.subcontractWorkOrderId || p.subcontractorPaymentRequestId || p.subcontractorBillId) continue;
      const vendorId = p.vendorId || p.purchaseBill?.vendorId || p.purchaseOrder?.vendorId || p.advanceRequest?.vendorId;
      if (!vendorId) continue;
      entries.push({
        key: `md-${p.id}`,
        date: dayOf(p.paymentDate),
        ref: p.purchaseBill?.billNumber || (p.purchaseOrderId ? billNoByPo.get(p.purchaseOrderId) : undefined) || p.purchaseOrder?.poNumber || '-',
        nameKey: vendorId,
        name: p.vendor?.name || vendorName.get(vendorId) || '-',
        credit: 0,
        debit: Number(p.amount || 0),
      });
    }
    return entries;
  }, [bills, payments, vendors]);

  // 3. Subcontractor: approved subcontractor bills are credits (with WO
  // number), subcontractor payments are debits.
  const subcontractorEntries = useMemo<Entry[]>(() => {
    const nameById = new Map<string, string>();
    const billById = new Map(subcontractorBills.map((b) => [b.id, b]));
    for (const b of subcontractorBills) if (b.subcontractor?.name) nameById.set(b.subcontractorId, b.subcontractor.name);

    const entries: Entry[] = subcontractorBills
      .filter((b) => APPROVED_BILL_STATUSES.includes(b.status))
      .map((b) => ({
        key: `sc-${b.id}`,
        date: dayOf(b.billDate || b.createdAt),
        ref: b.subcontractWorkOrder?.woNumber || '-',
        nameKey: b.subcontractorId,
        name: b.subcontractor?.name || '-',
        credit: Number(b.amount || 0) + Number(b.gstAmount || 0),
        debit: 0,
      }));

    for (const p of payments) {
      if (!p.subcontractWorkOrderId && !p.subcontractorPaymentRequestId && !p.subcontractorBillId) continue;
      const linkedBill = p.subcontractorBillId ? billById.get(p.subcontractorBillId) : undefined;
      const subcontractorId =
        p.subcontractWorkOrder?.subcontractorId ||
        p.subcontractorPaymentRequest?.subcontractorId ||
        linkedBill?.subcontractorId ||
        p.payeeName ||
        'unknown';
      entries.push({
        key: `sd-${p.id}`,
        date: dayOf(p.paymentDate),
        ref: p.subcontractWorkOrder?.woNumber || linkedBill?.subcontractWorkOrder?.woNumber || '-',
        nameKey: subcontractorId,
        name: p.subcontractWorkOrder?.subcontractor?.name || nameById.get(subcontractorId) || p.payeeName || '-',
        credit: 0,
        debit: Number(p.amount || 0),
      });
    }
    return entries;
  }, [subcontractorBills, payments]);

  // 4. Expenses, engineer-wise: admin-approved expenses per week are credits,
  // paid weekly expense payments are debits.
  const expenseEntries = useMemo<Entry[]>(() => {
    const credits = new Map<string, Entry>();
    for (const e of expenses) {
      if (e.status !== 'admin_approved' || !e.createdBy) continue;
      const weekStart = weekStartOf(e.expenseDate)?.format('YYYY-MM-DD') || dayOf(e.expenseDate);
      const key = `${e.createdBy}|${weekStart}`;
      const entry = credits.get(key) || {
        key: `ec-${key}`, date: weekStart, ref: weekRangeLabel(weekStart), nameKey: e.createdBy, name: e.creator?.name || '-', credit: 0, debit: 0,
      };
      entry.credit += Number(e.amount || 0);
      credits.set(key, entry);
    }
    const debits: Entry[] = expensePayments
      .filter((p) => p.status === 'paid')
      .map((p) => ({
        key: `ed-${p.id}`,
        date: dayOf(p.paymentDate),
        ref: weekRangeLabel(p.weekStart),
        nameKey: p.userId,
        name: p.userName || '-',
        credit: 0,
        debit: Number(p.amount || 0),
      }));
    return [...credits.values(), ...debits];
  }, [expenses, expensePayments]);

  const tabs = [
    { key: 'labour', label: '1. Labour (Team Wise)', refTitle: 'Weekly', nameTitle: 'Team', entries: labourEntries },
    { key: 'material', label: '2. Material (Vendor Wise)', refTitle: 'Bill No', nameTitle: 'Vendor Name', entries: materialEntries },
    { key: 'subcontractor', label: '3. Subcontractor', refTitle: 'WO Number', nameTitle: 'Subcontractor', entries: subcontractorEntries },
    { key: 'expenses', label: '4. Expenses (Engineer Wise)', refTitle: 'Weekly', nameTitle: 'Engineer', entries: expenseEntries },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <BookOutlined className={titleIconClassName} /> Ledger
        </Typography.Title>
      </Flex>

      <Card className={cardClassName}>
        <Tabs
          items={tabs.map((tab) => ({
            key: tab.key,
            label: tab.label,
            children: <LedgerTab tabKey={tab.key} refTitle={tab.refTitle} nameTitle={tab.nameTitle} entries={tab.entries} />,
          }))}
        />
      </Card>
    </div>
  );
}

function LedgerTab({ tabKey, refTitle, nameTitle, entries }: { tabKey: string; refTitle: string; nameTitle: string; entries: Entry[] }) {
  const [nameFilter, setNameFilter] = useState<string | undefined>();

  const nameOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) map.set(e.nameKey, e.name);
    return [...map.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [entries]);

  // Balance is worked out on the full list so it stays correct when filtered.
  const rows = useMemo(() => {
    const all = buildLedger(entries);
    const filtered = nameFilter ? all.filter((r) => r.nameKey === nameFilter) : all;
    return filtered.map((r, i) => ({ ...r, sno: i + 1 }));
  }, [entries, nameFilter]);

  const totals = useMemo(() => {
    const credit = rows.reduce((s, r) => s + r.credit, 0);
    const debit = rows.reduce((s, r) => s + r.debit, 0);
    return { credit, debit, balance: credit - debit };
  }, [rows]);

  const columns: ColumnsType<LedgerRow> = [
    { title: 'S.No', dataIndex: 'sno', key: 'sno', width: 70, align: 'right' },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 120, render: (v: string) => formatDate(v) },
    { title: refTitle, dataIndex: 'ref', key: 'ref', width: 170 },
    { title: nameTitle, dataIndex: 'name', key: 'name', width: 220, render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'Credit', dataIndex: 'credit', key: 'credit', width: 140, align: 'right', render: (v: number) => (v ? formatCurrency(v) : '-') },
    { title: 'Debit', dataIndex: 'debit', key: 'debit', width: 140, align: 'right', render: (v: number) => (v ? formatCurrency(v) : '-') },
    {
      title: 'Balance', dataIndex: 'balance', key: 'balance', width: 150, align: 'right',
      render: (v: number) => <Typography.Text strong type={v > 0 ? 'warning' : undefined}>{formatCurrency(v)}</Typography.Text>,
    },
  ];

  const handleExport = () => {
    exportToExcel({
      filename: `Ledger-${tabKey}`,
      sheetName: 'Ledger',
      headers: ['S.No', 'Date', refTitle, nameTitle, 'Credit', 'Debit', 'Balance'],
      rows: rows.map((r) => [r.sno, formatDate(r.date), r.ref, r.name, r.credit, r.debit, r.balance]),
    });
  };

  return (
    <div>
      <Flex justify="space-between" align="center" gap={12} wrap="wrap" className="mb-3!">
        <Select
          allowClear
          showSearch
          placeholder={`All ${nameTitle.toLowerCase()}s`}
          style={{ minWidth: 240 }}
          value={nameFilter}
          onChange={(v) => setNameFilter(v || undefined)}
          options={nameOptions}
          filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
        />
        <Flex gap={16} align="center" wrap="wrap">
          <Typography.Text className={mutedTextClassName}>
            Credit <Typography.Text strong>{formatCurrency(totals.credit)}</Typography.Text>
            {' · '}Debit <Typography.Text strong>{formatCurrency(totals.debit)}</Typography.Text>
            {' · '}Balance <Typography.Text strong>{formatCurrency(totals.balance)}</Typography.Text>
          </Typography.Text>
          <Button icon={<FileExcelOutlined />} disabled={rows.length === 0} onClick={handleExport}>Export to Excel</Button>
        </Flex>
      </Flex>
      <Table
        dataSource={rows}
        columns={columns}
        rowKey="key"
        size="middle"
        pagination={{ pageSize: 20, showTotal: (total) => `${total} entries` }}
        scroll={{ x: 1000 }}
        locale={{ emptyText: 'No ledger entries yet' }}
      />
    </div>
  );
}
