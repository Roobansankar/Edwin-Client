'use client';

import { useEffect, useMemo, useState, useTransition, useCallback } from 'react';
import { Button, Card, DatePicker, Drawer, Flex, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Typography, Upload, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, FilePdfOutlined, HistoryOutlined, PlusOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createPurchaseOrder, updatePurchaseOrderStatus, updatePurchaseOrder, deletePurchaseOrder, uploadBillFile } from '@/actions/purchase-orders';
import { createItemDescription, deleteItemDescription } from '@/actions/item-descriptions';
import { createPayment } from '@/actions/payments';
import type { Project, Vendor, PurchaseOrder, ItemDescription, VendorQuotation, Payment } from '@/types/erp';
import { useAuthStore } from '@/store/auth';
import {
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleIconClassName,
} from './ui';

type PurchaseOrdersClientProps = {
  purchaseOrders: PurchaseOrder[];
  projects: Project[];
  vendors: Vendor[];
  itemDescriptions?: ItemDescription[];
  vendorQuotations?: VendorQuotation[];
};

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Admin Approved', value: 'admin_approved' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

type PoItem = { description: string; quantity: number; unit: string; rate: number };
type VendorPoSection = { vendorId: string; vendorName: string; items: PoItem[]; gstPercent: number };

const approvedQuotations = (vqs: VendorQuotation[]) => vqs.filter((vq) => vq.status === 'approved');

