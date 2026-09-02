import { fetchSalaries, fetchTrades, fetchTeams } from '@/lib/api';
import { SalaryClient } from '@/components/dashboard/SalaryClient';
import { LabourTradesClient } from '@/components/dashboard/LabourTradesClient';
import { Alert, Divider } from 'antd';

async function loadSalaries() {
  try {
    return await fetchSalaries();
  } catch (error) {
    return null;
  }
}

async function loadTrades() {
  try {
    return await fetchTrades();
  } catch (error) {
    return null;
  }
}

async function loadTeams() {
  try {
    return await fetchTeams();
  } catch (error) {
    return [];
  }
}

export default async function SalaryPage() {
  const [salaries, trades, teams] = await Promise.all([loadSalaries(), loadTrades(), loadTeams()]);

  if (salaries === null) {
    return (
      <Alert
        message="Failed to load salary data"
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <SalaryClient salaries={salaries} />
      <Divider />
      {trades === null ? (
        <Alert title="Failed to load labour trades" type="error" showIcon />
      ) : (
        <LabourTradesClient trades={trades} teams={teams} />
      )}
    </div>
  );
}
