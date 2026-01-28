export type Operator = 'and' | 'or';
export type ConditionOperator =
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

export type Group = {
  operator: Operator;
  fields: Field[];
}

export type Field = {
  field: string;
  conditions: Condition[];
  nested?: Group[];
}

export type Condition = {
  operator: ConditionOperator;
  value: string;
}