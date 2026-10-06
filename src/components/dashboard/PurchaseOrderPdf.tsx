import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { PurchaseOrder } from '@/types/erp';
import { formatDate } from './ui';

// Layout modeled on the vendor-style PO format the client asked to match:
// bold "PURCHASE ORDER" title with two dark reference boxes (PO No / Date)
// top-right, Vendor Name/Address and Ship To/Bill To as two-up bordered
// panels, a grid-lined items table, a right-aligned totals block with a
// solid TOTAL bar, a terms note box, and a signature + company seal footer.
const DARK = '#1f2937';
const BLACK = '#000000';
const GREY_700 = '#374151';
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
    lineHeight: 1.2,
  },
  companyTagline: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 7,
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
  colNo: { width: '7%' },
  colDesc: { width: '35%' },
  colQty: { width: '13%', textAlign: 'center' },
  colUnit: { width: '13%', textAlign: 'center' },
  colRate: { width: '16%', textAlign: 'right' },
  colAmt: { width: '16%', textAlign: 'right', borderLeftWidth: 1, borderLeftColor: GREY_200 },
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
  notesText: {
    fontSize: 8.5,
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
    justifyContent: 'flex-end',
  },
  sigBlock: {
    width: 190,
    alignItems: 'center',
  },
  sigCompany: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  signSpace: {
    height: 36,
  },
  sigUnderline: {
    width: 190,
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    marginBottom: 4,
  },
  sigLine: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
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
  purchaseOrder: PurchaseOrder;
}

export function PurchaseOrderPdf({ purchaseOrder }: Props) {
  const items = purchaseOrder.items || [];
  const basicAmount = Number(purchaseOrder.totalAmount) || 0;
  const gstPercent = Number(purchaseOrder.gstPercent) || 0;
  const gstAmount = Number(purchaseOrder.gstAmount) || 0;
  const transportAmount = Number(purchaseOrder.transportAmount) || 0;
  const total = Number(purchaseOrder.totalWithGst) || basicAmount + gstAmount + transportAmount;
  const vendor = purchaseOrder.vendor;
  const project = purchaseOrder.project;

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

        {/* Title + PO No / Date reference boxes */}
        <View style={styles.headerRow}>
          <Text style={styles.mainTitle}>PURCHASE ORDER</Text>
          <View style={styles.headerBoxes}>
            <View style={styles.headerBox}>
              <Text style={styles.headerBoxLabel}>Purchase Order</Text>
            </View>
            <Text style={styles.headerBoxValue}>{purchaseOrder.poNumber}</Text>
            <View style={[styles.headerBox, { marginTop: 6 }]}>
              <Text style={styles.headerBoxLabel}>Date</Text>
            </View>
            <Text style={styles.headerBoxValue}>{formatDate(purchaseOrder.createdAt || '')}</Text>
          </View>
        </View>

        {/* Vendor Name / Vendor Address */}
        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <View style={styles.barHeader}><Text style={styles.barHeaderText}>Vendor Name</Text></View>
            <View style={styles.colBody}>
              <Text style={styles.boldText}>{vendor?.name || 'N/A'}</Text>
            </View>
          </View>
          <View style={[styles.colHalf, styles.colHalfLast]}>
            <View style={styles.barHeader}><Text style={styles.barHeaderText}>Vendor Address</Text></View>
            <View style={styles.colBody}>
              <Text style={styles.mutedText}>{vendor?.address || '-'}</Text>
              {(vendor?.contactPhone || vendor?.contactEmail) && (
                <Text style={[styles.mutedText, { marginTop: 3 }]}>
                  {vendor?.contactPhone ? `Tel: ${vendor.contactPhone}` : ''}
                  {vendor?.contactPhone && vendor?.contactEmail ? '  |  ' : ''}
                  {vendor?.contactEmail ? `Email: ${vendor.contactEmail}` : ''}
                </Text>
              )}
              {vendor?.gstNumber && (
                <Text style={[styles.boldText, { marginTop: 3 }]}>GSTIN: {vendor.gstNumber}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Ship To / Bill To */}
        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <View style={styles.barHeader}><Text style={styles.barHeaderText}>Ship To</Text></View>
            <View style={styles.colBody}>
              <Text style={styles.boldText}>{project?.name || 'N/A'}</Text>
              <Text style={styles.mutedText}>{project?.location || '-'}</Text>
            </View>
          </View>
          <View style={[styles.colHalf, styles.colHalfLast]}>
            <View style={styles.barHeader}><Text style={styles.barHeaderText}>Bill To</Text></View>
            <View style={styles.colBody}>
              <Text style={styles.boldText}>EDWIN CONSTRUCTION</Text>
              <Text style={styles.mutedText}>2/1-1A1 Rainbow Garden, Kamarajar Salai,</Text>
              <Text style={styles.mutedText}>Moovendar Nagar, Konam PO, Nagercoil - 629004,</Text>
              <Text style={styles.mutedText}>Kanyakumari Dist, Tamil Nadu, India</Text>
              <Text style={[styles.boldText, { marginTop: 3 }]}>GST No: 33AAFFE2810H1ZY</Text>
            </View>
          </View>
        </View>

        {/* Items table */}
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colNo]}>S.No</Text>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colUnit]}>Unit</Text>
            <Text style={[styles.th, styles.colRate]}>Unit Price</Text>
            <Text style={[styles.th, styles.colAmt]}>Total</Text>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, styles.colNo, styles.colBorderRight]}>{index + 1}</Text>
              <Text style={[styles.td, styles.colDesc, styles.colBorderRight]}>{item.description}</Text>
              <Text style={[styles.td, styles.colQty, styles.colBorderRight]}>{Number(item.quantity).toFixed(0)}</Text>
              <Text style={[styles.td, styles.colUnit, styles.colBorderRight]}>{item.unit}</Text>
              <Text style={[styles.td, styles.colRate]}>{formatINR(item.rate)}</Text>
              <Text style={[styles.td, styles.colAmt, { fontFamily: 'Helvetica-Bold' }]}>{formatINR(item.amount || 0)}</Text>
            </View>
          ))}
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
            {transportAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Transport</Text>
                <Text style={styles.totalsValue}>{formatINR(transportAmount)}</Text>
              </View>
            )}
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>Total</Text>
              <View style={styles.grandValueBox}>
                <Text style={styles.grandValueText}>{formatINR(total)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Terms note */}
        <View style={styles.notesBox}>
          <Text style={styles.notesText}>1. Material amount must be refundable in case of material loss or damage.</Text>
        </View>

        {/* Signature + Date row (matches printed-slip style) */}
        <View style={styles.signRow}>
          <Text style={styles.signLabel}>Signature</Text>
          <Text style={styles.signLabel}>Date: {formatDate(purchaseOrder.createdAt || '')}</Text>
        </View>

        {/* Signature block: company name, then an underlined line to sign on */}
        <View style={styles.footer}>
          <View style={styles.sigBlock}>
            <Text style={styles.sigCompany}>For Edwin Construction</Text>
            <View style={styles.signSpace} />
            <View style={styles.sigUnderline} />
            <Text style={styles.sigLine}>Purchase Order Sign</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
