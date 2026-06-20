export type ScalarFieldType =
  | 'row_number'
  | 'uuid'
  | 'first_name'
  | 'last_name'
  | 'full_name'
  | 'email'
  | 'phone'
  | 'gender'
  | 'city'
  | 'country'
  | 'boolean'
  | 'integer'
  | 'float'
  | 'date'
  | 'datetime'
  | 'url'
  | 'ipv4'
  | 'lorem'
  | 'enum';

export type FieldType = ScalarFieldType | 'object' | 'array';

export function isScalarType(type: FieldType): type is ScalarFieldType {
  return type !== 'object' && type !== 'array';
}

export interface SchemaField {
  id: string;
  name: string;
  type: FieldType;
  blankPercent: number;
  options?: {
    min?: number;
    max?: number;
    values?: string[];
    minItems?: number;
    maxItems?: number;
  };
  /** Nested fields when type is `object`. */
  children?: SchemaField[];
  /** Item template when type is `array`. */
  item?: SchemaField;
}

export type OutputFormat = 'json' | 'csv' | 'xml';

export const MAX_ROW_COUNT = 1000;
