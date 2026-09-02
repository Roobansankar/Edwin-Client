import { Alert } from 'antd';
import { fetchTimesheets } from '@/lib/api';
import { SiteEngineerAttendanceClient } from '@/components/dashboard/SiteEngineerAttendanceClient';

async function loadData() {
  try {
    const tsResult = await fetchTimesheets('limit=500');
    return { timesheets: tsResult.data ?? [] };
  } catch {
    return null;
  }
}

export default async function SiteEngineerAttendancePage() {
  const data = await loadData();
  if (data === null) return <Alert title="Error" description="Failed to load data" type="error" showIcon />;
  return <SiteEngineerAttendanceClient timesheets={data.timesheets} />;
}
