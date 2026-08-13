'use client';

import { useEffect, useState, useCallback } from 'react';
import { clientApiFetch } from '@/lib/client-api';
import { DpwClient } from '@/components/dashboard/DpwClient';
import { Alert, Spin } from 'antd';
import type { Project, Trade, Team, DailyLabourReport } from '@/types/erp';

export default function NewDpwPage() {
  const [data, setData] = useState<{ projects: Project[], trades: Trade[], teams: Team[], reports: DailyLabourReport[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [projects, trades, teams, reports] = await Promise.all([
        clientApiFetch<Project[]>('/projects'),
        clientApiFetch<Trade[]>('/trades'),
        clientApiFetch<Team[]>('/teams'),
        clientApiFetch<DailyLabourReport[]>('/daily-labour'),
      ]);
      setData({ projects, trades, teams, reports });
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
    <DpwClient
      reports={data.reports}
      projects={data.projects}
      trades={data.trades}
      teams={data.teams}
      onRefresh={() => load(true)}
      defaultOpen={false}
      title="Daily Entry List"
    />
  );
}
