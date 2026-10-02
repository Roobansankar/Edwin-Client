'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  Button, Card, DatePicker, Drawer, Flex, Form, Input, InputNumber, Modal, Select, Space, Table, Typography, App, Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, UploadOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Project, Subcontractor, WorkCategory, SubcontractorEnquiry } from '@/types/erp';
import { cardClassName, formatCurrency, formatDate, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';
import { clientApiFetch } from '@/lib/client-api';

type Props = {
  subcontractors: Subcontractor[];
  projects: Project[];
  workCategories: WorkCategory[];
};

type SubSection = {
  subcontractorId: string;
  totalAmount: number | null;
  gstPercent: number | null;
  startDate: string | null;
  endDate: string | null;
  file: File | null;
};

const EMPTY_SECTION: SubSection = { subcontractorId: '', totalAmount: null, gstPercent: null, startDate: null, endDate: null, file: null };

function calcGst(basicAmount: number | null, gstPercent: number | null) {
  const basic = basicAmount || 0;
  const percent = gstPercent || 0;
  const gstAmount = Number(((basic * percent) / 100).toFixed(2));
  return { basicAmount: basic, gstAmount, total: Number((basic + gstAmount).toFixed(2)) };
}

function formatPeriod(startDate?: string | null, endDate?: string | null) {
  if (!startDate && !endDate) return '-';
  const start = startDate ? formatDate(startDate) : '-';
  const end = endDate ? formatDate(endDate) : '-';
  return `${start} to ${end}`;
}

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

export function SubcontractorEnquiryClient({ subcontractors, projects, workCategories }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<SubcontractorEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const { message } = App.useApp();

  const [projectId, setProjectId] = useState('');
  const [workCategoryId, setWorkCategoryId] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [subSections, setSubSections] = useState<SubSection[]>([{ ...EMPTY_SECTION }]);

  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<SubcontractorEnquiry | null>(null);
  const [editProjectId, setEditProjectId] = useState('');
  const [editWorkCategoryId, setEditWorkCategoryId] = useState('');
  const [editSubcontractorId, setEditSubcontractorId] = useState('');
  const [editScopeOfWork, setEditScopeOfWork] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState<number | null>(null);
  const [editGstPercent, setEditGstPercent] = useState<number | null>(null);
  const [editStartDate, setEditStartDate] = useState<string | null>(null);
  const [editEndDate, setEditEndDate] = useState<string | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Add-another-subcontractor-to-an-existing-enquiry-group flow: reuses the
  // same POST /subcontractor-enquiries endpoint the multi-subcontractor
  // "New Enquiry" form uses, passing the existing group's groupId so the
  // new quote joins that group instead of starting a new one.
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [addSubGroup, setAddSubGroup] = useState<{ groupId: string; projectId: string; workCategoryId: string } | null>(null);
  const [addSubId, setAddSubId] = useState('');
  const [addSubTotalAmount, setAddSubTotalAmount] = useState<number | null>(null);
  const [addSubGstPercent, setAddSubGstPercent] = useState<number | null>(null);
  const [addSubStartDate, setAddSubStartDate] = useState<string | null>(null);
  const [addSubEndDate, setAddSubEndDate] = useState<string | null>(null);
  const [addSubFile, setAddSubFile] = useState<File | null>(null);
  const [addSubSaving, setAddSubSaving] = useState(false);

  // Picking a Work Category narrows each "Subcontractor" dropdown down to
  // only subcontractors registered under that category - same idea across
  // the New Enquiry form, Edit drawer, and Add Subcontractor drawer.
  const sectionSubcontractorOptions = useMemo(
    () => (workCategoryId ? subcontractors.filter((s) => s.workCategory?.id === workCategoryId) : subcontractors),
    [subcontractors, workCategoryId],
  );
  const editSubcontractorOptions = useMemo(
    () => (editWorkCategoryId ? subcontractors.filter((s) => s.workCategory?.id === editWorkCategoryId) : subcontractors),
    [subcontractors, editWorkCategoryId],
  );
  const addSubSubcontractorOptions = useMemo(
    () => (addSubGroup?.workCategoryId ? subcontractors.filter((s) => s.workCategory?.id === addSubGroup.workCategoryId) : subcontractors),
    [subcontractors, addSubGroup],
  );

  const fetchData = async () => {
    try {
      const enquiries = await clientApiFetch<SubcontractorEnquiry[]>('/subcontractor-enquiries');
      setData(Array.isArray(enquiries) ? enquiries : []);
    } catch {
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleClose = () => {
    setOpen(false);
    setProjectId('');
    setWorkCategoryId('');
    setScopeOfWork('');
    setSubSections([{ ...EMPTY_SECTION }]);
  };

  const addSubSection = () => setSubSections([...subSections, { ...EMPTY_SECTION }]);
  const removeSubSection = (idx: number) => setSubSections(subSections.filter((_, i) => i !== idx));

  const updateSection = (idx: number, patch: Partial<SubSection>) => {
    setSubSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const submit = () => {
    if (!projectId) { message.error('Select a project'); return; }
    if (!workCategoryId) { message.error('Select a work category'); return; }
    if (subSections.some((s) => !s.subcontractorId)) { message.error('Select a subcontractor for each section'); return; }
    if (subSections.some((s) => !s.totalAmount || s.totalAmount <= 0)) { message.error('Enter a quoted amount for each subcontractor'); return; }

    startTransition(async () => {
      try {
        let groupId: string | null = null;

        for (const section of subSections) {
          const body: Record<string, unknown> = {
            projectId,
            workCategoryId,
            subcontractorId: section.subcontractorId,
            scopeOfWork: scopeOfWork || undefined,
            totalAmount: section.totalAmount || undefined,
            gstPercent: section.gstPercent || undefined,
            startDate: section.startDate || undefined,
            endDate: section.endDate || undefined,
          };
          if (groupId) body.groupId = groupId;

          const enquiry = await apiPost('/subcontractor-enquiries', body);
          if (!groupId) groupId = enquiry.groupId;

          if (section.file) {
            const fd = new FormData();
            fd.append('quotation', section.file);
            const res = await fetch(`/api/backend/subcontractor-enquiries/${enquiry.id}/upload`, {
              method: 'POST',
              credentials: 'same-origin',
              body: fd,
            });
            if (!res.ok) throw new Error(`Upload failed (${res.status})`);
          }
        }

        message.success('Subcontractor enquiry created');
        handleClose();
        fetchData();
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Failed to create');
      }
    });
  };

  const openEdit = (record: SubcontractorEnquiry) => {
    setEditRecord(record);
    setEditProjectId(record.projectId);
    setEditWorkCategoryId(record.workCategoryId);
    setEditSubcontractorId(record.subcontractorId);
    setEditScopeOfWork(record.scopeOfWork || '');
    setEditTotalAmount(record.totalAmount ? Number(record.totalAmount) : null);
    setEditGstPercent(record.gstPercent ? Number(record.gstPercent) : null);
    setEditStartDate(record.startDate || null);
    setEditEndDate(record.endDate || null);
    setEditFile(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditRecord(null);
    setEditProjectId('');
    setEditWorkCategoryId('');
    setEditSubcontractorId('');
    setEditScopeOfWork('');
    setEditTotalAmount(null);
    setEditGstPercent(null);
    setEditStartDate(null);
    setEditEndDate(null);
    setEditFile(null);
  };

  const submitEdit = async () => {
    if (!editRecord) return;
    if (!editProjectId) { message.error('Select a project'); return; }
    if (!editWorkCategoryId) { message.error('Select a work category'); return; }
    if (!editSubcontractorId) { message.error('Select a subcontractor'); return; }
    if (!editTotalAmount || editTotalAmount <= 0) { message.error('Enter a quoted amount'); return; }

    setEditSaving(true);
    try {
      await apiPatch(`/subcontractor-enquiries/${editRecord.id}`, {
        projectId: editProjectId,
        workCategoryId: editWorkCategoryId,
        subcontractorId: editSubcontractorId,
        scopeOfWork: editScopeOfWork || undefined,
        totalAmount: editTotalAmount || undefined,
        gstPercent: editGstPercent || undefined,
        startDate: editStartDate || undefined,
        endDate: editEndDate || undefined,
      });

      if (editFile) {
        const fd = new FormData();
        fd.append('quotation', editFile);
        const res = await fetch(`/api/backend/subcontractor-enquiries/${editRecord.id}/upload`, {
          method: 'POST',
          credentials: 'same-origin',
          body: fd,
        });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      }

      message.success('Enquiry updated');
      closeEdit();
      fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setEditSaving(false);
    }
  };

  const openAddSub = (r: SubcontractorEnquiry) => {
    setAddSubGroup({ groupId: r.groupId, projectId: r.projectId, workCategoryId: r.workCategoryId });
    setAddSubId('');
    setAddSubTotalAmount(null);
    setAddSubGstPercent(null);
    setAddSubStartDate(null);
    setAddSubEndDate(null);
    setAddSubFile(null);
    setAddSubOpen(true);
  };

  const closeAddSub = () => {
    setAddSubOpen(false);
    setAddSubGroup(null);
    setAddSubId('');
    setAddSubTotalAmount(null);
    setAddSubGstPercent(null);
    setAddSubStartDate(null);
    setAddSubEndDate(null);
    setAddSubFile(null);
  };

  const submitAddSub = async () => {
    if (!addSubGroup) return;
    if (!addSubId) { message.error('Select a subcontractor'); return; }
    if (!addSubTotalAmount || addSubTotalAmount <= 0) { message.error('Enter a quoted amount'); return; }

    setAddSubSaving(true);
    try {
      const enquiry = await apiPost('/subcontractor-enquiries', {
        projectId: addSubGroup.projectId,
        workCategoryId: addSubGroup.workCategoryId,
        subcontractorId: addSubId,
        totalAmount: addSubTotalAmount || undefined,
        gstPercent: addSubGstPercent || undefined,
        startDate: addSubStartDate || undefined,
        endDate: addSubEndDate || undefined,
        groupId: addSubGroup.groupId,
      });

      if (addSubFile) {
        const fd = new FormData();
        fd.append('quotation', addSubFile);
        const res = await fetch(`/api/backend/subcontractor-enquiries/${enquiry.id}/upload`, {
          method: 'POST',
          credentials: 'same-origin',
          body: fd,
        });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      }

      message.success('Subcontractor added to enquiry');
      closeAddSub();
      fetchData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to add subcontractor');
    } finally {
      setAddSubSaving(false);
    }
  };

  // Search matches whole enquiry groups (SCR No / category / subcontractor),
  // so the grouped rowSpan layout stays intact instead of a group losing rows.
  const filteredData = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return data;
    const matchedGroups = new Set<string>();
    for (const r of data) {
      const haystack = [r.scrNo, r.workCategory?.name, r.subcontractor?.name, r.project?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (haystack.includes(q)) matchedGroups.add(r.groupId);
    }
    return data.filter((r) => matchedGroups.has(r.groupId));
  }, [data, searchText]);

  const flatData = filteredData.reduce<Array<SubcontractorEnquiry & { _groupSize: number; _isFirst: boolean }>>((acc, r, idx) => {
    const prev = filteredData[idx - 1];
    const isNewGroup = !prev || prev.groupId !== r.groupId;
    const groupSize = isNewGroup
      ? filteredData.slice(idx).findIndex((x) => x.groupId !== r.groupId)
      : 0;
    const realGroupSize = groupSize === -1 ? filteredData.length - idx : groupSize > 0 ? groupSize : 0;
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
      title: '', key: 'addSub', width: 110,
      onCell: (r) => ({ rowSpan: r._isFirst ? r._groupSize : 0 }),
      render: (_, r) => r._isFirst ? (
        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => openAddSub(r)}>
          Subcontractor
        </Button>
      ) : null,
    },
    {
      title: 'Category', key: 'category', width: 140,
      onCell: (r) => ({ rowSpan: r._isFirst ? r._groupSize : 0 }),
      render: (_, r) => r.workCategory?.name || '-',
    },
    {
      title: 'Sub Contractor', key: 'subcontractor', width: 170,
      render: (_, r) => r.subcontractor?.name || '-',
    },
    {
      title: 'SCR No', key: 'scrNo', width: 130,
      onCell: (r) => ({ rowSpan: r._isFirst ? r._groupSize : 0 }),
      render: (_, r) => r.scrNo,
    },
    {
      title: 'Total Amount', key: 'totalAmount', width: 160, align: 'right',
      render: (_, r) => r.totalAmount ? (
        <Flex vertical gap={0} className="items-end">
          <Typography.Text strong>{formatCurrency(r.totalWithGst || r.totalAmount)}</Typography.Text>
          <Typography.Text type="secondary" className="text-[10px]">
            Basic: {formatCurrency(r.totalAmount)}
            {!!r.gstPercent && ` + GST ${Number(r.gstPercent)}%`}
          </Typography.Text>
        </Flex>
      ) : (
        <Typography.Text type="secondary">-</Typography.Text>
      ),
    },
    {
      title: 'Quotation Comparison', key: 'quotation', width: 150,
      render: (_, r) =>
        r.quotationUrl ? (
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setPreviewUrl(r.quotationUrl!)}>
            View
          </Button>
        ) : (
          <Typography.Text type="secondary">-</Typography.Text>
        ),
    },
    {
      title: 'Time Period', key: 'period', width: 170,
      render: (_, r) => <Typography.Text className="text-xs">{formatPeriod(r.startDate, r.endDate)}</Typography.Text>,
    },
    {
      title: 'Status', key: 'status', width: 120,
      render: (_, r) => (
        <Select
          size="small"
          value={r.status || 'pending'}
          onChange={(v) => {
            startTransition(async () => {
              try {
                await apiPatch(`/subcontractor-enquiries/${r.id}`, { status: v });
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
      ),
    },
    {
      title: 'Action', key: 'action', width: 100,
      render: (_, r) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => {
            Modal.confirm({
              title: 'Delete this enquiry?',
              onOk: () => startTransition(async () => {
                await apiDelete(`/subcontractor-enquiries/${r.id}`);
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
          <FileTextOutlined className={titleIconClassName} style={{ marginBottom: 24 }} /> Sub Contractor Enquiry
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          New Enquiry
        </Button>
      </Flex>

      <Flex gap={12} wrap="wrap" className="mb-6!">
        <Input.Search
          placeholder="Search by SCR No, category, subcontractor..."
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
          style={{ width: 300 }}
        />
      </Flex>

      <Card className={cardClassName} styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={flatData}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          loading={loading}
          locale={{ emptyText: 'No subcontractor enquiries yet' }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Drawer
        title="New Subcontractor Enquiry"
        size="large"
        open={open}
        onClose={handleClose}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" loading={isPending} onClick={submit}>Submit</Button>
          </Space>
        }
      >
        <Flex vertical gap={16}>
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

          <Form.Item label="Work Category" required>
            <Select
              placeholder="Select work category"
              showSearch
              optionFilterProp="label"
              value={workCategoryId || undefined}
              onChange={(v) => {
                setWorkCategoryId(v);
                // Clear any already-picked subcontractors that no longer
                // belong to the newly selected category.
                setSubSections((prev) => prev.map((s) => ({
                  ...s,
                  subcontractorId: subcontractors.find((sc) => sc.id === s.subcontractorId)?.workCategory?.id === v ? s.subcontractorId : '',
                })));
              }}
              options={workCategories.map((c) => ({ value: c.id, label: c.name }))}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item label="Scope of Work">
            <Input.TextArea
              rows={2}
              placeholder="Briefly describe the work being quoted for"
              value={scopeOfWork}
              onChange={(e) => setScopeOfWork(e.target.value)}
            />
          </Form.Item>

          {subSections.map((section, sIdx) => (
            <Card
              key={sIdx}
              size="small"
              title={`Subcontractor ${sIdx + 1}`}
              extra={sIdx > 0 && <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => removeSubSection(sIdx)} />}
              className="border! border-gray-200!"
            >
              <Flex vertical gap={12}>
                <Select
                  placeholder="Select subcontractor"
                  showSearch
                  optionFilterProp="label"
                  value={section.subcontractorId || undefined}
                  onChange={(v) => updateSection(sIdx, { subcontractorId: v })}
                  options={sectionSubcontractorOptions.map((s) => ({ value: s.id, label: s.name }))}
                  notFoundContent={workCategoryId ? 'No subcontractors in this category yet' : 'Select a work category first'}
                  style={{ width: '100%' }}
                />

                <div className="flex flex-col gap-4 sm:flex-row">
                  <Form.Item label="Total Amount (Basic)" className="mb-0 flex-1">
                    <InputNumber className="w-full" min={0} prefix="₹" placeholder="Quoted amount" value={section.totalAmount ?? undefined} onChange={(v) => updateSection(sIdx, { totalAmount: v ?? null })} />
                  </Form.Item>
                  <Form.Item label="GST %" className="mb-0">
                    <InputNumber className="w-full sm:w-auto" min={0} max={100} addonAfter="%" value={section.gstPercent ?? undefined} onChange={(v) => updateSection(sIdx, { gstPercent: v ?? null })} />
                  </Form.Item>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
                  <Form.Item label="Start Date" className="mb-0 flex-1">
                    <DatePicker
                      className="w-full"
                      value={section.startDate ? dayjs(section.startDate) : null}
                      onChange={(d) => updateSection(sIdx, { startDate: d ? d.format('YYYY-MM-DD') : null })}
                    />
                  </Form.Item>
                  <Form.Item label="End Date" className="mb-0 flex-1">
                    <DatePicker
                      className="w-full"
                      value={section.endDate ? dayjs(section.endDate) : null}
                      onChange={(d) => updateSection(sIdx, { endDate: d ? d.format('YYYY-MM-DD') : null })}
                    />
                  </Form.Item>
                </div>

                {(() => {
                  const { basicAmount, gstAmount, total } = calcGst(section.totalAmount, section.gstPercent);
                  return (
                    <Flex gap={16} align="center" wrap="wrap">
                      <Form.Item label="Basic" className="mb-0"><Typography.Text strong>{formatCurrency(basicAmount)}</Typography.Text></Form.Item>
                      <Form.Item label="GST Amt" className="mb-0"><Typography.Text>{formatCurrency(gstAmount)}</Typography.Text></Form.Item>
                      <Form.Item label="Total" className="mb-0"><Typography.Text strong>{formatCurrency(total)}</Typography.Text></Form.Item>
                    </Flex>
                  );
                })()}

                <Upload
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
                  beforeUpload={async (file) => {
                    const compressed = await compressImage(file, 1920, 0.7);
                    updateSection(sIdx, { file: compressed });
                    return false;
                  }}
                  onRemove={() => updateSection(sIdx, { file: null })}
                  maxCount={1}
                  fileList={section.file ? [{ uid: '-1', name: section.file.name, status: 'done' }] : []}
                >
                  <Button icon={<UploadOutlined />}>Upload Quotation</Button>
                </Upload>
              </Flex>
            </Card>
          ))}

          <Button type="dashed" icon={<PlusOutlined />} onClick={addSubSection} block>
            Add Another Subcontractor
          </Button>
        </Flex>
      </Drawer>

      <Drawer
        title={`Edit Enquiry — ${editRecord?.subcontractor?.name || ''}`}
        size="large"
        open={editOpen}
        onClose={closeEdit}
        destroyOnHidden
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

          <Form.Item label="Work Category" required>
            <Select
              placeholder="Select work category"
              showSearch
              optionFilterProp="label"
              value={editWorkCategoryId || undefined}
              onChange={(v) => {
                setEditWorkCategoryId(v);
                if (subcontractors.find((sc) => sc.id === editSubcontractorId)?.workCategory?.id !== v) {
                  setEditSubcontractorId('');
                }
              }}
              options={workCategories.map((c) => ({ value: c.id, label: c.name }))}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item label="Subcontractor" required>
            <Select
              placeholder="Select subcontractor"
              showSearch
              optionFilterProp="label"
              value={editSubcontractorId || undefined}
              onChange={setEditSubcontractorId}
              options={editSubcontractorOptions.map((s) => ({ value: s.id, label: s.name }))}
              notFoundContent={editWorkCategoryId ? 'No subcontractors in this category yet' : 'Select a work category first'}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item label="Scope of Work">
            <Input.TextArea rows={2} value={editScopeOfWork} onChange={(e) => setEditScopeOfWork(e.target.value)} />
          </Form.Item>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Form.Item label="Total Amount (Basic)" className="mb-0 flex-1">
              <InputNumber className="w-full" min={0} prefix="₹" value={editTotalAmount ?? undefined} onChange={(v) => setEditTotalAmount(v ?? null)} />
            </Form.Item>
            <Form.Item label="GST %" className="mb-0">
              <InputNumber className="w-full sm:w-auto" min={0} max={100} addonAfter="%" value={editGstPercent ?? undefined} onChange={(v) => setEditGstPercent(v ?? null)} />
            </Form.Item>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Form.Item label="Start Date" className="mb-0 flex-1">
              <DatePicker className="w-full" value={editStartDate ? dayjs(editStartDate) : null} onChange={(d) => setEditStartDate(d ? d.format('YYYY-MM-DD') : null)} />
            </Form.Item>
            <Form.Item label="End Date" className="mb-0 flex-1">
              <DatePicker className="w-full" value={editEndDate ? dayjs(editEndDate) : null} onChange={(d) => setEditEndDate(d ? d.format('YYYY-MM-DD') : null)} />
            </Form.Item>
          </div>

          {(() => {
            const { basicAmount, gstAmount, total } = calcGst(editTotalAmount, editGstPercent);
            return (
              <Flex gap={16} align="center" wrap="wrap">
                <Form.Item label="Basic" className="mb-0"><Typography.Text strong>{formatCurrency(basicAmount)}</Typography.Text></Form.Item>
                <Form.Item label="GST Amt" className="mb-0"><Typography.Text>{formatCurrency(gstAmount)}</Typography.Text></Form.Item>
                <Form.Item label="Total" className="mb-0"><Typography.Text strong>{formatCurrency(total)}</Typography.Text></Form.Item>
              </Flex>
            );
          })()}

          <Form.Item label="Quotation">
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
                {editRecord?.quotationUrl ? 'Replace Quotation' : 'Upload Quotation'}
              </Button>
            </Upload>
          </Form.Item>
        </Flex>
      </Drawer>

      <Drawer
        title="Add Subcontractor to Enquiry"
        size="large"
        open={addSubOpen}
        onClose={closeAddSub}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={closeAddSub}>Cancel</Button>
            <Button type="primary" loading={addSubSaving} onClick={submitAddSub}>Add Subcontractor</Button>
          </Space>
        }
      >
        <Flex vertical gap={16}>
          <Form.Item label="Subcontractor" required>
            <Select
              placeholder="Select subcontractor"
              showSearch
              optionFilterProp="label"
              value={addSubId || undefined}
              onChange={setAddSubId}
              options={addSubSubcontractorOptions.map((s) => ({ value: s.id, label: s.name }))}
              notFoundContent="No subcontractors in this category yet"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Form.Item label="Total Amount (Basic)" className="mb-0 flex-1">
              <InputNumber className="w-full" min={0} prefix="₹" value={addSubTotalAmount ?? undefined} onChange={(v) => setAddSubTotalAmount(v ?? null)} />
            </Form.Item>
            <Form.Item label="GST %" className="mb-0">
              <InputNumber className="w-full sm:w-auto" min={0} max={100} addonAfter="%" value={addSubGstPercent ?? undefined} onChange={(v) => setAddSubGstPercent(v ?? null)} />
            </Form.Item>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Form.Item label="Start Date" className="mb-0 flex-1">
              <DatePicker className="w-full" value={addSubStartDate ? dayjs(addSubStartDate) : null} onChange={(d) => setAddSubStartDate(d ? d.format('YYYY-MM-DD') : null)} />
            </Form.Item>
            <Form.Item label="End Date" className="mb-0 flex-1">
              <DatePicker className="w-full" value={addSubEndDate ? dayjs(addSubEndDate) : null} onChange={(d) => setAddSubEndDate(d ? d.format('YYYY-MM-DD') : null)} />
            </Form.Item>
          </div>

          {(() => {
            const { basicAmount, gstAmount, total } = calcGst(addSubTotalAmount, addSubGstPercent);
            return (
              <Flex gap={16} align="center" wrap="wrap">
                <Form.Item label="Basic" className="mb-0"><Typography.Text strong>{formatCurrency(basicAmount)}</Typography.Text></Form.Item>
                <Form.Item label="GST Amt" className="mb-0"><Typography.Text>{formatCurrency(gstAmount)}</Typography.Text></Form.Item>
                <Form.Item label="Total" className="mb-0"><Typography.Text strong>{formatCurrency(total)}</Typography.Text></Form.Item>
              </Flex>
            );
          })()}

          <Upload
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
            beforeUpload={async (file) => {
              const compressed = await compressImage(file, 1920, 0.7);
              setAddSubFile(compressed);
              return false;
            }}
            onRemove={() => setAddSubFile(null)}
            maxCount={1}
            fileList={addSubFile ? [{ uid: '-1', name: addSubFile.name, status: 'done' }] : []}
          >
            <Button icon={<UploadOutlined />}>Upload Quotation</Button>
          </Upload>
        </Flex>
      </Drawer>

      <Modal
        open={!!previewUrl}
        footer={null}
        onCancel={() => setPreviewUrl(null)}
        width={800}
        title="Quotation"
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
