'use client';

import { useEffect, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  App,
  Button,
  Card,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
} from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { IdcardOutlined, SaveOutlined } from '@ant-design/icons';
import { updateMyProfile, updateMySalary } from '@/actions/profile';
import { useAuthStore } from '@/store/auth';
import type { Salary } from '@/types/erp';
import {
  cardClassName,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

const CATEGORY_OPTIONS = [
  { value: 'White Collar', label: 'White Collar' },
  { value: 'Blue Collar', label: 'Blue Collar' },
];

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().optional(),
});

const salarySchema = z.object({
  grades: z.string().min(1, 'Grade is required'),
  category: z.enum(['White Collar', 'Blue Collar'], {
    message: 'Category is required',
  }),
  role: z.string().min(1, 'Role is required'),
  expInYears: z.string().min(1, 'Experience range is required'),
  monthlySalary: z.number().min(0, 'Must be 0 or more'),
  avgCostPerHr: z.number().min(0, 'Must be 0 or more'),
  bookingCost: z.number().min(0, 'Must be 0 or more'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type SalaryFormValues = z.infer<typeof salarySchema>;

type ProfileClientProps = {
  initialSalary: Salary | null;
};

export function ProfileClient({ initialSalary }: ProfileClientProps) {
  const { message } = App.useApp();
  const { user, setUser } = useAuthStore();
  const [isPending, startTransition] = useTransition();

  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      password: '',
    },
  });

  const {
    control: salaryControl,
    handleSubmit: handleSalarySubmit,
    reset: resetSalary,
  } = useForm<SalaryFormValues>({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      grades: '',
      category: 'White Collar',
      role: '',
      expInYears: '',
      monthlySalary: 0,
      avgCostPerHr: 0,
      bookingCost: 0,
    },
  });

  useEffect(() => {
    resetProfile({
      name: user?.name || '',
      email: user?.email || '',
      password: '',
    });
  }, [user?.name, user?.email, resetProfile]);

  useEffect(() => {
    if (initialSalary) {
      resetSalary({
        grades: initialSalary.grades || '',
        category: (initialSalary.category as SalaryFormValues['category']) || 'White Collar',
        role: initialSalary.role || '',
        expInYears: initialSalary.expInYears || '',
        monthlySalary: Number(initialSalary.monthlySalary) || 0,
        avgCostPerHr: Number(initialSalary.avgCostPerHr) || 0,
        bookingCost: Number(initialSalary.bookingCost) || 0,
      });
    }
  }, [initialSalary, resetSalary]);

  const submitProfile = (values: ProfileFormValues) => {
    startTransition(async () => {
      try {
        const updated = await updateMyProfile(values);
        setUser({
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
        });
        message.success('Profile updated successfully');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to update profile');
      }
    });
  };

  const submitSalary = (values: SalaryFormValues) => {
    startTransition(async () => {
      try {
        await updateMySalary(values);
        message.success('Salary saved successfully');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to save salary');
      }
    });
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <IdcardOutlined className={titleIconClassName} /> My Profile
        </Typography.Title>
      </Flex>

      <Card title="Profile Information" className={cardClassName}>
        <Form layout="vertical" onFinish={handleProfileSubmit(submitProfile)}>
          <Flex gap={16} wrap="wrap">
            <Controller
              control={profileControl}
              name="name"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Name"
                  className="min-w-55 flex-1"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Input {...field} placeholder="Full name" />
                </Form.Item>
              )}
            />
            <Controller
              control={profileControl}
              name="email"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Email"
                  className="min-w-55 flex-1"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Input {...field} placeholder="you@company.com" />
                </Form.Item>
              )}
            />
            <Controller
              control={profileControl}
              name="password"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Password"
                  className="min-w-55 flex-1"
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message || 'Leave blank to keep the current password'}
                >
                  <Input.Password {...field} placeholder="New password" autoComplete="new-password" />
                </Form.Item>
              )}
            />
          </Flex>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={isPending}>
            Update Profile
          </Button>
        </Form>
      </Card>

      <Divider />

      <Card title="My Salary" className={cardClassName}>
        <Form layout="vertical" onFinish={handleSalarySubmit(submitSalary)}>
          <Flex gap={16} wrap="wrap">
            <Controller
              control={salaryControl}
              name="grades"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Grades"
                  className="min-w-55 flex-1"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Input {...field} placeholder="e.g. Grade A, Grade B" />
                </Form.Item>
              )}
            />
            <Controller
              control={salaryControl}
              name="category"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Category"
                  className="min-w-55 flex-1"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Select {...field} options={CATEGORY_OPTIONS} placeholder="Select category" />
                </Form.Item>
              )}
            />
            <Controller
              control={salaryControl}
              name="role"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Role"
                  className="min-w-55 flex-1"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Input {...field} placeholder="e.g. Site Engineer, Supervisor" />
                </Form.Item>
              )}
            />
            <Controller
              control={salaryControl}
              name="expInYears"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Experience in Years (Range)"
                  className="min-w-55 flex-1"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <Input {...field} placeholder="e.g. 2-4, 5-7, 10+" />
                </Form.Item>
              )}
            />
          </Flex>

          <Flex gap={16} wrap="wrap">
            <Controller
              control={salaryControl}
              name="monthlySalary"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Monthly Salary"
                  className="min-w-55 flex-1"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <InputNumber
                    {...field}
                    className="w-full"
                    min={0}
                    step={1000}
                    prefix="₹"
                    placeholder="0"
                  />
                </Form.Item>
              )}
            />
            <Controller
              control={salaryControl}
              name="avgCostPerHr"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Avg Cost / Hr"
                  className="min-w-55 flex-1"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <InputNumber
                    {...field}
                    className="w-full"
                    min={0}
                    step={0.5}
                    prefix="₹"
                    placeholder="0.0"
                  />
                </Form.Item>
              )}
            />
            <Controller
              control={salaryControl}
              name="bookingCost"
              render={({ field, fieldState }) => (
                <Form.Item
                  label="Booking Cost"
                  className="min-w-55 flex-1"
                  required
                  validateStatus={fieldState.error ? 'error' : undefined}
                  help={fieldState.error?.message}
                >
                  <InputNumber
                    {...field}
                    className="w-full"
                    min={0}
                    step={1000}
                    prefix="₹"
                    placeholder="0"
                  />
                </Form.Item>
              )}
            />
          </Flex>

          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={isPending}>
            Save Salary
          </Button>
        </Form>
      </Card>
    </div>
  );
}
