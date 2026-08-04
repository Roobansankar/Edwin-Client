import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { SalesInvoice } from '@/types/erp';
import { formatDate } from './ui';

const TEAL = '#0f766e';
const SLATE_900 = '#0f172a';
const SLATE_600 = '#475569';
const SLATE_400 = '#94a3b8';
const SLATE_200 = '#e2e8f0';
const SLATE_50 = '#f8fafc';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: SLATE_900,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    borderBottomWidth: 3,
    borderBottomColor: TEAL,
    paddingBottom: 15,
  },
  companyInfo: {
    flex: 2,
  },
  companyName: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: TEAL,
    marginBottom: 4,
  },
  companyTagline: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: SLATE_400,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 6,
    marginBottom: 10,
  },
  companyDetails: {
    fontSize: 8.5,
    color: SLATE_600,
    lineHeight: 1.4,
  },
  docTitleBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: SLATE_900,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  docMeta: {
    fontSize: 9,
    textAlign: 'right',
  },
  docMetaLabel: {
    color: SLATE_400,
  },
  docMetaValue: {
    fontFamily: 'Helvetica-Bold',
  },
  mainGrid: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 20,
  },
  customerSection: {
    flex: 1,
    backgroundColor: SLATE_50,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: SLATE_200,
  },
  projectSection: {
    flex: 1,
    padding: 12,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: SLATE_400,
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 1,
  },
  customerName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  customerText: {
    fontSize: 9,
    color: SLATE_600,
  },
  table: {
    width: 'auto',
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: TEAL,
    padding: 8,
  },
  th: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: SLATE_200,
    padding: 8,
    alignItems: 'center',
  },
  td: {
    fontSize: 9,
    color: SLATE_900,
  },
  colNo: { width: '8%' },
  colDesc: { width: '52%' },
  colQty: { width: '12%', textAlign: 'center' },
  colRate: { width: '14%', textAlign: 'right' },
  colAmt: { width: '14%', textAlign: 'right' },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 40,
  },
  totalsBox: {
    width: 200,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: SLATE_50,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 5,
    borderTopWidth: 2,
    borderTopColor: TEAL,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: TEAL,
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: TEAL,
  },
  footer: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: SLATE_200,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bankDetails: {
    fontSize: 8,
    color: SLATE_600,
    textAlign: 'center',
  }
});

const formatINR = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

interface Props {
  invoice: SalesInvoice;
}

export function InvoicePdf({ invoice }: Props) {
  const items = invoice.items || [];
  const subtotal = Number(invoice.totalAmount) || 0;
  const gst = Number(invoice.gstAmount) || 0;
  const total = subtotal + gst;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>EDWIN CONSTRUCTIONS</Text>
            <Text style={styles.companyTagline}>Civil Engineers & Contractors</Text>
            <View style={styles.companyDetails}>
              <Text>No. 123, Builders Avenue, Chennai, Tamil Nadu — 600001</Text>
              <Text>GSTIN: 33AAAAA0000A1Z5 | PAN: AAAAA0000A</Text>
              <Text>Phone: +91 44 2345 6789 | Email: accounts@edwinconstructions.in</Text>
            </View>
          </View>
          <View style={styles.docTitleBlock}>
            <Text style={styles.docTitle}>Tax Invoice</Text>
            <View style={styles.docMeta}>
              <Text><Text style={styles.docMetaLabel}>Inv No: </Text><Text style={styles.docMetaValue}>{invoice.invoiceNumber}</Text></Text>
              <Text><Text style={styles.docMetaLabel}>Date: </Text><Text style={styles.docMetaValue}>{formatDate(invoice.createdAt || '')}</Text></Text>
              <Text><Text style={styles.docMetaLabel}>Due Date: </Text><Text style={styles.docMetaValue}>{formatDate(invoice.dueDate || '')}</Text></Text>
            </View>
          </View>
        </View>

        <View style={styles.mainGrid}>
          <View style={styles.customerSection}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={styles.customerName}>{invoice.project?.clientName || 'Valued Client'}</Text>
            {invoice.project?.location && <Text style={styles.customerText}>{invoice.project.location}</Text>}
            {invoice.project?.email && <Text style={styles.customerText}>Email: {invoice.project.email}</Text>}
            {invoice.project?.phone1 && <Text style={styles.customerText}>Phone: {invoice.project.phone1}</Text>}
          </View>
          <View style={styles.projectSection}>
            <Text style={styles.sectionLabel}>Project Reference</Text>
            <Text style={[styles.customerName, { fontSize: 11 }]}>{invoice.project?.name || 'General Project'}</Text>
            <Text style={styles.customerText}>Status: <Text style={{ fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' }}>{invoice.status}</Text></Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colNo]}>S.No</Text>
            <Text style={[styles.th, styles.colDesc]}>Description of Services</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colRate]}>Rate</Text>
            <Text style={[styles.th, styles.colAmt]}>Amount</Text>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, styles.colNo]}>{index + 1}</Text>
              <Text style={[styles.td, styles.colDesc]}>{item.description}</Text>
              <Text style={[styles.td, styles.colQty]}>{item.quantity} {item.unit}</Text>
              <Text style={[styles.td, styles.colRate]}>{formatINR(item.rate)}</Text>
              <Text style={[styles.td, styles.colAmt, { fontFamily: 'Helvetica-Bold' }]}>{formatINR(item.amount || 0)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.td}>Subtotal</Text>
              <Text style={styles.td}>{formatINR(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.td}>GST (18%)</Text>
              <Text style={styles.td}>{formatINR(gst)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>INR {formatINR(total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.bankDetails}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>BANK DETAILS</Text>
            <Text>Bank: HDFC Bank | A/c Name: Edwin Constructions</Text>
            <Text>A/c No: 50200012345678 | IFSC: HDFC0001234</Text>
            <Text style={{ marginTop: 10, color: SLATE_400 }}>This is a computer generated invoice.</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
