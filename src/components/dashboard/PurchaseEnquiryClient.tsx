'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Checkbox, Divider, Drawer, Flex, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, App, InputNumber } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, FilePdfOutlined, HistoryOutlined, PlusOutlined, ShoppingCartOutlined, SplitCellsOutlined } from '@ant-design/icons';
import { Controller, useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { createPurchaseEnquiry, updatePurchaseEnquiry, deletePurchaseEnquiry, updatePurchaseEnquiryStatus } from '@/actions/purchase-enquiries';
import { createItemDescription, deleteItemDescription } from '@/actions/item-descriptions';
import type { Project, Vendor, PurchaseEnquiry, ItemDescription, EnquiryItem, PurchaseOrder, Payment } from '@/types/erp';
import { cardClassName, formatCurrency, formatDate, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';
import { PurchaseEnquiryPdf } from './PurchaseEnquiryPdf';
import { useAuthStore } from '@/store/auth';

type Props = {
  enquiries: PurchaseEnquiry[];
  projects: Project[];
  itemDescriptions: ItemDescription[];
  vendors: Vendor[];
  purchaseOrders?: PurchaseOrder[];
  payments?: Payment[];
};

const itemSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity: z.number().min(1, 'Min 1'),
});

const peSchema = z.object({
  projectId: z.string().min(1, 'Select a project'),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});

type PeFormValues = z.infer<typeof peSchema>;

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
};

