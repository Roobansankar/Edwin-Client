'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import {
  Button, Card, Checkbox, DatePicker, Flex, Input, Modal, Select, Spin, Tag, Typography, App,
} from 'antd';
import {
  LeftOutlined, RightOutlined, SaveOutlined, ClockCircleOutlined, PlusOutlined, DeleteOutlined, EditOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { saveTimesheet, updateTimesheet, submitTimesheet } from '@/actions/timesheet-attendance';
import { createEmployeeQuery } from '@/actions/employee-queries';
import { approveTimesheet } from '@/actions/timesheet-approval';
import { useAuthStore } from '@/store/auth';
import type { Project, EmployeeQuery } from '@/types/erp';
import { cardClassName, pageHeaderClassName, pageTitleClassName, titleIconClassName } from './ui';
import dayjs from 'dayjs';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS = ['monHours', 'tueHours', 'wedHours', 'thuHours', 'friHours', 'satHours', 'sunHours'] as const;

const FIXED_CATEGORIES = [
  { kind: 'holiday', label: 'Public Holiday' },
  { kind: 'idle', label: 'Idle Time' },
  { kind: 'leave', label: 'Leave' },
] as const;

const STANDARD_DAILY_HOURS = 8;
const DAY_LIMIT_HOURS = 8;
const STANDARD_WORKING_DAYS = 6;
const STANDARD_WEEKLY_HOURS = STANDARD_DAILY_HOURS * STANDARD_WORKING_DAYS;

const ALL_PROJECTS_VALUE = '__ALL__';

type FixedKind = (typeof FIXED_CATEGORIES)[number]['kind'];

type GridRow = {
  key: string;
  kind: 'project' | FixedKind;
  rowId?: string;
  projectId: string | null;
  hours: number[];
  remark: string;
  submittedMask: number;
};

type Props = { projects: Project[] };

let rowSeq = 0;
function nextKey() {
  rowSeq += 1;
  return `row-${rowSeq}`;
}

function emptyHours(): number[] {
  return [0, 0, 0, 0, 0, 0, 0];
}

function emptyProjectRow(): GridRow {
  return { key: nextKey(), kind: 'project', projectId: null, hours: emptyHours(), remark: '', submittedMask: 0 };
}

function emptyFixedRows(): GridRow[] {
  return FIXED_CATEGORIES.map((c) => ({ key: nextKey(), kind: c.kind, projectId: null, hours: emptyHours(), remark: '', submittedMask: 0 }));
}

function defaultRows(): GridRow[] {
  return [emptyProjectRow(), ...emptyFixedRows()];
}

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rowsFromServer(tsRows: any[]): GridRow[] {
  const projectRows: GridRow[] = [];
  const fixedMap = new Map<string, GridRow>();
  for (const c of FIXED_CATEGORIES) fixedMap.set(c.kind, { key: nextKey(), kind: c.kind, projectId: null, hours: emptyHours(), remark: '', submittedMask: 0 });

  for (const row of tsRows) {
    const hours = DAYS.map((d) => Number((row as any)[d] || 0));
    const remark = row.remark || '';
    const submittedMask = Number((row as any).submittedMask || 0);
    if (row.entryType === 'project') {
      projectRows.push({ key: nextKey(), kind: 'project', rowId: row.id, projectId: row.projectId || null, hours, remark, submittedMask });
    } else if (fixedMap.has(row.entryType)) {
      fixedMap.set(row.entryType, { key: nextKey(), kind: row.entryType, rowId: row.id, projectId: null, hours, remark, submittedMask });
    }
  }

  if (projectRows.length === 0) projectRows.push(emptyProjectRow());
  return [...projectRows, ...FIXED_CATEGORIES.map((c) => fixedMap.get(c.kind)!)];
}

function rowsToPayload(rows: GridRow[]): any[] {
  const out: any[] = [];
  for (const row of rows) {
    const total = row.hours.reduce((a, b) => a + b, 0);
    const remark = row.remark.trim();
    if (row.kind === 'project') {
      if (!row.projectId || row.projectId === ALL_PROJECTS_VALUE) continue;
    } else if (total <= 0 && !remark) {
      continue;
    }
    out.push({
      ...(row.rowId ? { id: row.rowId } : {}),
      ...(row.kind === 'project' ? { projectId: row.projectId } : {}),
      entryType: row.kind,
      remark: remark || undefined,
      monHours: row.hours[0],
      tueHours: row.hours[1],
      wedHours: row.hours[2],
      thuHours: row.hours[3],
      friHours: row.hours[4],
      satHours: row.hours[5],
      sunHours: row.hours[6],
    });
  }
  return out;
}

function HoursCell({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<string>(String(value || 0));

  const clamp = (n: number) => Math.max(0, n);

  return (
    <Input
      className="w-full!"
      size="small"
      inputMode="decimal"
      variant="borderless"
      disabled={disabled}
      value={draft}
      onChange={(e) => {
        const sanitized = e.target.value.replace(/[^0-9.]/g, '');
        setDraft(sanitized);
        if (sanitized !== '' && sanitized !== '.') {
          const n = Number(sanitized);
          if (Number.isFinite(n)) onChange(clamp(n));
        }
      }}
      onBlur={() => {
        const n = Number(draft);
        const clean = Number.isFinite(n) ? clamp(n) : 0;
        setDraft(String(clean));
        onChange(clean);
      }}
      style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }}
    />
  );
}

