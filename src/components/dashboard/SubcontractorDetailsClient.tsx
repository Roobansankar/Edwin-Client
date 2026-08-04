'use client';

import { Card, Descriptions, Divider, Flex, Space, Table, Tag, Typography, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowLeftOutlined, FileTextOutlined, FilePdfOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import type { Subcontractor, SubcontractWorkOrder } from '@/types/erp';
import {
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';
import { getApiOrigin } from '@/lib/api-url';

type SubcontractorDetailsClientProps = {
  subcontractor: Subcontractor;
  workOrders: SubcontractWorkOrder[];
};

export function SubcontractorDetailsClient({ subcontractor, workOrders }: SubcontractorDetailsClientProps) {
  const router = useRouter();

  const columns: ColumnsType<SubcontractWorkOrder> = [
    {
      title: 'WO Number',
      dataIndex: 'woNumber',
      key: 'woNumber',
      render: (text) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: 'Project',
      dataIndex: ['project', 'name'],
      key: 'project',
    },
    {
      title: 'Work Category',
      dataIndex: ['workCategory', 'name'],
      key: 'category',
    },
    {
      title: 'Work Order',
      key: 'workorder',
      render: (_, record) =>
        record.workorderUrl ? (
          <Typography.Link href={`${getApiOrigin()}${record.workorderUrl}`} target="_blank">
            <FilePdfOutlined className="text-red-500" /> View File
          </Typography.Link>
        ) : '-',
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (val) => formatCurrency(val),
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      width: 200,
      render: (val) => <Typography.Text type="secondary" className="text-xs">{val || '-'}</Typography.Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'approved' ? 'success' : 'processing'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Period',
      key: 'period',
      render: (_, record) => (
        <Typography.Text className="text-xs">
          {record.startDate ? dayjs(record.startDate).format('DD/MM/YY') : '-'} to{' '}
          {record.endDate ? dayjs(record.endDate).format('DD/MM/YY') : '-'}
        </Typography.Text>
      ),
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
            <TeamOutlined className={titleIconClassName} /> {subcontractor.name}
          </Typography.Title>
        </Space>
      </Flex>

      <Card className={cardClassName} title="Subcontractor Information">
        <Descriptions bordered column={{ xxl: 3, xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }}>
          <Descriptions.Item label="Work Category">
            <Tag color="blue">{subcontractor.workCategory?.name}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="GST Number">{subcontractor.gstNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="Contact Person">{subcontractor.contactPerson || '-'}</Descriptions.Item>
          <Descriptions.Item label="Phone">{subcontractor.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="Email">{subcontractor.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="Registered On">{formatDate(subcontractor.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="Address" span={3}>{subcontractor.address || '-'}</Descriptions.Item>
          <Descriptions.Item label="Internal Notes" span={3}>{subcontractor.notes || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Divider />

      <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
        <FileTextOutlined className="text-sky-500 text-xl" />
        <Typography.Title level={4} style={{ margin: 0 }}>Work Order History</Typography.Title>
      </Flex>

      <Card className={cardClassName}>
        <Table
          dataSource={workOrders}
          columns={columns}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'No work orders found for this subcontractor.' }}
        />
      </Card>
    </div>
  );
}
