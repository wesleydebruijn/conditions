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
  private groups: Group[]

  constructor(input: string) {
    this.groups = this.deserialize(input);
  }

  deserialize(string: string): Group[] {
    const json = JSON.parse(string);

    const groups: Group[] = [];

    return groups;
  }

  serialize(groups: Group[]): string {
    return ''
  }
}
