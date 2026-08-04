'use client';

import { ArchitectureDiagram } from '@/components/dashboard/ArchitectureDiagram';
import { Typography, Breadcrumb } from 'antd';
import { NodeIndexOutlined, HomeOutlined } from '@ant-design/icons';

export default function ArchitecturePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Breadcrumb
          items={[
            { title: <HomeOutlined />, href: '/dashboard' },
            { title: 'System Architecture' },
          ]}
          className="text-[var(--text-muted)]"
        />
        <Typography.Title level={2} className="m-0! text-[var(--text-primary)]!">
          <NodeIndexOutlined className="mr-3 text-sky-400" />
          System Architecture
        </Typography.Title>
        <Typography.Text className="text-[var(--text-muted)]">
          Visual overview of database relationships and application page flows.
        </Typography.Text>
      </div>

      <ArchitectureDiagram />
    </div>
  );
}
