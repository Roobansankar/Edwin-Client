'use client';

import { Card, Empty, Typography } from 'antd';
import { CalculatorOutlined } from '@ant-design/icons';
import { cardClassName } from '@/components/dashboard/ui';

export function EstimateClient() {
  return (
    <div>
      <Typography.Title level={3} className="m-0! mb-6 text-[var(--text-primary)]!">
        <CalculatorOutlined className="mr-2" /> Estimate
      </Typography.Title>
      <Card className={cardClassName}>
        <Empty
          description={
            <div>
              <Typography.Title level={4} className="mb-1! text-[var(--text-primary)]!">
                Estimate Module Coming Soon
              </Typography.Title>
              <Typography.Text type="secondary">
                The Estimate module is under development and will be available shortly.
              </Typography.Text>
            </div>
          }
        />
      </Card>
    </div>
  );
}
