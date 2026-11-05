import type { Condition, ConditionOperator, Field, FieldSet, Group, Hash, Operator } from "./types";

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

export function deserialize(string: string): Group[] {
  const json: JSON = JSON.parse(string);

  return Array.isArray(json) ? json.map(deserializeGroup) : [deserializeGroup(json)];
}

export function serialize(groups: Group[]): string {
  const result = groups.length === 1 ? serializeGroup(groups[0]) : groups.map(serializeGroup);

  return JSON.stringify(result, null, 2);
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

export function serializeField(field: Field): Hash {
  const fieldObj: Hash = {};

  for (const cond of field.conditions) {
    fieldObj[cond.operator] = serializeValue(cond.operator, cond.value);
  }

  if (field.where && field.where.length > 0) {
    const where = field.where.map(serializeGroup);
    fieldObj.where = where.length === 1 ? where[0] : where;
  }

  return fieldObj;
}

function canMerge(existing: Hash | undefined, next: Hash): boolean {
  if (!existing) return true;
  if ("where" in existing || "where" in next) return false;

  return Object.keys(next).every((operator) => !(operator in existing));
}

function combine(parts: Hash[]): Hash {
  if (parts.length === 0) return {};

  return parts.length === 1 ? parts[0] : { and: parts };
}

export function serializeFieldSet(fieldset: FieldSet): Hash[] {
  const parts: Hash[] = [];

  for (const field of fieldset.fields) {
    const value = serializeField(field);
    const part = parts.find((candidate) => canMerge(candidate[field.key], value));

    if (part) {
      part[field.key] = { ...part[field.key], ...value };
    } else {
      parts.push({ [field.key]: value });
    }
  }

  return parts;
}

export function serializeGroup(group: Group): Hash {
  if (group.fieldSets.length === 0) return {};
  if (group.fieldSets.length === 1) return combine(serializeFieldSet(group.fieldSets[0]));
  if (group.operator === "and") return combine(group.fieldSets.flatMap(serializeFieldSet));

  return { or: group.fieldSets.map((fieldset) => combine(serializeFieldSet(fieldset))) };
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

export function deserializeFieldSet(record: Record<string, any>): FieldSet {
  if (Array.isArray(record.and)) {
    return { fields: record.and.flatMap((item: Hash) => deserializeFieldSet(item).fields) };
  }

  return { fields: deserializeFields(record) };
}

export function deserializeFields(record: Record<string, any>): Field[] {
  return Object.entries(record).map(([key, value]) => {
    const conditions = deserializeConditions(value);
    const where = value?.where
      ? Array.isArray(value.where)
        ? value.where.map(deserializeGroup)
        : [deserializeGroup(value.where)]
      : undefined;

    return { key, conditions, where };
  });
}

export function deserializeGroup(record: Record<string, any>): Group {
  if ("and" in record || "or" in record) {
    const operator: Operator = "and" in record ? "and" : "or";
    const fieldSets = Array.isArray(record[operator])
      ? record[operator].map(deserializeFieldSet)
      : [deserializeFieldSet(record[operator])];

    return { operator, fieldSets };
  }

  return { operator: "and", fieldSets: [deserializeFieldSet(record)] };
}
