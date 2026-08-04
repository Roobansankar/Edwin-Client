'use client';

import { useState, useTransition, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, DatePicker, Flex, Form, Input, InputNumber, Select, Typography, Upload, Divider } from 'antd';
import { DollarOutlined, UploadOutlined, SaveOutlined, PlusOutlined } from '@ant-design/icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import dayjs from 'dayjs';
import { createExpense, updateExpense } from '@/actions/expenses';
import { createExpenseType } from '@/actions/expense-types';
import type { Expense, ExpenseType, Project, Trade } from '@/types/erp';
import { titleCase } from './ui';
import { useAuthStore } from '@/store/auth';

const expenseSchema = z.object({
  expenseTypeId: z.string().min(1, 'Select an expense type'),
  description: z.string().min(2, 'Enter a description'),
  amount: z.number().positive('Amount must be greater than zero'),
  expenseDate: z.string().min(1, 'Select a date'),
  projectId: z.string().optional(),
  tradeId: z.string().optional(),
  remarks: z.string().optional(),
  paidBy: z.string().optional(),
  status: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

type Props = {
  projects: Project[];
  trades: Trade[];
  expenseTypes: ExpenseType[];
  initialValues?: Expense | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  showPaidBy?: boolean;
};

export function ExpenseForm({ projects, trades, expenseTypes, initialValues, onSuccess, onCancel, showPaidBy = false }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const [fileList, setFileList] = useState<any[]>([]);
  const [sitePhotos, setSitePhotos] = useState<any[]>([]);

  const { control, handleSubmit, reset, setValue } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expenseTypeId: '',
      description: '',
      amount: 0,
      expenseDate: dayjs().format('YYYY-MM-DD'),
      projectId: '',
      tradeId: undefined,
      remarks: '',
      paidBy: '',
      status: 'pending',
    },
  });

  useEffect(() => {
    if (initialValues) {
      setValue('expenseTypeId', initialValues.expenseTypeId || '');
      setValue('description', initialValues.description);
      setValue('amount', Number(initialValues.amount));
      setValue('expenseDate', dayjs(initialValues.expenseDate).format('YYYY-MM-DD'));
      setValue('projectId', initialValues.projectId || undefined);
      setValue('tradeId', initialValues.tradeId || undefined);
      setValue('remarks', initialValues.remarks || '');
      setValue('paidBy', initialValues.paidBy || '');
      setValue('status', initialValues.status || 'pending');
    } else {
      reset();
    }
  }, [initialValues, setValue, reset]);

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    setIsAddingType(true);
    try {
      const newType = await createExpenseType({ name: newTypeName.trim() });
      message.success('Expense type added');
      setNewTypeName('');
      if (onSuccess) onSuccess(); // To refresh the parent's data
      setValue('expenseTypeId', newType.id);
    } catch (err) {
      message.error('Failed to add expense type');
    } finally {
      setIsAddingType(false);
    }
  };

  const availableProjects = user?.role === 'site_engineer' && user.projects 
    ? projects.filter(p => user.projects?.some(up => up.id === p.id))
    : projects;

  const submit = (values: ExpenseFormValues) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('expenseTypeId', values.expenseTypeId);
        formData.append('description', values.description);
        formData.append('amount', values.amount.toString());
        formData.append('expenseDate', values.expenseDate);
        if (values.projectId) formData.append('projectId', values.projectId);
        if (values.tradeId) formData.append('tradeId', values.tradeId);
        if (values.remarks) formData.append('remarks', values.remarks);
        if (values.paidBy) formData.append('paidBy', values.paidBy);
        if (values.status) formData.append('status', values.status);
        
        // Add files
        fileList.forEach((file) => {
          if (file.originFileObj) {
            formData.append('files', file.originFileObj);
          }
        });

        // Add site photos
        sitePhotos.forEach((file) => {
          if (file.originFileObj) {
            formData.append('sitePhotos', file.originFileObj);
          }
        });

        if (initialValues?.id) {
          await updateExpense(initialValues.id, formData);
          message.success('Expense updated successfully');
        } else {
          await createExpense(formData);
          message.success('Expense submitted successfully');
        }
        
        reset();
        setFileList([]);
        setSitePhotos([]);
        if (onSuccess) onSuccess();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to submit expense');
      }
    });
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(submit)}>
      <Flex vertical gap={16}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            control={control}
            name="projectId"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Project"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Select
                  {...field}
                  placeholder="Select project (optional)"
                  allowClear
                  options={availableProjects.map((p) => ({ label: p.name, value: p.id }))}
                />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="expenseDate"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Date"
                required
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <DatePicker
                  className="w-full"
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(_, dateString) => field.onChange(Array.isArray(dateString) ? dateString[0] : dateString)}
                  format="DD-MM-YYYY"
                />
              </Form.Item>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            control={control}
            name="expenseTypeId"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Expense Type"
                required
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Select
                  {...field}
                  placeholder="Select expense type"
                  options={expenseTypes.map((type) => ({ value: type.id, label: type.name }))}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider className="my-2" />
                      <Flex gap={8} className="p-2">
                        <Input
                          placeholder="New Type"
                          value={newTypeName}
                          onChange={(e) => setNewTypeName(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                        <Button 
                          type="text" 
                          icon={<PlusOutlined />} 
                          onClick={handleAddType}
                          loading={isAddingType}
                        >
                          Add
                        </Button>
                      </Flex>
                    </>
                  )}
                />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="tradeId"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Trade (Related to)"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Select
                  {...field}
                  allowClear
                  showSearch
                  placeholder="Select trade (optional)"
                  options={trades.map((t) => ({ label: t.name, value: t.id }))}
                />
              </Form.Item>
            )}
          />
        </div>

        <Controller
          control={control}
          name="description"
          render={({ field, fieldState }) => (
            <Form.Item
              label="Description"
              required
              validateStatus={fieldState.error ? 'error' : undefined}
              help={fieldState.error?.message}
            >
              <Input {...field} placeholder="What was this expense for?" />
            </Form.Item>
          )}
        />

        <Controller
          control={control}
          name="amount"
          render={({ field, fieldState }) => (
            <Form.Item
              label="Amount"
              required
              validateStatus={fieldState.error ? 'error' : undefined}
              help={fieldState.error?.message}
            >
              <InputNumber
                min={0.01}
                precision={2}
                prefix="₹"
                className="w-full"
                value={field.value}
                onChange={field.onChange}
                placeholder="0.00"
              />
            </Form.Item>
          )}
        />

        {showPaidBy && (
          <Controller
            control={control}
            name="paidBy"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Paid By"
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Input {...field} placeholder="Account, employee, petty cash..." />
              </Form.Item>
            )}
          />
        )}

        <Form.Item label="Bill/Receipt Upload (Images or PDF, Max 5)">
          <Upload
            beforeUpload={() => false}
            listType="picture"
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            multiple
            maxCount={5}
            accept="image/*,.pdf"
          >
            <Button icon={<UploadOutlined />}>Select Files</Button>
          </Upload>
          <Typography.Text type="secondary" className="text-xs mt-1 block">
            Please upload clear photos of bills or receipts.
          </Typography.Text>
        </Form.Item>

        <Form.Item label="Site Photographs (Optional, Max 5)">
          <Upload
            beforeUpload={() => false}
            listType="picture"
            fileList={sitePhotos}
            onChange={({ fileList }) => setSitePhotos(fileList)}
            multiple
            maxCount={5}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />}>Select Photos</Button>
          </Upload>
          <Typography.Text type="secondary" className="text-xs mt-1 block">
            Upload any relevant site photos for this expense.
          </Typography.Text>
        </Form.Item>

        <Divider className="my-0 border-[var(--border)]" />

        <Controller
          control={control}
          name="remarks"
          render={({ field }) => (
            <Form.Item label="Remarks">
              <Input.TextArea {...field} rows={3} placeholder="Any additional notes..." />
            </Form.Item>
          )}
        />

        <Flex justify="end" gap={12}>
          {onCancel && <Button onClick={onCancel}>Cancel</Button>}
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            loading={isPending} 
            onClick={handleSubmit(submit)}
          >
            {initialValues ? 'Update Expense' : 'Submit Expense'}
          </Button>
        </Flex>
      </Flex>
    </Form>
  );
}
