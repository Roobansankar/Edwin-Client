'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Flex, Typography, Tag, Table, Space, Row, Col, Image, Button, Spin, Alert, Divider, Select, message } from 'antd';
import { CalendarOutlined, ArrowLeftOutlined, ProjectOutlined, TeamOutlined, PictureOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { clientApiFetch } from '@/lib/client-api';
import type { DailyLabourReport, DailyWorker } from '@/types/erp';
import { getApiOrigin } from '@/lib/api-url';
import { useAuthStore } from '@/store/auth';

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
  const [report, setReport] = useState<DailyLabourReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <div className="flex h-screen items-center justify-center bg-[var(--page-bg)]"><Spin size="large" /></div>;
  if (error) return <Alert type="error" message={error} showIcon />;
  if (!report) return null;

  const formatTime = (time: string) => {
    if (!time) return '-';
    return dayjs(`2000-01-01 ${time}`).format('hh:mm A');
  };

  const totalHeadcount = report.workers.reduce((acc, w) => acc + (Number(w.count) || 1), 0);

  const handleWorkerStatusChange = async (workerId: string, status: string) => {
    try {
      const updated = await clientApiFetch<DailyWorker>(`/daily-labour/${id}/workers/${workerId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' },
      });
      setReport((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          workers: prev.workers.map((w) => (w.id === workerId ? { ...w, status } : w)),
        };
      });
      message.success(`Trade status updated to ${status}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const STATUS_OPTIONS = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  const workerColumns = [
    {
      title: 'Trade',
      dataIndex: 'trade',
      key: 'trade',
      render: (trade: string) => <Tag color="blue" className="text-sm px-3 py-1">{trade}</Tag>,
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => <Typography.Text strong className="text-lg text-sky-400">{count}</Typography.Text>,
    },
    {
      title: 'Shift',
      dataIndex: 'shift',
      key: 'shift',
      render: (shift: string) => <Tag color="blue">{shift}</Tag>,
    },
    {
      title: 'In Time',
      dataIndex: 'inTime',
      key: 'inTime',
      render: (time: string) => <Tag color="green">{formatTime(time)}</Tag>,
    },
    {
      title: 'Out Time',
      dataIndex: 'outTime',
      key: 'outTime',
      render: (time: string) => <Tag color="orange">{formatTime(time)}</Tag>,
    },
    {
      title: 'Task/Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (text: string) => text || '-',
    },
    {
      title: 'Status',
      key: 'status',
      width: 130,
      render: (_: unknown, record: DailyWorker) =>
        canApprove ? (
          <Select
            defaultValue={record.status || 'pending'}
            size="small"
            variant="borderless"
            className="w-full"
            onChange={(newStatus) => handleWorkerStatusChange(record.id, newStatus)}
            options={STATUS_OPTIONS}
            popupMatchSelectWidth={false}
          />
        ) : (
          <Tag color={record.status === 'approved' ? 'success' : record.status === 'rejected' ? 'error' : 'default'}>
            {record.status || 'pending'}
          </Tag>
        ),
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <Flex justify="space-between" align="center">
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

        {/* Worker Table */}
        <Col xs={24} lg={16}>
          <Card 
            title={<><TeamOutlined className="mr-2 text-sky-400" /> Trade Attendance Log</>} 
            className="border-[var(--border)] bg-[var(--subtle-bg)]"
            styles={{ body: { padding: 0 } }}
          >
            <Table
              dataSource={report.workers}
              columns={workerColumns}
              rowKey="id"
              pagination={false}
              className="border-none"
              size="middle"
            />
          </Card>

          {/* Trade Photos Section */}
          <Divider className="border-[var(--border)] text-[var(--text-muted)] mt-8">Site Photographs (Trade-wise)</Divider>
          
          <div className="space-y-6">
            {report.workers.map((worker, index) => {
              const morningUrls = getSessionPhotoUrls(worker, 'morning');
              const eveningUrls = getSessionPhotoUrls(worker, 'evening');
              if (morningUrls.length === 0 && eveningUrls.length === 0) return null;

              return (
                <Card
                  key={worker.id || index}
                  title={<Typography.Text strong className="text-sky-400">{worker.trade} - Photos</Typography.Text>}
                  className="border-[var(--border)] bg-[var(--subtle-bg)]"
                >
                  <Row gutter={[24, 24]}>
                    <Col xs={24} md={12}>
                      <Typography.Text type="secondary" className="mb-2 block text-xs uppercase">Morning Session</Typography.Text>
                      <Image.PreviewGroup>
                        <Row gutter={[12, 12]}>
                          {morningUrls.map((url, i) => (
                            <Col span={12} key={i}>
                              <Image
                                src={`${getApiOrigin()}${url}`}
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
                                src={`${getApiOrigin()}${url}`}
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
                </Card>
              );
            })}
          </div>
        </Col>
      </Row>
    </div>
  );
}
