import type { Hash, ConditionHash, ConditionOperator } from "./types";

function isObject(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default class Evaluator {
  private conditions: ConditionHash;

  constructor(conditions: ConditionHash) {
    this.conditions = conditions;
  }

  match(record: Hash, conditions: ConditionHash = this.conditions): boolean {
    return this.evaluate(conditions, record);
  }

  filter(records: Hash[], conditions: ConditionHash = this.conditions): Hash[] {
    return records.filter((record) => this.match(record, conditions));
  }

  private evaluate(conditions: ConditionHash, record: Hash): boolean {
    if (Array.isArray(conditions)) return this.evaluateArray(conditions, record);
    if (isObject(conditions)) return this.evaluateHash(conditions, record);

    return false;
  }

  private evaluateHash(hash: Hash, record: Hash): boolean {
    if (!hash || Object.keys(hash).length === 0) return true;

    if ("and" in hash) return this.evaluateAnd(hash.and, record);
    if ("or" in hash) return this.evaluateOr(hash.or, record);

    return this.evaluateFieldConditions(hash, record);
  }

  private evaluateArray(array: Hash[], record: Hash): boolean {
    return array.every((cond) => this.evaluate(cond, record));
  }

  private evaluateAnd(conditions: ConditionHash, record: Hash): boolean {
    if (Array.isArray(conditions)) return conditions.every((cond) => this.evaluate(cond, record));
    if (isObject(conditions)) return this.evaluate(conditions, record);

    return false;
  }

  private evaluateOr(conditions: ConditionHash, record: Hash): boolean {
    if (Array.isArray(conditions)) return conditions.some((cond) => this.evaluate(cond, record));
    if (isObject(conditions)) return this.evaluate(conditions, record);

    return false;
  }

  private evaluateFieldConditions(hash: Hash, record: Hash): boolean {
    return Object.entries(hash).every(([field, expectedValue]) => {
      const fieldKey = String(field);

      const actualValue = fieldKey.split(".").reduce((acc, key) => acc?.[key], record);

      // Handle special aggregation fields like count & sum
      const hasCount = fieldKey.endsWith("_count") && isObject(expectedValue);
      if (hasCount) return this.evaluateCountCondition(record, fieldKey, expectedValue);

      const hasSum = fieldKey.endsWith("_sum") && isObject(expectedValue);
      if (hasSum) return this.evaluateSumCondition(record, fieldKey, expectedValue);

      return this.matchFieldValue(actualValue, expectedValue);
    });
  }

  private evaluateCountCondition(record: Hash, countField: string, condition: Hash): boolean {
    // Extract base field name (e.g., 'items' from 'items_count')
    const baseField = countField.replace(/_count$/, "");
    let items: any[] = record[baseField] || [];

    // Apply 'where' filter if present
    let where_conditions = condition["where"];
    if (where_conditions !== undefined) {
      items = this.filter(items, where_conditions);
    }

    const count = Array.isArray(items) ? items.length : 0;

    // Check count conditions
    return Object.entries(condition).every(([op, value]) => {
      if (op === "where") return true;
      return this.evaluateOperator(count, op as ConditionOperator, value);
    });
  }

  private evaluateSumCondition(record: Hash, sum_field: string, condition: Hash): boolean {
    // Extract base field name and sum field (e.g., 'orders_price_sum' -> 'orders' and 'price')
    const match = sum_field.match(/^(.+?)_(.+?)_sum$/);
    if (!match) return false;

    const baseField = match[1];
    const sumField = match[2];

    let items: any[] = record[baseField] || [];

    // Apply 'where' filter if present
    let where_conditions = condition["where"];
    if (where_conditions !== undefined) {
      items = this.filter(items, where_conditions);
    }

    // Calculate sum of the specified field
    const sum_value: number = items.reduce((sum, item) => {
      let fieldValue = item[sumField];
      if (fieldValue === undefined) fieldValue = item[sumField as any];
      let f = parseFloat(fieldValue) || 0;
      return sum + f;
    }, 0);

    // Check sum conditions
    return Object.entries(condition).every(([op, value]) => {
      if (op === "where") return true;
      return this.evaluateOperator(sum_value, op as ConditionOperator, value);
    });
  }

  private matchFieldValue(actual: any, expected: any): boolean {
    if (Array.isArray(expected)) return expected.includes(actual);

    if (isObject(expected)) {
      return Object.entries(expected).every(([op, value]) => {
        return this.evaluateOperator(actual, op as ConditionOperator, value);
      });
    }

    return actual === expected;
  }

  private evaluateOperator(actual: any, operator: ConditionOperator, expected: any): boolean {
    const op = String(operator);

    switch (op) {
      case "eq":
      case "=":
        return actual === expected;
      case "ne":
      case "!=":
        return actual !== expected;
      case "gt":
      case ">":
        return actual != null && expected != null && actual > expected;
      case "gte":
      case ">=":
        return actual != null && expected != null && actual >= expected;
      case "lt":
      case "<":
        return actual != null && expected != null && actual < expected;
      case "lte":
      case "<=":
        return actual != null && expected != null && actual <= expected;
      case "in":
        return Array.isArray(expected) ? expected.includes(actual) : false;
      case "nin":
      case "not_in":
        return Array.isArray(expected) ? !expected.includes(actual) : false;
      case "between":
        return (
          actual != null &&
          Array.isArray(expected) &&
          expected.length === 2 &&
          actual >= expected[0] &&
          actual <= expected[1]
        );
      case "like":
        if (actual == null || expected == null) return false;
        return String(actual).includes(String(expected).replace(/%/g, ""));
      case "exists":
        return actual != null;
      case "not_exists":
      case "null":
        return actual == null;
      case "startswith":
      case "starts_with":
        return actual != null && expected != null && String(actual).startsWith(String(expected));
      case "endswith":
      case "ends_with":
        return actual != null && expected != null && String(actual).endsWith(String(expected));
      case "contains":
        return actual != null && expected != null && actual.includes(String(expected));
      case "match":
      case "regex":
        if (actual == null || expected == null) return false;
        try {
          return new RegExp(String(expected)).test(String(actual));
        } catch (e) {
          return false;
        }
      case "empty":
        return (
          actual == null ||
          (typeof actual === "string" && actual.length === 0) ||
          (Array.isArray(actual) && actual.length === 0) ||
          (typeof actual === "object" && Object.keys(actual).length === 0)
        );
      case "not_empty":
        return (
          actual != null &&
          !(
            (typeof actual === "string" && actual.length === 0) ||
            (Array.isArray(actual) && actual.length === 0) ||
            (typeof actual === "object" && Object.keys(actual).length === 0)
          )
        );
      default:
        return false;
    }
  }
}
