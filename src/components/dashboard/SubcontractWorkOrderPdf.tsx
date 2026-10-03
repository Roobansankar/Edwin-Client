import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { SubcontractWorkOrder } from '@/types/erp';
import { formatDate } from './ui';

// Letterhead + layout shared with PurchaseOrderPdf.tsx (same black/white
// vendor-style format the client asked both documents to match): logo +
// company letterhead, bold title with two dark reference boxes (WO No /
// Date) top-right, Vendor Name/Address and Ship To/Job Details as two-up
// bordered panels, a grid-lined item row, a solid TOTAL bar, a remarks box
// (from the WO's own Notes), and a signature + company seal footer.
const DARK = '#1f2937';
const BLACK = '#000000';
const GREY_700 = '#374151';
const GREY_500 = '#6b7280';
const GREY_200 = '#e5e7eb';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: BLACK,
    lineHeight: 1.4,
  },
  letterhead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 52,
    height: 52,
    marginRight: 12,
  },
  letterheadText: {
    flex: 1,
  },
  companyName: {
    fontSize: 19,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  companyTagline: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 2,
    marginBottom: 4,
  },
  companyContact: {
    fontSize: 8,
    color: GREY_700,
    lineHeight: 1.5,
  },
  letterheadDivider: {
    borderBottomWidth: 2,
    borderBottomColor: DARK,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  mainTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
  },
  headerBoxes: {
    width: 170,
  },
  headerBox: {
    backgroundColor: DARK,
    marginBottom: 4,
  },
  headerBoxLabel: {
    color: '#ffffff',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  headerBoxValue: {
    backgroundColor: '#ffffff',
    color: BLACK,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: BLACK,
    borderTopWidth: 0,
    paddingVertical: 3,
  },
  twoCol: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  colHalf: {
    flex: 1,
    borderWidth: 1,
    borderColor: BLACK,
  },
  colHalfLast: {
    borderLeftWidth: 0,
  },
  barHeader: {
    backgroundColor: DARK,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  barHeaderText: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colBody: {
    padding: 8,
    minHeight: 54,
  },
  boldText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    marginBottom: 2,
  },
  mutedText: {
    color: GREY_700,
  },
  table: {
    borderWidth: 1,
    borderColor: BLACK,
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: DARK,
  },
  th: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: GREY_200,
  },
  td: {
    fontSize: 8.5,
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  colNo: { width: '8%' },
  colDesc: { width: '52%' },
  colRate: { width: '20%', textAlign: 'right', borderLeftWidth: 1, borderLeftColor: GREY_200 },
  colAmt: { width: '20%', textAlign: 'right', borderLeftWidth: 1, borderLeftColor: GREY_200 },
  colBorderRight: { borderRightWidth: 1, borderRightColor: GREY_200 },
  totalsWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 14,
  },
  totalsBox: {
    width: 220,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  totalsLabel: {
    fontSize: 9,
    color: GREY_700,
  },
  totalsValue: {
    fontSize: 9,
  },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DARK,
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  grandLabel: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  grandValueBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: BLACK,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  grandValueText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  notesBox: {
    borderWidth: 1,
    borderColor: BLACK,
    padding: 8,
    marginBottom: 24,
  },
  notesTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 4,
    color: GREY_700,
  },
  notesText: {
    fontSize: 8.5,
    lineHeight: 1.6,
  },
  signRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  signLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sigBlock: {
    width: 190,
    borderTopWidth: 1,
    borderTopColor: BLACK,
    paddingTop: 6,
    textAlign: 'center',
  },
  sigLine: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  sigSub: {
    fontSize: 8,
    color: GREY_500,
    marginTop: 2,
  },
  sealBox: {
    width: 90,
    height: 60,
    alignSelf: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: GREY_500,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealBoxText: {
    fontSize: 7,
    color: GREY_500,
    textTransform: 'uppercase',
  },
});

const formatINR = (value: number | string | null | undefined): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

interface Props {
  workOrder: SubcontractWorkOrder;
}

