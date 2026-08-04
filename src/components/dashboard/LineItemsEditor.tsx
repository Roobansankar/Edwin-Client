'use client';

import { Button, Flex, Form, Input, InputNumber, Select, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Controller,
  type Control,
  type FieldArray,
  type FieldArrayPath,
  type FieldValues,
  type Path,
  useFieldArray,
} from 'react-hook-form';

type LineItemsEditorProps<TFormValues extends FieldValues> = {
  control: Control<TFormValues>;
  name: FieldArrayPath<TFormValues>;
  descriptionOptions?: { label: string; value: string }[];
};

export function LineItemsEditor<TFormValues extends FieldValues>({
  control,
  name,
  descriptionOptions,
}: LineItemsEditorProps<TFormValues>) {
  const { fields, append, remove } = useFieldArray({ control, name });
  const emptyItem = {
    description: '',
    quantity: 1,
    unit: 'nos',
    rate: 0,
  } as FieldArray<TFormValues, FieldArrayPath<TFormValues>>;

  return (
    <div>
      <Flex justify="space-between" align="center" className="mb-3">
        <Typography.Text strong>Line Items</Typography.Text>
        <Button
          icon={<PlusOutlined />}
          onClick={() => append(emptyItem)}
        >
          Add Item
        </Button>
      </Flex>

      <Flex vertical className="w-full" gap={12}>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-[10px] border border-[var(--border)] bg-[var(--subtle-bg)] p-3"
          >
            <Flex gap={8} align="flex-start" wrap="wrap">
              <Controller
                control={control}
                name={`${name}.${index}.description` as Path<TFormValues>}
                render={({ field: inputField, fieldState }) => (
                  <Form.Item
                    label="Description"
                    validateStatus={fieldState.error ? 'error' : undefined}
                    help={fieldState.error?.message}
                    className="mb-2 min-w-60 flex-1"
                  >
                    {descriptionOptions ? (
                    <Select
                      {...inputField}
                      showSearch
                      allowClear
                      placeholder="Select or type an item"
                      options={descriptionOptions}
                    />
                  ) : (
                    <Input {...inputField} placeholder="Enter item description" />
                  )}
                  </Form.Item>
                )}
              />
              <Controller
                control={control}
                name={`${name}.${index}.quantity` as Path<TFormValues>}
                render={({ field: inputField, fieldState }) => (
                  <Form.Item
                    label="Qty"
                    validateStatus={fieldState.error ? 'error' : undefined}
                    help={fieldState.error?.message}
                    className="mb-2 w-30"
                  >
                    <InputNumber
                      min={0}
                      precision={0}
                      className="w-full"
                      value={inputField.value}
                      onChange={inputField.onChange}
                    />
                  </Form.Item>
                )}
              />
              <Controller
                control={control}
                name={`${name}.${index}.unit` as Path<TFormValues>}
                render={({ field: inputField, fieldState }) => (
                  <Form.Item
                    label="Unit"
                    validateStatus={fieldState.error ? 'error' : undefined}
                    help={fieldState.error?.message}
                    className="mb-2 w-27.5"
                  >
                    <Input {...inputField} placeholder="nos" />
                  </Form.Item>
                )}
              />
              <Controller
                control={control}
                name={`${name}.${index}.rate` as Path<TFormValues>}
                render={({ field: inputField, fieldState }) => (
                  <Form.Item
                    label="Rate"
                    validateStatus={fieldState.error ? 'error' : undefined}
                    help={fieldState.error?.message}
                    className="mb-2 w-37.5"
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      prefix="₹"
                      className="w-full"
                      value={inputField.value}
                      onChange={inputField.onChange}
                    />
                  </Form.Item>
                )}
              />
              <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                aria-label="Remove item"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className="mt-7.5"
              />
              </Flex>
              </div>
              ))}
              </Flex>
              </div>
              );
              }
