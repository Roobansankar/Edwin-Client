'use client';

import { Button, DatePicker, Flex, Input, InputNumber, Select } from 'antd';
import type { Dayjs } from 'dayjs';

type Props = {
  amount: number;
  balance: number;
  date: Dayjs;
  mode: string;
  reference: string;
  notes: string;
  loading: boolean;
  onAmountChange: (value: number) => void;
  onDateChange: (value: Dayjs) => void;
  onModeChange: (value: string) => void;
  onReferenceChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onRecord: () => void;
  onCancel: () => void;
};

export function PaymentRowForm(props: Props) {
  return (
    <Flex vertical gap={8} style={{ minWidth: 240 }}>
      <InputNumber aria-label="Payment amount" prefix="₹" min={1} max={Math.max(props.balance, 0)}
        value={props.amount} onChange={(value) => props.onAmountChange(Number(value) || 0)}
        disabled={props.loading} style={{ width: '100%' }} />
      <DatePicker aria-label="Payment date" value={props.date} format="DD-MM-YYYY"
        onChange={(value) => value && props.onDateChange(value)} allowClear={false} disabled={props.loading} />
      <Select aria-label="Payment mode" value={props.mode} onChange={props.onModeChange} disabled={props.loading}
        options={[
          { label: 'UPI', value: 'upi' }, { label: 'RTGS', value: 'rtgs' },
          { label: 'Cash', value: 'cash' }, { label: 'Cheque', value: 'cheque' },
        ]} />
      <Input aria-label="UTR / Reference Number" placeholder="UTR / Reference Number" value={props.reference}
        onChange={(event) => props.onReferenceChange(event.target.value)} disabled={props.loading} />
      <Input aria-label="Payment notes" placeholder="Notes" value={props.notes}
        onChange={(event) => props.onNotesChange(event.target.value)} disabled={props.loading} />
      <Flex gap={8}>
        <Button type="primary" loading={props.loading} onClick={props.onRecord}
          disabled={props.amount <= 0 || props.amount > props.balance}>Record</Button>
        <Button onClick={props.onCancel} disabled={props.loading}>Cancel</Button>
      </Flex>
    </Flex>
  );
}
