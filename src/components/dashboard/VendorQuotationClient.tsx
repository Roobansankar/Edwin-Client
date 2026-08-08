'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  Button, Card, Checkbox, Drawer, Flex, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, App, Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, UploadOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, EditOutlined } from '@ant-design/icons';
import type { Project, Vendor, VendorQuotation, PurchaseEnquiry } from '@/types/erp';
import { cardClassName, formatDate, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';
import { clientApiFetch } from '@/lib/client-api';

type Props = {
  vendors: Vendor[];
  projects: Project[];
};

type QuotationItem = { description: string; quantity: number };
type VendorSection = { vendorId: string; itemIndices: number[]; file: File | null; totalAmount: number | null };

const apiPost = async (path: string, data: unknown) => {
  const res = await fetch(`/api/backend${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || err?.error || `Request failed (${res.status})`);
  }
  return res.json();
};

const apiPatch = async (path: string, data: unknown) => {
  const res = await fetch(`/api/backend${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || err?.error || `Patch failed (${res.status})`);
  }
};

const apiDelete = async (path: string) => {
  const res = await fetch(`/api/backend${path}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
};

function compressImage(file: File, maxW = 1920, quality = 0.7): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return resolve(file);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxW || height > maxW) {
        const ratio = Math.min(maxW / width, maxW / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const c = document.createElement('canvas');
      c.width = width; c.height = height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      c.toBlob((blob) => {
        if (!blob) return reject(new Error('Compression failed'));
        resolve(new File([blob], file.name, { type: file.type }));
      }, file.type, quality);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

export function VendorQuotationClient({ vendors, projects }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<VendorQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { message } = App.useApp();

  const [projectId, setProjectId] = useState('');
  const [selectedMR, setSelectedMR] = useState<string | null>(null);
  const [materialRequirements, setMaterialRequirements] = useState<PurchaseEnquiry[]>([]);
  const [mrItems, setMrItems] = useState<QuotationItem[]>([]);
  const [vendorSections, setVendorSections] = useState<VendorSection[]>([
    { vendorId: '', itemIndices: [], file: null, totalAmount: null },
  ]);

  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<VendorQuotation | null>(null);
  const [editProjectId, setEditProjectId] = useState('');
  const [editVendorId, setEditVendorId] = useState('');
  const [editItems, setEditItems] = useState<QuotationItem[]>([]);
  const [editTotalAmount, setEditTotalAmount] = useState<number | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const quotedMrIds = useMemo(
    () => new Set(data.filter((q) => q.materialRequirementId).map((q) => q.materialRequirementId as string)),
    [data],
  );
  const availableMrs = useMemo(
    () => materialRequirements.filter((m) => m.status === 'approved' && (!quotedMrIds.has(m.id) || m.id === selectedMR)),
    [materialRequirements, quotedMrIds, selectedMR],
  );

  const fetchData = async () => {
    try {
      const [quotations, mrs] = await Promise.all([
        clientApiFetch<VendorQuotation[]>('/vendor-quotations'),
        clientApiFetch<PurchaseEnquiry[]>('/purchase-enquiries'),
      ]);
      setData(Array.isArray(quotations) ? quotations : []);
      setMaterialRequirements(Array.isArray(mrs) ? mrs : []);
    } catch {
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setProjectId('');
    setSelectedMR(null);
    setMrItems([]);
    setVendorSections([{ vendorId: '', itemIndices: [], file: null, totalAmount: null }]);
  };

  useEffect(() => { fetchData(); }, []);

  const addVendorSection = () => {
    setVendorSections([...vendorSections, { vendorId: '', itemIndices: [], file: null, totalAmount: null }]);
  };

  const removeVendorSection = (idx: number) => {
    setVendorSections(vendorSections.filter((_, i) => i !== idx));
  };

  const updateVendor = (idx: number, vendorId: string) => {
    const copy = [...vendorSections];
    copy[idx].vendorId = vendorId;
    setVendorSections(copy);
  };

  const toggleItem = (sectionIdx: number, itemIdx: number) => {
    const copy = [...vendorSections];
    const set = new Set(copy[sectionIdx].itemIndices);
    if (set.has(itemIdx)) set.delete(itemIdx); else set.add(itemIdx);
    copy[sectionIdx].itemIndices = [...set].sort();
    setVendorSections(copy);
  };

  const setFile = (sectionIdx: number, file: File | null) => {
    const copy = [...vendorSections];
    copy[sectionIdx].file = file;
    setVendorSections(copy);
  };

  const setSectionTotalAmount = (sectionIdx: number, totalAmount: number | null) => {
    const copy = [...vendorSections];
    copy[sectionIdx].totalAmount = totalAmount;
    setVendorSections(copy);
  };

  const submit = () => {
    if (!projectId) { message.error('Select a project'); return; }
    if (vendorSections.some((s) => !s.vendorId)) { message.error('Select a vendor for each section'); return; }
    if (vendorSections.some((s) => !s.itemIndices.length)) { message.error('Select at least one item per vendor'); return; }

    startTransition(async () => {
      try {
        let groupId: string | null = null;

        for (let i = 0; i < vendorSections.length; i++) {
          const section = vendorSections[i];
          const items = section.itemIndices.map((idx) => ({
            description: mrItems[idx].description,
            quantity: Number(mrItems[idx].quantity),
          }));

          const body: Record<string, unknown> = {
            projectId,
            vendorId: section.vendorId,
            items,
            totalAmount: section.totalAmount || undefined,
            materialRequirementId: selectedMR || undefined,
          };
          if (groupId) body.groupId = groupId;

          const quotation = await apiPost('/vendor-quotations', body);
          if (!groupId) groupId = quotation.groupId;

          if (section.file) {
            const fd = new FormData();
            fd.append('quotation', section.file);
            const res = await fetch(`/api/backend/vendor-quotations/${quotation.id}/upload`, {
              method: 'POST',
              credentials: 'same-origin',
              body: fd,
            });
            if (!res.ok) throw new Error(`Upload failed (${res.status})`);
          }
        }

        message.success('Quotations created');
        handleClose();
        fetchData();
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Failed to create');
      }
    });
  };

  const openEdit = (record: VendorQuotation) => {
    setEditRecord(record);
    setEditProjectId(record.projectId);
    setEditVendorId(record.vendorId);
    setEditItems(record.items.map((i) => ({ description: i.description, quantity: i.quantity })));
    setEditTotalAmount(record.totalAmount ? Number(record.totalAmount) : null);
    setEditFile(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditRecord(null);
    setEditProjectId('');
    setEditVendorId('');
    setEditItems([]);
    setEditTotalAmount(null);
    setEditFile(null);
  };

  const updateEditItem = (idx: number, field: 'description' | 'quantity', value: string | number) => {
    const copy = [...editItems];
    copy[idx] = { ...copy[idx], [field]: value } as QuotationItem;
    setEditItems(copy);
  };

  const addEditItem = () => setEditItems([...editItems, { description: '', quantity: 1 }]);
  const removeEditItem = (idx: number) => setEditItems(editItems.filter((_, i) => i !== idx));

  const submitEdit = async () => {
    if (!editRecord) return;
    if (!editProjectId) { message.error('Select a project'); return; }
    if (!editVendorId) { message.error('Select a vendor'); return; }
    if (!editItems.length || editItems.some((i) => !i.description || !i.quantity)) {
      message.error('Fill in all item fields');
      return;
    }

    setEditSaving(true);
    try {
      await apiPatch(`/vendor-quotations/${editRecord.id}`, {
        projectId: editProjectId,
        vendorId: editVendorId,
        items: editItems.map((i) => ({ description: i.description, quantity: Number(i.quantity) })),
        totalAmount: editTotalAmount || undefined,
      });

      if (editFile) {
        const fd = new FormData();
        fd.append('quotation', editFile);
        const res = await fetch(`/api/backend/vendor-quotations/${editRecord.id}/upload`, {
          method: 'POST',
          credentials: 'same-origin',
          body: fd,
        });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      }

      message.success('Quotation updated');
      closeEdit();
      fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setEditSaving(false);
    }
  };

  const flatData = data.reduce<Array<VendorQuotation & { _groupSize: number; _isFirst: boolean }>>((acc, r, idx) => {
    const prev = data[idx - 1];
    const isNewGroup = !prev || prev.groupId !== r.groupId;
    const groupSize = isNewGroup
      ? data.slice(idx).findIndex((x) => x.groupId !== r.groupId)
      : 0;
    const realGroupSize = groupSize === -1 ? data.length - idx : groupSize > 0 ? groupSize : 0;
    acc.push({ ...r, _groupSize: isNewGroup ? (realGroupSize || 1) : 0, _isFirst: isNewGroup });
    return acc;
  }, []);

  const columns: ColumnsType<(typeof flatData)[number]> = [
    {
      title: 'S.No', key: 'sno', width: 60,
      onCell: (r) => ({ rowSpan: r._isFirst ? r._groupSize : 0 }),
      render: (_, r, idx) => {
        if (!r._isFirst) return null;
        const sno = flatData.slice(0, idx + 1).filter((x) => x._isFirst).length;
        return sno;
      },
    },
    {
      title: 'MR Ref', key: 'mr', width: 130, responsive: ['md'],
      onCell: (r) => ({ rowSpan: r._isFirst ? r._groupSize : 0 }),
      render: (_, r) => r.materialRequirement?.enquiryNo || '-',
    },
    {
      title: 'Project', key: 'project', width: 160,
      onCell: (r) => ({ rowSpan: r._isFirst ? r._groupSize : 0 }),
      render: (_, r) => r.project?.name || r.projectId,
    },
    {
      title: 'MR Items', key: 'mrItems', width: 200, responsive: ['lg'],
      onCell: (r) => ({ rowSpan: r._isFirst ? r._groupSize : 0 }),
      render: (_, r) => {
        const items = r.materialRequirement?.items?.length ? r.materialRequirement.items : r.items;
        return (
          <Flex vertical>
            {items?.map((i, idx) => (
              <Typography.Text key={idx} className="text-xs">{i.description} — Qty: {i.quantity}</Typography.Text>
            ))}
          </Flex>
        );
      },
    },
    {
      title: 'Vendor — Items', key: 'vendorItems', width: 280,
      render: (_, r) => (
        <Flex vertical>
          <Typography.Text strong className="text-xs">{r.vendor?.name || r.vendorId}:</Typography.Text>
          {r.items?.map((i, idx) => (
            <Typography.Text key={idx} className="text-xs ml-2">{i.description} — Qty: {i.quantity}</Typography.Text>
          ))}
        </Flex>
      ),
    },
    {
      title: 'Quotation', key: 'quotation', width: 120, responsive: ['lg'],
      render: (_, r) =>
        r.quotationUrl ? (
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setPreviewUrl(r.quotationUrl!)}>
            View
          </Button>
        ) : (
          <Typography.Text type="secondary">-</Typography.Text>
        ),
    },
    { title: 'Status', key: 'status', width: 120, render: (_, r) => (
      <Select
        size="small"
        value={r.status || 'pending'}
        onChange={(v) => {
          startTransition(async () => {
            try {
              await apiPatch(`/vendor-quotations/${r.id}`, { status: v });
              message.success(`Status updated to ${v}`);
              fetchData();
            } catch (err) {
              message.error(err instanceof Error ? err.message : 'Failed to update status');
            }
          });
        }}
        options={[
          { value: 'pending', label: 'PENDING' },
          { value: 'approved', label: 'APPROVED' },
          { value: 'rejected', label: 'REJECTED' },
        ]}
        style={{ width: 110 }}
      />
    )},
    {
      title: 'Date', key: 'createdAt', width: 110, responsive: ['lg'],
      onCell: (r) => ({ rowSpan: r._isFirst ? r._groupSize : 0 }),
      render: (_, r) => r.createdAt ? formatDate(r.createdAt) : '-',
    },
    {
      title: 'Action', key: 'action', width: 100,
      render: (_, r) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => {
            Modal.confirm({
              title: 'Delete quotation?',
              onOk: () => startTransition(async () => {
                await apiDelete(`/vendor-quotations/${r.id}`);
                message.success('Deleted');
                fetchData();
              }),
            });
          }} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName}>
        <Typography.Title level={3} className={pageTitleClassName}>
          <FileTextOutlined className={titleIconClassName} style={{ marginBottom: 24 }} /> Purchase Enquiry
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          New Enquiry
        </Button>
      </Flex>

      <Card className={cardClassName} styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={flatData}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          loading={loading}
          locale={{ emptyText: 'No purchase enquiries yet' }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Drawer
        title="New Purchase Enquiry"
        size="large"
        open={open}
        onClose={handleClose}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={submit}>Submit</Button>
          </Space>
        }
      >
        <Flex vertical gap={16}>
          <Form.Item label="Material Requirement Request">
            <Select
              allowClear
              placeholder="Select MR"
              showSearch
              optionFilterProp="label"
              value={selectedMR}
              onChange={(v) => {
                setSelectedMR(v);
                const mr = availableMrs.find((m) => m.id === v);
                if (mr) {
                  setProjectId(mr.projectId);
                  setMrItems(mr.items.map((i) => ({ description: i.description, quantity: i.quantity })));
                  setVendorSections([{ vendorId: '', itemIndices: [], file: null, totalAmount: null }]);
                } else {
                  setMrItems([]);
                  setProjectId('');
                  setVendorSections([{ vendorId: '', itemIndices: [], file: null, totalAmount: null }]);
                }
              }}
              options={availableMrs.map((m) => ({
                value: m.id,
                label: `${m.enquiryNo} — ${m.project?.name || ''}`,
              }))}
              style={{ width: '100%' }}
            />
          </Form.Item>

          {mrItems.length > 0 && (
            <Card size="small" title="MR Items" className="border! border-gray-200!">
              <Flex vertical gap={4}>
                {mrItems.map((item, idx) => (
                  <Typography.Text key={idx}>
                    {idx + 1}. {item.description} — Qty: {item.quantity}
                  </Typography.Text>
                ))}
              </Flex>
            </Card>
          )}

          <Form.Item label="Project" required>
            <Select
              placeholder="Select project"
              showSearch
              optionFilterProp="label"
              value={projectId || undefined}
              onChange={setProjectId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              style={{ width: '100%' }}
            />
          </Form.Item>

          {vendorSections.map((section, sIdx) => (
            <Card
              key={sIdx}
              size="small"
              title={`Vendor ${sIdx + 1}`}
              extra={sIdx > 0 && <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => removeVendorSection(sIdx)} />}
              className="border! border-gray-200!"
            >
              <Flex vertical gap={12}>
                <Select
                  placeholder="Select vendor"
                  showSearch
                  optionFilterProp="label"
                  value={section.vendorId || undefined}
                  onChange={(v) => updateVendor(sIdx, v)}
                  options={vendors.map((v) => ({ value: v.id, label: v.name }))}
                  style={{ width: '100%' }}
                />

                <div>
                  <Typography.Text strong className="text-sm">Assign MR Items to this Vendor</Typography.Text>
                  {mrItems.length === 0 ? (
                    <Typography.Text type="secondary" className="block mt-1">Select an MR first</Typography.Text>
                  ) : (
                    <Checkbox.Group value={section.itemIndices} className="mt-2 block">
                      <Flex vertical gap={4}>
                        {mrItems.map((item, idx) => (
                          <Checkbox key={idx} value={idx} onChange={() => toggleItem(sIdx, idx)}>
                            {item.description} — Qty: {item.quantity}
                          </Checkbox>
                        ))}
                      </Flex>
                    </Checkbox.Group>
                  )}
                </div>

                <Form.Item label="Total Amount" className="mb-0">
                  <InputNumber
                    className="w-full"
                    min={0}
                    placeholder="Enter quoted total amount"
                    value={section.totalAmount}
                    onChange={(v) => setSectionTotalAmount(sIdx, v)}
                  />
                </Form.Item>

                <Upload
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
                  beforeUpload={async (file) => {
                    const compressed = await compressImage(file, 1920, 0.7);
                    setFile(sIdx, compressed);
                    return false;
                  }}
                  onRemove={() => setFile(sIdx, null)}
                  maxCount={1}
                  fileList={section.file ? [{ uid: '-1', name: section.file.name, status: 'done' }] : []}
                >
                  <Button icon={<UploadOutlined />}>Upload Quotation Bill</Button>
                </Upload>
              </Flex>
            </Card>
          ))}

          <Button type="dashed" icon={<PlusOutlined />} onClick={addVendorSection} block>
            Add Another Vendor
          </Button>
        </Flex>
      </Drawer>

      <Drawer
        title={`Edit Enquiry — ${editRecord?.vendor?.name || ''}`}
        size="large"
        open={editOpen}
        onClose={closeEdit}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={closeEdit}>Cancel</Button>
            <Button type="primary" loading={editSaving} onClick={submitEdit}>Save</Button>
          </Space>
        }
      >
        <Flex vertical gap={16}>
          <Form.Item label="Project" required>
            <Select
              placeholder="Select project"
              showSearch
              optionFilterProp="label"
              value={editProjectId || undefined}
              onChange={setEditProjectId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item label="Vendor" required>
            <Select
              placeholder="Select vendor"
              showSearch
              optionFilterProp="label"
              value={editVendorId || undefined}
              onChange={setEditVendorId}
              options={vendors.map((v) => ({ value: v.id, label: v.name }))}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <div>
            <Typography.Text strong className="text-sm">Items</Typography.Text>
            <Flex vertical gap={8} className="mt-2!">
              {editItems.map((item, idx) => (
                <Flex key={idx} gap={8} align="center">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateEditItem(idx, 'description', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <InputNumber
                    placeholder="Qty"
                    min={1}
                    value={item.quantity}
                    onChange={(v) => updateEditItem(idx, 'quantity', v ?? 1)}
                    style={{ width: 100 }}
                  />
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    disabled={editItems.length <= 1}
                    onClick={() => removeEditItem(idx)}
                  />
                </Flex>
              ))}
            </Flex>
            <Button type="dashed" icon={<PlusOutlined />} onClick={addEditItem} block className="mt-2">
              Add Item
            </Button>
          </div>

          <Form.Item label="Total Amount">
            <InputNumber
              className="w-full"
              min={0}
              placeholder="Enter quoted total amount"
              value={editTotalAmount}
              onChange={setEditTotalAmount}
            />
          </Form.Item>

          <Form.Item label="Quotation Bill">
            {editRecord?.quotationUrl && !editFile && (
              <Flex align="center" gap={8} className="mb-2!">
                <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setPreviewUrl(editRecord.quotationUrl!)}>
                  View current file
                </Button>
              </Flex>
            )}
            <Upload
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
              beforeUpload={async (file) => {
                const compressed = await compressImage(file, 1920, 0.7);
                setEditFile(compressed);
                return false;
              }}
              onRemove={() => setEditFile(null)}
              maxCount={1}
              fileList={editFile ? [{ uid: '-1', name: editFile.name, status: 'done' }] : []}
            >
              <Button icon={<UploadOutlined />}>
                {editRecord?.quotationUrl ? 'Replace Quotation Bill' : 'Upload Quotation Bill'}
              </Button>
            </Upload>
          </Form.Item>
        </Flex>
      </Drawer>

      <Modal
        open={!!previewUrl}
        footer={null}
        onCancel={() => setPreviewUrl(null)}
        width={800}
        title="Quotation Bill"
      >
        {previewUrl?.endsWith('.pdf') ? (
          <iframe src={previewUrl} style={{ width: '100%', height: 500, border: 'none' }} title="Quotation" />
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Quotation" style={{ width: '100%', maxHeight: 500, objectFit: 'contain' }} />
        ) : null}
      </Modal>
    </div>
  );
}