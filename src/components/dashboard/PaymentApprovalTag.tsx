import { Tag } from 'antd';

const APPROVAL_STAGES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Accounts Pending', color: 'warning' },
  accepted: { label: 'Accounts Approved', color: 'processing' },
  admin_approved: { label: 'Admin Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
};

export function PaymentApprovalTag({ status }: { status: string }) {
  const stage = APPROVAL_STAGES[status];
  return <Tag color={stage?.color || 'default'}>{stage?.label || status}</Tag>;
}
