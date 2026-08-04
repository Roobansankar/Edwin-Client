'use client';

import { useEffect, useState, use } from 'react';
import { clientApiFetch } from '@/lib/client-api';
import { DpwForm } from '@/components/dashboard/DpwForm';
import { Typography, Breadcrumb, Flex, Alert, Spin } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { pageHeaderClassName, pageTitleClassName, titleIconClassName } from '@/components/dashboard/ui';
import Link from 'next/link';
import type { Project, Trade, DailyLabourReport } from '@/types/erp';

export default function EditDpwPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ projects: Project[], trades: Trade[], report: DailyLabourReport } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [projects, trades, report] = await Promise.all([
          clientApiFetch<Project[]>('/projects'),
          clientApiFetch<Trade[]>('/trades'),
          clientApiFetch<DailyLabourReport>(`/daily-labour/${id}`),
        ]);
        setData({ projects, trades, report });
      } catch (err) {
        console.error('Failed to fetch DPW data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) return <div className="p-10 text-center"><Spin size="large" /></div>;
  if (error) return <Alert message="Error" description={error} type="error" showIcon />;
  if (!data) return null;

  return (
    <div className="p-4">
      <Flex justify="space-between" align="center" className={pageHeaderClassName}>
        <Typography.Title level={3} className={pageTitleClassName}>
          <CalendarOutlined className={titleIconClassName} /> Daily Report Workers (DPW)
        </Typography.Title>
      </Flex>

      <DpwForm 
        projects={data.projects} 
        trades={data.trades} 
        initialValues={data.report}
      />
    </div>
  );
}
