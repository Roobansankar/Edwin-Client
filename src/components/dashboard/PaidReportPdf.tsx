import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { PaidReportRow } from '@/lib/paid-report';
import { paymentStatus } from '@/lib/payment-status';
import { weekRangeLabel } from './ui';

// Built-in PDF fonts have no ₹ glyph, so amounts are written as "Rs. 1,23,456".
const money = (value: number | null | undefined) =>
  value === null || value === undefined ? '-' : `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
const HEAD_BG = '#f1f5f9';
const ZEBRA = '#f8fafc';

// Column set chosen to fit A4 landscape; widths (incl. Status) add up to 100%.
const COLUMNS: Array<{ title: string; width: string; align?: 'right'; value: (row: PaidReportRow, index: number) => string }> = [
  { title: 'S.No', width: '4%', value: (_, i) => String(i + 1) },
  { title: 'Week', width: '8%', value: (row) => weekRangeLabel(row.week) },
  { title: 'Project', width: '11%', value: (row) => row.project || '-' },
  { title: 'Type', width: '8%', value: (row) => row.type || '-' },
  { title: 'Vendor / Team', width: '10%', value: (row) => row.name || '-' },
  { title: 'Description', width: '12%', value: (row) => row.description || '-' },
  { title: 'Bill No', width: '7%', value: (row) => row.billNo || '-' },
  { title: 'Without GST', width: '7%', align: 'right', value: (row) => money(row.withoutGst) },
  { title: 'GST', width: '6%', align: 'right', value: (row) => money(row.gstAmount) },
  { title: 'Total', width: '7%', align: 'right', value: (row) => money(row.total) },
  { title: 'Paid', width: '7%', align: 'right', value: (row) => money(row.paid) },
  { title: 'Balance', width: '7%', align: 'right', value: (row) => money(row.balance) },
];
const STATUS_WIDTH = '6%'; // remaining width for Payment Status

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 36, paddingHorizontal: 24, fontSize: 7, fontFamily: 'Helvetica', color: INK },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 2, borderBottomColor: INK, paddingBottom: 8, marginBottom: 10 },
  company: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  subtitle: { fontSize: 9, color: MUTED, marginTop: 2 },
  meta: { fontSize: 7.5, color: MUTED, textAlign: 'right' },
  summary: { flexDirection: 'row', marginBottom: 10 },
  summaryBox: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 6, marginRight: 6 },
  summaryLabel: { fontSize: 7, color: MUTED },
  summaryValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  tableHead: { flexDirection: 'row', backgroundColor: HEAD_BG, borderTopWidth: 1, borderBottomWidth: 1, borderColor: LINE },
  headCell: { paddingVertical: 4, paddingHorizontal: 3, fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: MUTED, textTransform: 'uppercase' },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: LINE },
  cell: { paddingVertical: 3.5, paddingHorizontal: 3 },
  totalRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: INK, backgroundColor: HEAD_BG },
  footer: { position: 'absolute', bottom: 16, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: MUTED },
});

export function PaidReportPdf({
  title,
  records,
  filters,
  generatedAt,
}: {
  title: string;
  records: PaidReportRow[];
  filters: string;
  generatedAt: string;
}) {
  const totals = records.reduce(
    (acc, row) => ({
      withoutGst: acc.withoutGst + row.withoutGst,
      gst: acc.gst + row.gstAmount,
      total: acc.total + row.total,
      paid: acc.paid + row.paid,
      balance: acc.balance + (row.balance ?? 0),
    }),
    { withoutGst: 0, gst: 0, total: 0, paid: 0, balance: 0 },
  );

  return (
    <Document title={`Paid Report - ${title}`} author="Edwin Constructions">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.company}>Edwin Constructions</Text>
            <Text style={styles.subtitle}>Paid Report — {title}</Text>
          </View>
          <View>
            <Text style={styles.meta}>Generated {generatedAt}</Text>
            {filters ? <Text style={styles.meta}>{filters}</Text> : null}
          </View>
        </View>

        <View style={styles.summary}>
          {[
            ['Records', String(records.length)],
            ['Total Amount', money(totals.total)],
            ['Total Paid', money(totals.paid)],
            ['Balance', money(totals.balance)],
          ].map(([label, value], i) => (
            <View key={label} style={[styles.summaryBox, i === 3 ? { marginRight: 0 } : {}]}>
              <Text style={styles.summaryLabel}>{label}</Text>
              <Text style={styles.summaryValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.tableHead} fixed>
          {COLUMNS.map((col) => (
            <Text key={col.title} style={[styles.headCell, { width: col.width, textAlign: col.align ?? 'left' }]}>{col.title}</Text>
          ))}
          <Text style={[styles.headCell, { width: STATUS_WIDTH }]}>Status</Text>
        </View>

        {records.map((row, index) => (
          <View key={row.key} style={[styles.row, index % 2 ? { backgroundColor: ZEBRA } : {}]} wrap={false}>
            {COLUMNS.map((col) => (
              <Text key={col.title} style={[styles.cell, { width: col.width, textAlign: col.align ?? 'left' }]}>{col.value(row, index)}</Text>
            ))}
            <Text style={[styles.cell, { width: STATUS_WIDTH }]}>{paymentStatus(row.paid, row.balance)}</Text>
          </View>
        ))}

        <View style={styles.totalRow} wrap={false}>
          <Text style={[styles.cell, { width: '60%', fontFamily: 'Helvetica-Bold' }]}>Total ({records.length} records)</Text>
          {[totals.withoutGst, totals.gst, totals.total, totals.paid, totals.balance].map((value, i) => (
            <Text key={i} style={[styles.cell, { width: COLUMNS[7 + i].width, textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>{money(value)}</Text>
          ))}
          <Text style={[styles.cell, { width: STATUS_WIDTH }]} />
        </View>

        <View style={styles.footer} fixed>
          <Text>Edwin Constructions · Paid Report</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
