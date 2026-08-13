'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Input, Button, Card, Typography, Space, App } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/auth';

const { Title, Text } = Typography;

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const { message } = App.useApp();

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res.json();
        message.error(error.message || 'Login failed');
        return;
      }

      const data = await res.json();
      setUser(data.user);
      message.success('Login successful!');
      router.push('/dashboard');
    } catch {
      message.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className="w-full max-w-[420px]! rounded-2xl! border! border-[var(--border)]! bg-[var(--subtle-bg)] shadow-[0_32px_64px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:min-w-[420px]"
      classNames={{ body: 'px-5 py-8 sm:px-8 sm:py-10' }}
    >
      <Space orientation="vertical" size="large" className="w-full text-center">
        <div>
          <SafetyCertificateOutlined
            className="mb-3 text-5xl text-blue-500"
          />
          <Title level={3} className="m-0! font-bold! text-[var(--text-primary)]!">
            Edwin Constructions
          </Title>
          <Text className="text-sm text-[var(--text-muted)]!">ERP Management System</Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          className="text-left"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Invalid email format' },
            ]}
          >
            <Input
              prefix={<UserOutlined className="text-[var(--text-very-muted)]" />}
              placeholder="Email address"
              className="h-12 rounded-[10px]! border-[var(--border)]! bg-[var(--subtle-bg)]! text-[var(--text-primary)]!"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-[var(--text-very-muted)]" />}
              placeholder="Password"
              className="h-12 rounded-[10px]! border-[var(--border)]! bg-[var(--subtle-bg)]! text-[var(--text-primary)]!"
            />
          </Form.Item>

          <Form.Item className="mb-0! mt-2">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="h-12 rounded-[10px] border-0 bg-linear-to-br! from-blue-500! to-violet-500! text-[15px] font-semibold"
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        
      </Space>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--page-bg)] px-4 py-8"
    >
      <div className="absolute -right-25 -top-25 h-100 w-100 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,transparent_70%)]" />
      <div className="absolute -bottom-12.5 -left-12.5 h-75 w-75 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.1)_0%,transparent_70%)]" />

      <Suspense fallback={<div className="text-[var(--text-primary)]">Loading...</div>}>
        <App>
          <LoginForm />
        </App>
      </Suspense>
    </div>
  );
}
