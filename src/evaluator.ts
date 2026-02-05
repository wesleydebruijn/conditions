import type { Hash, ConditionHash, ConditionOperator } from "./types";

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
    if (Array.isArray(conditions)) {
      return this.evaluateArray(conditions, record);
    } else if (typeof conditions === "object" && conditions !== null) {
      return this.evaluateHash(conditions as { [key: string]: any }, record);
    } else {
      return false;
    }
  }

  private evaluateHash(hash: { [key: string]: any }, record: Hash): boolean {
    if (!hash || Object.keys(hash).length === 0) return true;

    if ("and" in hash) {
      return this.evaluateAnd(hash["and"], record);
    } else if ("or" in hash) {
      return this.evaluateOr(hash["or"], record);
    } else {
      return this.evaluateFieldConditions(hash, record);
    }
  }

  private evaluateArray(array: any[], record: Hash): boolean {
    return array.every((condition) => this.evaluate(condition, record));
  }

  private evaluateAnd(conditions: ConditionHash, record: Hash): boolean {
    if (Array.isArray(conditions)) {
      return conditions.every((condition) => this.evaluate(condition, record));
    } else if (typeof conditions === "object" && conditions !== null) {
      return this.evaluate(conditions as { [key: string]: any }, record);
    } else {
      return false;
    }
  }

  private evaluateOr(conditions: ConditionHash, record: Hash): boolean {
    if (Array.isArray(conditions)) {
      return conditions.some((condition) => this.evaluate(condition, record));
    } else if (typeof conditions === "object" && conditions !== null) {
      return this.evaluate(conditions as { [key: string]: any }, record);
    } else {
      return false;
    }
  }

  private evaluateFieldConditions(hash: { [key: string]: any }, record: Hash): boolean {
    return Object.entries(hash).every(([field, expected_value]) => {
      const fieldKey = String(field);

      const actualValue = fieldKey.split(".").reduce((acc, key) => acc && acc[key], record);

      // Handle special aggregation fields like count & sum
      if (
        fieldKey.endsWith("_count") &&
        typeof expected_value === "object" &&
        expected_value !== null &&
        !Array.isArray(expected_value)
      ) {
        return this.evaluateCountCondition(record, fieldKey, expected_value);
      } else if (
        fieldKey.endsWith("_sum") &&
        typeof expected_value === "object" &&
        expected_value !== null &&
        !Array.isArray(expected_value)
      ) {
        return this.evaluateSumCondition(record, fieldKey, expected_value);
      } else {
        return this.matchFieldValue(actualValue, expected_value);
      }
    });
  }

  private evaluateCountCondition(
    record: Hash,
    countField: string,
    condition: { [key: string]: any },
  ): boolean {
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

  private evaluateSumCondition(
    record: Hash,
    sum_field: string,
    condition: { [key: string]: any },
  ): boolean {
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
    if (typeof expected === "object" && expected !== null && !Array.isArray(expected)) {
      return Object.entries(expected).every(([op, value]) => {
        return this.evaluateOperator(actual, op as ConditionOperator, value);
      });
    } else if (Array.isArray(expected)) {
      return expected.includes(actual);
    } else {
      return actual === expected;
    }
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
        let strPattern = String(expected).replace(/%/g, "");
        return String(actual).includes(strPattern);
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
