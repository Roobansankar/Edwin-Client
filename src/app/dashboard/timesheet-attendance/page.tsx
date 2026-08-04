import { fetchProjects } from '@/lib/api';
import { TimesheetAttendanceClient } from '@/components/dashboard/TimesheetAttendanceClient';
import { Alert } from 'antd';

async function loadData() {
  try {
    const projects = await fetchProjects();
    return { projects };
  } catch {
    return null;
  }
}

export default async function AttendancePage() {
  const data = await loadData();
  if (data === null) return <Alert message="Error" description="Failed to load data" type="error" showIcon />;
  return <TimesheetAttendanceClient projects={data.projects} />;
}
