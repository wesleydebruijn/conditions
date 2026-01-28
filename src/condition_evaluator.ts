type Condition =
  | { [key: string]: any }
  | Array<any>
  | undefined
  | null;

type RecordType = { [key: string]: any };
type Operator =
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

export class ConditionEvaluator {
  private conditions: Condition;

  constructor(conditions: Condition) {
    this.conditions = conditions;
  }

  match(record: RecordType, conditions: Condition = this.conditions): boolean {
    return this.evaluate(conditions, record);
  }

  filter(records: RecordType[], conditions: Condition = this.conditions): RecordType[] {
    return records.filter(record => this.match(record, conditions));
  }

  private evaluate(conditions: Condition, record: RecordType): boolean {
    if (Array.isArray(conditions)) {
      return this.evaluate_array(conditions, record);
    } else if (typeof conditions === 'object' && conditions !== null) {
      return this.evaluate_hash(conditions as { [key: string]: any }, record);
    } else {
      return false;
    }
  }

  private evaluate_hash(hash: { [key: string]: any }, record: RecordType): boolean {
    if (!hash || Object.keys(hash).length === 0) return true;

    if ('and' in hash) {
      return this.evaluate_and(hash['and'], record);
    } else if ('or' in hash) {
      return this.evaluate_or(hash['or'], record);
    } else {
      return this.evaluate_field_conditions(hash, record);
    }
  }

  private evaluate_array(array: any[], record: RecordType): boolean {
    return array.every(condition => this.evaluate(condition, record));
  }

  private evaluate_and(conditions: Condition, record: RecordType): boolean {
    if (Array.isArray(conditions)) {
      return conditions.every(condition => this.evaluate(condition, record));
    } else if (typeof conditions === 'object' && conditions !== null) {
      return this.evaluate(conditions as { [key: string]: any }, record);
    } else {
      return false;
    }
  }

  private evaluate_or(conditions: Condition, record: RecordType): boolean {
    if (Array.isArray(conditions)) {
      return conditions.some(condition => this.evaluate(condition, record));
    } else if (typeof conditions === 'object' && conditions !== null) {
      return this.evaluate(conditions as { [key: string]: any }, record);
    } else {
      return false;
    }
  }

  private evaluate_field_conditions(hash: { [key: string]: any }, record: RecordType): boolean {
    return Object.entries(hash).every(([field, expected_value]) => {
      const fieldKey = String(field);

      // Try both string and symbol-ish property (JS doesn't really use Symbol for keys as often)
      let actualValue =
        record[fieldKey] !== undefined
          ? record[fieldKey]
          : record[(fieldKey as any)];

      // Handle special aggregation fields like count & sum
      if (fieldKey.endsWith('_count') && typeof expected_value === 'object' && expected_value !== null && !Array.isArray(expected_value)) {
        return this.evaluate_count_condition(record, fieldKey, expected_value);
      } else if (fieldKey.endsWith('_sum') && typeof expected_value === 'object' && expected_value !== null && !Array.isArray(expected_value)) {
        return this.evaluate_sum_condition(record, fieldKey, expected_value);
      } else {
        return this.match_field_value(actualValue, expected_value);
      }
    });
  }

  private evaluate_count_condition(record: RecordType, countField: string, condition: { [key: string]: any }): boolean {
    // Extract base field name (e.g., 'items' from 'items_count')
    const baseField = countField.replace(/_count$/, '');
    let items: any[] = record[baseField] || [];

    // Apply 'where' filter if present
    let where_conditions = condition['where'];
    if (where_conditions !== undefined) {
      items = this.filter(items, where_conditions);
    }

    const count = Array.isArray(items) ? items.length : 0;

    // Check count conditions
    return Object.entries(condition).every(([op, value]) => {
      if (op === 'where') return true;
      return this.evaluate_operator(count, op as Operator, value);
    });
  }

  private evaluate_sum_condition(record: RecordType, sum_field: string, condition: { [key: string]: any }): boolean {
    // Extract base field name and sum field (e.g., 'orders_price_sum' -> 'orders' and 'price')
    const match = sum_field.match(/^(.+?)_(.+?)_sum$/);
    if (!match) return false;

    const baseField = match[1];
    const sumField = match[2];

    let items: any[] = record[baseField] || [];

    // Apply 'where' filter if present
    let where_conditions = condition['where'];
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
      if (op === 'where') return true;
      return this.evaluate_operator(sum_value, op as Operator, value);
    });
  }

  private match_field_value(actual: any, expected: any): boolean {
    if (typeof expected === 'object' && expected !== null && !Array.isArray(expected)) {
      return Object.entries(expected).every(([op, value]) => {
        return this.evaluate_operator(actual, op as Operator, value);
      });
    } else if (Array.isArray(expected)) {
      return expected.includes(actual);
    } else {
      return actual === expected;
    }
  }

  private evaluate_operator(actual: any, operator: Operator, expected: any): boolean {
    const op = String(operator);

    switch (op) {
      case 'eq':
      case '=':
        return actual === expected;
      case 'ne':
      case '!=':
        return actual !== expected;
      case 'gt':
      case '>':
        return actual != null && expected != null && actual > expected;
      case 'gte':
      case '>=':
        return actual != null && expected != null && actual >= expected;
      case 'lt':
      case '<':
        return actual != null && expected != null && actual < expected;
      case 'lte':
      case '<=':
        return actual != null && expected != null && actual <= expected;
      case 'in':
        return Array.isArray(expected) ? expected.includes(actual) : false;
      case 'nin':
      case 'not_in':
        return Array.isArray(expected) ? !expected.includes(actual) : false;
      case 'between':
        return (
          actual != null &&
          Array.isArray(expected) &&
          expected.length === 2 &&
          actual >= expected[0] &&
          actual <= expected[1]
        );
      case 'like':
        if (actual == null || expected == null) return false;
        let strPattern = String(expected).replace(/%/g, '');
        return String(actual).includes(strPattern);
      case 'exists':
        return actual != null;
      case 'not_exists':
      case 'null':
        return actual == null;
      case 'startswith':
      case 'starts_with':
        return actual != null && expected != null && String(actual).startsWith(String(expected));
      case 'endswith':
      case 'ends_with':
        return actual != null && expected != null && String(actual).endsWith(String(expected));
      case 'contains':
        return actual != null && expected != null && String(actual).includes(String(expected));
      case 'match':
      case 'regex':
        if (actual == null || expected == null) return false;
        try {
          return new RegExp(String(expected)).test(String(actual));
        } catch (e) {
          return false;
        }
      case 'empty':
        return actual == null || (typeof actual === 'string' && actual.length === 0) ||
          (Array.isArray(actual) && actual.length === 0) ||
          (typeof actual === 'object' && Object.keys(actual).length === 0);
      case 'not_empty':
        return actual != null && !(
          (typeof actual === 'string' && actual.length === 0) ||
          (Array.isArray(actual) && actual.length === 0) ||
          (typeof actual === 'object' && Object.keys(actual).length === 0)
        );
      default:
        return false;
    }
  }
}