'use client';

import { useEffect, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, Card, Divider, Drawer, Flex, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { createTrade, deleteTrade, updateTrade } from '@/actions/trades';
import type { Trade } from '@/types/erp';
import {
  cardClassName,
  formatDate,
  formatCurrency,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

const PRESET_TRADE_NAMES = [
  'Mason',
  'Carpenter',
  'Helper',
  'Electrician',
  'Plumber',
  'Painter',
  'Bar Bender',
  'Welder',
  'Fabricator',
  'Tile Layer',
  'Supervisor',
  'Fitter',
];

const tradeSchema = z.object({
  name: z.string().min(1, 'Trade name is required'),
  shiftWiseAmount: z.number().min(0, 'Must be 0 or more'),
});

type TradeFormValues = z.infer<typeof tradeSchema>;

type LabourTradesClientProps = {
  trades: Trade[];
};

export function LabourTradesClient({ trades }: LabourTradesClientProps) {
  const [open, setOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isPending, startTransition] = useTransition();
  const [newNameOption, setNewNameOption] = useState('');
  const [customNameOptions, setCustomNameOptions] = useState<string[]>([]);
  const { message } = App.useApp();

  const nameOptions = Array.from(
    new Set([...PRESET_TRADE_NAMES, ...trades.map((t) => t.name), ...customNameOptions]),
  ).sort((a, b) => a.localeCompare(b));

  const {
    control,
    handleSubmit,
    reset,
    setValue,
  } = useForm<TradeFormValues>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      name: '',
      shiftWiseAmount: 0,
    },
  });

  useEffect(() => {
    if (editingTrade) {
      setValue('name', editingTrade.name);
      setValue('shiftWiseAmount', Number(editingTrade.shiftWiseAmount) || 0);
    } else {
      reset({ name: '', shiftWiseAmount: 0 });
    }
  }, [editingTrade, setValue, reset]);

  const handleEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteTrade(id);
        message.success('Trade deleted successfully');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to delete trade');
      }
    });
  };

  const columns: ColumnsType<Trade> = [
    {
      title: 'S.No',
      key: 'sno',
      width: 60,
      render: (_text, _record, index) => index + 1,
    },
    {
      title: 'Trade / Labour',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Shift Wise Amount',
      dataIndex: 'shiftWiseAmount',
      width: 180,
      sorter: (a, b) => Number(a.shiftWiseAmount || 0) - Number(b.shiftWiseAmount || 0),
      render: (value) => (value ? formatCurrency(value) : '-'),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      width: 120,
      sorter: (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
      render: formatDate,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined className="text-sky-500" />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete Trade"
            description="Are you sure you want to delete this trade?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true, loading: isPending }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const submit = (values: TradeFormValues) => {
    startTransition(async () => {
      try {
        if (editingTrade) {
          await updateTrade(editingTrade.id, values);
          message.success('Trade updated successfully');
        } else {
          await createTrade(values);
          message.success('Trade created successfully');
        }
        setOpen(false);
        setEditingTrade(null);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to save trade');
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    setEditingTrade(null);
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <TeamOutlined className={titleIconClassName} /> Labour Trades
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add Trade
        </Button>
      </Flex>

      <Card className={cardClassName}>
        <Table
          dataSource={trades}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 700 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} trades` }}
        />
      </Card>

      <Drawer
        title={editingTrade ? 'Edit Trade' : 'Add New Trade'}
        open={open}
        onClose={handleClose}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(submit)}>
              {editingTrade ? 'Update' : 'Save'}
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" onFinish={handleSubmit(submit)}>
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Trade / Labour Name"
                required
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <Select
                  {...field}
                  showSearch
                  placeholder="Select trade"
                  options={nameOptions.map((n) => ({ label: n, value: n }))}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space style={{ padding: '0 8px 4px' }}>
                        <Input
                          placeholder="New trade"
                          value={newNameOption}
                          onChange={(e) => setNewNameOption(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                        <Button
                          type="text"
                          icon={<PlusOutlined />}
                          onClick={(e) => {
                            e.preventDefault();
                            const name = newNameOption.trim();
                            if (!name) return;
                            if (!nameOptions.includes(name)) {
                              setCustomNameOptions((prev) => [...prev, name]);
                            }
                            field.onChange(name);
                            setNewNameOption('');
                          }}
                        >
                          Add
                        </Button>
                      </Space>
                    </>
                  )}
                />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="shiftWiseAmount"
            render={({ field, fieldState }) => (
              <Form.Item
                label="Shift Wise Amount (per 1 shift)"
                required
                validateStatus={fieldState.error ? 'error' : undefined}
                help={fieldState.error?.message}
              >
                <InputNumber
                  {...field}
                  className="w-full"
                  min={0}
                  step={50}
                  prefix="₹"
                  placeholder="0"
                />
              </Form.Item>
            )}
          />
        </Form>
      </Drawer>
    </div>
  );
}
