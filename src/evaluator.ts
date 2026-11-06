import type { ConditionHash, Hash } from "./types";

const SUM_FIELD = /^([^:]+):([^:]+):sum$/;

export default class Evaluator {
  private conditions?: ConditionHash;

  constructor(conditions?: ConditionHash) {
    this.conditions = conditions;
  }

  match(record: Hash, conditions = this.conditions): boolean {
    return this.evaluate(conditions, record);
  }

  any(records: Hash[], conditions = this.conditions): boolean {
    return records.some((record) => this.match(record, conditions));
  }

  filter(records: Hash[], conditions = this.conditions): Hash[] {
    return records.filter((record) => this.match(record, conditions));
  }

  private evaluate(conditions: unknown, record: Hash): boolean {
    if (isHash(conditions)) return this.evaluateHash(conditions, record);
    if (Array.isArray(conditions))
      return conditions.every((condition) => this.evaluate(condition, record));

    return false;
  }

  private evaluateHash(hash: Hash, record: Hash): boolean {
    if (Object.keys(hash).length === 0) return true;
    if ("and" in hash) return this.evaluateAnd(hash.and, record);
    if ("or" in hash) return this.evaluateOr(hash.or, record);

    return this.evaluateFieldConditions(hash, record);
  }

  private evaluateAnd(conditions: unknown, record: Hash): boolean {
    if (Array.isArray(conditions))
      return conditions.every((condition) => this.evaluate(condition, record));
    if (isHash(conditions)) return this.evaluate(conditions, record);

    return false;
  }

  private evaluateOr(conditions: unknown, record: Hash): boolean {
    if (Array.isArray(conditions))
      return conditions.some((condition) => this.evaluate(condition, record));
    if (isHash(conditions)) return this.evaluate(conditions, record);

    return false;
  }

  private evaluateFieldConditions(hash: Hash, record: Hash): boolean {
    return Object.entries(hash).every(([field, expected]) => {
      if (field.endsWith(":count") && isHash(expected)) {
        return this.evaluateCountCondition(record, field, expected);
      }
      if (field.endsWith(":sum") && isHash(expected)) {
        return this.evaluateSumCondition(record, field, expected);
      }

      return matchFieldValue(lookup(record, field), expected);
    });
  }

  private evaluateCountCondition(record: Hash, countField: string, condition: Hash): boolean {
    const items = this.items(record, countField.slice(0, -":count".length), condition);
    const count = "distinct" in condition ? countDistinct(items, condition.distinct) : items.length;

    return Object.entries(condition).every(
      ([operator, value]) =>
        operator === "where" || operator === "distinct" || evaluateOperator(count, operator, value),
    );
  }

  private evaluateSumCondition(record: Hash, sumField: string, condition: Hash): boolean {
    const match = sumField.match(SUM_FIELD);
    if (!match) return false;

    const [, baseField, field] = match;
    const items = this.items(record, baseField, condition);
    const sum = items.reduce((total, item) => total + toNumber(lookup(item, field)), 0);

    return Object.entries(condition).every(
      ([operator, value]) => operator === "where" || evaluateOperator(sum, operator, value),
    );
  }

  private items(record: Hash, field: string, condition: Hash): Hash[] {
    const items = lookup(record, field);
    if (!Array.isArray(items)) return [];

    return "where" in condition ? this.filter(items, condition.where) : items;
  }
}

function countDistinct(items: Hash[], distinct: unknown): number {
  if (!isHash(distinct)) return 0;

  const matched = new Set<string>();

  for (const [field, selector] of Object.entries(distinct)) {
    if (selector !== true && !Array.isArray(selector)) continue;

    for (const item of items) {
      for (const value of toList(lookup(item, field))) {
        const included = selector === true ? value != null : includes(selector, value);
        if (included) matched.add(JSON.stringify([field, value]));
      }
    }
  }

  return matched.size;
}

