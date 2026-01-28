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
          fields: parseFields(record)
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
    return ''
  }
}
