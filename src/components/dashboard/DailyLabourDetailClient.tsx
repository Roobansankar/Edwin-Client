'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Descriptions, Flex, Typography, Tag, Row, Col, Image, Button, Spin, Alert, Divider, Select, Modal, Input, message } from 'antd';
import { CalendarOutlined, ArrowLeftOutlined, ProjectOutlined, TeamOutlined, PictureOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { clientApiFetch } from '@/lib/client-api';
import type { DailyLabourReport, DailyWorker, Trade } from '@/types/erp';
import { useAuthStore } from '@/store/auth';
import { formatCurrency } from './ui';
import { StatusCards } from './DataTablePanel';

const PHOTO_SLOTS = [1, 2, 3, 4, 5] as const;

function getSessionPhotoUrls(worker: DailyWorker, session: 'morning' | 'evening'): string[] {
  return PHOTO_SLOTS
    .map((slot) => (worker as unknown as Record<string, string | null | undefined>)[`${session}Photo${slot}Url`])
    .filter((url): url is string => Boolean(url));
}

export function DailyLabourDetailClient() {
  const { id } = useParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canApprove = user?.role === 'admin' || user?.role === 'accounts_manager';
  const showAmount = user?.role !== 'site_engineer';
  const [report, setReport] = useState<DailyLabourReport | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ workerId: string; trade: string } | null>(null);
  const [rejectRemark, setRejectRemark] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await clientApiFetch<DailyLabourReport>(`/daily-labour/${id}`);
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report details');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  // Shift-wise rates are configured on the Salary page (per Trade) rather
  // than always being saved on the worker row itself, so look them up here
  // and use them as the source of truth for the Amount calculation.
  useEffect(() => {
    if (!showAmount) return;
    clientApiFetch<Trade[]>('/trades')
      .then(setTrades)
      .catch(() => setTrades([]));
  }, [showAmount]);

  const getShiftRate = (worker: DailyWorker) => {
    const trade = trades.find((t) => t.id === worker.tradeId) || trades.find((t) => t.name === worker.trade);
    return Number(trade?.shiftWiseAmount ?? worker.shiftAmount ?? 0);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[var(--page-bg)]"><Spin size="large" /></div>;
  if (error) return <Alert type="error" message={error} showIcon />;
  if (!report) return null;

  const formatTime = (time: string) => {
    if (!time) return '-';
    return dayjs(`2000-01-01 ${time}`).format('hh:mm A');
  };

  const totalHeadcount = report.workers.reduce((acc, w) => acc + (Number(w.count) || 1), 0);
  const totalShift = report.workers.reduce((acc, w) => acc + (Number(w.count) || 1) * (Number(w.shift) || 0), 0);
  const totalAmount = report.workers.reduce((acc, w) => acc + (Number(w.count) || 1) * (Number(w.shift) || 0) * getShiftRate(w), 0);

  const handleWorkerStatusChange = async (workerId: string, status: string, remarks?: string) => {
    try {
      const body: { status: string; remarks?: string } = { status };
      if (remarks !== undefined) body.remarks = remarks;
      await clientApiFetch<DailyWorker>(`/daily-labour/${id}/workers/${workerId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      setReport((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          workers: prev.workers.map((w) =>
            w.id === workerId
              ? { ...w, status, reviewRemarks: remarks !== undefined ? (remarks || null) : w.reviewRemarks }
              : w
          ),
        };
      });
      message.success(`Trade status updated to ${status}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Accounts/admin picking "Rejected" opens a small modal to capture why, so
  // the site engineer gets a specific reason instead of a bare status flip.
  const handleStatusSelect = (workerId: string, trade: string, newStatus: string) => {
    if (newStatus === 'rejected') {
      setRejectRemark('');
      setRejectTarget({ workerId, trade });
      return;
    }
    // Re-approving/resetting clears any earlier rejection remark so it
    // doesn't linger once the issue has been resolved.
    handleWorkerStatusChange(workerId, newStatus, '');
  };

  const submitRejection = () => {
    if (!rejectTarget) return;
    handleWorkerStatusChange(rejectTarget.workerId, 'rejected', rejectRemark.trim());
    setRejectTarget(null);
  };

  const STATUS_OPTIONS = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  const tradeBreakdown = Object.entries(
    report.workers.reduce((acc, w) => {
      const trade = w.trade || 'Other';
      acc[trade] = (acc[trade] || 0) + (Number(w.count) || 1);
      return acc;
    }, {} as Record<string, number>),
  );

  // Session photos, shown as a small gallery under each trade.
  const photoGrid = (urls: string[], emptyText: string) => (
    <Image.PreviewGroup>
      <Row gutter={[12, 12]}>
        {urls.map((url, i) => (
          <Col span={12} key={i}>
            <Image
              src={url}
              alt={`Site photo ${i + 1}`}
              className="aspect-video w-full rounded-lg border border-[var(--border)] object-cover"
              placeholder={<div className="aspect-video w-full animate-pulse rounded-lg bg-[var(--subtle-hover-bg)]" />}
            />
          </Col>
        ))}
        {urls.length === 0 && (
          <Col span={24}>
            <Typography.Text type="secondary" italic className="text-xs">{emptyText}</Typography.Text>
          </Col>
        )}
      </Row>
    </Image.PreviewGroup>
  );

  return (
    <div className="bill-detail pb-10">
      <Flex justify="space-between" align="flex-start" gap={12} wrap="wrap" className="mb-6!">
        <div>
          <Typography.Title level={3} className="m-0! text-[var(--text-primary)]!" style={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
            Daily Labour Report
          </Typography.Title>
          <Typography.Text className="block text-[var(--text-muted)]!">
            {[report.project?.name, dayjs(report.reportDate).format('DD MMMM YYYY')].filter(Boolean).join(' · ')}
          </Typography.Text>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} className="mt-3!">
            Back
          </Button>
        </div>
      </Flex>

      <StatusCards
        items={[
          { key: 'headcount', label: 'Headcount', value: `${totalHeadcount} Workers` },
          { key: 'shift', label: 'Total Shift', value: totalShift },
          ...(showAmount ? [{ key: 'amount', label: 'Total Amount', value: formatCurrency(totalAmount) }] : []),
          { key: 'trades', label: 'Trades', value: report.workers.length },
        ]}
      />

      <Row gutter={[20, 20]}>
        {/* Report info, trade breakdown, overall remarks */}
        <Col xs={24} lg={8}>
          <Flex vertical gap={20}>
            <Card size="small" title={<><ProjectOutlined className="mr-2" /> Report Info</>}>
              <Descriptions
                bordered
                size="small"
                column={1}
                items={[
                  { key: 'project', label: 'Project', children: report.project?.name || 'N/A' },
                  { key: 'date', label: 'Report Date', children: dayjs(report.reportDate).format('DD MMMM YYYY') },
                  { key: 'by', label: 'Submitted By', children: report.createdBy?.name || '-' },
                ]}
              />
            </Card>

            <Card size="small" title={<><TeamOutlined className="mr-2" /> Trade Breakdown</>}>
              <Flex vertical gap={8}>
                {tradeBreakdown.map(([trade, count]) => (
                  <Flex key={trade} justify="space-between" align="center" className="rounded-lg border border-[var(--border)] px-3! py-2!">
                    <Typography.Text className="text-[var(--text-secondary)]!">{trade}</Typography.Text>
                    <Typography.Text strong>{count} Workers</Typography.Text>
                  </Flex>
                ))}
              </Flex>
            </Card>

            <Card size="small" title={<><CalendarOutlined className="mr-2" /> Overall Remarks</>}>
              <Typography.Paragraph className="m-0! text-[var(--text-secondary)]!">
                {report.remarks || 'No overall remarks provided for this date.'}
              </Typography.Paragraph>
            </Card>
          </Flex>
        </Col>

        {/* One card per trade */}
        <Col xs={24} lg={16}>
          <Flex vertical gap={20}>
            {report.workers.map((worker, index) => {
              const rowTotalShift = (Number(worker.count) || 1) * (Number(worker.shift) || 0);
              const rowAmount = rowTotalShift * getShiftRate(worker);
              const morningUrls = getSessionPhotoUrls(worker, 'morning');
              const eveningUrls = getSessionPhotoUrls(worker, 'evening');
              const hasPhotos = morningUrls.length > 0 || eveningUrls.length > 0;

              return (
                <Card
                  key={worker.id || index}
                  size="small"
                  title={
                    <Flex gap={8} align="center" wrap="wrap">
                      <span>{worker.trade}</span>
                      <Tag className="m-0!">Team: {worker.tradeRel?.team?.name || 'No team'}</Tag>
                    </Flex>
                  }
                  extra={canApprove ? (
                    <Select
                      value={worker.status || 'pending'}
                      size="small"
                      style={{ width: 130 }}
                      onChange={(newStatus) => handleStatusSelect(worker.id, worker.trade, newStatus)}
                      options={STATUS_OPTIONS}
                      popupMatchSelectWidth={false}
                    />
                  ) : (
                    <Tag color={worker.status === 'approved' ? 'success' : worker.status === 'rejected' ? 'error' : 'default'} className="m-0!">
                      {worker.status || 'pending'}
                    </Tag>
                  )}
                >
                  <Descriptions
                    bordered
                    size="small"
                    column={{ xs: 1, sm: 2, md: 3 }}
                    items={[
                      { key: 'count', label: 'Count', children: <Typography.Text strong>{worker.count}</Typography.Text> },
                      { key: 'shift', label: 'Shift', children: worker.shift },
                      { key: 'totalShift', label: 'Total Shift', children: <Typography.Text strong>{rowTotalShift}</Typography.Text> },
                      ...(showAmount ? [{ key: 'amount', label: 'Amount', children: <Typography.Text strong>{formatCurrency(rowAmount)}</Typography.Text> }] : []),
                      { key: 'in', label: 'In Time', children: formatTime(worker.inTime || '') },
                      { key: 'out', label: 'Out Time', children: formatTime(worker.outTime || '') },
                      { key: 'remarks', label: 'Task / Remarks', span: 'filled' as const, children: worker.remarks || '-' },
                    ]}
                  />

                  {worker.reviewRemarks && (
                    <Alert
                      className="mt-3!"
                      type={worker.status === 'rejected' ? 'error' : 'warning'}
                      showIcon
                      message="Remarks from Accounts"
                      description={worker.reviewRemarks}
                    />
                  )}

                  {hasPhotos && (
                    <>
                      <Divider className="my-4! text-xs! text-[var(--text-muted)]!">
                        <PictureOutlined className="mr-1" /> Site Photographs
                      </Divider>
                      <Row gutter={[24, 16]}>
                        <Col xs={24} md={12}>
                          <Typography.Text type="secondary" className="mb-2 block text-xs uppercase">Morning Session</Typography.Text>
                          {photoGrid(morningUrls, 'No morning photos')}
                        </Col>
                        <Col xs={24} md={12}>
                          <Typography.Text type="secondary" className="mb-2 block text-xs uppercase">Evening Session</Typography.Text>
                          {photoGrid(eveningUrls, 'No evening photos')}
                        </Col>
                      </Row>
                    </>
                  )}
                </Card>
              );
            })}
          </Flex>
        </Col>
      </Row>

      <Modal
        title="Reject Trade Entry"
        open={!!rejectTarget}
        onCancel={() => setRejectTarget(null)}
        onOk={submitRejection}
        okText="Reject"
        okButtonProps={{ danger: true }}
      >
        <Typography.Paragraph>
          Rejecting <Typography.Text strong>{rejectTarget?.trade}</Typography.Text>. The site engineer who submitted this
          entry will be notified — add a remark so they know why.
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          value={rejectRemark}
          onChange={(e) => setRejectRemark(e.target.value)}
          placeholder="Reason for rejection..."
        />
      </Modal>
    </div>
  );
}
