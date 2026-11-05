import {
  deserialize,
  deserializeGroup,
  isNumber,
  serialize,
  serializeField,
  serializeGroup,
  serializeValue,
} from "../src/serializer";
import type { Field, Group } from "../src/types";

describe("isNumber", () => {
  it("returns true for numeric strings", () => {
    expect(isNumber("0")).toBe(true);
    expect(isNumber("42")).toBe(true);
    expect(isNumber(" 3.14 ")).toBe(true);
  });

  it("returns false for non‑numeric or empty strings", () => {
    expect(isNumber("")).toBe(false);
    expect(isNumber("   ")).toBe(false);
    expect(isNumber("12a")).toBe(false);
    expect(isNumber("abc")).toBe(false);
  });
});

describe("serialize / deserialize", () => {
  it("deserializes array of groups", () => {
    const json = JSON.stringify([{ fieldKey: { eq: "value" } }, { fieldKey2: { gt: 5 } }]);

    const deserialized = deserialize(json);
    expect(deserialized).toHaveLength(2);
    expect(deserialized[0].fieldSets[0].fields[0].key).toBe("fieldKey");
    expect(deserialized[1].fieldSets[0].fields[0].key).toBe("fieldKey2");
  });

  it("serializes multiple groups as array", () => {
    const groups: Group[] = [
      {
        operator: "and",
        fieldSets: [{ fields: [{ key: "a", conditions: [{ operator: "eq", value: "1" }] }] }],
      },
      {
        operator: "or",
        fieldSets: [{ fields: [{ key: "b", conditions: [{ operator: "eq", value: "2" }] }] }],
      },
    ];

    const serialized = serialize(groups);
    expect(JSON.parse(serialized)).toEqual([{ a: { eq: 1 } }, { b: { eq: 2 } }]);
  });

  it("round‑trips a simple group with one field and one condition", () => {
    const groups: Group[] = [
      {
        operator: "and",
        fieldSets: [
          {
            fields: [
              {
                key: "fieldKey",
                conditions: [{ operator: "eq", value: "value" }],
              },
            ],
          },
        ],
      },
    ];

    const serialized = serialize(groups);
    expect(JSON.parse(serialized)).toEqual({
      fieldKey: {
        eq: "value",
      },
    });

    const deserialized = deserialize(serialized);
    expect(deserialized).toEqual(groups);
  });

  it("deserializes array where conditions", () => {
    const json = JSON.stringify({
      fieldKey: {
        eq: "value",
        where: [{ a: { gt: 1 } }, { b: { lt: 5 } }],
      },
    });

    const deserialized = deserialize(json);
    const field = deserialized[0].fieldSets[0].fields[0];
    expect(field.where).toHaveLength(2);
    expect(field.where![0].fieldSets[0].fields[0].key).toBe("a");
    expect(field.where![1].fieldSets[0].fields[0].key).toBe("b");
  });

  it("serializes and deserializes where (nested filter) as single object", () => {
    const nested: Group = {
      operator: "or",
      fieldSets: [
        {
          fields: [
            {
              key: "nestedField",
              conditions: [{ operator: "gt", value: "5" }],
            },
          ],
        },
        {
          fields: [
            {
              key: "nestedField2",
              conditions: [{ operator: "lt", value: "10" }],
            },
          ],
        },
      ],
    };

    const groups: Group[] = [
      {
        operator: "and",
        fieldSets: [
          {
            fields: [
              {
                key: "fieldKey",
                conditions: [{ operator: "eq", value: "value" }],
                where: [nested],
              },
            ],
          },
        ],
      },
    ];

    const serialized = serialize(groups);
    expect(JSON.parse(serialized)).toEqual({
      fieldKey: {
        eq: "value",
        where: {
          or: [
            {
              nestedField: {
                gt: 5,
              },
            },
            {
              nestedField2: {
                lt: 10,
              },
            },
          ],
        },
      },
    });

    const deserialized = deserialize(serialized);
    expect(deserialized).toEqual(groups);
  });

  it("serializes between, in, not_in, and boolean/number values correctly", () => {
    const groups: Group[] = [
      {
        operator: "and",
        fieldSets: [
          {
            fields: [
              {
                key: "price",
                conditions: [
                  { operator: "between", value: "1,10" },
                  { operator: "in", value: "1,2,3" },
                  { operator: "not_in", value: "a,b" },
                  { operator: "exists", value: "true" },
                  { operator: "empty", value: "true" },
                  { operator: "eq", value: "true" },
                  { operator: "ne", value: "42" },
                ],
              },
            ],
          },
        ],
      },
    ];

    const serialized = serialize(groups);
    expect(JSON.parse(serialized)).toEqual({
      price: {
        between: [1, 10],
        in: [1, 2, 3],
        not_in: ["a", "b"],
        exists: true,
        empty: true,
        eq: true,
        ne: 42,
      },
    });

    const deserialized = deserialize(serialized);
    expect(deserialized).toEqual(groups);
  });

  it("maps alias operators to canonical ones on deserialize", () => {
    const json = JSON.stringify({
      fieldKey: {
        "=": "value",
        "!=": "other",
        nin: [1, 2],
        startswith: "foo",
        endswith: "bar",
        regex: ".*baz.*",
        null: true,
      },
    });

    const deserialized = deserialize(json);
    expect(deserialized).toEqual([
      {
        operator: "and",
        fieldSets: [
          {
            fields: [
              {
                key: "fieldKey",
                conditions: [
                  { operator: "eq", value: "value" },
                  { operator: "ne", value: "other" },
                  { operator: "not_in", value: "1,2" },
                  { operator: "starts_with", value: "foo" },
                  { operator: "ends_with", value: "bar" },
                  { operator: "match", value: ".*baz.*" },
                  { operator: "not_exists", value: "true" },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });
});

describe("serializeValue", () => {
  it("serializes non-value operators correctly", () => {
    expect(serializeValue("exists", "")).toBe(true);
    expect(serializeValue("not_exists", "")).toBe(true);
    expect(serializeValue("null", "")).toBe(true);
    expect(serializeValue("empty", "")).toBe(true);
    expect(serializeValue("not_empty", "")).toBe(true);
  });

  it("serializes between operator correctly", () => {
    expect(serializeValue("between", "1,10")).toEqual([1, 10]);
  });

  it("serializes in operator correctly", () => {
    expect(serializeValue("in", "1,2,3")).toEqual([1, 2, 3]);
    expect(serializeValue("in", "phone,accessory,other")).toEqual(["phone", "accessory", "other"]);
  });

  it("serializes not_in operator correctly", () => {
    expect(serializeValue("not_in", "1,2,3")).toEqual([1, 2, 3]);
    expect(serializeValue("not_in", "phone,accessory,other")).toEqual([
      "phone",
      "accessory",
      "other",
    ]);
  });

  it("trims whitespace around list values", () => {
    expect(serializeValue("in", "red, green , blue")).toEqual(["red", "green", "blue"]);
    expect(serializeValue("between", "18, 65")).toEqual([18, 65]);
  });

  it("serializes boolean values correctly", () => {
    expect(serializeValue("eq", "true")).toBe(true);
    expect(serializeValue("eq", "false")).toBe(false);
  });

  it("serializes number values correctly", () => {
    expect(serializeValue("eq", "1")).toBe(1);
    expect(serializeValue("eq", "1.5")).toBe(1.5);
  });

  it("serializes string values correctly", () => {
    expect(serializeValue("eq", "hello")).toBe("hello");
  });
});

describe("serializeField", () => {
  it("serializes field with conditions correctly", () => {
    const field: Field = {
      key: "fieldKey",
      conditions: [
        { operator: "gt", value: "1" },
        { operator: "lt", value: "5" },
      ],
    };

    const expected = { gt: 1, lt: 5 };

    expect(serializeField(field)).toEqual(expected);
  });

  it("serializes field with where conditions correctly", () => {
    const field: Field = {
      key: "fieldKey",
      conditions: [{ operator: "eq", value: "value" }],
      where: [
        {
          operator: "and",
          fieldSets: [
            { fields: [{ key: "nestedField", conditions: [{ operator: "eq", value: "value" }] }] },
          ],
        },
      ],
    };

    const expected = { eq: "value", where: { nestedField: { eq: "value" } } };

    expect(serializeField(field)).toEqual(expected);
  });

  it("serializes field with multiple where groups as array", () => {
    const field: Field = {
      key: "fieldKey",
      conditions: [],
      where: [
        {
          operator: "and",
          fieldSets: [{ fields: [{ key: "a", conditions: [{ operator: "eq", value: "1" }] }] }],
        },
        {
          operator: "or",
          fieldSets: [{ fields: [{ key: "b", conditions: [{ operator: "gt", value: "2" }] }] }],
        },
      ],
    };

    const result = serializeField(field);
    expect(result.where).toEqual([{ a: { eq: 1 } }, { b: { gt: 2 } }]);
  });

  it("serializes field with empty where array", () => {
    const field: Field = {
      key: "fieldKey",
      conditions: [{ operator: "eq", value: "value" }],
      where: [],
    };

    const result = serializeField(field);
    expect(result).toEqual({ eq: "value" });
    expect(result.where).toBeUndefined();
  });
});

describe("serializeGroup", () => {
  it("serializes group with multiple fieldsets correctly", () => {
    const group: Group = {
      operator: "and",
      fieldSets: [
        { fields: [{ key: "fieldKey", conditions: [{ operator: "eq", value: "value" }] }] },
        { fields: [{ key: "fieldKey2", conditions: [{ operator: "eq", value: "value2" }] }] },
      ],
    };

    const expected = { and: [{ fieldKey: { eq: "value" } }, { fieldKey2: { eq: "value2" } }] };
    expect(serializeGroup(group)).toEqual(expected);
  });

  it("merges conditions of rules that use the same field", () => {
    const group: Group = {
      operator: "and",
      fieldSets: [
        {
          fields: [
            { key: "age", conditions: [{ operator: "gte", value: "18" }] },
            { key: "name", conditions: [{ operator: "eq", value: "x" }] },
            { key: "age", conditions: [{ operator: "lte", value: "65" }] },
          ],
        },
      ],
    };

    expect(serializeGroup(group)).toEqual({ age: { gte: 18, lte: 65 }, name: { eq: "x" } });
  });

  const countWhere = (type: string): Field => ({
    key: "items_count",
    conditions: [{ operator: "gte", value: "1" }],
    where: [
      {
        operator: "and",
        fieldSets: [{ fields: [{ key: "type", conditions: [{ operator: "eq", value: type }] }] }],
      },
    ],
  });

  it("keeps same-field rules with item filters apart", () => {
    const group: Group = {
      operator: "and",
      fieldSets: [{ fields: [countWhere("proposition"), countWhere("product")] }],
    };

    expect(serializeGroup(group)).toEqual({
      and: [
        { items_count: { gte: 1, where: { type: { eq: "proposition" } } } },
        { items_count: { gte: 1, where: { type: { eq: "product" } } } },
      ],
    });
  });

  it("keeps same-field rules with the same operator apart", () => {
    const group: Group = {
      operator: "and",
      fieldSets: [
        {
          fields: [
            { key: "tags", conditions: [{ operator: "contains", value: "a" }] },
            { key: "tags", conditions: [{ operator: "contains", value: "b" }] },
          ],
        },
      ],
    };

    expect(serializeGroup(group)).toEqual({
      and: [{ tags: { contains: "a" } }, { tags: { contains: "b" } }],
    });
  });

  it("nests split rule sets inside an 'or'", () => {
    const group: Group = {
      operator: "or",
      fieldSets: [
        { fields: [countWhere("proposition"), countWhere("product")] },
        { fields: [{ key: "a", conditions: [{ operator: "eq", value: "1" }] }] },
      ],
    };

    expect(serializeGroup(group)).toEqual({
      or: [
        {
          and: [
            { items_count: { gte: 1, where: { type: { eq: "proposition" } } } },
            { items_count: { gte: 1, where: { type: { eq: "product" } } } },
          ],
        },
        { a: { eq: 1 } },
      ],
    });
  });
});

describe("deserializeGroup", () => {
  it("deserializes group with multiple fieldsets correctly", () => {
    const json = {
      and: [{ fieldKey: { eq: "value" } }, { fieldKey2: { eq: "value2" } }],
    };

    const expected = {
      operator: "and",
      fieldSets: [
        {
          fields: [
            { key: "fieldKey", conditions: [{ operator: "eq", value: "value" }], where: undefined },
          ],
        },
        {
          fields: [
            {
              key: "fieldKey2",
              conditions: [{ operator: "eq", value: "value2" }],
              where: undefined,
            },
          ],
        },
      ],
    };

    expect(deserializeGroup(json)).toEqual(expected);
  });

  it("deserializes group with 'or' operator correctly", () => {
    const json = {
      or: [{ a: { gt: 1 } }, { b: { lt: 5 } }],
    };

    const result = deserializeGroup(json);
    expect(result.operator).toBe("or");
    expect(result.fieldSets).toHaveLength(2);
  });

  it("deserializes shorthand values as equality conditions", () => {
    const json = { status: "paid", age: 30, active: true };

    const [status, age, active] = deserializeGroup(json).fieldSets[0].fields;
    expect(status.conditions).toEqual([{ operator: "eq", value: "paid" }]);
    expect(age.conditions).toEqual([{ operator: "eq", value: "30" }]);
    expect(active.conditions).toEqual([{ operator: "eq", value: "true" }]);
  });

  it("deserializes shorthand arrays as 'in' conditions", () => {
    const json = { role: ["admin", "editor"] };

    const [role] = deserializeGroup(json).fieldSets[0].fields;
    expect(role.conditions).toEqual([{ operator: "in", value: "admin,editor" }]);
  });

  it("deserializes simple object as 'and' group", () => {
    const json = { fieldKey: { eq: "value" } };

    const result = deserializeGroup(json);
    expect(result.operator).toBe("and");
    expect(result.fieldSets).toHaveLength(1);
  });

  it("deserializes non-array and/or value as single fieldset", () => {
    const json = { and: { fieldKey: { eq: "value" } } };

    const result = deserializeGroup(json);
    expect(result.operator).toBe("and");
    expect(result.fieldSets).toHaveLength(1);
  });

  it("deserializes an 'and' inside an 'or' as one rule set", () => {
    const json = { or: [{ and: [{ a: { eq: 1 } }, { a: { eq: 2 } }] }, { b: { eq: 3 } }] };

    const [combined, single] = deserializeGroup(json).fieldSets;
    expect(combined.fields.map((field) => field.key)).toEqual(["a", "a"]);
    expect(single.fields.map((field) => field.key)).toEqual(["b"]);
  });

  it("round-trips split rule sets", () => {
    const json = {
      or: [
        {
          and: [
            { items_count: { gte: 1, where: { type: { eq: "proposition" } } } },
            { items_count: { gte: 1, where: { type: { eq: "product" } } } },
          ],
        },
        { a: { eq: 1 } },
      ],
    };

    expect(JSON.parse(serialize(deserialize(JSON.stringify(json))))).toEqual(json);
  });
});
