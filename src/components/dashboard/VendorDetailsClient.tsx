'use client';

import { Card, Descriptions, Divider, Flex, Space, Table, Tag, Typography, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowLeftOutlined, FilePdfOutlined, ShopOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import type { Vendor, PurchaseOrder } from '@/types/erp';
import {
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

type VendorDetailsClientProps = {
  vendor: Vendor;
  purchaseOrders: PurchaseOrder[];
};

export function VendorDetailsClient({ vendor, purchaseOrders }: VendorDetailsClientProps) {
  const router = useRouter();

  const approvedPOs = useMemo(
    () => purchaseOrders.filter((po) => po.status === 'approved'),
    [purchaseOrders],
  );

  const totalOrdered = useMemo(
    () => approvedPOs.reduce((sum, po) => sum + Number(po.totalWithGst || po.totalAmount || 0), 0),
    [approvedPOs],
  );

  const totalPaid = useMemo(
    () => approvedPOs.reduce((sum, po) => sum + Number(po.paidAmount || 0), 0),
    [approvedPOs],
  );

  const totalPending = totalOrdered - totalPaid;

  const columns: ColumnsType<PurchaseOrder> = [
    {
      title: 'PO Number',
      dataIndex: 'poNumber',
      key: 'poNumber',
      render: (text) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: 'Project',
      key: 'project',
      render: (_, record) => record.project?.name || record.projectId,
    },
    {
      title: 'MR Number',
      dataIndex: 'materialRequirementNo',
      key: 'materialRequirementNo',
      render: (v) => v || '-',
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalWithGst',
      key: 'totalWithGst',
      align: 'right',
      render: (val, record) => formatCurrency(val || record.totalAmount),
    },
    {
      title: 'Paid',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      align: 'right',
      render: (val) => val ? formatCurrency(val) : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'Balance',
      key: 'balance',
      align: 'right',
      render: (_, record) => {
        const total = Number(record.totalWithGst || record.totalAmount || 0);
        const paid = Number(record.paidAmount || 0);
        const balance = total - paid;
        return <Typography.Text strong={balance > 0}>{formatCurrency(balance)}</Typography.Text>;
      },
    },
    {
      title: 'Bill',
      key: 'bill',
      render: (_, record) =>
        record.billFileUrl ? (
          <Typography.Link href={record.billFileUrl} target="_blank">
            <FilePdfOutlined className="text-red-500" /> View
          </Typography.Link>
        ) : (
          <Typography.Text type="secondary">-</Typography.Text>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'processing'}>
          {String(status).toUpperCase().replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => formatDate(v),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName}>
        <Space size="middle">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
            type="text"
          />
          <Typography.Title level={3} className={pageTitleClassName} style={{ margin: 0 }}>
            <ShopOutlined className={titleIconClassName} /> {vendor.name}
          </Typography.Title>
        </Space>
      </Flex>

      <Card className={cardClassName} title="Vendor Information">
        <Descriptions bordered column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
          <Descriptions.Item label="GST Number">{vendor.gstNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="Category">{vendor.category || '-'}</Descriptions.Item>
          <Descriptions.Item label="State">{vendor.state || '-'}</Descriptions.Item>
          <Descriptions.Item label="Contact Email">{vendor.contactEmail || '-'}</Descriptions.Item>
          <Descriptions.Item label="Contact Phone">{vendor.contactPhone || '-'}</Descriptions.Item>
          <Descriptions.Item label="Registered On">{formatDate(vendor.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="Address" span={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>{vendor.address || '-'}</Descriptions.Item>
          <Descriptions.Item label="Bank Name">{vendor.bankName || '-'}</Descriptions.Item>
          <Descriptions.Item label="Account Holder">{vendor.accountHolderName || '-'}</Descriptions.Item>
          <Descriptions.Item label="Account Number">{vendor.accountNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="IFSC Code">{vendor.ifscCode || '-'}</Descriptions.Item>
          <Descriptions.Item label="Branch">{vendor.branch || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Divider />

      <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
        <ShoppingCartOutlined className="text-sky-500 text-xl" />
        <Typography.Title level={4} style={{ margin: 0 }}>Purchase Order History</Typography.Title>
      </Flex>

      <Flex gap={16} wrap="wrap" className="mb-6!">
        <Card size="small" className="flex-1 min-w-48" styles={{ body: { padding: '12px 16px' } }}>
          <Typography.Text type="secondary" className="text-xs uppercase block">Total POs (Approved)</Typography.Text>
          <Typography.Title level={4} style={{ margin: 0 }}>{approvedPOs.length}</Typography.Title>
        </Card>
        <Card size="small" className="flex-1 min-w-48" styles={{ body: { padding: '12px 16px' } }}>
          <Typography.Text type="secondary" className="text-xs uppercase block">Ordered Amount</Typography.Text>
          <Typography.Title level={4} style={{ margin: 0, color: '#38bdf8' }}>{formatCurrency(totalOrdered)}</Typography.Title>
        </Card>
        <Card size="small" className="flex-1 min-w-48" styles={{ body: { padding: '12px 16px' } }}>
          <Typography.Text type="secondary" className="text-xs uppercase block">Paid Amount</Typography.Text>
          <Typography.Title level={4} style={{ margin: 0, color: '#22c55e' }}>{formatCurrency(totalPaid)}</Typography.Title>
        </Card>
        <Card size="small" className="flex-1 min-w-48" styles={{ body: { padding: '12px 16px' } }}>
          <Typography.Text type="secondary" className="text-xs uppercase block">Pending Amount</Typography.Text>
          <Typography.Title level={4} style={{ margin: 0, color: totalPending > 0 ? '#ef4444' : undefined }}>{formatCurrency(totalPending)}</Typography.Title>
        </Card>
      </Flex>

      <Card className={cardClassName}>
        <Table
          dataSource={approvedPOs}
          columns={columns}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
          locale={{ emptyText: 'No approved purchase orders found for this vendor.' }}
        />
      </Card>
    </div>
  );
}
