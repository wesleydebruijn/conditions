type Operator = 'and' | 'or';
type ConditionOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'not_in'
  | 'between'
  | 'like'
  | 'exists'
  | 'not_exists'
  | 'starts_with'
  | 'ends_with'
  | 'contains'
  | 'match'
  | 'empty'
  | 'not_empty'

type Group = {
  operator: Operator;
  fields: Field[];
}

type Field = {
  field: string;
  conditions: Condition[];
  nested?: Group[];
}

type Condition = {
  operator: ConditionOperator;
  value: string;
}

export class ConditionBuilder {
  public groups: Group[]

  constructor(input: string) {
    this.groups = this.deserialize(input);
  }

  deserialize(string: string): Group[] {
    const json: JSON = JSON.parse(string);

    function parseConditions(value: Record<string, any>): Condition[] {
      return Object.entries(value).filter(([operator, _value]) => operator !== "where").map(([operator, value]) => {
        return {
          operator: operator as ConditionOperator,
          value: String(value)
        }
      });
    }

    function parseFields(record: Record<string, any>): Field[] {
      return Object.entries(record).map(([field, value]) => {
        return {
          field,
          conditions: parseConditions(value),
          nested: value['where'] ? Array.isArray(value['where']) ? value['where'].map(parseGroup) : [parseGroup(value['where'])] : undefined
        }
      });
    }

    function parseGroup(record: Record<string, any>): Group {
      if ('and' in record || 'or' in record) {
        const operator: Operator = 'and' in record ? 'and' : 'or';

        return {
          operator,
          fields: Array.isArray(record[operator])
            ? record[operator].map(parseFields).flat()
            : parseFields(record[operator])
        }
      }

      return {
        operator: 'and',
        fields: parseFields(record)
      }
    }

    return Array.isArray(json) ? json.map(parseGroup) : [parseGroup(json)];
  }

  serialize(groups: Group[]): string {
    function buildValue(value: string): string | number | boolean {
      if (value === 'true') return true;
      else if (value === 'false') return false;
      else if (!isNaN(Number(value)) && value.trim() !== '') return Number(value);
      else return value;
    }

    function buildField(field: Field): Record<string, any> {
      const fieldObj: any = {};

      for (const cond of field.conditions) {
        fieldObj[cond.operator] = buildValue(cond.value);
      }

      if (field.nested && field.nested.length > 0) {
        const nestedGroups = field.nested.map(buildGroup);
        fieldObj['where'] = nestedGroups.length === 1 ? nestedGroups[0] : nestedGroups;
      }

      return fieldObj;
    }

    function buildGroup(group: Group): any {
      const groupObj: any = {};

      if (group.operator === 'and') {
        for (const field of group.fields) {
          groupObj[field.field] = buildField(field);
        }
      } else if (group.operator === 'or') {
        groupObj[group.operator] = group.fields.map(field => ({ [field.field]: buildField(field) }))
      }

      return groupObj;
    }

    // If there's only one group, return its object form directly;
    // if multiple groups, return array of group objects.
    let result: any;
    if (groups.length === 1) {
      result = buildGroup(groups[0]);
    } else {
      result = groups.map(buildGroup);
    }

    return JSON.stringify(result, null, 2);
  }
}
