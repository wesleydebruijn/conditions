export type Hash = Record<string, any>;
export type ConditionHash = Hash | Array<Hash>;

export type Operator = "and" | "or";
export type ConditionOperator =
  | "eq"
  | "="
  | "ne"
  | "!="
  | "gt"
  | ">"
  | "gte"
  | ">="
  | "lt"
  | "<"
  | "lte"
  | "<="
  | "in"
  | "nin"
  | "not_in"
  | "between"
  | "like"
  | "exists"
  | "not_exists"
  | "null"
  | "startswith"
  | "starts_with"
  | "endswith"
  | "ends_with"
  | "contains"
  | "match"
  | "regex"
  | "empty"
  | "not_empty";

export type Group = {
  operator: Operator;
  fieldSets: FieldSet[];
};

export type FieldSet = {
  fields: Field[];
};

export type Field = {
  key: string;
  conditions: Condition[];
  where?: Group[];
};

export type Condition = {
  operator: ConditionOperator;
  value: string;
};

export type SchemaType =
  | "text"
  | "number"
  | "boolean"
  | "object"
  | "text[]"
  | "number[]"
  | "boolean[]"
  | "object[]";
export type Schema = Record<string, SchemaItem>;

export type SchemaItem = {
  label: string;
  type: SchemaType;
  schema?: Schema;
};

export type ValueKind = "none" | "text" | "number" | "boolean" | "list" | "range";

export type Settings = {
  classNames: {
    wrapper: string;
    groupsContainer: string;

    groupSection: string;
    groupHeader: string;
    groupLabel: string;
    groupBody: string;
    groupEmpty: string;
    groupFooter: string;
    groupSelect: string;

    fieldsetSection: string;
    fieldsetLabel: string;
    fieldsetBody: string;

    fieldSection: string;
    fieldBody: string;
    fieldActions: string;
    fieldConditions: string;
    fieldNestedGroups: string;
    fieldInput: string;
    fieldSelect: string;

    conditionSection: string;
    conditionSelect: string;
    conditionValue: string;
    conditionValueInput: string;
    conditionValueSeparator: string;

    isBoxed: string;

    buttonAddGroup: string;
    buttonAddField: string;
    buttonJoinField: string;
    buttonAddCondition: string;
    buttonAddFilter: string;
    buttonRemove: string;
  };
  labels: {
    match: string;
    where: string;
    ofTheFollowing: string;
    and: string;
    or: string;
    all: string;
    any: string;
    allOf: string;
    empty: string;
    addGroup: string;
    addField: string;
    joinField: string;
    addCondition: string;
    addFilter: string;
    remove: string;
    choose: string;
    fieldPlaceholder: string;
    fieldNamePlaceholder: string;
    fieldLabel: string;
    operatorLabel: string;
    valueLabel: string;
    valuePlaceholder: string;
    listPlaceholder: string;
    yes: string;
    no: string;
  };
  conditionOperators: Partial<Record<ConditionOperator, string>>;
  schema?: Schema;
};

export type Options = Partial<Omit<Settings, "classNames" | "labels">> & {
  classNames?: Partial<Settings["classNames"]>;
  labels?: Partial<Settings["labels"]>;
};
