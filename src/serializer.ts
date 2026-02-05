import type { Hash, Group, Field, FieldSet, Condition, ConditionOperator, Operator } from './types';

const ALIAS_CONDITIONS: Record<string, ConditionOperator> = {
  '=': 'eq',
  '!=': 'ne',
  '>': 'gt',
  '>=': 'gte',
  '<': 'lt',
  '<=': 'lte',
  'nin': 'not_in',
  'startswith': 'starts_with',
  'endswith': 'ends_with',
  'regex': 'match',
  'null': 'not_exists',
};

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
  if (['exists', 'not_exists', 'null', 'empty', 'not_empty'].includes(operator)) return true;
  if (operator === 'between') return value.split(',').map(Number);
  if (operator === 'in' || operator === 'not_in') return value.split(',').every(isNumber) ? value.split(',').map(Number) : value.split(',');
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (isNumber(value)) return Number(value);

  return value;
}

function serializeField(field: Field): Hash {
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

function serializeGroup(group: Group): Hash {
  let groupObj: Hash = {};

  if ((group.operator === 'and' || group.operator === 'or') && group.fieldSets.length > 1) {
    groupObj[group.operator] = group.fieldSets.map(fieldset => fieldset.fields.reduce((acc, field) => ({ ...acc, [field.key]: serializeField(field) }), {}));
  } else if (group.fieldSets.length === 1) {
    groupObj = group.fieldSets[0].fields.reduce((acc, field) => ({ ...acc, [field.key]: serializeField(field) }), {});
  }

  return groupObj;
}

function deserializeConditions(value: Record<string, any>): Condition[] {
  return Object.entries(value).filter(([operator, _value]) => operator !== "where").map(([operator, value]) => {
    return {
      operator: ALIAS_CONDITIONS[operator] || operator as ConditionOperator,
      value: String(value)
    }
  });
}

function deserializeFieldSet(record: Record<string, any>): FieldSet {
  return { fields: deserializeFields(record) }
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
    const fieldSets = Array.isArray(record[operator]) ? record[operator].map(deserializeFieldSet) : [deserializeFieldSet(record[operator])]

    return { operator, fieldSets }
  }

  return { operator: 'and', fieldSets: [deserializeFieldSet(record)] }
}