'use client';

import { Card, Flex, Table, Typography } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { cardClassName, pageHeaderClassName, pageTitleClassName, titleIconClassName } from '@/components/dashboard/ui';
import type { SchemaColumn, SchemaTable } from '@/types/erp';

const colDefColumns: ColumnsType<SchemaColumn> = [
  { title: 'Column', dataIndex: 'column', width: 160, render: (v) => <Typography.Text code>{v}</Typography.Text> },
  { title: 'Type', dataIndex: 'type', width: 160, render: (v) => <Typography.Text code>{v}</Typography.Text> },
  { title: 'Nullable', dataIndex: 'nullable', width: 80 },
  { title: 'Default', dataIndex: 'default', width: 180, render: (v) => <Typography.Text code>{v}</Typography.Text> },
  { title: 'Description', dataIndex: 'description' },
];

export function SchemasClient({ tables }: { tables: SchemaTable[] }) {
  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName}>
        <Typography.Title level={3} className={pageTitleClassName}>
          <DatabaseOutlined className={titleIconClassName} /> Database Schemas Reference
        </Typography.Title>
      </Flex>

      <Typography.Paragraph className="mb-6 text-[var(--text-muted)]">
        Schema metadata is defined in the backend TypeORM entities with <Typography.Text code>synchronize: true</Typography.Text>.
        On production restart, tables are automatically created or altered to match entity definitions.
      </Typography.Paragraph>

      {tables.map((schema) => (
        <Card
          key={schema.table}
          className={cardClassName}
          title={
            <Flex align="center" gap={8}>
              <DatabaseOutlined className="text-sky-400" />
              <Typography.Text strong className="text-[var(--text-primary)] text-base">
                {schema.table}
              </Typography.Text>
            </Flex>
          }
          extra={<Typography.Text type="secondary">{schema.description}</Typography.Text>}
          style={{ marginBottom: 24 }}
        >
          <Table
            dataSource={schema.columns}
            columns={colDefColumns}
            rowKey="column"
            size="small"
            pagination={false}
          />

          {schema.createSql && (
            <>
              <Typography.Paragraph className="mt-4 text-[var(--text-very-muted)] text-sm">
                <strong>SQL CREATE TABLE reference:</strong>
              </Typography.Paragraph>
              <Typography.Paragraph>
                <pre className="bg-[var(--card-bg)] text-[var(--text-primary)] p-4 rounded-lg overflow-x-auto text-sm leading-relaxed">
                  {schema.createSql}
                </pre>
              </Typography.Paragraph>
            </>
          )}

          {schema.alterSql && (
            <>
              <Typography.Paragraph className="mt-4 text-[var(--text-very-muted)] text-sm">
                <strong>SQL ALTER reference:</strong>
              </Typography.Paragraph>
              <Typography.Paragraph>
                <pre className="bg-[var(--card-bg)] text-[var(--text-primary)] p-4 rounded-lg overflow-x-auto text-sm leading-relaxed">
                  {schema.alterSql}
                </pre>
              </Typography.Paragraph>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}
