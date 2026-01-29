export type Hash = Record<string, any>;
export type ConditionHash = Hash | Array<Hash>;

export type Operator = 'and' | 'or';
export type ConditionOperator =
  | 'eq' | '='
  | 'ne' | '!='
  | 'gt' | '>'
  | 'gte' | '>='
  | 'lt' | '<'
  | 'lte' | '<='
  | 'in'
  | 'nin' | 'not_in'
  | 'between'
  | 'like'
  | 'exists'
  | 'not_exists' | 'null'
  | 'startswith' | 'starts_with'
  | 'endswith' | 'ends_with'
  | 'contains'
  | 'match' | 'regex'
  | 'empty'
  | 'not_empty'

export type Group = {
  operator: Operator;
  fields: Field[];
}

export type Field = {
  key: string;
  conditions: Condition[];
  where?: Group[];
}

export type Condition = {
  operator: ConditionOperator;
  value: string;
}

export type Mapping = Record<string, MappingSettings>;
export type MappingSettings =
  | {
      label: string;
      type: 'object';
      multiple: true;
      mapping: Mapping;
    }
  | {
      label: string;
      type: 'text' | 'number' | 'boolean' | 'date';
      multiple?: boolean;
      mapping?: Mapping;
    };

export type Settings = {
  items: {
    group: string;
    field: string;
    condition: string;
    nestedGroup: string;
  },
  operators: Record<Operator, string>
  conditionOperators: Partial<Record<ConditionOperator, string>>
  mapping?: Mapping;
}