import { Alert } from 'antd';
import { fetchMyTodos } from '@/lib/api';
import { PurchaseTodosClient } from '@/components/dashboard/PurchaseTodosClient';

export default async function MyTodosPage() {
  try {
    const todos = await fetchMyTodos();
    return <PurchaseTodosClient initialTodos={todos} />;
  } catch (error) {
    return (
      <Alert
        message="Error"
        description={error instanceof Error ? error.message : 'Failed to load your todo list.'}
        type="error"
        showIcon
      />
    );
  }
}
