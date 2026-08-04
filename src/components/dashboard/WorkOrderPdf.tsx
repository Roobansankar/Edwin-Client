import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { WorkOrder } from '@/types/erp';
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
  // ── LETTERHEAD ──────────────────────────────────────────
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

  // ── SECTIONS ─────────────────────────────────────────────
  mainGrid: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 20,
  },
  vendorSection: {
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
  vendorName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  vendorText: {
    fontSize: 9,
    color: SLATE_600,
  },

  // ── TABLE ────────────────────────────────────────────────
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

  // ── TOTALS ───────────────────────────────────────────────
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

  // ── FOOTER ───────────────────────────────────────────────
  footer: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: SLATE_200,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sigBlock: {
    width: 180,
    textAlign: 'center',
  },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: SLATE_900,
    marginTop: 40,
    paddingTop: 5,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  sigSub: {
    fontSize: 8,
    color: SLATE_400,
    marginTop: 2,
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
  workOrder: WorkOrder;
}

export function WorkOrderPdf({ workOrder }: Props) {
  const items = workOrder.items || [];
  const subtotal = Number(workOrder.totalAmount) || 0;
  const gst = Number(workOrder.gstAmount) || 0;
  const total = subtotal + gst;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── PROFESSIONAL HEADER ── */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>EDWIN CONSTRUCTIONS</Text>
            <Text style={styles.companyTagline}>Civil Engineers & Contractors</Text>
            <View style={styles.companyDetails}>
              <Text>No. 123, Builders Avenue, Chennai, Tamil Nadu — 600001</Text>
              <Text>GSTIN: 33AAAAA0000A1Z5 | PAN: AAAAA0000A</Text>
              <Text>Phone: +91 44 2345 6789 | Email: office@edwinconstructions.in</Text>
            </View>
          </View>
          <View style={styles.docTitleBlock}>
            <Text style={styles.docTitle}>Work Order</Text>
            <View style={styles.docMeta}>
              <Text><Text style={styles.docMetaLabel}>WO No: </Text><Text style={styles.docMetaValue}>{workOrder.woNumber}</Text></Text>
              <Text><Text style={styles.docMetaLabel}>Date: </Text><Text style={styles.docMetaValue}>{formatDate(workOrder.createdAt || '')}</Text></Text>
            </View>
          </View>
        </View>

        {/* ── PROJECT HIGHLIGHT ── */}
        <View style={{ backgroundColor: TEAL, padding: 10, marginBottom: 20, borderRadius: 4 }}>
          <Text style={{ fontSize: 8, color: '#ffffff', opacity: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>Project Name</Text>
          <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>
            {workOrder.project?.name || 'N/A'}
          </Text>
        </View>

        {/* ── INFO GRID ── */}
        <View style={styles.mainGrid}>
          <View style={styles.vendorSection}>
            <Text style={styles.sectionLabel}>Vendor / Contractor</Text>
            <Text style={styles.vendorName}>{workOrder.vendor?.name || 'N/A'}</Text>
            <Text style={styles.vendorText}>{workOrder.vendor?.address || ''}</Text>
            {workOrder.vendor?.gstNumber && (
              <Text style={[styles.vendorText, { marginTop: 4, fontFamily: 'Helvetica-Bold' }]}>
                GSTIN: {workOrder.vendor.gstNumber}
              </Text>
            )}
          </View>
          <View style={styles.projectSection}>
            <Text style={styles.sectionLabel}>Project Details</Text>
            <Text style={[styles.vendorName, { fontSize: 11 }]}>{workOrder.project?.name || 'General Maintenance'}</Text>
            <Text style={styles.vendorText}>Work Order Status: <Text style={{ fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' }}>{workOrder.status}</Text></Text>
          </View>
        </View>

        {/* ── ITEMS TABLE ── */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colNo]}>S.No</Text>
            <Text style={[styles.th, styles.colDesc]}>Description of Work</Text>
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

        {/* ── TOTALS ── */}
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
              <Text style={styles.grandTotalLabel}>Total Amount</Text>
              <Text style={styles.grandTotalValue}>INR {formatINR(total)}</Text>
            </View>
          </View>
        </View>

        {/* ── TERMS ── */}
        {workOrder.terms && (
          <View style={{ marginBottom: 40 }}>
            <Text style={styles.sectionLabel}>Terms & Conditions</Text>
            <Text style={[styles.vendorText, { lineHeight: 1.6 }]}>{workOrder.terms}</Text>
          </View>
        )}

        {/* ── SIGNATURES ── */}
        <View style={styles.footer}>
          <View style={styles.sigBlock}>
            <Text style={styles.sigLine}>Vendor Signature</Text>
            <Text style={styles.sigSub}>Seal & Date</Text>
          </View>
          <View style={styles.sigBlock}>
            <Text style={styles.sigLine}>Authorized Signatory</Text>
            <Text style={styles.sigSub}>For Edwin Constructions</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
