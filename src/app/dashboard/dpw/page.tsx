'use client';

import { useEffect, useState } from 'react';
import { clientApiFetch } from '@/lib/client-api';
import { DpwClient } from '@/components/dashboard/DpwClient';
import { Alert, Spin } from 'antd';
import type { DailyLabourReport, Project, Trade } from '@/types/erp';

export default function DpwPage() {
  const [data, setData] = useState<{ reports: DailyLabourReport[], projects: Project[], trades: Trade[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [reports, projects, trades] = await Promise.all([
          clientApiFetch<DailyLabourReport[]>('/daily-labour'),
          clientApiFetch<Project[]>('/projects'),
          clientApiFetch<Trade[]>('/trades'),
        ]);
        setData({ reports, projects, trades });
      } catch (err) {
        console.error('Failed to fetch DPW data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="p-10 text-center"><Spin size="large" /></div>;

  if (error || data === null) {
    return (
      <Alert
        message="Error"
        description={error || "Failed to load daily reports. Please check your connection to the server."}
        type="error"
        showIcon
      />
    );
  }

  return (
    <DpwClient
      reports={data.reports}
      projects={data.projects}
      trades={data.trades}
      title="Daily Report DPW"
      showActions={false}
    />
  );
}
