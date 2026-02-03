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
  fieldSets: FieldSet[];
}

export type FieldSet = {
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

export type MappingSettings = {
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'object';
  mapping?: Mapping;
};

export type ClassNames = {
  wrapper: string;
  groupsContainer: string;

  groupSection: string;
  groupHeader: string;
  groupBody: string;
  groupBadge: string;
  select: string;

  fieldsetSection: string;
  fieldsetHeader: string;
  fieldsetBody: string;
  fieldsetBadge: string;

  fieldSection: string;
  fieldHeader: string;
  fieldBody: string;
  fieldBadge: string;
  fieldConditions: string;
  fieldNestedGroups: string;
  fieldInput: string;
  fieldSelect: string;

  conditionSection: string;
  conditionInputs: string;
  operatorSelect: string;
  valueInput: string;

  isCollapsed: string;

  buttonAddGroup: string;
  buttonAddFieldSet: string;
  buttonAddField: string;
  buttonAddCondition: string;
  buttonAddFilter: string;
  buttonRemove: string;
};

export type Settings = {
  classNames: ClassNames;
  items: {
    group: string;
    field: string;
    fieldSet: string;
    condition: string;
    nestedGroup: string;
  };
  operators: Record<Operator, string>;
  conditionOperators: Partial<Record<ConditionOperator, string>>;
  mapping?: Mapping;
};