function matchFieldValue(actual: unknown, expected: unknown): boolean {
  if (isHash(expected)) {
    return Object.entries(expected).every(([operator, value]) =>
      evaluateOperator(actual, operator, value),
    );
  }
  if (Array.isArray(expected)) return includes(expected, actual);

  return isEqual(actual, expected);
}

// biome-ignore lint/suspicious/noExplicitAny: values are compared the way Ruby compares them
function evaluateOperator(actual: any, operator: string, expected: any): boolean {
  switch (operator) {
    case "eq":
      return isEqual(actual, expected);
    case "ne":
      return !isEqual(actual, expected);
    case "gt":
      return present(actual) && present(expected) && actual > expected;
    case "gte":
      return present(actual) && present(expected) && actual >= expected;
    case "lt":
      return present(actual) && present(expected) && actual < expected;
    case "lte":
      return present(actual) && present(expected) && actual <= expected;
    case "in":
      return includes(toList(expected), actual);
    case "not_in":
      return !includes(toList(expected), actual);
    case "between":
      return (
        present(actual) &&
        Array.isArray(expected) &&
        expected.length === 2 &&
        actual >= expected[0] &&
        actual <= expected[1]
      );
    case "exists":
      return actual != null;
    case "not_exists":
      return actual == null;
    case "starts_with":
      return present(actual) && present(expected) && String(actual).startsWith(String(expected));
    case "ends_with":
      return present(actual) && present(expected) && String(actual).endsWith(String(expected));
    case "contains":
      return present(actual) && present(expected) && containsText(actual, String(expected));
    case "match":
      return present(actual) && present(expected) && matchesPattern(actual, expected);
    case "empty":
      return isEmpty(actual);
    case "not_empty":
      return !isEmpty(actual);
    case "intersects":
      return toList(actual).some((value) => includes(toList(expected), value));
    case "mod":
      return modulo(actual, expected);
    default:
      return false;
  }
}

function lookup(record: unknown, field: string): unknown {
  if (!isHash(record)) return undefined;
  if (field in record) return record[field];

  return field
    .split(".")
    .reduce<unknown>((value, key) => (isHash(value) ? value[key] : undefined), record);
}

function containsText(actual: unknown, expected: string): boolean {
  const values = Array.isArray(actual) ? actual : [actual];

  return values.some((value) => String(value).includes(expected));
}

function matchesPattern(actual: unknown, pattern: unknown): boolean {
  try {
    return new RegExp(String(pattern)).test(String(actual));
  } catch {
    return false;
  }
}

function modulo(actual: unknown, expected: unknown): boolean {
  if (!present(actual) || !Array.isArray(expected) || expected.length !== 2) return false;

  const divisor = toInteger(expected[0]);
  if (divisor === 0) return false;

  const remainder = toInteger(actual) % divisor;

  return (remainder + divisor) % divisor === toInteger(expected[1]);
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" || Array.isArray(value)) return value.length === 0;
  if (isHash(value)) return Object.keys(value).length === 0;

  return false;
}

function isEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => isEqual(value, b[index]));
  }
  if (isHash(a) && isHash(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => isEqual(a[key], b[key]));
  }

  return a === b || (a == null && b == null);
}

function includes(list: unknown[], value: unknown): boolean {
  return list.some((item) => isEqual(item, value));
}

function toList(value: unknown): unknown[] {
  if (value == null) return [];

  return Array.isArray(value) ? value : [value];
}

function toNumber(value: unknown): number {
  const number = Number.parseFloat(String(value ?? 0));

  return Number.isNaN(number) ? 0 : number;
}

function toInteger(value: unknown): number {
  const number = typeof value === "number" ? value : Number.parseInt(String(value), 10);

  return Number.isNaN(number) ? 0 : Math.trunc(number);
}

function present(value: unknown): boolean {
  return value != null && value !== false;
}

function isHash(value: unknown): value is Hash {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
