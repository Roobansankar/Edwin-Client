import { Alert } from 'antd';
import { fetchSchemas } from '@/lib/api';
import { SchemasClient } from './SchemasClient';

export default async function SchemasPage() {
  try {
    const tables = await fetchSchemas();
    return <SchemasClient tables={tables} />;
  } catch {
    return (
      <Alert
        message="Failed to load schema definitions"
        description="Could not fetch schema metadata from the server. Make sure you are logged in with admin privileges and the backend is running."
        type="error"
        showIcon
      />
    );
  }
}
