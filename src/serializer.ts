import type {
  Condition,
  ConditionNode,
  ConditionOperator,
  Group,
  Hash,
  Operator,
  Rule,
} from "./types";

const ALIAS_CONDITIONS: Record<string, ConditionOperator> = {
  "=": "eq",
  "!=": "ne",
  ">": "gt",
  ">=": "gte",
  "<": "lt",
  "<=": "lte",
  nin: "not_in",
  startswith: "starts_with",
  endswith: "ends_with",
  regex: "match",
  null: "not_exists",
};

export function deserialize(string: string): Group {
  return deserializeGroup(JSON.parse(string));
}

export function serialize(group: Group): string {
  return JSON.stringify(serializeGroup(group), null, 2);
}

export function isNumber(value: string): boolean {
  return !Number.isNaN(Number(value)) && value.trim() !== "";
}

export function serializeValue(
  operator: ConditionOperator,
  value: string,
): string | number | boolean | number[] | string[] {
  if (["exists", "not_exists", "null", "empty", "not_empty"].includes(operator)) return true;

  const list = value.split(",").map((item) => item.trim());

  if (operator === "between") return list.map(Number);
  if (operator === "in" || operator === "not_in")
    return list.every(isNumber) ? list.map(Number) : list;
  if (value === "true") return true;
  if (value === "false") return false;
  if (isNumber(value)) return Number(value);

  return value;
}

export function serializeRule(rule: Rule): Hash {
  const ruleObj: Hash = {};

  for (const condition of rule.conditions) {
    ruleObj[condition.operator] = serializeValue(condition.operator, condition.value);
  }

  if (rule.where && !isEmpty(rule.where)) ruleObj.where = serializeGroup(rule.where);

  return ruleObj;
}

function isEmpty(node: ConditionNode): boolean {
  return node.type === "rule" ? !node.key : node.children.every(isEmpty);
}

export function serializeGroup(group: Group): Hash {
  const children = group.children.filter((child) => !isEmpty(child));
  const parts =
    group.operator === "and" ? serializeAndParts(children) : children.map(serializeNode);

  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];

  return { [group.operator]: parts };
}

function serializeNode(node: ConditionNode): Hash {
  return node.type === "group" ? serializeGroup(node) : { [node.key]: serializeRule(node) };
}

function serializeAndParts(children: ConditionNode[]): Hash[] {
  const parts: Hash[] = [];
  const ruleParts: Hash[] = [];

  for (const child of children) {
    if (child.type === "group") {
      parts.push(serializeGroup(child));
      continue;
    }

    const value = serializeRule(child);
    const part = ruleParts.find((candidate) => canMerge(candidate[child.key], value));

    if (part) {
      part[child.key] = { ...part[child.key], ...value };
    } else {
      const newPart = { [child.key]: value };
      parts.push(newPart);
      ruleParts.push(newPart);
    }
  }

  return parts;
}

function canMerge(existing: Hash | undefined, next: Hash): boolean {
  if (!existing) return true;
  if ("where" in existing || "where" in next) return false;

  return Object.keys(next).every((operator) => !(operator in existing));
}

export function deserializeConditions(value: unknown): Condition[] {
  if (Array.isArray(value)) return [{ operator: "in", value: value.join(",") }];
  if (typeof value !== "object" || value === null)
    return [{ operator: "eq", value: String(value) }];

  return Object.entries(value)
    .filter(([operator, _value]) => operator !== "where")
    .map(([operator, value]) => {
      return {
        operator: ALIAS_CONDITIONS[operator] || (operator as ConditionOperator),
        value: String(value),
      };
    });
}

export function deserializeGroup(json: unknown): Group {
  if (Array.isArray(json)) return deserializeItems("and", json);

  const record: Hash = typeof json === "object" && json !== null ? json : {};
  const operator = logicOperator(record);

  if (!operator) return { type: "group", operator: "and", children: deserializeRules(record) };

  const value = record[operator];

  return deserializeItems(operator, Array.isArray(value) ? value : [value]);
}

function deserializeItems(operator: Operator, items: unknown[]): Group {
  return {
    type: "group",
    operator,
    children: items.flatMap((item) => deserializeChild(operator, item)),
  };
}

function deserializeChild(parentOperator: Operator, json: unknown): ConditionNode[] {
  const group = deserializeGroup(json);

  if (group.children.length === 1 || group.operator === parentOperator) return group.children;

  return [group];
}

function deserializeRules(record: Hash): Rule[] {
  return Object.entries(record).map(([key, value]) => {
    const rule: Rule = { type: "rule", key, conditions: deserializeConditions(value) };

    if (value?.where) rule.where = deserializeGroup(value.where);

    return rule;
  });
}

function logicOperator(record: Hash): Operator | undefined {
  if ("and" in record) return "and";
  if ("or" in record) return "or";
}
