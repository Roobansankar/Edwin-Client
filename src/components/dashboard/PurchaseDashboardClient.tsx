'use client';

import { useEffect, useState } from 'react';
import { Alert, Card, Col, Divider, Flex, Row, Typography } from 'antd';
import { ShoppingCartOutlined, InboxOutlined, FileTextOutlined, WarningOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { fetchPurchaseDashboard } from '@/lib/client-api';
import {
  KpiCard,
  cardClassName,
  mutedTextClassName,
  pageTitleClassName,
  StatusTag,
  formatDate,
} from './ui';
import { PageSkeleton } from '@/components/dashboard/Skeletons';
import { useDashboardRouter } from '@/components/dashboard/navigation';

export function PurchaseDashboardClient() {
  const router = useDashboardRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await fetchPurchaseDashboard();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <PageSkeleton />;
  if (error) return <Alert type="error" message={error} showIcon />;
  if (!data) return null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Typography.Title level={3} className={pageTitleClassName}>
            Purchase Dashboard
          </Typography.Title>
          <Typography.Text className={mutedTextClassName}>
            Material requests, purchase orders and bills at a glance
          </Typography.Text>
        </div>
      </div>

      <div className="rise-stagger mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            tone="blue"
            title="Material Request"
            value={data.kpis.materialRequirementCount}
            icon={<FileTextOutlined className="text-blue-500" />}
            onClick={() => router.push('/dashboard/material-requirement')}
          />
          <KpiCard
            tone="green"
            title="Active POs"
            value={data.kpis.activePOCount}
            icon={<ShoppingCartOutlined className="text-emerald-500" />}
            note="Approved"
            onClick={() => router.push('/dashboard/purchase-orders')}
          />
          <KpiCard
            tone="purple"
            title="Material Received"
            value={data.kpis.materialReceivedCount}
            icon={<InboxOutlined className="text-purple-500" />}
            onClick={() => router.push('/dashboard/material-received')}
          />
          <KpiCard
            tone="amber"
            title="Pending POs"
            value={data.kpis.pendingPOCount}
            icon={<ClockCircleOutlined className="text-amber-500" />}
            note="Awaiting Approval"
            onClick={() => router.push('/dashboard/purchase-orders')}
          />
          <KpiCard
            tone="orange"
            title="Bills"
            value={data.kpis.unpaidBillCount}
            icon={<WarningOutlined className="text-orange-500" />}
            note="Unpaid bills"
            onClick={() => router.push('/dashboard/accounts/bills')}
          />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title={<Typography.Text strong className="text-[var(--text-primary)]!">Recent Activity</Typography.Text>}
            className={cardClassName}
          >
            <Typography.Text strong className="mb-3 block">Latest Bills</Typography.Text>
            <div className="space-y-4">
              {data.recentActivity.bills.map((bill: any) => (
                <Flex key={bill.id} justify="space-between" align="center" className="pb-3! border-b border-[var(--border)] last:border-0">
                  <div>
                    <Typography.Text className="block">{bill.billNumber}</Typography.Text>
                    <Typography.Text type="secondary" className="text-xs">{bill.vendorName}</Typography.Text>
                  </div>
                  <div className="text-right">
                    <StatusTag value={bill.status} />
                    <Typography.Text type="secondary" className="mt-1 block text-xs">{formatDate(bill.billDate)}</Typography.Text>
                  </div>
                </Flex>
              ))}
            </div>

            <Divider className="my-4 border-[var(--border)]" />

            <Typography.Text strong className="mb-3 block">Latest POs</Typography.Text>
            <div className="space-y-4">
              {data.recentActivity.pos.map((po: any) => (
                <Flex key={po.id} justify="space-between" align="center" className="pb-3! border-b border-[var(--border)] last:border-0">
                  <div>
                    <Typography.Text className="block">{po.poNumber}</Typography.Text>
                    <Typography.Text type="secondary" className="text-xs">{po.vendorName}</Typography.Text>
                  </div>
                  <div className="text-right">
                    <StatusTag value={po.status} />
                    <Typography.Text type="secondary" className="mt-1 block text-xs">{formatDate(po.createdAt)}</Typography.Text>
                  </div>
                </Flex>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
