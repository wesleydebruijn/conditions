import type { Group, Field, Condition, ConditionOperator, Operator } from './types';

export function deserialize(string: string): Group[] {
  const json: JSON = JSON.parse(string);

  return Array.isArray(json) ? json.map(deserializeGroup) : [deserializeGroup(json)];
}

export function serialize(groups: Group[]): string {
  const result = groups.length === 1 ? serializeGroup(groups[0]) : groups.map(serializeGroup);

  return JSON.stringify(result, null, 2);
}

function serializeValue(value: string): string | number | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (!isNaN(Number(value)) && value.trim() !== '') return Number(value);
  
  return value;
}

function serializeField(field: Field): Record<string, any> {
  const fieldObj: any = {};

  for (const cond of field.conditions) {
    fieldObj[cond.operator] = serializeValue(cond.value);
  }

  if (field.nested && field.nested.length > 0) {
    const nestedGroups = field.nested.map(serializeGroup);
    fieldObj['where'] = nestedGroups.length === 1 ? nestedGroups[0] : nestedGroups;
  }

  return fieldObj;
}

function serializeGroup(group: Group): any {
  const groupObj: any = {};

  if (group.operator === 'and') {
    for (const field of group.fields) {
      groupObj[field.field] = serializeField(field);
    }
  } else if (group.operator === 'or') {
    groupObj[group.operator] = group.fields.map(field => ({ [field.field]: serializeField(field) }))
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
  return Object.entries(record).map(([field, value]) => {
    const conditions = deserializeConditions(value);
    const nested = value['where'] ? Array.isArray(value['where']) ? value['where'].map(deserializeGroup) : [deserializeGroup(value['where'])] : undefined;
 
    return { field, conditions, nested };
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