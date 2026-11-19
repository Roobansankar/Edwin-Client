import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ExcelRow } from '@/lib/excel';

// Generic report table as a PDF: same headings and rows as the Excel export.
// Column widths follow the length of their content; numbers are right-aligned
// and grouped Indian-style. Built-in PDF fonts have no ₹ glyph, so amounts
// are plain numbers (the heading names the column).

const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
const HEAD_BG = '#f1f5f9';
const ZEBRA = '#f8fafc';

const formatCell = (value: ExcelRow[number]) => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return String(value);
};

function columnWidths(headers: string[], rows: ExcelRow[]) {
  // Weight = typical content length (header vs. longest sampled cell), capped
  // so a long description cannot squeeze every other column.
  const sample = rows.slice(0, 200);
  const weights = headers.map((header, i) => {
    const longest = sample.reduce((max, row) => Math.max(max, formatCell(row[i]).length), 0);
    return Math.min(28, Math.max(6, Math.max(header.length * 0.8, longest)));
  });
  const total = weights.reduce((sum, w) => sum + w, 0);
  return weights.map((w) => `${(w / total) * 100}%`);
}

export function TablePdf({
  title,
  subtitle,
  headers,
  rows,
  generatedAt,
}: {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: ExcelRow[];
  generatedAt: string;
}) {
  const widths = columnWidths(headers, rows);
  const numeric = headers.map((_, i) => rows.length > 0 && rows.every((row) => row[i] === '' || row[i] === null || row[i] === undefined || typeof row[i] === 'number'));
  const fontSize = headers.length > 13 ? 6 : headers.length > 10 ? 6.5 : 7.5;

  const styles = StyleSheet.create({
    page: { paddingTop: 28, paddingBottom: 36, paddingHorizontal: 24, fontSize, fontFamily: 'Helvetica', color: INK },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 2, borderBottomColor: INK, paddingBottom: 8, marginBottom: 10 },
    company: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
    sub: { fontSize: 9, color: MUTED, marginTop: 2 },
    meta: { fontSize: 7.5, color: MUTED, textAlign: 'right' },
    head: { flexDirection: 'row', backgroundColor: HEAD_BG, borderTopWidth: 1, borderBottomWidth: 1, borderColor: LINE },
    headCell: { paddingVertical: 4, paddingHorizontal: 3, fontFamily: 'Helvetica-Bold', fontSize: fontSize - 0.5, color: MUTED },
    row: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: LINE },
    cell: { paddingVertical: 3, paddingHorizontal: 3 },
    empty: { paddingVertical: 20, textAlign: 'center', color: MUTED },
    footer: { position: 'absolute', bottom: 16, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: MUTED },
  });

  return (
    <Document title={title} author="Edwin Constructions">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.company}>Edwin Constructions</Text>
            <Text style={styles.sub}>{subtitle ? `${subtitle} — ${title}` : title}</Text>
          </View>
          <View>
            <Text style={styles.meta}>Generated {generatedAt}</Text>
            <Text style={styles.meta}>{rows.length} {rows.length === 1 ? 'row' : 'rows'}</Text>
          </View>
        </View>

        <View style={styles.head} fixed>
          {headers.map((h, i) => (
            <Text key={i} style={[styles.headCell, { width: widths[i], textAlign: numeric[i] ? 'right' : 'left' }]}>{h}</Text>
          ))}
        </View>

        {rows.length === 0 && <Text style={styles.empty}>No rows</Text>}
        {rows.map((row, r) => (
          <View key={r} style={[styles.row, r % 2 ? { backgroundColor: ZEBRA } : {}]} wrap={false}>
            {headers.map((_, i) => (
              <Text key={i} style={[styles.cell, { width: widths[i], textAlign: numeric[i] ? 'right' : 'left' }]}>{formatCell(row[i])}</Text>
            ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>Edwin Constructions · {title}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
