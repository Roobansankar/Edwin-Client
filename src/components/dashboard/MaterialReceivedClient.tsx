'use client';

import { useEffect, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Drawer, Flex, Form, Input, Popconfirm, Select, Space, Table, Typography, Upload, App, InputNumber, Image, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RcFile } from 'antd/es/upload/interface';
import { DeleteOutlined, EditOutlined, FilePdfOutlined, PlusOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { Controller, useForm, useFieldArray, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { createMaterialReceived, updateMaterialReceived, deleteMaterialReceived, uploadMaterialFile, updateMaterialReceivedStatus } from '@/actions/material-received';
import type { Project, MaterialReceived, ItemDescription, PurchaseOrder } from '@/types/erp';
import { useAuthStore } from '@/store/auth';
import { cardClassName, formatDate, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Verified', value: 'verified' },
];

type Props = {
  records: MaterialReceived[];
  projects: Project[];
  itemDescriptions: ItemDescription[];
  purchaseOrders: PurchaseOrder[];
};

const itemSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity: z.number().min(0.01, 'Min 0.01'),
});

const mrSchema = z.object({
  projectId: z.string().min(1, 'Select a project'),
  purchaseOrderId: z.string().optional(),
  receivedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});

type MrFormValues = z.infer<typeof mrSchema>;

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function MaterialReceivedClient({ records, projects, itemDescriptions, purchaseOrders }: Props) {
  const user = useAuthStore((s) => s.user);
  const canUpdateStatus = user?.role === 'admin' || user?.role === 'accounts_manager' || user?.role === 'purchase_team';
  const availableProjects = user?.role === 'site_engineer' && user.projects
    ? projects.filter((p) => user.projects?.some((up) => up.id === p.id))
    : projects;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialReceived | null>(null);
  const [isPending, startTransition] = useTransition();
  const [photos, setPhotos] = useState<RcFile[]>([]);
  const [billFile, setBillFile] = useState<File | null>(null);
  const { message } = App.useApp();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MrFormValues>({
    resolver: zodResolver(mrSchema),
    defaultValues: {
      projectId: '',
      purchaseOrderId: '',
      receivedDate: '',
      notes: '',
      items: [{ description: '', quantity: 1 }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' });

  const watchedProjectId = useWatch({ control, name: 'projectId' });
  const watchedPoId = useWatch({ control, name: 'purchaseOrderId' });

  // When a PO is chosen, auto-fill the project
  useEffect(() => {
    if (!watchedPoId) return;
    const po = purchaseOrders.find((p) => p.id === watchedPoId);
    if (po && po.projectId && !watchedProjectId) {
      setValue('projectId', po.projectId);
    }
  }, [watchedPoId, watchedProjectId, purchaseOrders, setValue]);

  // When a PO is chosen, auto-fill its line items (description & quantity)
  useEffect(() => {
    if (!watchedPoId || editing) return;
    const po = purchaseOrders.find((p) => p.id === watchedPoId);
    if (po?.items?.length) {
      replace(po.items.map((i) => ({ description: i.description, quantity: Number(i.quantity) })));
    }
  }, [watchedPoId, editing, purchaseOrders, replace]);

  // When a project is chosen, auto-select a PO belonging to it
  useEffect(() => {
    if (!watchedProjectId || editing) return;
    const po = purchaseOrders.find(
      (p) => p.status === 'approved' && p.projectId === watchedProjectId,
    );
    if (po && po.id !== watchedPoId) {
      setValue('purchaseOrderId', po.id);
    }
  }, [watchedProjectId, purchaseOrders, editing, watchedPoId, setValue]);

  useEffect(() => {
    if (editing) {
      reset({
        projectId: editing.projectId,
        purchaseOrderId: editing.purchaseOrderId || '',
        receivedDate: editing.receivedDate || '',
        notes: editing.notes || '',
        items: editing.items?.length
          ? editing.items.map((i) => ({ description: i.description, quantity: Number(i.quantity) }))
          : [{ description: '', quantity: 1 }],
      });
    }
  }, [editing, reset]);

  const uploadFiles = async (files: File[]) => {
    const uploaded: { fileUrl: string; fileKey: string }[] = [];
    for (const file of files) {
      const base64 = await readFileAsBase64(file);
      uploaded.push(await uploadMaterialFile({ name: file.name, base64 }));
    }
    return uploaded;
  };

  const submit = (values: MrFormValues) => {
    startTransition(async () => {
      try {
        let photoUrls: string[] = [];
        let photoKeys: string[] = [];
        let billUrl: string | undefined;
        let billKey: string | undefined;

        if (photos.length > 0) {
          const uploaded = await uploadFiles(photos);
          photoUrls = uploaded.map((u) => u.fileUrl);
          photoKeys = uploaded.map((u) => u.fileKey);
        }
        if (billFile) {
          const [uploaded] = await uploadFiles([billFile]);
          billUrl = uploaded.fileUrl;
          billKey = uploaded.fileKey;
        }

        const payload = {
          ...values,
          photoUrls: editing ? [...(editing.photoUrls || []), ...photoUrls] : photoUrls,
          photoKeys: editing ? [...(editing.photoKeys || []), ...photoKeys] : photoKeys,
          billUrl: billUrl || editing?.billUrl || undefined,
          billKey: billKey || editing?.billKey || undefined,
        } as Record<string, unknown>;

        if (editing) {
          await updateMaterialReceived(editing.id, payload);
          message.success('Material received record updated');
        } else {
          await createMaterialReceived(payload);
          message.success('Material received record created');
        }
        setOpen(false);
        setEditing(null);
        setPhotos([]);
        setBillFile(null);
        reset();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Operation failed');
      }
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      try { await updateMaterialReceivedStatus(id, status); message.success('Status updated'); }
      catch (error) { message.error(error instanceof Error ? error.message : 'Failed to update status'); }
    });
  };

  const openCreate = () => {
    setEditing(null);
    setPhotos([]);
    setBillFile(null);
    reset({ projectId: '', purchaseOrderId: '', receivedDate: '', notes: '', items: [{ description: '', quantity: 1 }] });
    setOpen(true);
  };

  const openEdit = (record: MaterialReceived) => {
    setPhotos([]);
    setBillFile(null);
    setEditing(record);
    setOpen(true);
  };

  const columns: ColumnsType<MaterialReceived> = [
    { title: 'S.No', key: 'sno', width: 60, render: (_, __, i) => i + 1 },
    { title: 'MR Number', dataIndex: 'mrNumber', key: 'mrNumber', width: 150, render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'PO Number', key: 'po', width: 130, responsive: ['md'], render: (_, r) => r.purchaseOrder?.poNumber || r.purchaseOrderId || '-' },
    { title: 'Project', key: 'project', width: 200, responsive: ['md'], render: (_, r) => r.project ? `${r.project.name} (${r.project.projectCode || 'No Code'})` : r.projectId },
    { title: 'Date', dataIndex: 'receivedDate', key: 'receivedDate', width: 120, responsive: ['lg'], render: (v?: string | null) => formatDate(v) },
    {
      title: 'Items',
      key: 'items',
      width: 250,
      responsive: ['lg'],
      render: (_, r) => (
        <Flex vertical>
          {r.items?.map((item, i) => (
            <Typography.Text key={i} type="secondary" className="text-xs">
              {item.description} — Qty: {item.quantity}
            </Typography.Text>
          ))}
        </Flex>
      ),
    },
    {
      title: 'Photos',
      key: 'photos',
      width: 140,
      responsive: ['xl'],
      render: (_, r) =>
        r.photoUrls?.length ? (
          <Image.PreviewGroup>
            <Flex gap={4}>
              {r.photoUrls.slice(0, 3).map((url) => (
                <Image key={url} src={url} width={40} height={40} className="rounded-md! object-cover!" preview={{ src: url }} alt="material" />
              ))}
              {r.photoUrls.length > 3 && (
                <Typography.Text type="secondary" className="text-xs self-center">+{r.photoUrls.length - 3}</Typography.Text>
              )}
            </Flex>
          </Image.PreviewGroup>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: 'Bill',
      key: 'bill',
      width: 110,
      responsive: ['xl'],
      render: (_, r) =>
        r.billUrl ? (
          <Button type="link" size="small" icon={<FilePdfOutlined />} href={r.billUrl} target="_blank">View</Button>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    { title: 'Status', key: 'status', width: 140, render: (_, r) =>
      canUpdateStatus ? (
        <Select
          defaultValue={r.status || 'pending'} size="small" variant="borderless" className="w-full"
          onChange={(newStatus) => handleStatusChange(r.id, newStatus)}
          options={STATUS_OPTIONS} popupMatchSelectWidth={false} disabled={isPending}
        />
      ) : (
        <Tag color={r.status === 'pending' ? 'orange' : 'green'}>{(r.status || 'pending').toUpperCase()}</Tag>
      ),
    },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 120, responsive: ['xl'], render: (v?: string) => formatDate(v) },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined className="text-blue-500" />} title="Edit" onClick={() => openEdit(record)} />
          <Popconfirm
            title="Delete this record?"
            onConfirm={() =>
              startTransition(async () => {
                try {
                  await deleteMaterialReceived(record.id);
                  message.success('Deleted');
                } catch {
                  message.error('Failed to delete');
                }
              })
            }
          >
            <Button danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const existingPhotos = editing?.photoUrls || [];
  const existingBillUrl = editing?.billUrl || null;

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <InboxOutlined className={titleIconClassName} /> Material Received
        </Typography.Title>
        {user?.role !== 'purchase_team' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New Material Received
          </Button>
        )}
      </Flex>

      <Card className={cardClassName} styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          loading={isPending}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'No material received records yet. Create one!' }}
        />
      </Card>

      <Drawer
        title={editing ? `Edit — ${editing.mrNumber}` : 'New Material Received'}
        size="large"
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={handleSubmit(submit)}>
              {editing ? 'Update' : 'Save'}
            </Button>
          </Space>
        }
      >
        <Flex vertical gap={16}>
          <Controller
            control={control}
            name="purchaseOrderId"
            render={({ field }) => (
              <Form.Item label="Purchase Order">
                <Select
                  {...field}
                  showSearch
                  allowClear
                  placeholder="Search PO number..."
                  optionFilterProp="label"
                  options={purchaseOrders
                    .filter((po) => po.status === 'approved')
                    .map((po) => ({
                      value: po.id,
                      label: `${po.poNumber} - ${po.vendor?.name || 'Unknown Vendor'}`,
                    }))}
                />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="projectId"
            render={({ field, fieldState }) => (
              <Form.Item label="Project" required validateStatus={fieldState.error ? 'error' : undefined} help={fieldState.error?.message}>
                <Select
                  {...field}
                  showSearch
                  placeholder="Select project"
                  optionFilterProp="label"
                  options={availableProjects.map((p) => ({ value: p.id, label: `${p.name} (${p.projectCode || 'No Code'})` }))}
                />
              </Form.Item>
            )}
          />

          <Controller
            control={control}
            name="receivedDate"
            render={({ field }) => (
              <Form.Item label="Received Date">
                <Input type="date" {...field} />
              </Form.Item>
            )}
          />

          <Typography.Text strong>MR Number</Typography.Text>
          <Input value={editing?.mrNumber || 'Auto-generated on save (MRN-YYYY-XXX)'} disabled />

          <Typography.Text strong>Materials Received</Typography.Text>
          {fields.map((field, index) => (
            <Flex key={field.id} gap={8} align="flex-start" wrap="wrap">
              <Controller
                control={control}
                name={`items.${index}.description`}
                render={({ field: f, fieldState }) => (
                  <Form.Item
                    label="Description"
                    validateStatus={fieldState.error ? 'error' : undefined}
                    help={fieldState.error?.message}
                    className="mb-2 min-w-60 flex-1"
                  >
                    <Select
                      {...f}
                      showSearch
                      allowClear
                      placeholder="Select or type an item"
                      options={itemDescriptions?.map((d) => ({ label: d.name, value: d.name }))}
                    />
                  </Form.Item>
                )}
              />
              <Controller
                control={control}
                name={`items.${index}.quantity`}
                render={({ field: f, fieldState }) => (
                  <Form.Item
                    label="Qty"
                    validateStatus={fieldState.error ? 'error' : undefined}
                    help={fieldState.error?.message}
                    className="mb-2 w-30"
                  >
                    <InputNumber min={0} precision={2} className="w-full" value={f.value} onChange={(v) => f.onChange(v ?? 1)} />
                  </Form.Item>
                )}
              />
              <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className="mt-7"
              />
            </Flex>
          ))}
          <Button icon={<PlusOutlined />} onClick={() => append({ description: '', quantity: 1 })}>
            Add Item
          </Button>
          {errors.items?.message && <Typography.Text type="danger">{errors.items.message}</Typography.Text>}

          <Typography.Text strong>Photos</Typography.Text>
          <Upload
            multiple
            accept=".jpg,.jpeg,.png,.webp"
            listType="picture-card"
            fileList={photos.map((file) => ({
              uid: file.name,
              name: file.name,
              status: 'done' as const,
              originFileObj: file,
            }))}
            beforeUpload={(file) => {
              setPhotos((prev) => [...prev, file]);
              return false;
            }}
            onRemove={(file) => {
              setPhotos((prev) => prev.filter((p) => p.name !== file.name));
            }}
          >
            <div>
              <UploadOutlined />
              <div className="mt-1 text-xs">Upload</div>
            </div>
          </Upload>
          {existingPhotos.length > 0 && (
            <Flex vertical gap={4}>
              <Typography.Text type="secondary" className="text-xs">Existing photos</Typography.Text>
              <Image.PreviewGroup>
                <Flex gap={4}>
                  {existingPhotos.map((url) => (
                    <Image key={url} src={url} width={60} height={60} className="rounded-md! object-cover!" preview={{ src: url }} alt="material" />
                  ))}
                </Flex>
              </Image.PreviewGroup>
            </Flex>
          )}

          <Typography.Text strong>Bill / Invoice</Typography.Text>
          <Upload accept=".pdf,.jpg,.jpeg,.png" showUploadList={false} beforeUpload={(file) => { setBillFile(file); return false; }} onRemove={() => setBillFile(null)}>
            <Button icon={<FilePdfOutlined />}>{billFile ? billFile.name : existingBillUrl ? 'Replace bill' : 'Upload bill'}</Button>
          </Upload>
          {billFile && <Typography.Text type="secondary" className="text-xs">{billFile.name}</Typography.Text>}
          {existingBillUrl && !billFile && (
            <Button type="link" size="small" href={existingBillUrl} target="_blank">View uploaded bill</Button>
          )}

          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <Form.Item label="Notes">
                <Input.TextArea {...field} rows={4} placeholder="Any notes... (vendor, vehicle, remarks)" />
              </Form.Item>
            )}
          />
        </Flex>
      </Drawer>
    </div>
  );
}