export function PurchaseEnquiryClient({ enquiries, projects, itemDescriptions, vendors, purchaseOrders = [], payments = [] }: Props) {
  const [localDescriptions, setLocalDescriptions] = useState<ItemDescription[]>(itemDescriptions || []);
  const [inlineNewDesc, setInlineNewDesc] = useState('');
  const [isAddingInlineDesc, setIsAddingInlineDesc] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseEnquiry | null>(null);
  const [previewEnquiry, setPreviewEnquiry] = useState<PurchaseEnquiry | null>(null);
  const [previewItems, setPreviewItems] = useState<EnquiryItem[] | null>(null);
  const [previewVendorName, setPreviewVendorName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isClient, setIsClient] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const isSiteEngineer = user?.role === 'site_engineer';
  const availableProjects = isSiteEngineer && user?.projects
    ? projects.filter((p) => user.projects?.some((up) => up.id === p.id))
    : projects;

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEnquiry, setHistoryEnquiry] = useState<PurchaseEnquiry | null>(null);

  const posByEnquiryNo = useMemo(() => {
    const map = new Map<string, PurchaseOrder[]>();
    for (const po of purchaseOrders) {
      if (!po.materialRequirementNo) continue;
      const list = map.get(po.materialRequirementNo) || [];
      list.push(po);
      map.set(po.materialRequirementNo, list);
    }
    return map;
  }, [purchaseOrders]);

  const paidByPoId = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments) {
      if (!p.purchaseOrderId) continue;
      map.set(p.purchaseOrderId, (map.get(p.purchaseOrderId) || 0) + Number(p.amount));
    }
    return map;
  }, [payments]);

  const enquiryTotals = (enquiryNo: string) => {
    const pos = posByEnquiryNo.get(enquiryNo) || [];
    const total = pos.reduce((sum, po) => sum + Number(po.totalWithGst || po.totalAmount), 0);
    const paid = pos.reduce((sum, po) => sum + (paidByPoId.get(po.id) || 0), 0);
    return { total, paid, balance: total - paid, hasPo: pos.length > 0 };
  };

  const openHistory = (enquiry: PurchaseEnquiry) => {
    setHistoryEnquiry(enquiry);
    setHistoryOpen(true);
  };
  const historyPayments = useMemo(() => {
    if (!historyEnquiry) return [];
    const poIds = new Set((posByEnquiryNo.get(historyEnquiry.enquiryNo) || []).map((po) => po.id));
    return payments.filter((p) => p.purchaseOrderId && poIds.has(p.purchaseOrderId));
  }, [historyEnquiry, posByEnquiryNo, payments]);

  const [splitOpen, setSplitOpen] = useState(false);
  const [splitEnquiry, setSplitEnquiry] = useState<PurchaseEnquiry | null>(null);
  const [splitVendorId, setSplitVendorId] = useState('');
  const [splitItemIndices, setSplitItemIndices] = useState<number[]>([]);

  const openSplit = (record: PurchaseEnquiry) => {
    setSplitEnquiry(record);
    setSplitVendorId('');
    setSplitItemIndices([]);
    setSplitOpen(true);
  };

  const closeSplit = () => {
    setSplitOpen(false);
    setSplitEnquiry(null);
    setSplitVendorId('');
    setSplitItemIndices([]);
  };

  const generateSplitPdf = () => {
    if (!splitEnquiry) return;
    if (!splitVendorId) { message.error('Select a vendor'); return; }
    if (!splitItemIndices.length) { message.error('Select at least one item'); return; }
    const vendor = vendors.find((v) => v.id === splitVendorId);
    const items = splitItemIndices.map((idx) => splitEnquiry.items[idx]);
    setPreviewEnquiry(splitEnquiry);
    setPreviewItems(items);
    setPreviewVendorName(vendor?.name || null);
    closeSplit();
  };

  useEffect(() => { setIsClient(true); }, []);
  useEffect(() => { setLocalDescriptions(itemDescriptions || []); }, [itemDescriptions]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PeFormValues>({
    resolver: zodResolver(peSchema),
    defaultValues: {
      projectId: '',
      notes: '',
      items: [{ description: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (editing) {
      reset({
        projectId: editing.projectId,
        notes: editing.notes || '',
        items: editing.items?.length ? editing.items.map((i) => ({ description: i.description, quantity: Number(i.quantity) })) : [{ description: '', quantity: 1 }],
      });
    }
  }, [editing, reset]);

  const submit = (values: PeFormValues) => {
    startTransition(async () => {
      try {
        const payload = { ...values } as Record<string, unknown>;
        if (editing) {
          await updatePurchaseEnquiry(editing.id, payload);
          message.success('Purchase enquiry updated');
        } else {
          await createPurchaseEnquiry(payload);
          message.success('Purchase enquiry sent');
        }
        setOpen(false);
        setEditing(null);
        reset();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Operation failed');
      }
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      try {
        await updatePurchaseEnquiryStatus(id, status);
        message.success(`Status updated to ${status}`);
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to update status');
      }
    });
  };

  const columns: ColumnsType<PurchaseEnquiry> = [
    { title: 'S.No', key: 'sno', width: 60, render: (_, __, i) => i + 1 },
    { title: 'Enquiry No', dataIndex: 'enquiryNo', key: 'enquiryNo', width: 150 },

    { title: 'Project', key: 'project', width: 180, render: (_, r) => r.project?.name || r.projectId },
    ...(!isSiteEngineer
      ? [{ title: 'Site Engineer', key: 'creator', width: 160, render: (_: unknown, r: PurchaseEnquiry) => r.creator?.name || r.createdBy || '-' }]
      : []),
    {
      title: 'Items',
      key: 'items',
      width: 250,
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (value: string, record) =>
        isSiteEngineer ? (
          <Tag color={STATUS_COLORS[value] || 'default'}>
            {(value || 'draft').toUpperCase()}
          </Tag>
        ) : (
          <Select
            value={value || 'pending'}
            size="small"
            variant="borderless"
            className="w-full"
            onChange={(newStatus) => handleStatusChange(record.id, newStatus)}
            options={STATUS_OPTIONS}
            popupMatchSelectWidth={false}
            disabled={isPending}
          />
        ),
    },
    {
      title: 'Amount / Balance',
      key: 'amountBalance',
      width: 200,
      render: (_, r) => {
        const { total, balance, hasPo } = enquiryTotals(r.enquiryNo);
        if (!hasPo) return <Typography.Text type="secondary">-</Typography.Text>;
        return (
          <Flex vertical gap={0}>
            <Typography.Text className="text-xs">Total: <Typography.Text strong>{formatCurrency(total)}</Typography.Text></Typography.Text>
            <Typography.Text className="text-xs">Balance: <Typography.Text strong>{formatCurrency(balance)}</Typography.Text></Typography.Text>
            <Button type="link" size="small" className="px-0! h-auto!" icon={<HistoryOutlined />} onClick={() => openHistory(r)}>History</Button>
          </Flex>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (v: string) => formatDate(v),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: isSiteEngineer ? 160 : 120,
      render: (_, record) => (
        <Space>
          {isSiteEngineer && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(record);
                setOpen(true);
              }}
            />
          )}
          <Button
            type="link"
            size="small"
            icon={<FilePdfOutlined />}
            title="Preview full PDF"
            onClick={() => {
              setPreviewEnquiry(record);
              setPreviewItems(null);
              setPreviewVendorName(null);
            }}
          />
          {!isSiteEngineer && (
            <Button
              type="link"
              size="small"
              icon={<SplitCellsOutlined />}
              title="Split items by vendor & generate PDF"
              onClick={() => openSplit(record)}
            />
          )}
          {isSiteEngineer && (
            <Popconfirm title="Delete this enquiry?" onConfirm={() => startTransition(async () => {
              try {
                await deletePurchaseEnquiry(record.id);
                message.success('Deleted');
              } catch (e) {
                message.error('Failed to delete');
              }
            })}>
              <Button danger type="link" size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={`${pageHeaderClassName} mb-0!`} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <ShoppingCartOutlined style={{ marginBottom: 24 }} className={titleIconClassName} /> {isSiteEngineer ? 'Material Requirement' : 'Material Requirement Request'}
        </Typography.Title>
        {isSiteEngineer && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              reset({ projectId: '', notes: '', items: [{ description: '', quantity: 1 }] });
              setOpen(true);
            }}
          >
            New Enquiry
          </Button>
        )}
      </Flex>

      <Card className={cardClassName}>
        <Table
          dataSource={enquiries}
          columns={columns}
          rowKey="id"
          loading={isPending}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          scroll={{ x: 1300 }}
          locale={{ emptyText: isSiteEngineer ? 'No material requirements yet. Create one!' : 'No material requirement requests yet.' }}
        />
      </Card>

      {isSiteEngineer && (
        <Drawer
          title={editing ? `Edit Enquiry — ${editing.enquiryNo}` : 'New Material Requirement'}
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
                {editing ? 'Update' : 'Send Enquiry'}
              </Button>
            </Space>
          }
        >
          <Flex vertical gap={16}>
            <Controller
              control={control}
              name="projectId"
              render={({ field, fieldState }) => (
                <Form.Item label="Project" validateStatus={fieldState.error ? 'error' : undefined} help={fieldState.error?.message}>
                  <Select
                    {...field}
                    showSearch
                    placeholder="Select project"
                    optionFilterProp="label"
                    options={availableProjects.map((p) => ({ value: p.id, label: p.name }))}
                  />
                </Form.Item>
              )}
            />

            <Flex justify="space-between" align="center">
              <Typography.Text strong>Items</Typography.Text>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => setDescOpen(true)}>
                Manage descriptions
              </Button>
            </Flex>
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
                        options={localDescriptions.map((d) => ({ label: d.name, value: d.name }))}
                        dropdownRender={(menu) => (
                          <>
                            {menu}
                            <Divider style={{ margin: '8px 0' }} />
                            <Space style={{ padding: '0 8px 4px' }}>
                              <Input
                                placeholder="New item description"
                                value={inlineNewDesc}
                                onChange={(e) => setInlineNewDesc(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                              <Button
                                type="text"
                                icon={<PlusOutlined />}
                                loading={isAddingInlineDesc}
                                onClick={async () => {
                                  const name = inlineNewDesc.trim();
                                  if (!name) return;
                                  setIsAddingInlineDesc(true);
                                  try {
                                    const created = await createItemDescription(name);
                                    setLocalDescriptions((prev) => prev.some((d) => d.name === created.name) ? prev : [...prev, created]);
                                    f.onChange(created.name);
                                    setInlineNewDesc('');
                                    message.success('Description added');
                                  } catch (error) {
                                    message.error(error instanceof Error ? error.message : 'Failed to add');
                                  } finally {
                                    setIsAddingInlineDesc(false);
                                  }
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
                  name={`items.${index}.quantity`}
                  render={({ field: f, fieldState }) => (
                    <Form.Item
                      label="Qty"
                      validateStatus={fieldState.error ? 'error' : undefined}
                      help={fieldState.error?.message}
                      className="mb-2 w-30"
                    >
                      <InputNumber min={1} precision={0} className="w-full" value={f.value} onChange={(v) => f.onChange(v ?? 1)} />
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
            {errors.items?.message && (
              <Typography.Text type="danger">{errors.items.message}</Typography.Text>
            )}

            <Controller
              control={control}
              name="notes"
              render={({ field }) => (
                <Form.Item label="Notes">
                  <Input.TextArea {...field} rows={4} placeholder="Any notes for the vendor..." />
                </Form.Item>
              )}
            />
          </Flex>
        </Drawer>
      )}

      <Drawer
        title="Manage Item Descriptions"
        size="small"
        open={descOpen}
        onClose={() => setDescOpen(false)}
        destroyOnClose
        extra={
          <Button type="primary" loading={isPending} onClick={async () => {
            if (!newDesc.trim()) return;
            startTransition(async () => {
              try {
                const created = await createItemDescription(newDesc.trim());
                setLocalDescriptions((prev) => prev.some((d) => d.name === created.name) ? prev : [...prev, created]);
                setNewDesc('');
                message.success('Description added');
              } catch (error) {
                message.error(error instanceof Error ? error.message : 'Failed to add');
              }
            });
          }}>
            Add
          </Button>
        }
      >
        <Flex gap={8} className="mb-4!">
          <Input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="New description name"
            onPressEnter={async () => {
              if (!newDesc.trim()) return;
              startTransition(async () => {
                try {
                  const created = await createItemDescription(newDesc.trim());
                  setLocalDescriptions((prev) => prev.some((d) => d.name === created.name) ? prev : [...prev, created]);
                  setNewDesc('');
                  message.success('Description added');
                } catch (error) {
                  message.error(error instanceof Error ? error.message : 'Failed to add');
                }
              });
            }}
          />
        </Flex>
        <Flex vertical gap={4}>
          {localDescriptions?.map((desc) => (
            <Flex key={desc.id} justify="space-between" align="center" className="rounded-lg border border-[var(--border)] px-3! py-2!">
              <Typography.Text>{desc.name}</Typography.Text>
              <Popconfirm
                title="Delete"
                description={`Remove "${desc.name}"?`}
                onConfirm={async () => {
                  startTransition(async () => {
                    try {
                      await deleteItemDescription(desc.id);
                      message.success('Deleted');
                    } catch (error) {
                      message.error(error instanceof Error ? error.message : 'Failed to delete');
                    }
                  });
                }}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            </Flex>
          ))}
        </Flex>
      </Drawer>

      <Drawer
        title={`Split by Vendor — ${splitEnquiry?.enquiryNo || ''}`}
        size="large"
        open={splitOpen}
        onClose={closeSplit}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={closeSplit}>Cancel</Button>
            <Button type="primary" icon={<FilePdfOutlined />} onClick={generateSplitPdf}>Generate PDF</Button>
          </Space>
        }
      >
        <Flex vertical gap={16}>
          <Typography.Text type="secondary">
            Pick a vendor and the items to send them. You can repeat this for each vendor if the requirement is split across more than one.
          </Typography.Text>

          <Form.Item label="Vendor" required>
            <Select
              placeholder="Select vendor"
              showSearch
              optionFilterProp="label"
              value={splitVendorId || undefined}
              onChange={setSplitVendorId}
              options={vendors.map((v) => ({ value: v.id, label: v.name }))}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <div>
            <Typography.Text strong className="text-sm">Items for this vendor</Typography.Text>
            <Checkbox.Group value={splitItemIndices} className="mt-2 block" onChange={(v) => setSplitItemIndices(v as number[])}>
              <Flex vertical gap={4}>
                {splitEnquiry?.items.map((item, idx) => (
                  <Checkbox key={idx} value={idx}>
                    {item.description} — Qty: {item.quantity}
                  </Checkbox>
                ))}
              </Flex>
            </Checkbox.Group>
          </div>
        </Flex>
      </Drawer>

      <Modal
        title={`Material Requirement — ${previewEnquiry?.enquiryNo || ''}${previewVendorName ? ` (${previewVendorName})` : ''}`}
        open={!!previewEnquiry}
        onCancel={() => { setPreviewEnquiry(null); setPreviewItems(null); setPreviewVendorName(null); }}
        width="90%"
        style={{ top: 20 }}
        footer={
          previewEnquiry && isClient ? (
            <PDFDownloadLink
              document={<PurchaseEnquiryPdf enquiry={previewEnquiry} items={previewItems ?? undefined} vendorName={previewVendorName ?? undefined} />}
              fileName={previewVendorName ? `${previewEnquiry.enquiryNo}-${previewVendorName}.pdf` : `${previewEnquiry.enquiryNo}.pdf`}
            >
              {({ loading }) => <Button type="primary" icon={<FilePdfOutlined />} loading={loading}>Download PDF</Button>}
            </PDFDownloadLink>
          ) : null
        }
      >
        {previewEnquiry && isClient && (
          <PDFViewer style={{ width: '100%', height: '80vh' }} showToolbar>
            <PurchaseEnquiryPdf enquiry={previewEnquiry} items={previewItems ?? undefined} vendorName={previewVendorName ?? undefined} />
          </PDFViewer>
        )}
      </Modal>

      <Modal
        title={historyEnquiry ? `Payment History — ${historyEnquiry.enquiryNo}` : 'Payment History'}
        open={historyOpen}
        onCancel={() => { setHistoryOpen(false); setHistoryEnquiry(null); }}
        footer={null}
      >
        <Table
          dataSource={historyPayments}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: 'No payments recorded yet' }}
          columns={[
            { title: 'Date', dataIndex: 'paymentDate', render: (v: string) => formatDate(v) },
            { title: 'Amount', dataIndex: 'amount', align: 'right', render: (v: number | string) => formatCurrency(v) },
            { title: 'Mode', dataIndex: 'paymentMode', render: (v: string) => v?.toUpperCase() },
            { title: 'Reference', dataIndex: 'referenceNumber', render: (v?: string | null) => v || '-' },
          ]}
        />
      </Modal>
    </div>
  );
}
