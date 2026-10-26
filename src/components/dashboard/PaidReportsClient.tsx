'use client';

import { useMemo, useState } from 'react';
import { Button, Card, DatePicker, Flex, Input, Select, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { FileExcelOutlined } from '@ant-design/icons';
import { buildPaidReport, type PaidReportRow, type PaidReportSources } from '@/lib/paid-report';
import { exportToExcel } from '@/lib/excel';
import { formatCurrency, weekRangeLabel, weekStartOf } from './ui';

const weekNumber = (date: string) => `${Math.ceil(Number(date.slice(8, 10)) / 7)}${['st', 'nd', 'rd'][Math.ceil(Number(date.slice(8, 10)) / 7) - 1] || 'th'} Week`;
const headers = ['S.No', 'Date', 'Week', 'Project Name', 'Items', 'Type', 'Vendor / Team', 'Description', 'GST / Non GST', 'Bill No', 'Without GST', 'GST Amount', 'With GST', 'Total Amount', 'Paid Amount', 'Balance', 'Payment Status'];

export function PaidReportsClient(props: PaidReportSources) {
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string | undefined>();
  const [subcontractorFilter, setSubcontractorFilter] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const rows = useMemo(() => buildPaidReport(props), [props]);
  const payeeOptions = useMemo(() => {
    const optionsFor = (category: string) => [...new Set(rows.filter((row) => row.category === category).map((row) => row.name))]
      .sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name }));
    return { vendor: optionsFor('vendor'), subcontractor: optionsFor('subcontractor') };
  }, [rows]);
  const filtered = rows.filter((row) => {
    const end = weekStartOf(row.week)?.add(6, 'day').format('YYYY-MM-DD') || row.week;
    return `${row.name} ${row.project} ${row.description} ${row.billNo} ${row.type}`.toLowerCase().includes(search.toLowerCase()) &&
      (!range[0] || end >= range[0].format('YYYY-MM-DD')) && (!range[1] || row.week <= range[1].format('YYYY-MM-DD'));
  });
  const exportRows = (records: PaidReportRow[], name: string) => exportToExcel({
    filename: `Paid-Report-${name}`, sheetName: 'Paid Report', headers,
    rows: records.map((row, index) => [index + 1, weekRangeLabel(row.week), weekNumber(row.week), row.project, row.item, row.type, row.name, row.description,
      row.gst, row.billNo, row.withoutGst, row.gstAmount, row.gstAmount > 0 ? row.total : 0, row.total, row.paid, row.balance ?? '', 'Paid']),
  });
  const columns: ColumnsType<PaidReportRow> = [
    { title: 'S.No', key: 'sno', width: 70, render: (_, __, index) => index + 1 },
    { title: 'Date', dataIndex: 'week', width: 170, render: (date: string) => weekRangeLabel(date) },
    { title: 'Week', dataIndex: 'week', key: 'weekNumber', width: 110, render: weekNumber },
    { title: 'Project Name', dataIndex: 'project', width: 220 },
    { title: 'Items', dataIndex: 'item', width: 130 }, { title: 'Type', dataIndex: 'type', width: 150 },
    { title: 'Vendor / Team', dataIndex: 'name', width: 180 }, { title: 'Description', dataIndex: 'description', width: 280 },
    { title: 'GST / Non GST', dataIndex: 'gst', width: 130 }, { title: 'Bill No', dataIndex: 'billNo', width: 130 },
    ...(['withoutGst', 'gstAmount'] as const).map((key) => ({
      title: { withoutGst: 'Without GST', gstAmount: 'GST Amount', total: 'Total Amount', paid: 'Paid Amount' }[key],
      dataIndex: key, key, width: 140, align: 'right' as const, render: (value: number) => formatCurrency(value),
    })),
    { title: 'With GST', key: 'withGst', width: 140, align: 'right', render: (_, row) => row.gstAmount > 0 ? formatCurrency(row.total) : '-' },
    { title: 'Total Amount', dataIndex: 'total', width: 140, align: 'right', render: (value: number) => formatCurrency(value) },
    { title: 'Paid Amount', dataIndex: 'paid', width: 140, align: 'right', render: (value: number) => formatCurrency(value) },
    { title: 'Balance', dataIndex: 'balance', width: 140, align: 'right', render: (value: number | null) => value === null ? '-' : formatCurrency(value) },
    { title: 'Payment Status', key: 'status', width: 150, render: () => <Tag color="success">Paid</Tag> },
  ];
  return <div>
    <Flex justify="space-between" align="center" wrap="wrap" gap={12} className="mb-4">
      <Typography.Title level={3} className="m-0!">Paid Report</Typography.Title>
      <Button type="primary" icon={<FileExcelOutlined />} disabled={!filtered.length} onClick={() => exportRows(filtered, 'All')}>Export All to Excel</Button>
    </Flex>
    <Flex gap={12} wrap="wrap" className="mb-4">
      <Input.Search placeholder="Search project, team, vendor, description" allowClear value={search} onChange={(event) => setSearch(event.target.value)} style={{ width: 340 }} />
      <DatePicker.RangePicker onChange={(dates) => setRange(dates ? [dates[0], dates[1]] : [null, null])} />
    </Flex>
    <Card><Tabs items={[
      ['all', 'All'], ['labour', 'Daily Labour List'], ['vendor', 'Vendor Payments'], ['subcontractor', 'Subcontractor Payments'], ['expenses', 'Expenses'],
    ].map(([key, label]) => {
      const payeeFilter = key === 'vendor' ? vendorFilter : key === 'subcontractor' ? subcontractorFilter : undefined;
      const records = key === 'all' ? filtered : filtered.filter((row) => row.category === key && (!payeeFilter || row.name === payeeFilter));
      return { key, label, children: <>
        {(key === 'vendor' || key === 'subcontractor') && (
          <Select
            showSearch
            allowClear
            className="mb-4"
            style={{ width: '100%', maxWidth: 320 }}
            placeholder={key === 'vendor' ? 'Filter by vendor' : 'Filter by subcontractor'}
            aria-label={key === 'vendor' ? 'Filter vendor payments by vendor' : 'Filter subcontractor payments by subcontractor'}
            value={payeeFilter}
            onChange={key === 'vendor' ? setVendorFilter : setSubcontractorFilter}
            options={payeeOptions[key]}
            optionFilterProp="label"
          />
        )}
        <Flex justify="space-between" align="center" className="mb-4" gap={12} wrap="wrap">
          <Typography.Text strong>Total Paid: {formatCurrency(records.reduce((sum, row) => sum + row.paid, 0))}</Typography.Text>
          {key !== 'all' && <Button icon={<FileExcelOutlined />} disabled={!records.length} onClick={() => exportRows(records, key)}>Export to Excel</Button>}
        </Flex>
        <Table rowKey="key" columns={columns} dataSource={records} scroll={{ x: 2600 }} pagination={{ pageSize: 20 }} locale={{ emptyText: 'No recorded payments' }} />
      </> };
    })} /></Card>
  </div>;
}
