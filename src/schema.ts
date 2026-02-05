import type { Schema, SchemaType, ConditionOperator, SchemaItem } from "./types";

export function fieldList(
  schema: Schema,
  parent?: { key: string; label: string },
): { key: string; label: string }[] {
  return Object.entries(schema).flatMap(([childKey, childValue]) => {
    const key = parent ? `${parent.key}.${childKey}` : childKey;
    const label = parent ? `${parent.label} → ${childValue.label}` : childValue.label;

    if (fieldType(childValue.type) !== "object") return [{ key, label }];
    if (!childValue.schema) return [];
    if (!fieldIsArray(childValue.type)) return fieldList(childValue.schema, { key, label });

    const numberFields = Object.entries(childValue.schema).filter(
      ([_, value]) => fieldType(value.type) === "number",
    );

    return [
      {
        key: `${key}_count`,
        label: `${label} (count)`,
      },
      ...numberFields.map(([subkey, subvalue]) => ({
        key: `${key}_${subkey}_sum`,
        label: `${label} → ${subvalue.label} (sum)`,
      })),
    ];
  });
}

export function fieldSchemaItem(
  schema: Schema | undefined,
  string: string,
): SchemaItem | undefined {
  if (!schema) return;

  const [key, ...rest] = string.split(".");

  if (rest.length === 0 || !schema[key].schema) return schema[key];

  return fieldSchemaItem(schema[key].schema, rest.join("."));
}

export function fieldKey(key: string | null | undefined): string {
  return key ? key.replace(/_.+_sum$/, "").replace(/_count$/, "") : "";
}

export function fieldType(type: string | null | undefined): string {
  return type ? type.replace(/[\[\]]+/, "") : "";
}

export function fieldIsArray(type: string): boolean {
  return type.endsWith("[]");
}

export function operatorHasValue(operator: ConditionOperator): boolean {
  return !["exists", "not_exists", "null", "empty", "not_empty"].includes(operator);
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
      return fieldType(type) === "number" || (fieldType(type) === "object" && fieldIsArray(type));
    case "like":
    case "starts_with":
    case "ends_with":
    case "match":
      return fieldType(type) === "text" && !fieldIsArray(type);
    case "contains":
    case "empty":
    case "not_empty":
      return fieldIsArray(type) && fieldType(type) !== "object";
    default:
      return false;
  }
}
