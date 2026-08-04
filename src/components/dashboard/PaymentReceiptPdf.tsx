import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { SalesInvoice, Payment } from '@/types/erp';
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
  mainContent: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: SLATE_50,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: SLATE_200,
  },
  receiptRow: {
    flexDirection: 'row',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: SLATE_200,
    paddingBottom: 5,
  },
  receiptLabel: {
    width: '30%',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: SLATE_600,
  },
  receiptValue: {
    width: '70%',
    fontSize: 10,
    color: SLATE_900,
  },
  amountBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: TEAL,
    color: '#ffffff',
    borderRadius: 4,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: SLATE_200,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signatureSection: {
    marginTop: 40,
    alignItems: 'flex-end',
  },
  signatureLine: {
    width: 150,
    borderTopWidth: 1,
    borderTopColor: SLATE_900,
    marginTop: 40,
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
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
  payment: Payment;
}

export function PaymentReceiptPdf({ invoice, payment }: Props) {
  return (
    <Document title={`Receipt - ${invoice.invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>EDWIN CONSTRUCTIONS</Text>
            <Text style={styles.companyTagline}>Civil Engineers & Contractors</Text>
            <View style={styles.companyDetails}>
              <Text>No. 123, Builders Avenue, Chennai, Tamil Nadu — 600001</Text>
              <Text>GSTIN: 33AAAAA0000A1Z5 | PAN: AAAAA0000A</Text>
            </View>
          </View>
          <View style={styles.docTitleBlock}>
            <Text style={styles.docTitle}>Payment Receipt</Text>
            <View style={styles.docMeta}>
              <Text><Text style={styles.docMetaLabel}>Date: </Text><Text style={styles.docMetaValue}>{formatDate(payment.paymentDate || '')}</Text></Text>
              <Text><Text style={styles.docMetaLabel}>Ref No: </Text><Text style={styles.docMetaValue}>{payment.referenceNumber || 'N/A'}</Text></Text>
            </View>
          </View>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>To:</Text>
            <Text style={styles.receiptValue}>{invoice.project?.clientName || 'Valued Client'}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Invoice No:</Text>
            <Text style={styles.receiptValue}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Project:</Text>
            <Text style={styles.receiptValue}>{invoice.project?.name || 'General Project'}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Payment Mode:</Text>
            <Text style={styles.receiptValue}>{payment.paymentMode.toUpperCase()}</Text>
          </View>
          {payment.notes && (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Notes:</Text>
              <Text style={styles.receiptValue}>{payment.notes}</Text>
            </View>
          )}
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Amount Paid</Text>
          <Text style={styles.amountValue}>INR {formatINR(payment.amount)}</Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 9, color: SLATE_600 }}>
            Total Invoice Amount: INR {formatINR(Number(invoice.totalAmount) + Number(invoice.gstAmount))}
          </Text>
          <Text style={{ fontSize: 9, color: SLATE_600 }}>
            Total Paid: INR {formatINR(invoice.paidAmount)}
          </Text>
          <Text style={{ fontSize: 9, color: SLATE_600 }}>
            Remaining Balance: INR {formatINR(Number(invoice.totalAmount) + Number(invoice.gstAmount) - Number(invoice.paidAmount))}
          </Text>
        </View>

        <View style={styles.signatureSection}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Authorized Signatory</Text>
          <Text style={{ fontSize: 8, color: SLATE_400 }}>Edwin Constructions</Text>
        </View>

        <View style={styles.footer}>
          <Text style={{ fontSize: 8, color: SLATE_400 }}>
            This is a computer generated payment receipt and does not require a physical signature.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
