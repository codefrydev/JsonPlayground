import type { SchemaField } from './types';

type FieldUpdater = (field: SchemaField) => SchemaField;

function mapFields(
  fields: SchemaField[],
  fieldId: string,
  updater: FieldUpdater
): SchemaField[] {
  return fields.map((field) => {
    if (field.id === fieldId) {
      return updater(field);
    }
    let next = field;
    if (field.children?.length) {
      const children = mapFields(field.children, fieldId, updater);
      if (children !== field.children) next = { ...next, children };
    }
    if (field.item && field.item.id === fieldId) {
      next = { ...next, item: updater(field.item) };
    } else if (field.item?.children?.length) {
      const itemChildren = mapFields(field.item.children, fieldId, updater);
      if (itemChildren !== field.item.children) {
        next = { ...next, item: { ...field.item, children: itemChildren } };
      }
    }
    return next;
  });
}

function filterFields(fields: SchemaField[], fieldId: string): SchemaField[] {
  return fields
    .filter((f) => f.id !== fieldId)
    .map((field) => {
      let next = field;
      if (field.children?.length) {
        const children = filterFields(field.children, fieldId);
        if (children.length !== field.children.length) next = { ...next, children };
      }
      if (field.item) {
        if (field.item.id === fieldId) {
          return next;
        }
        if (field.item.children?.length) {
          const itemChildren = filterFields(field.item.children, fieldId);
          if (itemChildren.length !== field.item.children.length) {
            next = { ...next, item: { ...field.item, children: itemChildren } };
          }
        }
      }
      return next;
    });
}

function addChildToField(
  fields: SchemaField[],
  parentId: string,
  child: SchemaField
): SchemaField[] {
  return mapFields(fields, parentId, (field) => {
    if (field.type !== 'object') return field;
    const children = field.children ?? [];
    return { ...field, children: [...children, child] };
  });
}

export function updateFieldById(
  fields: SchemaField[],
  fieldId: string,
  updater: FieldUpdater
): SchemaField[] {
  return mapFields(fields, fieldId, updater);
}

export function removeFieldById(fields: SchemaField[], fieldId: string): SchemaField[] {
  return filterFields(fields, fieldId);
}

export function addChildField(
  fields: SchemaField[],
  parentId: string,
  child: SchemaField
): SchemaField[] {
  return addChildToField(fields, parentId, child);
}

export function countFields(fields: SchemaField[]): number {
  let count = 0;
  for (const field of fields) {
    count += 1;
    if (field.type === 'object' && field.children) {
      count += countFields(field.children);
    }
    if (field.type === 'array' && field.item?.type === 'object' && field.item.children) {
      count += countFields(field.item.children);
    }
  }
  return count;
}

export function hasNestedFields(fields: SchemaField[]): boolean {
  for (const field of fields) {
    if (field.type === 'object' || field.type === 'array') return true;
    if (field.children && hasNestedFields(field.children)) return true;
    if (field.item?.type === 'object' || field.item?.type === 'array') return true;
    if (field.item?.children && hasNestedFields(field.item.children)) return true;
  }
  return false;
}
