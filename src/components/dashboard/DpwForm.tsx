'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button, Card, Col, DatePicker, Divider, Flex, Form, Input, Row, Select, Space, Typography, App, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createDailyLabourReport, updateDailyLabourReport, deleteDailyLabourReport } from '@/actions/daily-labour';
import { createTrade } from '@/actions/trades';
import type { Project, Trade, DailyLabourReport } from '@/types/erp';
import { cardClassName } from './ui';
import { useAuthStore } from '@/store/auth';
import { GeoTagPhotoCapture, type GeoTagFile } from './GeoTagPhotoCapture';

import { useRouter } from 'next/navigation';
import { getApiOrigin } from '@/lib/api-url';

const MAX_PHOTOS_PER_SESSION = 5;
const PHOTO_SLOTS = [1, 2, 3, 4, 5] as const;

type Props = {
  projects: Project[];
  trades: Trade[];
  initialValues?: DailyLabourReport;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function DpwForm({ projects, trades, initialValues, onSuccess, onCancel }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingTrade, setIsAddingTrade] = useState(false);
  const [newTradeName, setNewTradeName] = useState('');
  const [localTrades, setLocalTrades] = useState<Trade[]>(trades);
  const { message, modal } = App.useApp();
  const { user } = useAuthStore();
  const [form] = Form.useForm();

  // Keep track of photo file lists per worker index
  const [workerPhotos, setWorkerPhotos] = useState<Record<number, { morning: GeoTagFile[], evening: GeoTagFile[] }>>({});

  // Pre-fill form if editing
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        projectId: initialValues.projectId,
        reportDate: dayjs(initialValues.reportDate),
        remarks: initialValues.remarks,
        workers: initialValues.workers.map(w => ({
          ...w,
          inTime: w.inTime ? dayjs(w.inTime, 'HH:mm:ss') : undefined,
          outTime: w.outTime ? dayjs(w.outTime, 'HH:mm:ss') : undefined,
        }))
      });

      // Populate existing photos per worker
      const photos: Record<number, { morning: GeoTagFile[], evening: GeoTagFile[] }> = {};
      initialValues.workers.forEach((w, index) => {
        const buildList = (session: 'morning' | 'evening'): GeoTagFile[] =>
          PHOTO_SLOTS.flatMap((slot) => {
            const url = (w as Record<string, unknown>)[`${session}Photo${slot}Url`] as string | undefined;
            if (!url) return [];
            return [{ uid: `-${session[0]}${slot}-${index}`, name: `${session}${slot}.jpg`, status: 'done' as const, url: `${getApiOrigin()}${url}` }];
          });

        photos[index] = { morning: buildList('morning'), evening: buildList('evening') };
      });
      setWorkerPhotos(photos);
    }
  }, [initialValues, form]);

  const handleDeleteReport = async () => {
    if (!initialValues?.id) return;
    
    modal.confirm({
      title: 'Delete this report?',
      content: 'Are you sure you want to delete this daily labour report? This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        setIsDeleting(true);
        try {
          await deleteDailyLabourReport(initialValues.id);
          message.success('Report deleted successfully');
          router.push('/dashboard/dpw');
        } catch (error) {
          message.error('Failed to delete report');
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

  const handleAddTrade = async (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    if (!newTradeName.trim()) return;

    setIsAddingTrade(true);
    try {
      const trade = await createTrade({ name: newTradeName });
      setLocalTrades([...localTrades, trade]);
      setNewTradeName('');
      message.success('Trade added successfully');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to add trade');
    } finally {
      setIsAddingTrade(false);
    }
  };

  const handlePhotoChange = (index: number, type: 'morning' | 'evening', fileList: GeoTagFile[]) => {
    setWorkerPhotos(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [type]: fileList
      }
    }));
  };

  const handleSubmit = (values: any) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('projectId', values.projectId);
        formData.append('reportDate', values.reportDate.format('YYYY-MM-DD'));
        formData.append('remarks', values.remarks || '');
        
        const workers = values.workers?.map((w: any, index: number) => {
          const selectedTrade = localTrades.find(t => t.id === w.tradeId);
          
          // Add photos to formData with special field names, and carry
          // through existing photo URLs (relative to API origin) for slots
          // that weren't replaced with a new capture.
          const photos = workerPhotos[index];
          const photoUrls: Record<string, string | undefined> = {};
          for (const session of ['morning', 'evening'] as const) {
            PHOTO_SLOTS.forEach((slot, i) => {
              const item = photos?.[session]?.[i];
              if (item?.originFileObj) {
                formData.append(`worker_${index}_${session}Photo${slot}`, item.originFileObj);
              }
              photoUrls[`${session}Photo${slot}Url`] = item?.url?.replace(getApiOrigin(), '') || undefined;
            });
          }

          return {
            tradeId: w.tradeId,
            trade: selectedTrade?.name || w.tradeId,
            count: w.count || 1,
            shift: w.shift || '1',
            inTime: w.inTime ? w.inTime.format('HH:mm:ss') : undefined,
            outTime: w.outTime ? w.outTime.format('HH:mm:ss') : undefined,
            remarks: w.remarks || '',
            ...photoUrls,
          };
        }) || [];
        
        formData.append('workers', JSON.stringify(workers));

        if (initialValues?.id) {
          await updateDailyLabourReport(initialValues.id, formData);
          message.success('Daily report updated successfully');
        } else {
          await createDailyLabourReport(formData);
          message.success('Daily report submitted successfully');
        }
        
        form.resetFields();
        setWorkerPhotos({});
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/dashboard/dpw');
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Failed to submit report');
      }
    });
  };

  const availableProjects = user?.role === 'site_engineer' && user.projects 
    ? projects.filter(p => user.projects?.some(up => up.id === p.id))
    : projects;

  return (
    <Card className={cardClassName} bordered={false}>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="projectId" label="Project" rules={[{ required: true }]}>
              <Select
                options={availableProjects.map((p) => ({ label: p.name, value: p.id }))}
                placeholder="Select project"
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="reportDate" label="Date" rules={[{ required: true }]} initialValue={dayjs()}>
              <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
            </Form.Item>
          </Col>
        </Row>

        <Divider className="border-[var(--border)] text-[var(--text-muted)]">Trade Wise Attendance</Divider>
        
        <Form.List name="workers">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Card size="small" key={key} className="mb-6 border-[var(--border)] bg-[var(--subtle-bg)] shadow-md" 
                  title={<Typography.Text strong className="text-sky-400">Trade Entry #{name + 1}</Typography.Text>}
                  extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />}
                >
                    <Row gutter={12}>
                      <Col xs={24} sm={10}>
                        <Form.Item {...restField} name={[name, 'tradeId']} label="Trade" rules={[{ required: true }]}>
                          <Select
                            showSearch
                            placeholder="Select trade"
                            options={localTrades.map(t => ({ label: t.name, value: t.id }))}
                            dropdownRender={(menu) => (
                              <>
                                {menu}
                                <Divider style={{ margin: '8px 0' }} />
                                <Space style={{ padding: '0 8px 4px' }}>
                                  <Input
                                    placeholder="New trade"
                                    value={newTradeName}
                                    onChange={(e) => setNewTradeName(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                  />
                                  <Button type="text" icon={<PlusOutlined />} onClick={handleAddTrade} loading={isAddingTrade}>
                                    Add
                                  </Button>
                                </Space>
                              </>
                            )}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={7}>
                        <Form.Item {...restField} name={[name, 'count']} label="Worker Count" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: '100%' }} placeholder="Count" />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={7}>
                        <Form.Item {...restField} name={[name, 'shift']} label="Shift" initialValue="1">
                          <Select options={[{label: '0.5', value: '0.5'}, {label: '1', value: '1'}, {label: '1.5', value: '1.5'}, {label: '2', value: '2'}]} />
                        </Form.Item>
                      </Col>
                    <Col xs={12}>
                      <Form.Item {...restField} name={[name, 'inTime']} label="In Time">
                        <DatePicker picker="time" format="hh:mm A" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12}>
                      <Form.Item {...restField} name={[name, 'outTime']} label="Out Time">
                        <DatePicker picker="time" format="hh:mm A" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    
                    <Col xs={24} md={12}>
                      <Form.Item label={`Morning Photos (Max ${MAX_PHOTOS_PER_SESSION})`}>
                        <GeoTagPhotoCapture
                          maxCount={MAX_PHOTOS_PER_SESSION}
                          fileList={workerPhotos[name]?.morning || []}
                          onChange={(fileList) => handlePhotoChange(name, 'morning', fileList)}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label={`Evening Photos (Max ${MAX_PHOTOS_PER_SESSION})`}>
                        <GeoTagPhotoCapture
                          maxCount={MAX_PHOTOS_PER_SESSION}
                          fileList={workerPhotos[name]?.evening || []}
                          onChange={(fileList) => handlePhotoChange(name, 'evening', fileList)}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24}>
                      <Form.Item {...restField} name={[name, 'remarks']} label="Remarks">
                        <Input.TextArea autoSize placeholder="Task details..." />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add Trade Entry
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Divider className="border-[var(--border)] text-[var(--text-muted)]">Summary</Divider>
        
        <Form.Item name="remarks" label="Overall Remarks">
          <Input.TextArea rows={3} placeholder="E.g., Site activities completed as planned." />
        </Form.Item>

        <Flex justify="space-between" className="mt-6">
          <Space>
            {initialValues?.id && (
              <Button danger icon={<DeleteOutlined />} loading={isDeleting} onClick={handleDeleteReport}>
                Delete Report
              </Button>
            )}
          </Space>
          <Space>
            {onCancel && <Button onClick={onCancel}>Cancel</Button>}
            <Button type="primary" loading={isPending} icon={<SaveOutlined />} onClick={() => form.submit()}>
              {initialValues?.id ? 'Update Report' : 'Submit Report'}
            </Button>
          </Space>
        </Flex>
      </Form>
    </Card>
  );
}
