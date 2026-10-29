'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  App,
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Flex,
  Form,
  Input,
  Popconfirm,
  Segmented,
  Space,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckSquareOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createTodo, updateTodo, deleteTodo } from '@/actions/purchase-todos';
import type { PurchaseTodo } from '@/types/erp';
import { formatDate, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';
import { PagedTableCard, StatusCards } from './DataTablePanel';

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
  const today = dayjs().format('YYYY-MM-DD');
  const isOverdue = (t: PurchaseTodo) => !t.isDone && !!t.dueDate && t.dueDate.split('T')[0] < today;
  const overdueCount = initialTodos.filter(isOverdue).length;
  // S.No follows the filtered list, so numbering continues across pages.
  const serialById = new Map(filtered.map((t, i) => [t.id, i + 1]));

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

  const columns: ColumnsType<PurchaseTodo> = [
    { title: 'S.No', key: 'sno', width: 70, render: (_, t) => serialById.get(t.id) },
    {
      title: 'Done', key: 'done', width: 80, align: 'center',
      render: (_, t) => <Checkbox checked={t.isDone} disabled={isPending} onChange={() => toggle(t)} />,
    },
    {
      title: 'Title', key: 'title', width: 280,
      render: (_, t) => (
        <Typography.Text delete={t.isDone} strong={!t.isDone} type={t.isDone ? 'secondary' : undefined}>
          {t.title}
        </Typography.Text>
      ),
    },
    {
      title: 'Notes', key: 'notes', width: 320,
      render: (_, t) => (t.description ? (
        <Typography.Text type="secondary" delete={t.isDone}>{t.description}</Typography.Text>
      ) : <Typography.Text type="secondary">-</Typography.Text>),
    },
    { title: 'Date', key: 'date', width: 130, render: (_, t) => (t.dueDate ? formatDate(t.dueDate) : '-') },
    {
      title: 'Status', key: 'status', width: 120,
      render: (_, t) => (t.isDone
        ? <Tag color="success" className="m-0!">Done</Tag>
        : isOverdue(t)
          ? <Tag color="error" className="m-0!">Overdue</Tag>
          : <Tag color="warning" className="m-0!">Pending</Tag>),
    },
    {
      title: 'Actions', key: 'actions', width: 110, align: 'center',
      render: (_, t) => (
        <Space size={0}>
          <Button type="text" title="Edit" icon={<EditOutlined />} onClick={() => openEdit(t)} />
          <Popconfirm
            title="Delete todo?"
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true, loading: isPending }}
            onConfirm={() => remove(t.id)}
          >
            <Button type="text" danger title="Delete" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

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

      <StatusCards
        items={[
          { key: 'total', label: 'Total', value: initialTodos.length },
          { key: 'pending', label: 'Pending', value: pendingCount },
          { key: 'done', label: 'Done', value: initialTodos.length - pendingCount },
          { key: 'overdue', label: 'Overdue', value: overdueCount },
        ]}
      />

      <PagedTableCard
        title="Todo List"
        subtitle={`${filtered.length} ${filtered.length === 1 ? 'todo' : 'todos'}`}
        toolbar={(
          <>
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
              style={{ width: 240 }}
            />
          </>
        )}
        noun="todos"
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        size="middle"
        scroll={{ x: 1000 }}
        locale={{ emptyText: 'No todos here — enjoy the clear list or add one above' }}
      />

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