export function SubcontractWorkOrderPdf({ workOrder }: Props) {
  const description = workOrder.description || workOrder.workCategory?.name || 'Subcontracted Work';
  const basicAmount = Number(workOrder.amount) || 0;
  const gstPercent = Number(workOrder.gstPercentage) || 0;
  const gstAmount = Number(workOrder.gstAmount) || 0;
  const total = Number(workOrder.totalAmount) || basicAmount + gstAmount;
  const notesLines = (workOrder.notes || '').split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Company letterhead */}
        <View style={styles.letterhead}>
          {/* react-pdf's Image, not an HTML img - no alt prop exists on it */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src="/logo.png" style={styles.logo} />
          <View style={styles.letterheadText}>
            <Text style={styles.companyName}>EDWIN CONSTRUCTION</Text>
            <Text style={styles.companyTagline}>Civil Engineers & Contractors</Text>
            <Text style={styles.companyContact}>
              2/1-1A1 Rainbow Garden, Kamarajar Salai, Moovendar Nagar, Konam PO, Nagercoil - 629004, Kanyakumari Dist, Tamil Nadu, India
            </Text>
            <Text style={styles.companyContact}>GSTIN: 33AAFFE2810H1ZY</Text>
          </View>
        </View>
        <View style={styles.letterheadDivider} />

        {/* Title + WO No / Date reference boxes */}
        <View style={styles.headerRow}>
          <Text style={styles.mainTitle}>WORK ORDER</Text>
          <View style={styles.headerBoxes}>
            <View style={styles.headerBox}>
              <Text style={styles.headerBoxLabel}>Work Order No</Text>
            </View>
            <Text style={styles.headerBoxValue}>{workOrder.woNumber}</Text>
            <View style={[styles.headerBox, { marginTop: 6 }]}>
              <Text style={styles.headerBoxLabel}>Date</Text>
            </View>
            <Text style={styles.headerBoxValue}>{formatDate(workOrder.createdAt || '')}</Text>
          </View>
        </View>

        {/* Subcontractor Name / Address */}
        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <View style={styles.barHeader}><Text style={styles.barHeaderText}>Vendor Name</Text></View>
            <View style={styles.colBody}>
              <Text style={styles.boldText}>{workOrder.subcontractor?.name || 'N/A'}</Text>
            </View>
          </View>
          <View style={[styles.colHalf, styles.colHalfLast]}>
            <View style={styles.barHeader}><Text style={styles.barHeaderText}>Vendor Address</Text></View>
            <View style={styles.colBody}>
              <Text style={styles.mutedText}>{workOrder.subcontractor?.address || '-'}</Text>
              {workOrder.subcontractor?.phone && (
                <Text style={[styles.mutedText, { marginTop: 3 }]}>Tel: {workOrder.subcontractor.phone}</Text>
              )}
              {workOrder.subcontractor?.gstNumber && (
                <Text style={[styles.boldText, { marginTop: 3 }]}>GSTIN: {workOrder.subcontractor.gstNumber}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Ship To / Job Details */}
        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <View style={styles.barHeader}><Text style={styles.barHeaderText}>Ship To</Text></View>
            <View style={styles.colBody}>
              <Text style={styles.boldText}>EDWIN CONSTRUCTION</Text>
              <Text style={styles.mutedText}>{workOrder.project?.name ? `Site: ${workOrder.project.name}` : '-'}</Text>
              {workOrder.project?.location && <Text style={styles.mutedText}>{workOrder.project.location}</Text>}
            </View>
          </View>
          <View style={[styles.colHalf, styles.colHalfLast]}>
            <View style={styles.barHeader}><Text style={styles.barHeaderText}>Job Details</Text></View>
            <View style={styles.colBody}>
              <Text style={styles.boldText}>{workOrder.workCategory?.name || 'N/A'}</Text>
              {workOrder.startDate && (
                <Text style={styles.mutedText}>
                  Period: {formatDate(workOrder.startDate)} to {workOrder.endDate ? formatDate(workOrder.endDate) : 'Ongoing'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Work item */}
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colNo]}>S.No</Text>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colRate]}>Amount</Text>
            <Text style={[styles.th, styles.colAmt]}>Total</Text>
          </View>
          <View style={styles.tableRow} wrap={false}>
            <Text style={[styles.td, styles.colNo, styles.colBorderRight]}>1</Text>
            <Text style={[styles.td, styles.colDesc, styles.colBorderRight]}>{description}</Text>
            <Text style={[styles.td, styles.colRate]}>{formatINR(basicAmount)}</Text>
            <Text style={[styles.td, styles.colAmt, { fontFamily: 'Helvetica-Bold' }]}>{formatINR(total)}</Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatINR(basicAmount)}</Text>
            </View>
            {gstPercent > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>G.S.T - {gstPercent}%</Text>
                <Text style={styles.totalsValue}>{formatINR(gstAmount)}</Text>
              </View>
            )}
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>Grand Total</Text>
              <View style={styles.grandValueBox}>
                <Text style={styles.grandValueText}>{'₹'} {formatINR(total)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Remarks, from the WO's own Notes field */}
        {notesLines.length > 0 && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Remarks</Text>
            {notesLines.map((line, idx) => (
              <Text key={idx} style={styles.notesText}>{idx + 1}. {line}</Text>
            ))}
          </View>
        )}

        {/* Signature + Date row */}
        <View style={styles.signRow}>
          <Text style={styles.signLabel}>Signature</Text>
          <Text style={styles.signLabel}>Date: {formatDate(workOrder.createdAt || '')}</Text>
        </View>

        {/* Company seal + authorized signatory */}
        <View style={styles.footer}>
          <View style={styles.sigBlock}>
            <View style={styles.sealBox}>
              <Text style={styles.sealBoxText}>Affix Seal Here</Text>
            </View>
            <Text style={styles.sigLine}>Company Seal</Text>
          </View>
          <View style={styles.sigBlock}>
            <Text style={styles.sigLine}>Authorized Signatory</Text>
            <Text style={styles.sigSub}>For Edwin Construction</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
