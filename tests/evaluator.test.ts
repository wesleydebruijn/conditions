import Evaluator from "../src/evaluator";
import type { Hash } from "../src/types";

const matches = (condition: Hash, record: Hash) => new Evaluator(condition).match(record);

describe("Evaluator", () => {
  describe("match", () => {
    it("returns true for empty conditions", () => {
      const evaluator = new Evaluator({});
      expect(evaluator.match({ name: "John" })).toBe(true);
    });

    it("matches simple equality", () => {
      const evaluator = new Evaluator({ name: "John" });
      expect(evaluator.match({ name: "John" })).toBe(true);
      expect(evaluator.match({ name: "Jane" })).toBe(false);
    });

    it("matches nested field with dot notation", () => {
      const evaluator = new Evaluator({ "address.city": "NYC" });
      expect(evaluator.match({ address: { city: "NYC" } })).toBe(true);
      expect(evaluator.match({ address: { city: "LA" } })).toBe(false);
    });

    it("prefers a literal key containing a dot", () => {
      expect(matches({ "address.city": "NYC" }, { "address.city": "NYC" })).toBe(true);
    });

    it("returns false for non-object/non-array conditions", () => {
      const evaluator = new Evaluator("invalid" as any);
      expect(evaluator.match({ name: "John" })).toBe(false);
    });

    it("takes conditions as an argument", () => {
      const evaluator = new Evaluator();
      expect(evaluator.match({ name: "John" }, { name: "John" })).toBe(true);
    });
  });

  describe("filter", () => {
    it("filters records based on conditions", () => {
      const evaluator = new Evaluator({ active: true });
      const records = [
        { id: 1, active: true },
        { id: 2, active: false },
        { id: 3, active: true },
      ];

      expect(evaluator.filter(records)).toEqual([
        { id: 1, active: true },
        { id: 3, active: true },
      ]);
    });
  });

  describe("any", () => {
    it("returns whether any record matches", () => {
      const evaluator = new Evaluator({ active: true });

      expect(evaluator.any([{ active: false }, { active: true }])).toBe(true);
      expect(evaluator.any([{ active: false }])).toBe(false);
      expect(evaluator.any([])).toBe(false);
    });
  });

  describe("and conditions", () => {
    it("matches when all conditions are true", () => {
      const evaluator = new Evaluator({
        and: [{ name: "John" }, { age: 30 }],
      });

      expect(evaluator.match({ name: "John", age: 30 })).toBe(true);
      expect(evaluator.match({ name: "John", age: 25 })).toBe(false);
    });

    it("handles non-array and value", () => {
      expect(matches({ and: { name: "John" } }, { name: "John" })).toBe(true);
    });

    it("returns false for invalid and value", () => {
      expect(matches({ and: "invalid" }, { name: "John" })).toBe(false);
    });
  });

  describe("or conditions", () => {
    it("matches when any condition is true", () => {
      const evaluator = new Evaluator({
        or: [{ name: "John" }, { name: "Jane" }],
      });

      expect(evaluator.match({ name: "John" })).toBe(true);
      expect(evaluator.match({ name: "Jane" })).toBe(true);
      expect(evaluator.match({ name: "Bob" })).toBe(false);
    });

    it("handles non-array or value", () => {
      expect(matches({ or: { name: "John" } }, { name: "John" })).toBe(true);
    });

    it("returns false for invalid or value", () => {
      expect(matches({ or: "invalid" }, { name: "John" })).toBe(false);
    });
  });

  describe("array conditions", () => {
    it("matches when all array elements match", () => {
      const evaluator = new Evaluator([{ name: "John" }, { age: { gt: 20 } }]);

      expect(evaluator.match({ name: "John", age: 30 })).toBe(true);
      expect(evaluator.match({ name: "John", age: 10 })).toBe(false);
    });
  });

  describe("array field matching", () => {
    it("matches when actual value is in expected array", () => {
      const evaluator = new Evaluator({ status: ["active", "pending"] });
      expect(evaluator.match({ status: "active" })).toBe(true);
      expect(evaluator.match({ status: "inactive" })).toBe(false);
    });
  });

  describe("operators", () => {
    it("eq compares values, including arrays and objects", () => {
      expect(matches({ age: { eq: 30 } }, { age: 30 })).toBe(true);
      expect(matches({ age: { eq: 30 } }, { age: 31 })).toBe(false);
      expect(matches({ tags: { eq: ["a", "b"] } }, { tags: ["a", "b"] })).toBe(true);
      expect(matches({ tags: { eq: ["a", "b"] } }, { tags: ["b", "a"] })).toBe(false);
    });

    it("ne", () => {
      expect(matches({ status: { ne: "archived" } }, { status: "active" })).toBe(true);
      expect(matches({ status: { ne: "archived" } }, { status: "archived" })).toBe(false);
    });

    it("gt, gte, lt and lte", () => {
      expect(matches({ age: { gt: 18 } }, { age: 19 })).toBe(true);
      expect(matches({ age: { gt: 18 } }, { age: 18 })).toBe(false);
      expect(matches({ age: { gte: 18 } }, { age: 18 })).toBe(true);
      expect(matches({ age: { lt: 18 } }, { age: 17 })).toBe(true);
      expect(matches({ age: { lt: 18 } }, { age: 18 })).toBe(false);
      expect(matches({ age: { lte: 18 } }, { age: 18 })).toBe(true);
    });

    it("comparisons are false without an actual value", () => {
      expect(matches({ age: { gt: 18 } }, {})).toBe(false);
      expect(matches({ age: { lte: 18 } }, { age: null })).toBe(false);
    });

    it("in and not_in wrap a single expected value in a list", () => {
      expect(matches({ role: { in: ["admin", "editor"] } }, { role: "admin" })).toBe(true);
      expect(matches({ role: { in: ["admin", "editor"] } }, { role: "viewer" })).toBe(false);
      expect(matches({ role: { in: "admin" } }, { role: "admin" })).toBe(true);
      expect(matches({ status: { not_in: ["deleted"] } }, { status: "active" })).toBe(true);
      expect(matches({ status: { not_in: ["deleted"] } }, { status: "deleted" })).toBe(false);
      expect(matches({ status: { not_in: "deleted" } }, { status: "active" })).toBe(true);
    });

    it("between", () => {
      expect(matches({ age: { between: [18, 65] } }, { age: 18 })).toBe(true);
      expect(matches({ age: { between: [18, 65] } }, { age: 66 })).toBe(false);
      expect(matches({ age: { between: [18] } }, { age: 20 })).toBe(false);
      expect(matches({ age: { between: [18, 65] } }, {})).toBe(false);
    });

    it("exists and not_exists", () => {
      expect(matches({ email: { exists: true } }, { email: "a@b.c" })).toBe(true);
      expect(matches({ email: { exists: true } }, {})).toBe(false);
      expect(matches({ deleted_at: { not_exists: true } }, { deleted_at: null })).toBe(true);
      expect(matches({ deleted_at: { not_exists: true } }, { deleted_at: "now" })).toBe(false);
    });

    it("starts_with and ends_with", () => {
      expect(matches({ name: { starts_with: "Jo" } }, { name: "John" })).toBe(true);
      expect(matches({ name: { starts_with: "Ja" } }, { name: "John" })).toBe(false);
      expect(matches({ email: { ends_with: ".com" } }, { email: "a@b.com" })).toBe(true);
      expect(matches({ email: { ends_with: ".com" } }, {})).toBe(false);
      expect(matches({ code: { starts_with: 12 } }, { code: 123 })).toBe(true);
    });

    it("contains matches text, and text inside list items", () => {
      expect(matches({ name: { contains: "oh" } }, { name: "John" })).toBe(true);
      expect(matches({ name: { contains: "x" } }, { name: "John" })).toBe(false);
      expect(matches({ tags: { contains: "featured" } }, { tags: ["new", "featured"] })).toBe(true);
      expect(matches({ tags: { contains: "old" } }, { tags: ["new", "featured"] })).toBe(false);
      expect(matches({ name: { contains: "x" } }, {})).toBe(false);
    });

    it("match tests a regular expression", () => {
      expect(matches({ code: { match: "^[A-Z]{3}" } }, { code: "ABC1" })).toBe(true);
      expect(matches({ code: { match: "^[A-Z]{3}" } }, { code: "ab" })).toBe(false);
      expect(matches({ code: { match: "[" } }, { code: "ABC" })).toBe(false);
      expect(matches({ code: { match: "A" } }, {})).toBe(false);
    });

    it("empty and not_empty", () => {
      for (const value of [null, undefined, "", [], {}]) {
        expect(matches({ notes: { empty: true } }, { notes: value })).toBe(true);
        expect(matches({ notes: { not_empty: true } }, { notes: value })).toBe(false);
      }

      for (const value of ["x", ["a"], { a: 1 }, 0]) {
        expect(matches({ notes: { empty: true } }, { notes: value })).toBe(false);
        expect(matches({ notes: { not_empty: true } }, { notes: value })).toBe(true);
      }
    });

    it("intersects matches when the lists share a value", () => {
      expect(matches({ tags: { intersects: ["a", "x"] } }, { tags: ["a", "b"] })).toBe(true);
      expect(matches({ tags: { intersects: ["x", "y"] } }, { tags: ["a", "b"] })).toBe(false);
      expect(matches({ tag: { intersects: ["a"] } }, { tag: "a" })).toBe(true);
      expect(matches({ tags: { intersects: "a" } }, { tags: ["a"] })).toBe(true);
      expect(matches({ tags: { intersects: ["a"] } }, {})).toBe(false);
    });

    it("mod matches a remainder after dividing", () => {
      expect(matches({ n: { mod: [3, 1] } }, { n: 7 })).toBe(true);
      expect(matches({ n: { mod: [3, 1] } }, { n: 6 })).toBe(false);
      expect(matches({ n: { mod: [3, 2] } }, { n: -7 })).toBe(true);
      expect(matches({ n: { mod: [2, 0] } }, { n: 4.9 })).toBe(true);
      expect(matches({ n: { mod: [0, 0] } }, { n: 4 })).toBe(false);
      expect(matches({ n: { mod: [3] } }, { n: 4 })).toBe(false);
      expect(matches({ n: { mod: [3, 0] } }, {})).toBe(false);
    });

    it.each(["=", "!=", ">", "nin", "like", "null", "startswith", "regex", "unknown"])(
      "returns false for the unsupported operator %s",
      (operator) => {
        expect(matches({ name: { [operator]: "John" } }, { name: "John" })).toBe(false);
      },
    );
  });

  describe("count conditions", () => {
    const orders = [
      { id: 1, status: "completed", tags: ["a", "b"] },
      { id: 2, status: "completed", tags: ["b"] },
      { id: 3, status: "pending", tags: [] },
    ];

    it("counts the items", () => {
      expect(matches({ "orders:count": { gte: 3 } }, { orders })).toBe(true);
      expect(matches({ "orders:count": { gte: 4 } }, { orders })).toBe(false);
    });

    it("counts only the items matching where", () => {
      const condition = { "orders:count": { eq: 2, where: { status: "completed" } } };
      expect(matches(condition, { orders })).toBe(true);
    });

    it("counts distinct values of a field", () => {
      expect(matches({ "orders:count": { eq: 2, distinct: { status: true } } }, { orders })).toBe(
        true,
      );
      expect(matches({ "orders:count": { eq: 2, distinct: { tags: true } } }, { orders })).toBe(
        true,
      );
    });

    it("counts only the listed distinct values", () => {
      const condition = { "orders:count": { eq: 1, distinct: { tags: ["a", "x"] } } };
      expect(matches(condition, { orders })).toBe(true);
    });

    it("counts distinct values across several fields", () => {
      const condition = { "orders:count": { eq: 4, distinct: { status: true, tags: true } } };
      expect(matches(condition, { orders })).toBe(true);
    });

    it("combines where and distinct", () => {
      const condition = {
        "orders:count": { eq: 1, where: { status: "completed" }, distinct: { status: true } },
      };
      expect(matches(condition, { orders })).toBe(true);
    });

    it("counts zero for an invalid distinct", () => {
      expect(matches({ "orders:count": { eq: 0, distinct: true } }, { orders })).toBe(true);
    });

    it("counts zero for a missing or non-list field", () => {
      expect(matches({ "orders:count": { eq: 0 } }, {})).toBe(true);
      expect(matches({ "orders:count": { eq: 0 } }, { orders: "not a list" })).toBe(true);
    });

    it("no longer treats _count as an aggregate", () => {
      expect(matches({ orders_count: { gte: 1 } }, { orders })).toBe(false);
    });
  });

  describe("sum conditions", () => {
    const orders = [
      { price: 80, status: "completed" },
      { price: "50.5", status: "completed" },
      { price: 100, status: "pending" },
      { status: "pending" },
    ];

    it("sums a number field of the items", () => {
      expect(matches({ "orders:price:sum": { eq: 230.5 } }, { orders })).toBe(true);
      expect(matches({ "orders:price:sum": { gt: 231 } }, { orders })).toBe(false);
    });

    it("sums only the items matching where", () => {
      const condition = { "orders:price:sum": { eq: 130.5, where: { status: "completed" } } };
      expect(matches(condition, { orders })).toBe(true);
    });

    it("sums zero for a missing field", () => {
      expect(matches({ "orders:price:sum": { eq: 0 } }, {})).toBe(true);
    });

    it("returns false for an invalid sum key", () => {
      expect(matches({ "price:sum": { gte: 0 } }, { orders })).toBe(false);
      expect(matches({ "a:b:c:sum": { gte: 0 } }, { orders })).toBe(false);
    });

    it("no longer treats _sum as an aggregate", () => {
      expect(matches({ orders_price_sum: { gte: 1 } }, { orders })).toBe(false);
    });
  });
});
