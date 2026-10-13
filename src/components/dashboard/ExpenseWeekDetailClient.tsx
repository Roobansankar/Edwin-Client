'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Col, Descriptions, Empty, Flex, Image, Input, Modal, Row, Select, Statistic, Tag, Typography } from 'antd';
import { updateExpenseStatus } from '@/actions/expenses';
import { useAuthStore } from '@/store/auth';
import { ArrowLeftOutlined, FilePdfOutlined, WalletOutlined } from '@ant-design/icons';
import type { Expense, ExpensePayment } from '@/types/erp';
import {
  cardClassName,
  formatCurrency,
  formatDate,
  pageHeaderClassName,
  pageTitleClassName,
  titleCase,
  titleIconClassName,
  weekRangeLabel,
} from './ui';

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  pending: { color: 'warning', label: 'Pending' },
  approved: { color: 'success', label: 'Approved' },
  admin_approved: { color: 'purple', label: 'Admin Approved' },
  rejected: { color: 'error', label: 'Rejected' },
};

// Same rules as the Approvals page: accounts verifies, admin gives the final
// approval. Options the role cannot set are shown disabled so the current
// status still displays.
const ACCOUNTS_STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Admin Approved', value: 'admin_approved', disabled: true },
];
const ADMIN_STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending', disabled: true },
  { label: 'Accounts Approved', value: 'approved', disabled: true },
  { label: 'Admin Approved', value: 'admin_approved' },
  { label: 'Rejected', value: 'rejected' },
];

const isImage =(url: string) => /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(url);

function Files({ urls, label }: { urls?: string[] | null; label: string }) {
  if (!urls?.length) return <Typography.Text type="secondary">No {label.toLowerCase()}</Typography.Text>;
  const images = urls.filter(isImage);
  const others = urls.filter((u) => !isImage(u));
  return (
    <Flex vertical gap={8}>
      {images.length > 0 && (
        <Image.PreviewGroup>
          <Flex gap={8} wrap="wrap">
            {images.map((url) => (
              <Image key={url} src={url} alt={label} width={96} height={96} style={{ objectFit: 'cover', borderRadius: 8 }} />
            ))}
          </Flex>
        </Image.PreviewGroup>
      )}
      {others.map((url, i) => (
        <Button key={url} type="link" size="small" className="w-fit px-0!" icon={<FilePdfOutlined />} href={url} target="_blank">
          {label} {others.length > 1 ? i + 1 : ''}
        </Button>
      ))}
    </Flex>
  );
}

