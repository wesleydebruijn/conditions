import {
  deserialize,
  deserializeConditions,
  deserializeGroup,
  isNumber,
  serialize,
  serializeGroup,
  serializeRule,
  serializeValue,
} from "../src/serializer";
import type { Condition, Group, Operator, Rule } from "../src/types";

const rule = (key: string, conditions: Condition[] = [], where?: Group): Rule => ({
  type: "rule",
  key,
  conditions,
  ...(where ? { where } : {}),
});

const group = (operator: Operator, ...children: Group["children"]): Group => ({
  type: "group",
  operator,
  children,
});

const eq = (value: string): Condition[] => [{ operator: "eq", value }];

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

describe("serializeRule", () => {
  it("serializes every condition as an operator key", () => {
    const value = serializeRule(
      rule("price", [
        { operator: "between", value: "1,10" },
        { operator: "in", value: "1,2,3" },
        { operator: "not_in", value: "a,b" },
        { operator: "exists", value: "true" },
        { operator: "eq", value: "true" },
        { operator: "ne", value: "42" },
      ]),
    );

    expect(value).toEqual({
      between: [1, 10],
      in: [1, 2, 3],
      not_in: ["a", "b"],
      exists: true,
      eq: true,
      ne: 42,
    });
  });

  it("serializes item filters as where", () => {
    const value = serializeRule(
      rule("items_count", [{ operator: "gte", value: "1" }], group("or", rule("a", eq("1")))),
    );

    expect(value).toEqual({ gte: 1, where: { a: { eq: 1 } } });
  });

  it("leaves out an empty where", () => {
    expect(serializeRule(rule("a", eq("1"), group("and")))).toEqual({ eq: 1 });
  });
});

describe("serializeGroup", () => {
  it("serializes an empty group as an empty object", () => {
    expect(serializeGroup(group("and"))).toEqual({});
    expect(serializeGroup(group("or"))).toEqual({});
  });

  it("serializes rules of an 'and' group as one object", () => {
    expect(serializeGroup(group("and", rule("a", eq("1")), rule("b", eq("2"))))).toEqual({
      a: { eq: 1 },
      b: { eq: 2 },
    });
  });

  it("serializes an 'or' group as a list", () => {
    expect(serializeGroup(group("or", rule("a", eq("1")), rule("b", eq("2"))))).toEqual({
      or: [{ a: { eq: 1 } }, { b: { eq: 2 } }],
    });
  });

  it("serializes a group with one child as that child", () => {
    expect(serializeGroup(group("or", rule("a", eq("1"))))).toEqual({ a: { eq: 1 } });
  });

  it("serializes inner groups at any depth", () => {
    const tree = group(
      "and",
      rule("a", eq("1")),
      group("or", rule("b", eq("2")), group("and", rule("c", eq("3")), rule("d", eq("4")))),
    );

    expect(serializeGroup(tree)).toEqual({
      and: [{ a: { eq: 1 } }, { or: [{ b: { eq: 2 } }, { c: { eq: 3 }, d: { eq: 4 } }] }],
    });
  });

  it("skips empty inner groups", () => {
    expect(serializeGroup(group("or", rule("a", eq("1")), group("and")))).toEqual({
      a: { eq: 1 },
    });
  });

  it("skips rules without a field and groups holding only those", () => {
    const tree = group("or", rule("a", eq("1")), rule("", eq("")), group("and", rule("", eq(""))));

    expect(serializeGroup(tree)).toEqual({ a: { eq: 1 } });
    expect(serializeRule(rule("items_count", eq("1"), group("and", rule(""))))).toEqual({
      eq: 1,
    });
  });

  it("merges conditions of rules that use the same field", () => {
    const tree = group(
      "and",
      rule("age", [{ operator: "gte", value: "18" }]),
      rule("name", eq("x")),
      rule("age", [{ operator: "lte", value: "65" }]),
    );

    expect(serializeGroup(tree)).toEqual({ age: { gte: 18, lte: 65 }, name: { eq: "x" } });
  });

  it("keeps same-field rules with item filters apart", () => {
    const countWhere = (type: string) =>
      rule("items_count", [{ operator: "gte", value: "1" }], group("and", rule("type", eq(type))));

    expect(serializeGroup(group("and", countWhere("proposition"), countWhere("product")))).toEqual({
      and: [
        { items_count: { gte: 1, where: { type: { eq: "proposition" } } } },
        { items_count: { gte: 1, where: { type: { eq: "product" } } } },
      ],
    });
  });

  it("keeps same-field rules with the same operator apart", () => {
    const tree = group(
      "and",
      rule("tags", [{ operator: "contains", value: "a" }]),
      rule("tags", [{ operator: "contains", value: "b" }]),
    );

    expect(serializeGroup(tree)).toEqual({
      and: [{ tags: { contains: "a" } }, { tags: { contains: "b" } }],
    });
  });
});

