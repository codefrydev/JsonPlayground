import type { FieldType, SchemaField } from './types';

export interface FieldTypeMeta {
  type: FieldType;
  label: string;
  hasNumericOptions?: boolean;
  hasEnumOptions?: boolean;
  hasArrayOptions?: boolean;
  isContainer?: boolean;
}

export const FIELD_TYPE_CATALOG: FieldTypeMeta[] = [
  { type: 'row_number', label: 'Row Number' },
  { type: 'uuid', label: 'UUID' },
  { type: 'first_name', label: 'First Name' },
  { type: 'last_name', label: 'Last Name' },
  { type: 'full_name', label: 'Full Name' },
  { type: 'email', label: 'Email Address' },
  { type: 'phone', label: 'Phone' },
  { type: 'gender', label: 'Gender' },
  { type: 'city', label: 'City' },
  { type: 'country', label: 'Country' },
  { type: 'boolean', label: 'Boolean' },
  { type: 'integer', label: 'Integer', hasNumericOptions: true },
  { type: 'float', label: 'Float', hasNumericOptions: true },
  { type: 'date', label: 'Date' },
  { type: 'datetime', label: 'Date Time' },
  { type: 'url', label: 'URL' },
  { type: 'ipv4', label: 'IP Address v4' },
  { type: 'lorem', label: 'Lorem Text' },
  { type: 'enum', label: 'Custom List', hasEnumOptions: true },
  { type: 'object', label: 'Object (nested)', isContainer: true },
  { type: 'array', label: 'Array', hasArrayOptions: true, isContainer: true },
];

export function getDefaultOptionsForType(type: FieldType): SchemaField['options'] {
  if (type === 'integer') return { min: 1, max: 100 };
  if (type === 'float') return { min: 0, max: 100 };
  if (type === 'enum') return { values: ['A', 'B', 'C'] };
  if (type === 'array') return { minItems: 1, maxItems: 3 };
  return undefined;
}

export function getDefaultChildrenForType(type: FieldType): SchemaField[] | undefined {
  if (type === 'object') {
    return [createSchemaField({ name: 'field_1', type: 'lorem' })];
  }
  return undefined;
}

export function getDefaultItemForArray(): SchemaField {
  return createSchemaField({ name: '', type: 'lorem' });
}

export function createSchemaField(
  partial: Partial<SchemaField> & Pick<SchemaField, 'name' | 'type'>
): SchemaField {
  const type = partial.type;
  return {
    id: partial.id ?? crypto.randomUUID(),
    name: partial.name,
    type,
    blankPercent: partial.blankPercent ?? 0,
    options: partial.options ?? getDefaultOptionsForType(type),
    children: partial.children ?? getDefaultChildrenForType(type),
    item: partial.item ?? (type === 'array' ? getDefaultItemForArray() : undefined),
  };
}

export function cloneSchemaField(field: SchemaField): SchemaField {
  const cloned = createSchemaField({
    name: field.name,
    type: field.type,
    blankPercent: field.blankPercent,
    options: field.options
      ? {
          ...field.options,
          values: field.options.values ? [...field.options.values] : undefined,
        }
      : undefined,
  });

  if (field.type === 'object' && field.children) {
    cloned.children = field.children.map(cloneSchemaField);
  }
  if (field.type === 'array' && field.item) {
    cloned.item = cloneSchemaField(field.item);
  }

  return cloned;
}

export function cloneSchemaFields(fields: SchemaField[]): SchemaField[] {
  return fields.map(cloneSchemaField);
}

export const DEFAULT_SCHEMA: SchemaField[] = [
  createSchemaField({ name: 'id', type: 'row_number' }),
  createSchemaField({ name: 'first_name', type: 'first_name' }),
  createSchemaField({ name: 'last_name', type: 'last_name' }),
  createSchemaField({ name: 'email', type: 'email' }),
  createSchemaField({
    name: 'address',
    type: 'object',
    children: [
      createSchemaField({ name: 'city', type: 'city' }),
      createSchemaField({ name: 'country', type: 'country' }),
    ],
  }),
  createSchemaField({
    name: 'tags',
    type: 'array',
    options: { minItems: 2, maxItems: 4 },
    item: createSchemaField({ name: '', type: 'lorem' }),
  }),
];
