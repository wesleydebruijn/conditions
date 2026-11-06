import type { ConditionOperator, Schema, SchemaItem, SchemaType, ValueKind } from "./types";

type Field = { key: string; label: string; groups?: string[] };

export function fieldList(
  schema: Schema,
  aggregates: { count: string; sum: string } = { count: "count", sum: "sum" },
  parent?: Field,
): Field[] {
  return Object.entries(schema).flatMap(([childKey, childValue]) => {
    const key = parent ? `${parent.key}.${childKey}` : childKey;
    const label = parent ? `${parent.label} → ${childValue.label}` : childValue.label;
    const groups = fieldGroups(childValue) ?? parent?.groups;

    if (fieldType(childValue.type) !== "object") return [field(key, label, groups)];
    if (!childValue.schema) return [];
    if (!fieldIsArray(childValue.type))
      return fieldList(childValue.schema, aggregates, field(key, label, groups));

    const count = childValue.count === false ? [] : [`${key}:count`];

    return [
      ...count.map((countKey) => field(countKey, `${label} (${aggregates.count})`, groups)),
      ...summableFields(childValue.schema).map(([subkey, subvalue]) =>
        field(
          `${key}:${subkey}:sum`,
          `${label} → ${subvalue.label} (${aggregates.sum})`,
          fieldGroups(subvalue) ?? groups,
        ),
      ),
    ];
  });
}

export function summableFields(schema: Schema): [string, SchemaItem][] {
  return Object.entries(schema).filter(
    ([_, item]) => fieldType(item.type) === "number" && item.sum !== false,
  );
}

function field(key: string, label: string, groups?: string[]): Field {
  return groups ? { key, label, groups } : { key, label };
}

function fieldGroups(item: SchemaItem): string[] | undefined {
  if (item.group === undefined) return;

  return Array.isArray(item.group) ? item.group : [item.group];
}

export function fieldSchemaItem(
  schema: Schema | undefined,
  string: string,
): SchemaItem | undefined {
  if (!schema) return;

  const [key, ...rest] = string.split(".");

  if (rest.length === 0 || !schema[key]?.schema) return schema[key];

  return fieldSchemaItem(schema[key].schema, rest.join("."));
}

export function fieldKey(key: string | null | undefined): string {
  return key ? key.replace(/:[^:]+:sum$/, "").replace(/:count$/, "") : "";
}

export function fieldType(type: string | null | undefined): string {
  return type ? type.replace(/[\[\]]+/, "") : "";
}

export function fieldIsArray(type: string): boolean {
  return type.endsWith("[]");
}

export function operatorHasValue(operator: ConditionOperator): boolean {
  return !["exists", "not_exists", "empty", "not_empty"].includes(operator);
}

export function fieldIsNumeric(type: string | undefined): boolean {
  if (!type) return false;

  return fieldType(type) === "number" || (fieldType(type) === "object" && fieldIsArray(type));
}

export function valueKind(operator: ConditionOperator, schema?: SchemaItem): ValueKind {
  if (!operatorHasValue(operator)) return "none";
  if (operator === "between") return "range";
  if (operator === "in" || operator === "not_in" || operator === "intersects") return "list";
  if (operator === "mod") return "mod";
  if (schema?.type === "boolean") return "boolean";
  if (fieldIsNumeric(schema?.type)) return "number";

  return "text";
}

export function defaultOperator(
  operators: ConditionOperator[],
  schema?: SchemaItem,
): ConditionOperator {
  return (
    operators.find((operator) => !schema || fieldOperatorValid(operator, schema.type)) ??
    operators[0]
  );
}

export function fieldOperatorValid(operator: ConditionOperator, type: SchemaType): boolean {
  switch (operator) {
    case "eq":
    case "ne":
      return !fieldIsArray(type) || fieldType(type) === "object";
    case "in":
    case "not_in":
    case "exists":
    case "not_exists":
      return !fieldIsArray(type);
    case "gt":
    case "gte":
    case "lt":
    case "lte":
    case "between":
    case "mod":
      return fieldType(type) === "number" || (fieldType(type) === "object" && fieldIsArray(type));
    case "starts_with":
    case "ends_with":
    case "match":
      return fieldType(type) === "text" && !fieldIsArray(type);
    case "contains":
      return type === "text" || (fieldIsArray(type) && fieldType(type) !== "object");
    case "intersects":
    case "empty":
    case "not_empty":
      return fieldIsArray(type) && fieldType(type) !== "object";
    default:
      return false;
  }
}
