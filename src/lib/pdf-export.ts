import { createElement } from 'react';
import type { ExcelRow } from './excel';

export type ExportFormat = 'excel' | 'pdf';

// Same input shape as exportToExcel, written as a landscape PDF table and
// downloaded. The PDF library is loaded only when an export is requested.
export async function exportTableToPdf({
  filename,
  sheetName,
  headers,
  rows,
  subtitle,
}: {
  filename: string;
  sheetName: string;
  headers: string[];
  rows: ExcelRow[];
  subtitle?: string;
}) {
  const [{ pdf }, { TablePdf }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/dashboard/TablePdf'),
  ]);
  const generatedAt = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date());
  const blob = await pdf(createElement(TablePdf, { title: sheetName, subtitle, headers, rows, generatedAt })).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
