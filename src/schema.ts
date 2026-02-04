import type { Schema, SchemaType, ConditionOperator } from './types';

export function fieldList(schema: Schema): { key: string, label: string }[] {
  return Object.entries(schema).flatMap(([key, value]) => {
    if(fieldType(value.type) !== 'object') return [{ key, label: value.label }];

    const numberFields = value.schema ? Object.entries(value.schema).filter(([_, value]) => fieldType(value.type) === 'number') : [];

    return [
      {
        key: `${key}_count`,
        label: `${value.label} (count)`,
      },
      ...numberFields.map(([subkey, subvalue]) => ({
        key: `${key}_${subkey}_sum`,
        label: `${value.label} → ${subvalue.label} (sum)`,
      })),
    ]
  });
}

export function fieldKey(key: string | null): string {
  return key ? key.replace(/_.+_sum$/, '').replace(/_count$/, '') : '';
}

export function fieldType(type: string | null): string {
  return type ? type.replace(/[\[\]]+/, '') as SchemaType : '';
}

export function fieldIsArray(type: string): boolean {
  return type.endsWith('[]');
}

export function operatorHasValue(operator: ConditionOperator): boolean {
  return !['exists', 'not_exists', 'null', 'empty', 'not_empty'].includes(operator);
}

export function fieldOperatorValid(operator: ConditionOperator, type: SchemaType): boolean {
  switch (operator) {
    case 'eq':
    case 'ne':
    case 'in':
    case 'not_in':
    case 'exists':
    case 'not_exists':
      return !fieldIsArray(type);
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
    case 'between':
      return fieldType(type) === 'number' || (fieldType(type) === 'object' && fieldIsArray(type));
    case 'like':
    case 'starts_with':
    case 'ends_with':
    case 'match':
      return fieldType(type) === 'text' && !fieldIsArray(type);
    case 'contains':
    case 'empty':
    case 'not_empty':
      return fieldIsArray(type) && fieldType(type) !== 'object';
    default:
      return false;
  }
}