// Full details of one engineer's expenses for one week and project.
export function ExpenseWeekDetailClient({
  weekStart,
  expenses,
  expensePayments,
}: {
  weekStart: string;
  expenses: Expense[];
  expensePayments: ExpensePayment[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const role = useAuthStore((s) => s.user?.role);
  const canUpdate = role === 'admin' || role === 'accounts_manager';
  const statusOptions = role === 'admin' ? ADMIN_STATUS_OPTIONS : ACCOUNTS_STATUS_OPTIONS;
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const changeStatus = (id: string, status: string, reason?: string) => {
    setUpdatingId(id);
    startTransition(async () => {
      try {
        await updateExpenseStatus(id, status, reason);
        message.success('Expense status updated');
        router.refresh();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to update status');
      } finally {
        setUpdatingId(null);
      }
    });
  };

  // Rejecting asks for remarks so the engineer knows why.
  const handleSelect = (id: string, status: string) => {
    if (status === 'rejected') {
      setRejectReason('');
      setRejectId(id);
      return;
    }
    changeStatus(id, status, '');
  };

  const paymentById =new Map(expensePayments.map((p) => [p.id, p]));
  const sorted = [...expenses].sort((a, b) => (a.expenseDate || '').localeCompare(b.expenseDate || ''));
  const first = sorted[0];

  const counted = sorted.filter((e) => e.status !== 'rejected');
  const total = counted.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const paid = sorted
    .filter((e) => e.expensePaymentId && paymentById.get(e.expensePaymentId)?.status === 'paid')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const count = (status: string) => sorted.filter((e) => (e.status || 'pending') === status).length;

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName} gap={16} wrap="wrap">
        <Typography.Title level={3} className={pageTitleClassName}>
          <WalletOutlined className={titleIconClassName} /> Expense Details
          <Typography.Text type="secondary" className="ml-2 text-base">
            {[weekStart ? weekRangeLabel(weekStart) : null, first?.creator?.name, first?.project?.name].filter(Boolean).join(' · ')}
          </Typography.Text>
        </Typography.Title>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>Back</Button>
      </Flex>

      {sorted.length === 0 ? (
        <Card className={cardClassName}><Empty description="No expenses found for this week" /></Card>
      ) : (
        <>
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={12} md={6}><Card className={cardClassName} size="small"><Statistic title="Expenses" value={sorted.length} /></Card></Col>
            <Col xs={12} md={6}><Card className={cardClassName} size="small"><Statistic title="Total (excl. rejected)" value={formatCurrency(total)} /></Card></Col>
            <Col xs={12} md={6}><Card className={cardClassName} size="small"><Statistic title="Paid" value={formatCurrency(paid)} /></Card></Col>
            <Col xs={12} md={6}>
              <Card className={cardClassName} size="small">
                <Typography.Text type="secondary" className="block text-sm">By status</Typography.Text>
                <Flex gap={4} wrap="wrap" className="mt-2">
                  {Object.entries(STATUS_TAG).map(([key, tag]) =>
                    count(key) > 0 ? <Tag key={key} color={tag.color} className="m-0!">{tag.label}: {count(key)}</Tag> : null,
                  )}
                </Flex>
              </Card>
            </Col>
          </Row>

          <Flex vertical gap={16}>
            {sorted.map((e, i) => {
              const status = STATUS_TAG[e.status || 'pending'] || { color: 'default', label: titleCase(e.status) };
              const payment = e.expensePaymentId ? paymentById.get(e.expensePaymentId) : undefined;
              return (
                <Card
                  key={e.id}
                  size="small"
                  className={cardClassName}
                  title={
                    <Flex justify="space-between" align="center" gap={8} wrap="wrap">
                      <Typography.Text strong>{i + 1}. {e.expenseType?.name || titleCase(e.category) || 'Expense'} — {formatDate(e.expenseDate)}</Typography.Text>
                      <Flex gap={8} align="center">
                        <Typography.Text strong>{formatCurrency(e.amount)}</Typography.Text>
                        {canUpdate ? (
                          <Select
                            size="small"
                            style={{ width: 170 }}
                            value={e.status || 'pending'}
                            options={statusOptions}
                            onChange={(v) => handleSelect(e.id, v)}
                            loading={updatingId === e.id}
                            disabled={isPending && updatingId === e.id}
                            popupMatchSelectWidth={false}
                          />
                        ) : (
                          <Tag color={status.color} className="m-0!">{status.label}</Tag>
                        )}
                      </Flex>
                    </Flex>
                  }
                >
                  <Descriptions size="small" column={{ xs: 1, md: 2, lg: 3 }} className="mb-3">
                    <Descriptions.Item label="Engineer">{e.creator?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Project">{e.project?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Trade">{e.trade?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Category">{e.category ? titleCase(e.category) : '-'}</Descriptions.Item>
                    <Descriptions.Item label="Expense Type">{e.expenseType?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Paid By">{e.paidBy || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Submitted On">{formatDate(e.createdAt)}</Descriptions.Item>
                    <Descriptions.Item label="Payment">
                      {payment
                        ? `${payment.status === 'paid' ? 'Paid' : 'Recorded'} on ${formatDate(payment.paymentDate)}`
                        : e.status === 'admin_approved' ? 'Payment pending' : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Description" span={3}>{e.description || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Remarks" span={3}>{e.remarks || '-'}</Descriptions.Item>
                    {e.status === 'rejected' && (
                      <Descriptions.Item label="Rejection Remarks" span={3}>
                        <Typography.Text type="danger">{e.rejectionReason || '-'}</Typography.Text>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Typography.Text strong className="mb-2 block">Receipts</Typography.Text>
                      <Files urls={e.receiptUrls} label="Receipt" />
                    </Col>
                    <Col xs={24} md={12}>
                      <Typography.Text strong className="mb-2 block">Site Photos</Typography.Text>
                      <Files urls={e.sitePhotoUrls} label="Site photo" />
                    </Col>
                  </Row>
                </Card>
              );
            })}
          </Flex>
        </>
      )}

      <Modal
        title="Reject Expense — Overall Remarks"
        open={!!rejectId}
        onCancel={() => setRejectId(null)}
        onOk={() => {
          if (!rejectId) return;
          changeStatus(rejectId, 'rejected', rejectReason.trim());
          setRejectId(null);
        }}
        okText="Reject with remarks"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
        destroyOnHidden
      >
        <Typography.Paragraph>The person who submitted this expense will be notified and can read these remarks.</Typography.Paragraph>
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={(ev) => setRejectReason(ev.target.value)}
          placeholder="Why is this expense rejected?"
        />
      </Modal>
    </div>
  );
}
