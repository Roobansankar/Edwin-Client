'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Flex, Typography, Tag, Space, Row, Col, Image, Button, Spin, Alert, Divider, Select, Modal, Input, message } from 'antd';
import { CalendarOutlined, ArrowLeftOutlined, ProjectOutlined, TeamOutlined, PictureOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { clientApiFetch } from '@/lib/client-api';
import type { DailyLabourReport, DailyWorker, Trade } from '@/types/erp';
import { useAuthStore } from '@/store/auth';
import { formatCurrency } from './ui';

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

  return (
    <div className="space-y-6 pb-10">
      <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
        <Typography.Title level={2} className="m-0">Daily Labour Detail</Typography.Title>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>Back to List</Button>
      </Flex>

      <Row gutter={[24, 24]}>
        {/* Basic Info */}
        <Col xs={24} lg={8}>
          <Card 
            title={<><ProjectOutlined className="mr-2 text-sky-400" /> Project Info</>} 
            className="border-[var(--border)] bg-[var(--subtle-bg)]"
          >
            <Space orientation="vertical" size={16} className="w-full">
              <div>
                <Typography.Text type="secondary" className="text-xs uppercase block">Project Name</Typography.Text>
                <Typography.Text strong className="text-lg">{report.project?.name || 'N/A'}</Typography.Text>
              </div>
              <div>
                <Typography.Text type="secondary" className="text-xs uppercase block">Report Date</Typography.Text>
                <Typography.Text strong className="text-lg">{dayjs(report.reportDate).format('DD MMMM YYYY')}</Typography.Text>
              </div>
              <div>
                <Typography.Text type="secondary" className="text-xs uppercase block">Total Headcount</Typography.Text>
                <Typography.Title level={3} style={{ margin: 0, color: '#38bdf8' }}>{totalHeadcount} Workers</Typography.Title>
              </div>
              <div>
                <Typography.Text type="secondary" className="text-xs uppercase block">Total Shift</Typography.Text>
                <Typography.Title level={3} style={{ margin: 0, color: '#38bdf8' }}>{totalShift}</Typography.Title>
              </div>
              {showAmount && (
                <div>
                  <Typography.Text type="secondary" className="text-xs uppercase block">Total Amount</Typography.Text>
                  <Typography.Title level={3} style={{ margin: 0, color: '#34d399' }}>{formatCurrency(totalAmount)}</Typography.Title>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-white/5">
                <Typography.Text type="secondary" className="text-xs uppercase block mb-3">Trade Breakdown</Typography.Text>
                <Space orientation="vertical" size={8} className="w-full">
                  {Object.entries(
                    report.workers.reduce((acc, w) => {
                      const trade = w.trade || 'Other';
                      acc[trade] = (acc[trade] || 0) + (Number(w.count) || 1);
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([trade, count]) => (
                    <Flex key={trade} justify="space-between" align="center" className="bg-[var(--subtle-bg)] px-3! py-2! rounded-md">
                      <Typography.Text className="text-[var(--text-secondary)]">{trade}</Typography.Text>
                      <Tag color="blue" className="m-0!">{count} Workers</Tag>
                    </Flex>
                  ))}
                </Space>
              </div>
            </Space>
          </Card>

          <Card 
            title={<><TeamOutlined className="mr-2 text-sky-400" /> Overall Remarks</>} 
            className="mt-6 border-[var(--border)] bg-[var(--subtle-bg)]"
          >
            <Typography.Paragraph className="text-[var(--text-secondary)] italic">
              {report.remarks || "No overall remarks provided for this date."}
            </Typography.Paragraph>
          </Card>
        </Col>

        {/* Worker + Photos, one trade at a time */}
        <Col xs={24} lg={16}>
          <Typography.Title level={4} className="mb-4">
            <TeamOutlined className="mr-2 text-sky-400" /> Trade Attendance Log
          </Typography.Title>

          <div className="space-y-6">
            {report.workers.map((worker, index) => {
              const rowTotalShift = (Number(worker.count) || 1) * (Number(worker.shift) || 0);
              const rowAmount = rowTotalShift * getShiftRate(worker);
              const morningUrls = getSessionPhotoUrls(worker, 'morning');
              const eveningUrls = getSessionPhotoUrls(worker, 'evening');
              const hasPhotos = morningUrls.length > 0 || eveningUrls.length > 0;

              return (
                <Card
                  key={worker.id || index}
                  title={<Typography.Text strong className="text-sky-400">{worker.trade}</Typography.Text>}
                  className="border-[var(--border)] bg-[var(--subtle-bg)]"
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={12} sm={6}>
                      <Typography.Text type="secondary" className="text-xs uppercase block">Count</Typography.Text>
                      <Typography.Text strong className="text-lg text-sky-400">{worker.count}</Typography.Text>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Typography.Text type="secondary" className="text-xs uppercase block">Shift</Typography.Text>
                      <Tag color="blue">{worker.shift}</Tag>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Typography.Text type="secondary" className="text-xs uppercase block">Total Shift</Typography.Text>
                      <Typography.Text strong className="text-sky-400">{rowTotalShift}</Typography.Text>
                    </Col>
                    {showAmount && (
                      <Col xs={12} sm={6}>
                        <Typography.Text type="secondary" className="text-xs uppercase block">Amount</Typography.Text>
                        <Typography.Text strong className="text-emerald-400">{formatCurrency(rowAmount)}</Typography.Text>
                      </Col>
                    )}
                    <Col xs={12} sm={6}>
                      <Typography.Text type="secondary" className="text-xs uppercase block">In Time</Typography.Text>
                      <Tag color="green">{formatTime(worker.inTime || '')}</Tag>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Typography.Text type="secondary" className="text-xs uppercase block">Out Time</Typography.Text>
                      <Tag color="orange">{formatTime(worker.outTime || '')}</Tag>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Typography.Text type="secondary" className="text-xs uppercase block">Status</Typography.Text>
                      {canApprove ? (
                        <Select
                          value={worker.status || 'pending'}
                          size="small"
                          variant="borderless"
                          className="w-full"
                          onChange={(newStatus) => handleStatusSelect(worker.id, worker.trade, newStatus)}
                          options={STATUS_OPTIONS}
                          popupMatchSelectWidth={false}
                        />
                      ) : (
                        <Tag color={worker.status === 'approved' ? 'success' : worker.status === 'rejected' ? 'error' : 'default'}>
                          {worker.status || 'pending'}
                        </Tag>
                      )}
                    </Col>
                    <Col xs={24}>
                      <Typography.Text type="secondary" className="text-xs uppercase block">Task/Remarks</Typography.Text>
                      <Typography.Text>{worker.remarks || '-'}</Typography.Text>
                    </Col>
                    {worker.reviewRemarks && (
                      <Col xs={24}>
                        <Alert
                          type={worker.status === 'rejected' ? 'error' : 'warning'}
                          showIcon
                          message="Remarks from Accounts"
                          description={worker.reviewRemarks}
                        />
                      </Col>
                    )}
                  </Row>

                  {hasPhotos && (
                    <>
                      <Divider className="border-[var(--border)] text-[var(--text-muted)]">Site Photographs</Divider>
                      <Row gutter={[24, 24]}>
                        <Col xs={24} md={12}>
                          <Typography.Text type="secondary" className="mb-2 block text-xs uppercase">Morning Session</Typography.Text>
                          <Image.PreviewGroup>
                            <Row gutter={[12, 12]}>
                              {morningUrls.map((url, i) => (
                                <Col span={12} key={i}>
                                  <Image
                                    src={url}
                                    className="rounded-lg object-cover w-full aspect-video border border-[var(--border)] shadow-lg hover:scale-[1.02] transition-transform"
                                    placeholder={<div className="w-full aspect-video bg-slate-800 animate-pulse rounded-lg" />}
                                  />
                                </Col>
                              ))}
                              {morningUrls.length === 0 && (
                                <Col span={24}>
                                  <Typography.Text type="secondary" italic className="text-xs">No morning photos</Typography.Text>
                                </Col>
                              )}
                            </Row>
                          </Image.PreviewGroup>
                        </Col>

                        <Col xs={24} md={12}>
                          <Typography.Text type="secondary" className="mb-2 block text-xs uppercase">Evening Session</Typography.Text>
                          <Image.PreviewGroup>
                            <Row gutter={[12, 12]}>
                              {eveningUrls.map((url, i) => (
                                <Col span={12} key={i}>
                                  <Image
                                    src={url}
                                    className="rounded-lg object-cover w-full aspect-video border border-[var(--border)] shadow-lg hover:scale-[1.02] transition-transform"
                                    placeholder={<div className="w-full aspect-video bg-slate-800 animate-pulse rounded-lg" />}
                                  />
                                </Col>
                              ))}
                              {eveningUrls.length === 0 && (
                                <Col span={24}>
                                  <Typography.Text type="secondary" italic className="text-xs">No evening photos</Typography.Text>
                                </Col>
                              )}
                            </Row>
                          </Image.PreviewGroup>
                        </Col>
                      </Row>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
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
