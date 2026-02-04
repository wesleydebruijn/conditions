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

export type SchemaType = 'text' | 'date' | 'number' | 'boolean' | 'object' | 'text[]' | 'number[]' | 'boolean[]' | 'object[]' | 'date[]';
export type Schema = Record<string, SchemaItem>;

export type SchemaItem = {
  label: string;
  type: SchemaType;
  schema?: Schema;
};

export type Settings = {
  classNames: {
    wrapper: string;
    groupsContainer: string;

    groupSection: string;
    groupHeader: string;
    groupBody: string;
    groupBadge: string;
    groupSelect: string;

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
    conditionSelect: string;
    conditionValueInput: string;

    isCollapsed: string;

    buttonAddGroup: string;
    buttonAddFieldSet: string;
    buttonAddField: string;
    buttonAddCondition: string;
    buttonAddFilter: string;
    buttonRemove: string;
  };
  items: {
    group: string;
    field: string;
    fieldset: string;
    condition: string;
    nestedGroup: string;
  };
  operators: Record<Operator, string>;
  conditionOperators: Partial<Record<ConditionOperator, string>>;
  hideInput: boolean;
  schema?: Schema;
};