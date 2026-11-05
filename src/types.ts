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
  type: "group";
  operator: Operator;
  children: ConditionNode[];
};

export type Rule = {
  type: "rule";
  key: string;
  conditions: Condition[];
  where?: Group;
};

export type ConditionNode = Group | Rule;

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

    group: string;
    groupBody: string;
    groupRail: string;
    groupOperator: string;
    groupChildren: string;
    groupEmpty: string;
    groupActions: string;

    rule: string;
    ruleRow: string;
    rulePill: string;
    ruleEditor: string;
    ruleEditorFooter: string;
    ruleWhere: string;
    ruleWhereLabel: string;

    summaryPath: string;
    summaryField: string;
    summaryOperator: string;
    summaryValue: string;
    summaryMuted: string;

    fieldInput: string;
    fieldSelect: string;
    fieldConditions: string;

    conditionSection: string;
    conditionSelect: string;
    conditionValue: string;
    conditionValueInput: string;
    conditionValueSeparator: string;

    isRoot: string;
    isNested: string;
    isOpen: string;
    isReadOnly: string;

    buttonAddRule: string;
    buttonAddGroup: string;
    buttonAddCondition: string;
    buttonAddWhere: string;
    buttonDone: string;
    buttonRemove: string;
  };
  labels: {
    and: string;
    or: string;
    andTitle: string;
    orTitle: string;
    where: string;
    whereTitle: string;
    empty: string;
    addRule: string;
    addGroup: string;
    addInnerGroup: string;
    addCondition: string;
    addWhere: string;
    edit: string;
    done: string;
    remove: string;
    removeRule: string;
    removeGroup: string;
    choose: string;
    fieldPlaceholder: string;
    fieldNamePlaceholder: string;
    fieldLabel: string;
    operatorLabel: string;
    valueLabel: string;
    valuePlaceholder: string;
    listPlaceholder: string;
    rangeSeparator: string;
    conditionSeparator: string;
    yes: string;
    no: string;
  };
  conditionOperators: Partial<Record<ConditionOperator, string>>;
  schema?: Schema;
  readOnly?: boolean;
};

export type Options = Partial<Omit<Settings, "classNames" | "labels">> & {
  classNames?: Partial<Settings["classNames"]>;
  labels?: Partial<Settings["labels"]>;
};