export function PurchaseOrdersClient({ purchaseOrders, projects, vendors, itemDescriptions, vendorQuotations: vendorQuotationsProp }: PurchaseOrdersClientProps) {
  const user = useAuthStore((s) => s.user);
  const canManagePo = user?.role === 'admin' || user?.role === 'purchase_team';
  const canUpdateStatus = canManagePo;
  const [open, setOpen] = useState(false);
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null);
  const [descOpen, setDescOpen] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [billFile, setBillFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const { message } = App.useApp();

  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [selectedMRNo, setSelectedMRNo] = useState<string | null>(null);
  const [projectId, setProjectId] = useState('');
  const [vendorSections, setVendorSections] = useState<VendorPoSection[]>([]);

  const [poPayments, setPoPayments] = useState<Payment[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
  const [paymentDate, setPaymentDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [paymentMode, setPaymentMode] = useState('upi');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentPending, startPaymentTransition] = useTransition();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPo, setHistoryPo] = useState<PurchaseOrder | null>(null);
  const [historyPayments, setHistoryPayments] = useState<Payment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const vendorQuotations = useMemo(() => vendorQuotationsProp || [], [vendorQuotationsProp]);
  const usedQuotationKeys = useMemo(
    () => new Set(purchaseOrders.filter((po) => po.materialRequirementNo).map((po) => `${po.vendorId}|${po.materialRequirementNo}`)),
    [purchaseOrders],
  );
  const peOptions = useMemo(
    () => approvedQuotations(vendorQuotations).filter((q) => !usedQuotationKeys.has(`${q.vendorId}|${q.materialRequirement?.enquiryNo || ''}`)),
    [vendorQuotations, usedQuotationKeys],
  );

  const statusOptions = user?.role === 'purchase_team'
    ? STATUS_OPTIONS.filter((opt) => opt.value !== 'admin_approved')
    : STATUS_OPTIONS;

  const quotationToSection = (q: VendorQuotation): VendorPoSection => ({
    vendorId: q.vendorId,
    vendorName: q.vendor?.name || q.vendorId,
    items: q.items.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unit: 'nos',
      rate: 0,
    })),
    gstPercent: 0,
  });

  const handleEnquirySelect = useCallback((value: string) => {
    const q = peOptions.find((vq) => vq.id === value);
    if (!q) return;
    setSelectedQuotationId(value);
    setSelectedMRNo(q.materialRequirement?.enquiryNo || null);
    setProjectId(q.projectId);
    setVendorSections([quotationToSection(q)]);
  }, [peOptions]);

  const updateItemRate = (vIdx: number, iIdx: number, rate: number) => {
    setVendorSections((prev) => {
      const copy = [...prev];
      copy[vIdx].items[iIdx].rate = rate;
      return copy;
    });
  };

  const updateGst = (vIdx: number, gstPercent: number) => {
    setVendorSections((prev) => {
      const copy = [...prev];
      copy[vIdx].gstPercent = gstPercent;
      return copy;
    });
  };

  const calcSectionTotals = (section: VendorPoSection) => {
    const basicAmount = section.items.reduce((sum, i) => sum + i.quantity * i.rate, 0);
    const gstAmount = Number((basicAmount * section.gstPercent / 100).toFixed(2));
    const totalWithGst = Number((basicAmount + gstAmount).toFixed(2));
    return { basicAmount, gstAmount, totalWithGst };
  };

  const uploadBillFileIfNeeded = async (file: File) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return uploadBillFile({ name: file.name, base64 });
  };

  const handleCreate = async () => {
    if (!projectId) { message.error('Select a project'); return; }
    if (!vendorSections.length) { message.error('Select a Purchase Enquiry'); return; }
    for (const section of vendorSections) {
      if (!section.items.some((i) => i.rate > 0)) { message.error(`Enter rates for ${section.vendorName}`); return; }
    }

    let billFileUrl: string | undefined;
    let billFileKey: string | undefined;
    if (billFile) {
      try {
        const result = await uploadBillFileIfNeeded(billFile);
        billFileUrl = result.fileUrl;
        billFileKey = result.fileKey;
      } catch { message.error('File upload failed'); return; }
    }

    startTransition(async () => {
      try {
        let successCount = 0;
        for (const section of vendorSections) {
          const items = section.items.filter((i) => i.rate > 0).map((i) => ({
            description: i.description, quantity: i.quantity, unit: i.unit, rate: i.rate,
          }));
          if (!items.length) continue;
          const createdPo = await createPurchaseOrder({
            vendorId: section.vendorId,
            projectId,
            materialRequirementNo: selectedMRNo || undefined,
            gstPercent: section.gstPercent || undefined,
            items,
            billFileUrl,
            billFileKey,
          });
          successCount++;

          if (vendorSections.length === 1 && paymentAmount && paymentAmount > 0) {
            try {
              await createPayment({
                purchaseOrderId: createdPo.id,
                projectId,
                vendorId: section.vendorId,
                paymentType: 'material',
                amount: paymentAmount,
                paymentDate,
                paymentMode,
                referenceNumber: paymentReference || undefined,
              });
            } catch {
              message.warning('PO created, but recording the payment failed — add it from the PO edit view.');
            }
          }
        }
        message.success(`${successCount} PO(s) created`);
        handleClose();
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Failed to create PO(s)');
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    setEditingPo(null);
    setSelectedQuotationId(null);
    setSelectedMRNo(null);
    setProjectId('');
    setVendorSections([]);
    setBillFile(null);
    setPoPayments([]);
    setPaymentAmount(null);
    setPaymentReference('');
  };

  const loadPoPayments = async (poId: string) => {
    try {
      const res = await fetch(`/api/backend/payments?purchaseOrderId=${poId}`);
      if (res.ok) {
        const data = await res.json();
        setPoPayments(data?.data || []);
      }
    } catch { /* silent */ }
  };

  const openHistory = async (po: PurchaseOrder) => {
    setHistoryPo(po);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/backend/payments?purchaseOrderId=${po.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryPayments(data?.data || []);
      }
    } catch { /* silent */ }
    finally { setHistoryLoading(false); }
  };

  const handleAddPayment = (po: PurchaseOrder) => {
    if (!paymentAmount || paymentAmount <= 0) { message.error('Enter a valid amount'); return; }
    startPaymentTransition(async () => {
      try {
        await createPayment({
          purchaseOrderId: po.id,
          projectId: po.projectId,
          vendorId: po.vendorId,
          paymentType: 'material',
          amount: paymentAmount,
          paymentDate,
          paymentMode,
          referenceNumber: paymentReference || undefined,
        });
        message.success('Payment recorded');
        setPaymentAmount(null);
        setPaymentReference('');
        loadPoPayments(po.id);
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Failed to record payment');
      }
    });
  };

  const handleEdit = (po: PurchaseOrder) => {
    setEditingPo(po);
    setProjectId(po.projectId);
    loadPoPayments(po.id);
    setVendorSections([
      {
        vendorId: po.vendorId,
        vendorName: po.vendor?.name || po.vendorId,
        items: (po.items || []).map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unit: i.unit || 'nos',
          rate: Number(i.rate),
        })),
        gstPercent: Number(po.gstPercent) || 0,
      },
    ]);
    setBillFile(null);
    setOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingPo) return;
    if (!projectId) { message.error('Select a project'); return; }
    const section = vendorSections[0];
    if (!section || !section.items.some((i) => i.rate > 0)) { message.error('Enter rates for all items'); return; }

    let billFileUrl = editingPo.billFileUrl || undefined;
    let billFileKey = editingPo.billFileKey || undefined;
    if (billFile) {
      try {
        const result = await uploadBillFileIfNeeded(billFile);
        billFileUrl = result.fileUrl;
        billFileKey = result.fileKey;
      } catch { message.error('File upload failed'); return; }
    }

    startTransition(async () => {
      try {
        const items = section.items.filter((i) => i.rate > 0).map((i) => ({
          description: i.description, quantity: i.quantity, unit: i.unit, rate: i.rate,
        }));
        await updatePurchaseOrder(editingPo.id, {
          vendorId: section.vendorId,
          projectId,
          gstPercent: section.gstPercent || undefined,
          items,
          billFileUrl,
          billFileKey,
        });
        message.success('Purchase order updated');
        handleClose();
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Failed to update PO');
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try { await deletePurchaseOrder(id); message.success('Purchase order deleted'); }
      catch (error) { message.error(error instanceof Error ? error.message : 'Delete failed'); }
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      try { await updatePurchaseOrderStatus(id, status); message.success('Status updated'); }
      catch (error) { message.error(error instanceof Error ? error.message : 'Failed to update status'); }
    });
  };

  const columns: ColumnsType<PurchaseOrder> = [
    { title: 'S.No', key: 'sno', width: 60, render: (_text, _record, index) => index + 1 },
    { title: 'PO Number', dataIndex: 'poNumber', sorter: (a, b) => a.poNumber.localeCompare(b.poNumber), render: (value: string) => <Typography.Text strong>{value}</Typography.Text> },
    { title: 'MR Ref', dataIndex: 'materialRequirementNo', responsive: ['md'], sorter: (a, b) => (a.materialRequirementNo || '').localeCompare(b.materialRequirementNo || ''), render: (value?: string | null) => value || <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Vendor', dataIndex: ['vendor', 'name'], sorter: (a, b) => (a.vendor?.name || '').localeCompare(b.vendor?.name || ''), render: (_value, record) => record.vendor?.name || '-' },
    { title: 'Project', key: 'project', responsive: ['md'], sorter: (a, b) => (a.project?.name || '').localeCompare(b.project?.name || ''), render: (_value, record) => record.project ? `${record.project.name} (${record.project.projectCode || 'No Code'})` : '-' },
    { title: 'Status', dataIndex: 'status', width: 150, filters: STATUS_OPTIONS.map((opt) => ({ text: opt.label, value: opt.value })), onFilter: (value, record) => record.status === value, render: (value: string, record) =>
      canUpdateStatus ? (
        <Select defaultValue={value} size="small" variant="borderless" className="w-full" onChange={(newStatus) => handleStatusChange(record.id, newStatus)} options={statusOptions} popupMatchSelectWidth={false} styles={{ popup: { root: { minWidth: 140 } } }} disabled={isPending} />
      ) : (
        <Typography.Text>{value.charAt(0).toUpperCase() + value.slice(1)}</Typography.Text>
      ),
    },
    { title: 'GST', key: 'gst', align: 'right', width: 100, responsive: ['xl'], render: (_, r) => (r.gstPercent ? `${Number(r.gstPercent)}%` : '-') },
    { title: 'Total w/ GST', key: 'totalWithGst', align: 'right', width: 130, responsive: ['lg'], sorter: (a, b) => Number(a.totalWithGst || 0) - Number(b.totalWithGst || 0), render: (_, r) => formatCurrency(r.totalWithGst || r.totalAmount) },
    { title: 'Advance', key: 'advanceAmount', align: 'right', width: 120, responsive: ['lg'], sorter: (a, b) => Number(a.advanceAmount || 0) - Number(b.advanceAmount || 0), render: (_, r) => r.advanceAmount ? formatCurrency(r.advanceAmount) : <Typography.Text type="secondary">-</Typography.Text> },
    { title: 'Balance Total', key: 'balanceTotal', align: 'right', width: 130, responsive: ['lg'], sorter: (a, b) => (Number(a.totalWithGst || a.totalAmount) - Number(a.paidAmount || 0)) - (Number(b.totalWithGst || b.totalAmount) - Number(b.paidAmount || 0)), render: (_, r) => {
      const balance = Number(r.totalWithGst || r.totalAmount) - Number(r.paidAmount || 0);
      return <Typography.Text strong={balance > 0}>{formatCurrency(balance)}</Typography.Text>;
    } },
    { title: 'History', key: 'history', width: 90, render: (_, record) => (
      <Button size="small" icon={<HistoryOutlined />} onClick={() => openHistory(record)}>History</Button>
    ) },
    { title: 'PO', key: 'billFile', width: 120, responsive: ['lg'], render: (_, record) =>
      record.billFileUrl ? <Button type="link" size="small" icon={<FilePdfOutlined />} href={record.billFileUrl} target="_blank">View PO</Button> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    { title: 'Created', dataIndex: 'createdAt', responsive: ['lg'], sorter: (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(), render: formatDate },
    ...(canManagePo ? [{ title: 'Actions', key: 'actions', width: 100, render: (_: unknown, record: PurchaseOrder) => (
      <Space>
        <Button type="text" icon={<EditOutlined className="text-blue-500" />} title="Edit" onClick={() => handleEdit(record)} />
        <Popconfirm title="Delete Purchase Order?" description="This will permanently delete this PO." onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No" okButtonProps={{ danger: true }}>
          <Button type="text" icon={<DeleteOutlined className="text-red-500" />} title="Delete" loading={isPending} />
        </Popconfirm>
      </Space>
    )}] : []),
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={`${pageHeaderClassName} mb-8!`} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <ShoppingCartOutlined className={titleIconClassName} /> Purchase Orders
        </Typography.Title>
        {canManagePo && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { handleClose(); setOpen(true); }}>
            Create PO
          </Button>
        )}
      </Flex>

      <Card className={cardClassName} styles={{ body: { padding: 0 } }}>
        <Table dataSource={purchaseOrders} columns={columns} rowKey="id" size="middle" scroll={{ x: 'max-content' }} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} POs` }} />
      </Card>

      <Drawer
        title={editingPo ? `Edit PO — ${editingPo.poNumber}` : 'Create Purchase Order(s)'}
        size="large"
        open={open}
        onClose={handleClose}
        destroyOnClose
        extra={
          editingPo ? (
            <Space>
              <Button onClick={handleClose}>Cancel</Button>
              <Button type="primary" loading={isPending} onClick={handleUpdate}>Update</Button>
            </Space>
          ) : (
            <Space>
              <Button onClick={handleClose}>Cancel</Button>
              <Button type="primary" loading={isPending} onClick={handleCreate}>Create POs</Button>
            </Space>
          )
        }
      >
        <Form layout="vertical">
          {!editingPo && peOptions.length > 0 && (
            <Form.Item label="MR Ref" className="mb-6 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <Select
                showSearch
                placeholder="Search MR Ref or vendor..."
                optionFilterProp="label"
                onChange={handleEnquirySelect}
                value={selectedQuotationId || undefined}
                options={peOptions.map((q) => {
                  const mrRef = q.materialRequirement?.enquiryNo;
                  const vendorName = q.vendor?.name || q.vendorId;
                  const projectName = q.project?.name || 'Unknown project';
                  return {
                    value: q.id,
                    label: mrRef
                      ? `${mrRef} — ${vendorName} (${projectName})`
                      : `${projectName} — ${vendorName} (${formatDate(q.createdAt)})`,
                  };
                }).sort((a, b) => a.label.localeCompare(b.label))}
              />
            </Form.Item>
          )}

          {projectId && (
            <Form.Item label="Project">
              <Typography.Text>{projects.find((p) => p.id === projectId)?.name || projectId}</Typography.Text>
            </Form.Item>
          )}

          {!projectId && (
            <Form.Item label="Project" required>
              <Select
                showSearch
                placeholder="Select project"
                optionFilterProp="label"
                value={projectId || undefined}
                onChange={setProjectId}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
              />
            </Form.Item>
          )}

          {editingPo && (
            <Card size="small" title="Payments" className="border! border-gray-200! mb-4">
              <Table
                dataSource={poPayments}
                rowKey="id"
                size="small"
                pagination={false}
                className="mb-3"
                locale={{ emptyText: 'No payments recorded yet' }}
                columns={[
                  { title: 'Date', dataIndex: 'paymentDate', render: formatDate },
                  { title: 'Amount', dataIndex: 'amount', align: 'right', render: (v: number | string) => formatCurrency(v) },
                  { title: 'Mode', dataIndex: 'paymentMode', render: (v: string) => v?.toUpperCase() },
                  { title: 'Reference', dataIndex: 'referenceNumber', render: (v?: string | null) => v || '-' },
                ]}
              />
              <Flex gap={8} wrap="wrap" align="flex-end">
                <InputNumber min={0} placeholder="Amount" value={paymentAmount} onChange={setPaymentAmount} style={{ width: 140 }} />
                <DatePicker
                  value={dayjs(paymentDate)}
                  onChange={(_, dateStr) => setPaymentDate(typeof dateStr === 'string' ? dateStr : paymentDate)}
                  style={{ width: 140 }}
                />
                <Select
                  value={paymentMode}
                  onChange={setPaymentMode}
                  style={{ width: 120 }}
                  options={[
                    { label: 'UPI', value: 'upi' },
                    { label: 'RTGS', value: 'rtgs' },
                    { label: 'Cash', value: 'cash' },
                    { label: 'Cheque', value: 'cheque' },
                  ]}
                />
                <Input placeholder="Reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} style={{ width: 140 }} />
                <Button type="primary" loading={paymentPending} onClick={() => handleAddPayment(editingPo)}>
                  Add Payment
                </Button>
              </Flex>
            </Card>
          )}

          {!editingPo && vendorSections.length === 1 && (
            <Card size="small" title="Payment (optional)" className="border! border-gray-200! mb-4">
              <Typography.Text type="secondary" className="mb-2 block text-xs">
                Record a payment made at the time this PO is created — it'll be saved once you click Create.
              </Typography.Text>
              <Flex gap={8} wrap="wrap" align="flex-end">
                <InputNumber min={0} placeholder="Amount" value={paymentAmount} onChange={setPaymentAmount} style={{ width: 140 }} />
                <DatePicker
                  value={dayjs(paymentDate)}
                  onChange={(_, dateStr) => setPaymentDate(typeof dateStr === 'string' ? dateStr : paymentDate)}
                  style={{ width: 140 }}
                />
                <Select
                  value={paymentMode}
                  onChange={setPaymentMode}
                  style={{ width: 120 }}
                  options={[
                    { label: 'UPI', value: 'upi' },
                    { label: 'RTGS', value: 'rtgs' },
                    { label: 'Cash', value: 'cash' },
                    { label: 'Cheque', value: 'cheque' },
                  ]}
                />
                <Input placeholder="Reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} style={{ width: 140 }} />
              </Flex>
            </Card>
          )}

          {vendorSections.map((section, vIdx) => {
            const { basicAmount, gstAmount, totalWithGst } = calcSectionTotals(section);
            return (
              <Card key={vIdx} size="small" title={`PO #${vIdx + 1} — ${section.vendorName}`} className="border! border-gray-200! mb-4">
                <Flex vertical gap={12}>
                  <Typography.Text strong className="text-sm">Items</Typography.Text>
                  {section.items.map((item, iIdx) => (
                    <Flex key={iIdx} gap={8} align="center">
                      <Typography.Text style={{ width: 180 }}>{item.description}</Typography.Text>
                      <Typography.Text type="secondary" style={{ width: 80 }}>Qty: {item.quantity}</Typography.Text>
                      <InputNumber
                        placeholder="Rate"
                        min={0}
                        style={{ width: 120 }}
                        prefix="₹"
                        value={item.rate || undefined}
                        onChange={(v) => updateItemRate(vIdx, iIdx, v ?? 0)}
                        addonAfter={`= ₹${(item.quantity * (item.rate || 0)).toFixed(2)}`}
                      />
                    </Flex>
                  ))}
                  <Flex gap={16} align="center">
                    <Form.Item label="GST %" className="mb-0">
                      <InputNumber min={0} max={100} addonAfter="%" value={section.gstPercent || undefined} onChange={(v) => updateGst(vIdx, v ?? 0)} />
                    </Form.Item>
                    <Form.Item label="Basic" className="mb-0"><Typography.Text strong>{formatCurrency(basicAmount)}</Typography.Text></Form.Item>
                    <Form.Item label="GST Amt" className="mb-0"><Typography.Text>{formatCurrency(gstAmount)}</Typography.Text></Form.Item>
                    <Form.Item label="Total" className="mb-0"><Typography.Text strong>{formatCurrency(totalWithGst)}</Typography.Text></Form.Item>
                  </Flex>
                </Flex>
              </Card>
            );
          })}

          <Typography.Text strong className="mt-4 block">PO Document</Typography.Text>
          <Upload accept=".pdf,.jpg,.jpeg,.png" showUploadList={false} beforeUpload={(file) => { setBillFile(file); return false; }} onRemove={() => setBillFile(null)}>
            <Button icon={<FilePdfOutlined />}>{billFile ? billFile.name : (editingPo?.billFileUrl ? 'Replace PO' : 'Upload PO')}</Button>
          </Upload>
          {billFile && <Typography.Text type="secondary" className="text-xs">{billFile.name}</Typography.Text>}
          {editingPo?.billFileUrl && !billFile && <Button type="link" size="small" href={editingPo.billFileUrl} target="_blank">View uploaded PO</Button>}
        </Form>
      </Drawer>

      <Drawer title="Manage Item Descriptions" size="small" open={descOpen} onClose={() => setDescOpen(false)} destroyOnClose
        extra={<Button type="primary" loading={isPending} onClick={async () => {
          if (!newDesc.trim()) return;
          startTransition(async () => {
            try { await createItemDescription(newDesc.trim()); setNewDesc(''); message.success('Description added'); }
            catch (error) { message.error(error instanceof Error ? error.message : 'Failed to add'); }
          });
        }}>Add</Button>}
      >
        <Flex gap={8} className="mb-4!">
          <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="New description name"
            onPressEnter={async () => {
              if (!newDesc.trim()) return;
              startTransition(async () => {
                try { await createItemDescription(newDesc.trim()); setNewDesc(''); message.success('Description added'); }
                catch (error) { message.error(error instanceof Error ? error.message : 'Failed to add'); }
              });
            }}
          />
        </Flex>
        <Flex vertical gap={4}>
          {itemDescriptions?.map((desc) => (
            <Flex key={desc.id} justify="space-between" align="center" className="rounded-lg border border-[var(--border)] px-3! py-2!">
              <Typography.Text>{desc.name}</Typography.Text>
              <Popconfirm title="Delete" description={`Remove "${desc.name}"?`} onConfirm={async () => {
                startTransition(async () => {
                  try { await deleteItemDescription(desc.id); message.success('Deleted'); }
                  catch (error) { message.error(error instanceof Error ? error.message : 'Failed to delete'); }
                });
              }} okText="Yes" cancelText="No" okButtonProps={{ danger: true }}>
                <Button type="text" danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            </Flex>
          ))}
        </Flex>
      </Drawer>

      <Modal
        title={historyPo ? `Payment History — ${historyPo.poNumber}` : 'Payment History'}
        open={historyOpen}
        onCancel={() => { setHistoryOpen(false); setHistoryPo(null); setHistoryPayments([]); }}
        footer={null}
      >
        <Table
          dataSource={historyPayments}
          rowKey="id"
          size="small"
          loading={historyLoading}
          pagination={false}
          locale={{ emptyText: 'No payments recorded yet' }}
          columns={[
            { title: 'Date', dataIndex: 'paymentDate', render: formatDate },
            { title: 'Amount', dataIndex: 'amount', align: 'right', render: (v: number | string) => formatCurrency(v) },
            { title: 'Mode', dataIndex: 'paymentMode', render: (v: string) => v?.toUpperCase() },
            { title: 'Reference', dataIndex: 'referenceNumber', render: (v?: string | null) => v || '-' },
          ]}
        />
      </Modal>
    </div>
  );
}