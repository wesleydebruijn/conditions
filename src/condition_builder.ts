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
    function buildGroup(group: Group): any {
      const groupObj: any = {};

      // If group.operator is 'and' or 'or', encode fields accordingly
      if (group.operator === 'and' || group.operator === 'or') {
        // Each field will be a property on the group object
        for (const field of group.fields) {
          const fieldObj: any = {};

          // Encode the condition operators as properties (except nested)
          for (const cond of field.conditions) {
            // Try to parse as number or boolean if possible, else keep as string
            let val = cond.value;
            if (val === 'true') val = true;
            else if (val === 'false') val = false;
            else if (!isNaN(Number(val)) && val.trim() !== '') val = Number(val);

            fieldObj[cond.operator] = val;
          }

          // If nested groups exist
          if (field.nested && field.nested.length > 0) {
            // Build the nested group(s)
            const nestedGroups = field.nested.map(buildGroup);
            // Save as 'where' property; array if many, object if one
            fieldObj['where'] = nestedGroups.length === 1 ? nestedGroups[0] : nestedGroups;
          }

          groupObj[field.field] = fieldObj;
        }
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
