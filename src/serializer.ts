import type { Group, Field, Condition, ConditionOperator, Operator } from './types';

export function deserialize(string: string): Group[] {
  const json: JSON = JSON.parse(string);

  return Array.isArray(json) ? json.map(deserializeGroup) : [deserializeGroup(json)];
}

export function serialize(groups: Group[]): string {
  const result = groups.length === 1 ? serializeGroup(groups[0]) : groups.map(serializeGroup);

  return JSON.stringify(result, null, 2);
}

function isNumber(value: string): boolean {
  return !isNaN(Number(value)) && value.trim() !== '';
}

function serializeValue(operator: ConditionOperator, value: string): string | number | boolean | number[] | string[] {
  if (operator === 'between') return value.split(',').map(Number);
  if (operator === 'in' || operator === 'not_in') return value.split(',').every(isNumber) ? value.split(',').map(Number) : value.split(',');
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (isNumber(value)) return Number(value);

  return value;
}

function serializeField(field: Field): Record<string, any> {
  const fieldObj: any = {};

  for (const cond of field.conditions) {
    fieldObj[cond.operator] = serializeValue(cond.operator, cond.value);
  }

  if (field.where && field.where.length > 0) {
    const where = field.where.map(serializeGroup);
    fieldObj['where'] = where.length === 1 ? where[0] : where;
  }

  return fieldObj;
}

function serializeGroup(group: Group): any {
  const groupObj: any = {};

  if (group.operator === 'and') {
    for (const field of group.fields) {
      groupObj[field.key] = serializeField(field);
    }
  } else if (group.operator === 'or') {
    groupObj[group.operator] = group.fields.map(field => ({ [field.key]: serializeField(field) }))
  }

  return groupObj;
}

function deserializeConditions(value: Record<string, any>): Condition[] {
  return Object.entries(value).filter(([operator, _value]) => operator !== "where").map(([operator, value]) => {
    return {
      operator: operator as ConditionOperator,
      value: String(value)
    }
  });
}

function deserializeFields(record: Record<string, any>): Field[] {
  return Object.entries(record).map(([key, value]) => {
    const conditions = deserializeConditions(value);
    const where = value['where'] ? Array.isArray(value['where']) ? value['where'].map(deserializeGroup) : [deserializeGroup(value['where'])] : undefined;

    return { key, conditions, where };
  });
}

function deserializeGroup(record: Record<string, any>): Group {
  if ('and' in record || 'or' in record) {
    const operator: Operator = 'and' in record ? 'and' : 'or';
    const fields = Array.isArray(record[operator]) ? record[operator].map(deserializeFields).flat() : deserializeFields(record[operator])

    return { operator, fields }
  }

  return { operator: 'and', fields: deserializeFields(record) }
}