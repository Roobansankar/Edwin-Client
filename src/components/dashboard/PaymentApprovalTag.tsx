import { Flex, Tag } from 'antd';

const APPROVAL_STAGES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Accounts Pending', color: 'warning' },
  accepted: { label: 'Accounts Approved', color: 'processing' },
  admin_approved: { label: 'Admin Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
};

export function PaymentApprovalTag({ status, showHistory = false }: { status: string; showHistory?: boolean }) {
  if (showHistory && (status === 'accepted' || status === 'admin_approved')) {
    return (
      <Flex vertical gap={4} align="start">
        <Tag color="processing">Approved by Accounts</Tag>
        <Tag color={status === 'admin_approved' ? 'success' : 'warning'}>
          {status === 'admin_approved' ? 'Approved by Admin' : 'Waiting for Admin Approval'}
        </Tag>
      </Flex>
    );
  }
  const stage = APPROVAL_STAGES[status];
  return <Tag color={stage?.color || 'default'}>{stage?.label || status}</Tag>;
}
