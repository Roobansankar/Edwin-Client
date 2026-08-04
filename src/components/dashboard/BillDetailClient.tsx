'use client';

import { App, Button, Card, Flex, Table, Typography, Tag } from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { PurchaseBill } from '@/types/erp';
import {
  StatusTag,
  formatCurrency,
  formatDate,
} from './ui';

type Props = {
  bill: PurchaseBill | null;
};

export function BillDetailClient({ bill }: Props) {
  const router = useRouter();

  if (!bill) {
    return (
      <div className="p-10 text-center text-[var(--text-very-muted)]">
        Bill not found.
      </div>
    );
  }

  const po = bill.purchaseOrder;

  return (
    <div>
      <Flex align="center" gap={12} className="mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
          Back to Bills
        </Button>
        <Typography.Title level={4} className="m-0!">
          Bill Details — {bill.billNumber}
        </Typography.Title>
        <StatusTag value={bill.status} />
      </Flex>

      <Flex gap={16} vertical>
        <Card size="small" title="Bill Information">
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="pr-6 py-1.5 text-[var(--text-muted)] w-40">Vendor</td><td>{bill.vendor?.name || '-'}</td></tr>
              <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Project</td><td>{bill.project?.name || '-'}</td></tr>
              <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Bill Amount</td><td><Typography.Text strong>{formatCurrency(bill.amount)}</Typography.Text></td></tr>
              <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Paid Amount</td><td>{formatCurrency(bill.paidAmount)}</td></tr>
              <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Bill Date</td><td>{formatDate(bill.billDate)}</td></tr>
              <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Due Date</td><td>{bill.dueDate ? formatDate(bill.dueDate) : '-'}</td></tr>
              {bill.notes && <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Notes</td><td>{bill.notes}</td></tr>}
              {bill.billFileUrl && (
                <tr><td className="pr-6 py-1.5 text-[var(--text-muted)]">Bill File</td><td><Button type="link" size="small" icon={<FilePdfOutlined />} href={bill.billFileUrl} target="_blank">View Document</Button></td></tr>
              )}
            </tbody>
          </table>
        </Card>

        {po && (
          <>
            <Card
              size="small"
              title={
                <Flex gap={8} align="center">
                  <span>Purchase Order — {po.poNumber}</span>
                  <Tag color="blue">PO Items</Tag>
                  {po.billFileUrl && (
                    <Button type="link" size="small" icon={<FilePdfOutlined />} href={po.billFileUrl} target="_blank">
                      PO
                    </Button>
                  )}
                </Flex>
              }
            >
              <Table
                dataSource={po.items || []}
                pagination={false}
                size="small"
                rowKey="id"
                columns={[
                  { title: '#', key: 'sno', width: 40, render: (_, __, i) => i + 1 },
                  { title: 'Description', dataIndex: 'description' },
                  { title: 'Qty', dataIndex: 'quantity', align: 'right', render: (v: any) => Number(v).toLocaleString() },
                  { title: 'Unit', dataIndex: 'unit' },
                  { title: 'Rate', dataIndex: 'rate', align: 'right', render: (v: any) => formatCurrency(v) },
                  { title: 'Amount', dataIndex: 'amount', align: 'right', render: (v: any) => formatCurrency(v) },
                ]}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5} align="right">
                      <Typography.Text strong>PO Total</Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <Typography.Text strong>{formatCurrency(po.totalAmount)}</Typography.Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </Card>

            <Card
              size="small"
              title={
                <Flex gap={8} align="center">
                  <span>Billed Items</span>
                  <Tag color="green">This Bill</Tag>
                </Flex>
              }
            >
              {bill.billItems && bill.billItems.length > 0 ? (
                <Table
                  dataSource={bill.billItems.map((bi) => {
                    const poItem = po?.items?.find((i) => i.id === bi.poItemId);
                    return {
                      ...bi,
                      description: bi.description || poItem?.description || '',
                      unit: bi.unit || poItem?.unit || 'nos',
                      rate: Number(bi.rate) || Number(poItem?.rate || 0),
                    };
                  })}
                  pagination={false}
                  size="small"
                  rowKey="id"
                  columns={[
                    { title: '#', key: 'sno', width: 40, render: (_, __, i) => i + 1 },
                    { title: 'Description', dataIndex: 'description' },
                    { title: 'Billed Qty', dataIndex: 'quantity', align: 'right', render: (v: any) => Number(v).toLocaleString() },
                    { title: 'Unit', dataIndex: 'unit' },
                    { title: 'Rate', dataIndex: 'rate', align: 'right', render: (v: any) => formatCurrency(v) },
                    { title: 'Amount', dataIndex: 'amount', align: 'right', render: (_, r) => formatCurrency(Number(r.quantity) * Number(r.rate)) },
                  ]}
                  summary={() => {
                    const total = (bill.billItems || []).reduce((s, i) => {
                      const poItem = po?.items?.find((p) => p.id === i.poItemId);
                      const rate = Number(i.rate) || Number(poItem?.rate || 0);
                      return s + Number(i.quantity) * rate;
                    }, 0);
                    return (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={5} align="right">
                          <Typography.Text strong>Bill Total</Typography.Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5} align="right">
                          <Typography.Text strong>{formatCurrency(total)}</Typography.Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    );
                  }}
                />
              ) : (
                <div className="py-4 text-center text-[var(--text-very-muted)]">No billed items recorded for this bill.</div>
              )}
            </Card>

            {bill.billItems && bill.billItems.length > 0 && (
              <Card
                size="small"
                title={
                  <Flex gap={8} align="center">
                    <span>Comparison</span>
                    <Tag color="orange">PO vs Bill</Tag>
                  </Flex>
                }
              >
                <Table
                  dataSource={po.items!.map((poItem) => {
                    const billItem = bill.billItems!.find((bi) => bi.poItemId === poItem.id);
                    return {
                      key: poItem.id,
                      description: poItem.description,
                      unit: poItem.unit,
                      poQty: Number(poItem.quantity),
                      poRate: Number(poItem.rate),
                      poAmount: Number(poItem.amount),
                      billQty: billItem ? Number(billItem.quantity) : 0,
                      billRate: billItem ? Number(billItem.rate) : 0,
                      billAmount: billItem ? Number(billItem.quantity) * Number(billItem.rate) : 0,
                    };
                  })}
                  pagination={false}
                  size="small"
                  rowKey="key"
                  columns={[
                    { title: '#', key: 'sno', width: 40, render: (_, __, i) => i + 1 },
                    { title: 'Description', dataIndex: 'description' },
                    { title: 'Unit', dataIndex: 'unit', width: 60 },
                    {
                      title: 'PO Qty',
                      dataIndex: 'poQty',
                      align: 'right',
                      render: (v: any) => Number(v).toLocaleString(),
                    },
                    {
                      title: 'PO Rate',
                      dataIndex: 'poRate',
                      align: 'right',
                      render: (v: any) => formatCurrency(v),
                    },
                    {
                      title: 'PO Amt',
                      dataIndex: 'poAmount',
                      align: 'right',
                      render: (v: any) => formatCurrency(v),
                    },
                    {
                      title: 'Bill Qty',
                      dataIndex: 'billQty',
                      align: 'right',
                      render: (v: any) => Number(v).toLocaleString(),
                    },
                    {
                      title: 'Bill Rate',
                      dataIndex: 'billRate',
                      align: 'right',
                      render: (v: any) => formatCurrency(v),
                    },
                    {
                      title: 'Bill Amt',
                      dataIndex: 'billAmount',
                      align: 'right',
                      render: (v: any) => formatCurrency(v),
                    },
                  ]}
                  summary={() => {
                    const totalPo = (po.items || []).reduce((s, i) => s + Number(i.amount), 0);
                    const totalBill = (bill.billItems || []).reduce((s, i) => s + Number(i.quantity) * Number(i.rate), 0);
                    return (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={5} align="right">
                          <Typography.Text strong>Totals</Typography.Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5} align="right">
                          <Typography.Text strong>{formatCurrency(totalPo)}</Typography.Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={6} />
                        <Table.Summary.Cell index={7} />
                        <Table.Summary.Cell index={8} align="right">
                          <Typography.Text strong>{formatCurrency(totalBill)}</Typography.Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    );
                  }}
                />
              </Card>
            )}
          </>
        )}

        {!po && (
          <Card size="small" title="Billed Items">
            {bill.billItems && bill.billItems.length > 0 ? (
              <Table
                dataSource={bill.billItems}
                pagination={false}
                size="small"
                rowKey="id"
                columns={[
                  { title: '#', key: 'sno', width: 40, render: (_, __, i) => i + 1 },
                  { title: 'Description', dataIndex: 'description' },
                  { title: 'Qty', dataIndex: 'quantity', align: 'right', render: (v: any) => Number(v).toLocaleString() },
                  { title: 'Unit', dataIndex: 'unit' },
                  { title: 'Rate', dataIndex: 'rate', align: 'right', render: (v: any) => formatCurrency(v) },
                  { title: 'Amount', render: (_, r: any) => formatCurrency(Number(r.quantity) * Number(r.rate)) },
                ]}
              />
            ) : (
              <div className="py-4 text-center text-[var(--text-very-muted)]">No items recorded for this bill.</div>
            )}
          </Card>
        )}
      </Flex>
    </div>
  );
}
