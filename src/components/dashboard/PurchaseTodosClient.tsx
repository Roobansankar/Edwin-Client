'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  List,
  Popconfirm,
  Segmented,
  Space,
  Tag,
  Typography,
} from 'antd';
import { CheckSquareOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createTodo, updateTodo, deleteTodo } from '@/actions/purchase-todos';
import type { PurchaseTodo } from '@/types/erp';
import { cardClassName, formatDate, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';

type Filter = 'ALL' | 'PENDING' | 'DONE';

export function PurchaseTodosClient({ initialTodos }: { initialTodos: PurchaseTodo[] }) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseTodo | null>(null);
  const [form] = Form.useForm();
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();

  const filtered = useMemo(() => {
    return initialTodos.filter((t) => {
      if (filter === 'PENDING' && t.isDone) return false;
      if (filter === 'DONE' && !t.isDone) return false;
      if (search) {
        const hay = `${t.title} ${t.description || ''}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [initialTodos, filter, search]);

  const pendingCount = initialTodos.filter((t) => !t.isDone).length;

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ dueDate: dayjs() });
    setOpen(true);
  };

  const openEdit = (todo: PurchaseTodo) => {
    setEditing(todo);
    form.setFieldsValue({
      title: todo.title,
      description: todo.description || undefined,
      dueDate: todo.dueDate ? dayjs(todo.dueDate) : undefined,
    });
    setOpen(true);
  };

  const submit = (values: { title: string; description?: string; dueDate?: dayjs.Dayjs }) => {
    const payload = {
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      dueDate: values.dueDate
        ? values.dueDate.format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD'),
    };
    startTransition(async () => {
      try {
        if (editing) {
          await updateTodo(editing.id, { ...payload, dueDate: payload.dueDate ?? null });
          message.success('Todo updated');
        } else {
          await createTodo(payload);
          message.success('Todo added');
        }
        setOpen(false);
        setEditing(null);
        form.resetFields();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Save failed');
      }
    });
  };

  const toggle = (todo: PurchaseTodo) => {
    startTransition(async () => {
      try {
        await updateTodo(todo.id, { isDone: !todo.isDone });
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Update failed');
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      try {
        await deleteTodo(id);
        message.success('Todo deleted');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Delete failed');
      }
    });
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <CheckSquareOutlined className={titleIconClassName} /> My Todo List{' '}
          {pendingCount > 0 && <Tag color="orange">{pendingCount} pending</Tag>}
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          Add Todo
        </Button>
      </Flex>

      <Card className={cardClassName}>
        <Flex gap={12} wrap="wrap" className="mb-4">
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            options={[
              { value: 'ALL', label: `All (${initialTodos.length})` },
              { value: 'PENDING', label: `Pending (${pendingCount})` },
              { value: 'DONE', label: `Done (${initialTodos.length - pendingCount})` },
            ]}
          />
          <Input.Search
            placeholder="Search my todos..."
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
        </Flex>

        {filtered.length === 0 ? (
          <Empty description="No todos here — enjoy the clear list or add one above" />
        ) : (
          <List
            dataSource={filtered}
            rowKey="id"
            renderItem={(todo) => (
              <List.Item
                actions={[
                  <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => openEdit(todo)} />,
                  <Popconfirm
                    key="delete"
                    title="Delete todo?"
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{ danger: true, loading: isPending }}
                    onConfirm={() => remove(todo.id)}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Checkbox checked={todo.isDone} onChange={() => toggle(todo)} />}
                  title={
                    <Typography.Text delete={todo.isDone} strong={!todo.isDone}>
                      {todo.title}
                    </Typography.Text>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      {todo.description && (
                        <Typography.Text type="secondary" delete={todo.isDone}>
                          {todo.description}
                        </Typography.Text>
                      )}
                      {todo.dueDate && (
                        <Typography.Text type="secondary" className="text-xs">
                          Date: {formatDate(todo.dueDate)}
                        </Typography.Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Drawer
        title={editing ? 'Edit Todo' : 'Add Todo'}
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        extra={
          <Space>
            <Button onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={() => form.submit()}>
              {editing ? 'Save' : 'Add'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item label="Title" name="title" rules={[{ required: true, message: 'Title is required' }]}>
            <Input placeholder="e.g. Follow up with vendor for cement quotation" maxLength={255} />
          </Form.Item>
          <Form.Item label="Notes" name="description">
            <Input.TextArea rows={3} placeholder="Optional details (private to you)" />
          </Form.Item>
          <Form.Item label="Date" name="dueDate">
            <DatePicker className="w-full" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
