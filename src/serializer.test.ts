import { deserialize, isNumber, serialize, serializeValue, serializeField } from "./serializer";
import type { Group, Field } from "./types";

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
});