describe("deserializeConditions", () => {
  it("maps alias operators to canonical ones", () => {
    const conditions = deserializeConditions({
      "=": "value",
      "!=": "other",
      nin: [1, 2],
      startswith: "foo",
      endswith: "bar",
      regex: ".*baz.*",
      null: true,
    });

    expect(conditions).toEqual([
      { operator: "eq", value: "value" },
      { operator: "ne", value: "other" },
      { operator: "not_in", value: "1,2" },
      { operator: "starts_with", value: "foo" },
      { operator: "ends_with", value: "bar" },
      { operator: "match", value: ".*baz.*" },
      { operator: "not_exists", value: "true" },
    ]);
  });

  it("deserializes shorthand values as equality conditions", () => {
    expect(deserializeConditions("paid")).toEqual(eq("paid"));
    expect(deserializeConditions(30)).toEqual(eq("30"));
    expect(deserializeConditions(true)).toEqual(eq("true"));
  });

  it("deserializes shorthand arrays as 'in' conditions", () => {
    expect(deserializeConditions(["admin", "editor"])).toEqual([
      { operator: "in", value: "admin,editor" },
    ]);
  });

  it("ignores where", () => {
    expect(deserializeConditions({ gte: 1, where: { a: 1 } })).toEqual([
      { operator: "gte", value: "1" },
    ]);
  });
});

describe("deserializeGroup", () => {
  it("deserializes a plain object as an 'and' group of rules", () => {
    expect(deserializeGroup({ a: { eq: 1 }, b: { eq: 2 } })).toEqual(
      group("and", rule("a", eq("1")), rule("b", eq("2"))),
    );
  });

  it("deserializes an empty object or list as an empty group", () => {
    expect(deserializeGroup({})).toEqual(group("and"));
    expect(deserializeGroup([])).toEqual(group("and"));
  });

  it("deserializes a top-level list as an 'and' group", () => {
    expect(deserializeGroup([{ a: { eq: 1 } }, { b: { eq: 2 } }])).toEqual(
      group("and", rule("a", eq("1")), rule("b", eq("2"))),
    );
  });

  it("deserializes 'or' with single-field items as rules", () => {
    expect(deserializeGroup({ or: [{ a: { eq: 1 } }, { b: { eq: 2 } }] })).toEqual(
      group("or", rule("a", eq("1")), rule("b", eq("2"))),
    );
  });

  it("deserializes multi-field items inside 'or' as inner 'and' groups", () => {
    expect(deserializeGroup({ or: [{ a: { eq: 1 }, b: { eq: 2 } }, { c: { eq: 3 } }] })).toEqual(
      group("or", group("and", rule("a", eq("1")), rule("b", eq("2"))), rule("c", eq("3"))),
    );
  });

  it("flattens items of the same operator into the parent", () => {
    expect(deserializeGroup({ and: [{ a: { eq: 1 } }, { and: [{ b: { eq: 2 } }] }] })).toEqual(
      group("and", rule("a", eq("1")), rule("b", eq("2"))),
    );
  });

  it("deserializes nested groups at any depth", () => {
    const json = {
      and: [{ a: { eq: 1 } }, { or: [{ b: { eq: 2 } }, { c: { eq: 3 }, d: { eq: 4 } }] }],
    };

    expect(deserializeGroup(json)).toEqual(
      group(
        "and",
        rule("a", eq("1")),
        group("or", rule("b", eq("2")), group("and", rule("c", eq("3")), rule("d", eq("4")))),
      ),
    );
  });

  it("deserializes a non-array and/or value", () => {
    expect(deserializeGroup({ or: { a: { eq: 1 } } })).toEqual(group("or", rule("a", eq("1"))));
  });

  it("deserializes where as a group, as object or list", () => {
    const [object] = deserializeGroup({ x_count: { gte: 1, where: { a: { eq: 1 } } } }).children;
    const [list] = deserializeGroup({
      x_count: { where: [{ a: { eq: 1 } }, { b: { eq: 2 } }] },
    }).children;

    expect((object as Rule).where).toEqual(group("and", rule("a", eq("1"))));
    expect((list as Rule).where).toEqual(group("and", rule("a", eq("1")), rule("b", eq("2"))));
  });
});

describe("serialize / deserialize", () => {
  it.each([
    [{ a: { eq: "value" } }],
    [{ age: { gte: 18, lte: 65 }, name: { starts_with: "Jo" } }],
    [{ or: [{ a: { eq: 1 } }, { b: { eq: 2 }, c: { eq: 3 } }] }],
    [{ and: [{ a: { eq: 1 } }, { or: [{ b: { eq: 2 } }, { c: { eq: 3 }, d: { eq: 4 } }] }] }],
    [
      {
        and: [
          { items_count: { gte: 1, where: { type: { eq: "proposition" } } } },
          { items_count: { gte: 1, where: { or: [{ a: { eq: 1 } }, { b: { eq: 2 } }] } } },
        ],
      },
    ],
  ])("round-trips %j", (json) => {
    expect(JSON.parse(serialize(deserialize(JSON.stringify(json))))).toEqual(json);
  });
});