export function TimesheetAttendanceClient({ projects }: Props) {
  const [month, setMonth] = useState<dayjs.Dayjs>(dayjs().startOf('month'));
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [existingTs, setExistingTs] = useState<any>(null);
  const [rows, setRows] = useState<GridRow[]>(defaultRows());
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [myQueries, setMyQueries] = useState<EmployeeQuery[]>([]);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestDayIndex, setRequestDayIndex] = useState<number | null>(null);
  const [requestPending, startRequestTransition] = useTransition();
  const [approvePending, startApproveTransition] = useTransition();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const canSeeFullWeek = isAdmin || ['accounts_manager', 'purchase_team', 'site_engineer'].includes(user?.role || '');

  const isDayVisible = (dayIdx: number, weekStartDate: Date) => {
    if (canSeeFullWeek) return true;
    const dateObj = new Date(weekStartDate);
    dateObj.setDate(dateObj.getDate() + dayIdx);
    const dStr = formatDate(dateObj);
    const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    return dStr === todayStr || dStr === yesterdayStr;
  };

  const weekStartStr = formatDate(weekStart);
  const todayStr = dayjs().format('YYYY-MM-DD');

  const tsStatus = existingTs?.status;
  const isSubmitted = tsStatus === 'submitted';
  const isFullyLocked = !!existingTs && ['verified', 'admin_approved', 'approved'].includes(tsStatus) && !isAdmin;

  const weeksInMonth = useMemo(() => {
    const start = month.startOf('month').toDate();
    const end = month.endOf('month').toDate();
    const weeks: Date[] = [];
    let m = getMonday(start);
    while (m <= end) {
      weeks.push(new Date(m));
      m.setDate(m.getDate() + 7);
    }
    return weeks;
  }, [month]);

  const weekIndex = weeksInMonth.findIndex((w) => formatDate(w) === weekStartStr);

  const goPrevWeek = () => {
    if (weekIndex > 0) {
      setWeekStart(weeksInMonth[weekIndex - 1]);
      setExistingTs(null);
      setRows(defaultRows());
    }
  };

  const goNextWeek = () => {
    if (weekIndex < weeksInMonth.length - 1) {
      setWeekStart(weeksInMonth[weekIndex + 1]);
      setExistingTs(null);
      setRows(defaultRows());
    }
  };

  const loadTs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/backend/timesheet-attendance/current?weekStart=${weekStartStr}`);
      if (res.ok) {
        const data = await res.json();
        setExistingTs(data);
        setRows(data && data.rows && data.rows.length > 0 ? rowsFromServer(data.rows) : defaultRows());
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [weekStartStr]);

  const loadQueries = useCallback(async () => {
    try {
      const res = await fetch('/api/backend/employee-queries');
      if (res.ok) setMyQueries(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadTs(); loadQueries(); }, [loadTs, loadQueries]);

  const latestQuery = useMemo(() => {
    if (!existingTs?.id) return null;
    return myQueries
      .filter((q) => q.timesheetId === existingTs.id)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null;
  }, [myQueries, existingTs?.id]);

  const approvedDayIndices = useMemo(() => {
    if (!existingTs?.id) return new Set<number>();
    return new Set(
      myQueries
        .filter((q) => q.timesheetId === existingTs.id && q.status === 'approved' && q.dayIndex !== null)
        .map((q) => q.dayIndex as number),
    );
  }, [myQueries, existingTs?.id]);

  const pendingDayIndices = useMemo(() => {
    if (!existingTs?.id) return new Set<number>();
    return new Set(
      myQueries
        .filter((q) => q.timesheetId === existingTs.id && q.status === 'pending' && q.dayIndex !== null)
        .map((q) => q.dayIndex as number),
    );
  }, [myQueries, existingTs?.id]);

  const eligibleRequestDays = useMemo(() => {
    const result: { value: number; label: string }[] = [];
    for (let d = 0; d < DAYS.length; d++) {
      if (!isDayVisible(d, weekStart)) continue;
      if (pendingDayIndices.has(d)) continue; // already requested — avoid a duplicate
      const dateObj = new Date(weekStart);
      dateObj.setDate(dateObj.getDate() + d);
      result.push({ value: d, label: `${DAY_LABELS[d]} (${dayjs(dateObj).format('D MMM')})` });
    }
    return result;
  }, [weekStart, pendingDayIndices]);

  const submitEditRequest = () => {
    if (!existingTs?.id) return;
    if (requestDayIndex === null) {
      message.error('Please select which day you need to correct');
      return;
    }
    if (requestReason.trim().length < 5) {
      message.error('Please describe the issue (at least 5 characters)');
      return;
    }
    startRequestTransition(async () => {
      try {
        await createEmployeeQuery({ timesheetId: existingTs.id, reason: requestReason.trim(), dayIndex: requestDayIndex });
        message.success('Edit request sent to admin');
        setRequestModalOpen(false);
        setRequestReason('');
        setRequestDayIndex(null);
        loadQueries();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to send request');
      }
    });
  };

  const approveOwnTimesheet = () => {
    if (!existingTs?.id) return;
    startApproveTransition(async () => {
      try {
        await approveTimesheet(existingTs.id);
        message.success('Approved & payment created');
        loadTs();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to approve');
      }
    });
  };

  const dayTotals = useMemo(
    () => DAY_LABELS.map((_, dayIdx) => rows.reduce((s, r) => s + (r.hours[dayIdx] || 0), 0)),
    [rows],
  );
  const totalHours = useMemo(() => dayTotals.reduce((s, v) => s + v, 0), [dayTotals]);

  // A day marked with any non-project category (Public Holiday, Idle Time or
  // Leave) blocks project hours being logged that same day — and the other
  // two categories, since a day can only be one of these at a time.
  const nonProjectDays = useMemo(() => {
    const set = new Set<number>();
    const fixedRows = rows.filter((r) => r.kind !== 'project');
    for (let d = 0; d < DAYS.length; d++) {
      if (fixedRows.some((r) => (r.hours[d] || 0) > 0)) set.add(d);
    }
    return set;
  }, [rows]);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const addProjectRow = () => {
    setRows((prev) => {
      const projectRows = prev.filter((r) => r.kind === 'project');
      const fixedRows = prev.filter((r) => r.kind !== 'project');
      return [...projectRows, emptyProjectRow(), ...fixedRows];
    });
  };

  const removeProjectRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const setProjectId = (key: string, projectId: string | null) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, projectId } : r)));
  };

  const setHour = (key: string, dayIdx: number, value: number) => {
    const dateObj = new Date(weekStart);
    dateObj.setDate(dateObj.getDate() + dayIdx);
    const isFutureCellDay = formatDate(dateObj) > todayStr;
    if (!isAdmin && isFutureCellDay && !approvedDayIndices.has(dayIdx)) return;

    const target = rows.find((r) => r.key === key);
    if (!isAdmin && target?.kind === 'project' && nonProjectDays.has(dayIdx)) return;
    if (!isAdmin && target && target.kind !== 'project') {
      const siblingSet = rows.some(
        (r) => r.kind !== 'project' && r.kind !== target.kind && (r.hours[dayIdx] || 0) > 0,
      );
      if (siblingSet) return;
    }

    // "All Projects" row: expand into one real row per active project,
    // evenly splitting the entered hours across them.
    if (target?.projectId === ALL_PROJECTS_VALUE) {
      if (projects.length === 0) {
        message.error('No active projects to split across');
        return;
      }
      const perProject = Math.round((value / projects.length) * 100) / 100;
      setRows((prev) => {
        const others = prev.filter((r) => r.key !== key);
        const existingByProject = new Map(
          others.filter((r) => r.kind === 'project' && r.projectId).map((r) => [r.projectId as string, r]),
        );
        const expanded: GridRow[] = projects.map((p) => {
          const existing = existingByProject.get(p.id);
          const hours = existing ? [...existing.hours] : emptyHours();
          hours[dayIdx] = perProject;
          return existing
            ? { ...existing, hours }
            : { key: nextKey(), kind: 'project', projectId: p.id, hours, remark: '', submittedMask: 0 };
        });
        const untouchedRows = others.filter(
          (r) => !(r.kind === 'project' && expanded.some((e) => e.projectId === r.projectId)),
        );
        return [...expanded, ...untouchedRows];
      });
      message.success(`Split ${value} hrs across ${projects.length} projects`);
      return;
    }

    setRows((prev) => prev.map((r) => {
      if (r.key !== key) return r;
      const hours = [...r.hours];
      hours[dayIdx] = value;
      return { ...r, hours };
    }));
  };

  const setRemark = (key: string, remark: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, remark } : r)));
  };

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const missingProject = rows.some(
          (r) => r.kind === 'project' && r.hours.some((h) => h > 0) && !r.projectId,
        );
        if (missingProject) {
          message.error('Select a project for every row that has hours');
          return;
        }
        const payloadRows = rowsToPayload(rows);
        if (payloadRows.length === 0) {
          message.error('Enter hours for at least one day before submitting');
          return;
        }
        const payload = { weekStart: weekStartStr, rows: payloadRows };
        if (existingTs?.id) {
          await updateTimesheet(existingTs.id, payload);
          await submitTimesheet(existingTs.id);
        } else {
          const created = await saveTimesheet(payload);
          await submitTimesheet(created.id);
        }
        message.success('Submitted');
        loadTs();
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to submit');
      }
    });
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className={pageHeaderClassName}>
        <Typography.Title level={3} className={pageTitleClassName}>
          <ClockCircleOutlined style={{ marginBottom: 24 }} className={titleIconClassName} /> Timesheet
        </Typography.Title>
      </Flex>

      <Card className={cardClassName}>
        <Flex gap={16} wrap="wrap" className="mb-4!" align="center" justify="space-between">
          <Flex gap={12} align="center" wrap="wrap">
            {isAdmin && (
              <DatePicker
                picker="month"
                value={month}
                onChange={(d) => {
                  if (d) {
                    setMonth(d);
                    const m = getMonday(d.startOf('month').toDate());
                    setWeekStart(m);
                    setExistingTs(null);
                    setRows(defaultRows());
                  }
                }}
                style={{ width: 160 }}
                allowClear={false}
              />
            )}
            {isAdmin && (
              <Button icon={<LeftOutlined />} size="small" onClick={goPrevWeek} disabled={weekIndex <= 0} />
            )}
            <Typography.Text strong className="text-[var(--text-primary)] text-sm" style={{ minWidth: 180, textAlign: 'center' }}>
              {formatDate(weekStart)} - {formatDate(weekEnd)}
            </Typography.Text>
            {isAdmin && (
              <Button icon={<RightOutlined />} size="small" onClick={goNextWeek} disabled={weekIndex >= weeksInMonth.length - 1} />
            )}
          </Flex>

          <Flex gap={12} align="center" wrap="wrap">
            {isAdmin && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-4 py-1.5">
                <Typography.Text strong className="text-emerald-300">
                  Total: {totalHours.toFixed(1)} / {STANDARD_WEEKLY_HOURS.toFixed(1)} hrs
                </Typography.Text>
              </div>
            )}
            {isSubmitted && <Tag color="green">Submitted</Tag>}
            {isSubmitted && (
              eligibleRequestDays.length === 0 ? (
                <Tag color="blue">Edit Request Pending</Tag>
              ) : (
                <Button size="small" icon={<EditOutlined />} onClick={() => setRequestModalOpen(true)}>
                  Request Edit
                </Button>
              )
            )}
            {isSubmitted && isAdmin && (
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={approveOwnTimesheet}
                loading={approvePending}
              >
                Approve & Pay
              </Button>
            )}
            {isFullyLocked ? (
              <Button type="primary" disabled>
                {tsStatus === 'approved' ? 'Approved' : tsStatus === 'verified' ? 'Verified' : 'Submitted'}
              </Button>
            ) : (
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit} loading={isPending}>
                Review and Submit
              </Button>
            )}
          </Flex>
        </Flex>

        <Spin spinning={loading}>
        <div className="overflow-x-auto" style={{ marginTop: 20 }}>
          <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th className="border border-[var(--border)] bg-[var(--subtle-bg)] px-3 py-2 text-left text-[var(--text-secondary)]" style={{ width: 260 }}>
                  Project / Category
                </th>
                {DAY_LABELS.map((label, i) => {
                  if (!isDayVisible(i, weekStart)) return null;
                  const dateObj = new Date(weekStart);
                  dateObj.setDate(dateObj.getDate() + i);
                  return (
                    <th key={label} className="border border-[var(--border)] bg-[var(--subtle-bg)] px-2 py-2 text-center text-[var(--text-secondary)]" style={{ width: 90 }}>
                      <div>{label}</div>
                      <div className="text-xs font-normal text-[var(--text-very-muted)]">{dateObj.getDate()}</div>
                    </th>
                  );
                })}
                <th className="border border-[var(--border)] bg-[var(--subtle-bg)] px-2 py-2 text-left text-[var(--text-secondary)]" style={{ width: 180 }}>
                  Remark
                </th>
                <th className="border border-[var(--border)] bg-[var(--subtle-bg)] px-2 py-2 text-center text-[var(--text-secondary)]" style={{ width: 56 }} />
              </tr>
            </thead>
            <tbody>
              {rows.filter((r) => r.kind === 'project').map((row) => {
                const rowLocked = !isAdmin && row.submittedMask !== 0;
                return (
                <tr key={row.key}>
                  <td className="border border-[var(--border)] px-2 py-1.5">
                    <Select
                      className="w-full"
                      placeholder="Select project"
                      allowClear
                      disabled={isFullyLocked || rowLocked}
                      value={row.projectId || undefined}
                      onChange={(val) => setProjectId(row.key, val || null)}
                      options={[
                        ...(isAdmin ? [{ label: 'All Projects', value: ALL_PROJECTS_VALUE }] : []),
                        ...projects.map((p) => ({ label: p.name, value: p.id })),
                      ]}
                      size="small"
                    />
                  </td>
                  {DAYS.map((_, dayIdx) => {
                    if (!isDayVisible(dayIdx, weekStart)) return null;
                    const dateObj = new Date(weekStart);
                    dateObj.setDate(dateObj.getDate() + dayIdx);
                    const isToday = formatDate(dateObj) === todayStr;
                    const isFutureDay = formatDate(dateObj) > todayStr;
                    const cellLocked = !isAdmin && (row.submittedMask & (1 << dayIdx)) !== 0;
                    const blockedByLeave = !isAdmin && nonProjectDays.has(dayIdx);
                    const disabled = isFullyLocked || cellLocked || blockedByLeave || (!isAdmin && isFutureDay && !approvedDayIndices.has(dayIdx));
                    return (
                      <td key={dayIdx} className={`border border-[var(--border)] p-1 text-center ${disabled && (!isToday || blockedByLeave) ? 'opacity-60 blur-[3px] select-none' : ''}`}>
                        <HoursCell
                          value={row.hours[dayIdx] || 0}
                          onChange={(v) => setHour(row.key, dayIdx, v)}
                          disabled={disabled}
                        />
                      </td>
                    );
                  })}
                  <td className="border border-[var(--border)] p-1">
                    <Input
                      className="w-full"
                      size="small"
                      placeholder="Remark"
                      allowClear
                      disabled={isFullyLocked || rowLocked}
                      maxLength={1000}
                      value={row.remark}
                      onChange={(e) => setRemark(row.key, e.target.value)}
                    />
                  </td>
                  <td className="border border-[var(--border)] text-center">
                    <Button
                      size="small"
                      type="text"
                      danger
                      disabled={isFullyLocked || rowLocked}
                      icon={<DeleteOutlined />}
                      onClick={() => removeProjectRow(row.key)}
                    />
                  </td>
                </tr>
                );
              })}

              <tr>
                <td colSpan={10} className="border border-[var(--border)] p-1.5">
                  <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addProjectRow} disabled={isFullyLocked} block>
                    Add Project
                  </Button>
                </td>
              </tr>

              {rows.filter((r) => r.kind !== 'project').map((row) => {
                const rowLocked = !isAdmin && row.submittedMask !== 0;
                return (
                <tr key={row.key}>
                  <td className="border border-[var(--border)] px-3 py-1.5 text-[var(--text-muted)] italic">
                    {FIXED_CATEGORIES.find((c) => c.kind === row.kind)?.label}
                  </td>
                  {DAYS.map((_, dayIdx) => {
                    if (!isDayVisible(dayIdx, weekStart)) return null;
                    const dateObj = new Date(weekStart);
                    dateObj.setDate(dateObj.getDate() + dayIdx);
                    const isToday = formatDate(dateObj) === todayStr;
                    const isFutureDay = formatDate(dateObj) > todayStr;
                    const cellLocked = !isAdmin && (row.submittedMask & (1 << dayIdx)) !== 0;
                    const blockedBySibling = !isAdmin && rows.some(
                      (r) => r.kind !== 'project' && r.kind !== row.kind && (r.hours[dayIdx] || 0) > 0,
                    );
                    const disabled = isFullyLocked || cellLocked || blockedBySibling || (!isAdmin && isFutureDay && !approvedDayIndices.has(dayIdx));
                    const isTickRow = row.kind === 'holiday' || row.kind === 'leave';
                    const value = row.hours[dayIdx] || 0;
                    return (
                      <td key={dayIdx} className={`border border-[var(--border)] p-1 text-center ${disabled && (!isToday || blockedBySibling) ? 'opacity-60 blur-[3px] select-none' : ''}`}>
                        {isTickRow ? (
                          disabled ? (
                            value > 0 ? <CheckCircleOutlined className="text-emerald-400" /> : <span className="text-[var(--text-very-muted)]">-</span>
                          ) : (
                            <Checkbox
                              checked={value > 0}
                              onChange={(e) => setHour(row.key, dayIdx, e.target.checked ? STANDARD_DAILY_HOURS : 0)}
                            />
                          )
                        ) : (
                          <HoursCell
                            value={value}
                            onChange={(v) => setHour(row.key, dayIdx, v)}
                            disabled={disabled}
                          />
                        )}
                      </td>
                    );
                  })}
                  <td className="border border-[var(--border)] p-1">
                    <Input
                      className="w-full"
                      size="small"
                      placeholder="Remark"
                      allowClear
                      disabled={isFullyLocked || rowLocked}
                      maxLength={1000}
                      value={row.remark}
                      onChange={(e) => setRemark(row.key, e.target.value)}
                    />
                  </td>
                  <td className="border border-[var(--border)]" />
                </tr>
                );
              })}
            </tbody>
            {isAdmin && (
              <tfoot>
                <tr>
                  <td className="border border-[var(--border)] px-3 py-2 font-semibold text-[var(--text-secondary)]">Daily Total</td>
                  {dayTotals.map((t, i) => (
                    <td
                      key={i}
                      className={`border border-[var(--border)] px-2 py-2 text-center font-semibold ${t > DAY_LIMIT_HOURS ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}
                    >
                      {t.toFixed(1)}
                    </td>
                  ))}
                  <td className="border border-[var(--border)]" />
                  <td className="border border-[var(--border)]" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        </Spin>

        <Typography.Text type="secondary" className="mt-2 block text-xs">
          Each day is 8 hrs — split it across projects (e.g. 4 hrs on Project A and 4 hrs on Project B). Submitted hours lock; add another project row to enter more for the same day. Use Public Holiday, Idle Time or Leave for non-project days.
        </Typography.Text>
        {latestQuery?.status === 'rejected' && (
          <Typography.Text type="danger" className="mt-1 block text-xs">
            Your last edit request was rejected. You can send a new one if you still need a correction.
          </Typography.Text>
        )}
      </Card>

      <Modal
        title="Request Edit Access"
        open={requestModalOpen}
        onCancel={() => { setRequestModalOpen(false); setRequestDayIndex(null); }}
        onOk={submitEditRequest}
        okText="Send Request"
        confirmLoading={requestPending}
      >
        <Typography.Paragraph type="secondary">
          Pick the day you got wrong. Describe what you entered wrong — an admin will review and can reopen just that day for editing.
        </Typography.Paragraph>
        <Select
          className="w-full mb-3"
          placeholder="Select day"
          value={requestDayIndex ?? undefined}
          onChange={(v) => setRequestDayIndex(v)}
          options={eligibleRequestDays.map((d) => ({ label: d.label, value: d.value }))}
          notFoundContent="No locked days available to request"
        />
        <Input.TextArea
          rows={4}
          maxLength={1000}
          value={requestReason}
          onChange={(e) => setRequestReason(e.target.value)}
          placeholder="e.g. Entered wrong hours on Monday, should be 6 hrs not 8"
        />
      </Modal>
    </div>
  );
}
