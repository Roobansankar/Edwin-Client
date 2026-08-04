'use client';

import { useEffect, useState, useCallback } from 'react';
import { clientApiFetch } from '@/lib/client-api';
import { DpwClient } from '@/components/dashboard/DpwClient';
import { Alert, Spin } from 'antd';
import type { Project, Trade, DailyLabourReport } from '@/types/erp';

export default function NewDpwPage() {
  const [data, setData] = useState<{ projects: Project[], trades: Trade[], reports: DailyLabourReport[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [projects, trades, reports] = await Promise.all([
        clientApiFetch<Project[]>('/projects'),
        clientApiFetch<Trade[]>('/trades'),
        clientApiFetch<DailyLabourReport[]>('/daily-labour'),
      ]);
      setData({ projects, trades, reports });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="p-10 text-center"><Spin size="large" /></div>;
  if (error) return <Alert message="Error" description={error} type="error" showIcon />;
  if (!data) return null;

  return (
    <div className="p-4">
      <DpwClient 
        reports={data.reports} 
        projects={data.projects} 
        trades={data.trades}
        onRefresh={() => load(true)}
        defaultOpen={true}
        title="Daily Entry List"
      />
    </div>
  );
}
