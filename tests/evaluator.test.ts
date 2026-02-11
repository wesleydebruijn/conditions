import Evaluator from "../src/evaluator";

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

    it("returns false for non-object/non-array conditions", () => {
      const evaluator = new Evaluator("invalid" as any);
      expect(evaluator.match({ name: "John" })).toBe(false);
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

  describe("and conditions", () => {
    it("matches when all conditions are true", () => {
      const evaluator = new Evaluator({
        and: [{ name: "John" }, { age: 30 }],
      });

      expect(evaluator.match({ name: "John", age: 30 })).toBe(true);
      expect(evaluator.match({ name: "John", age: 25 })).toBe(false);
    });

    it("handles non-array and value", () => {
      const evaluator = new Evaluator({
        and: { name: "John" },
      });

      expect(evaluator.match({ name: "John" })).toBe(true);
    });

    it("returns false for invalid and value", () => {
      const evaluator = new Evaluator({ and: "invalid" as any });
      expect(evaluator.match({ name: "John" })).toBe(false);
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
      const evaluator = new Evaluator({
        or: { name: "John" },
      });

      expect(evaluator.match({ name: "John" })).toBe(true);
    });

    it("returns false for invalid or value", () => {
      const evaluator = new Evaluator({ or: "invalid" as any });
      expect(evaluator.match({ name: "John" })).toBe(false);
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
    describe("eq / =", () => {
      it("matches equal values", () => {
        const evaluator = new Evaluator({ name: { eq: "John" } });
        expect(evaluator.match({ name: "John" })).toBe(true);
        expect(evaluator.match({ name: "Jane" })).toBe(false);
      });

      it("handles = alias", () => {
        const evaluator = new Evaluator({ name: { "=": "John" } });
        expect(evaluator.match({ name: "John" })).toBe(true);
      });
    });

    describe("ne / !=", () => {
      it("matches non-equal values", () => {
        const evaluator = new Evaluator({ name: { ne: "John" } });
        expect(evaluator.match({ name: "Jane" })).toBe(true);
        expect(evaluator.match({ name: "John" })).toBe(false);
      });

      it("handles != alias", () => {
        const evaluator = new Evaluator({ name: { "!=": "John" } });
        expect(evaluator.match({ name: "Jane" })).toBe(true);
      });
    });

    describe("gt / >", () => {
      it("matches greater values", () => {
        const evaluator = new Evaluator({ age: { gt: 20 } });
        expect(evaluator.match({ age: 30 })).toBe(true);
        expect(evaluator.match({ age: 20 })).toBe(false);
        expect(evaluator.match({ age: 10 })).toBe(false);
      });

      it("handles null values", () => {
        const evaluator = new Evaluator({ age: { gt: 20 } });
        expect(evaluator.match({ age: null })).toBe(false);
        expect(evaluator.match({})).toBe(false);
      });

      it("handles > alias", () => {
        const evaluator = new Evaluator({ age: { ">": 20 } });
        expect(evaluator.match({ age: 30 })).toBe(true);
      });
    });

    describe("gte / >=", () => {
      it("matches greater or equal values", () => {
        const evaluator = new Evaluator({ age: { gte: 20 } });
        expect(evaluator.match({ age: 30 })).toBe(true);
        expect(evaluator.match({ age: 20 })).toBe(true);
        expect(evaluator.match({ age: 10 })).toBe(false);
      });

      it("handles >= alias", () => {
        const evaluator = new Evaluator({ age: { ">=": 20 } });
        expect(evaluator.match({ age: 20 })).toBe(true);
      });
    });

    describe("lt / <", () => {
      it("matches lesser values", () => {
        const evaluator = new Evaluator({ age: { lt: 20 } });
        expect(evaluator.match({ age: 10 })).toBe(true);
        expect(evaluator.match({ age: 20 })).toBe(false);
        expect(evaluator.match({ age: 30 })).toBe(false);
      });

      it("handles < alias", () => {
        const evaluator = new Evaluator({ age: { "<": 20 } });
        expect(evaluator.match({ age: 10 })).toBe(true);
      });
    });

    describe("lte / <=", () => {
      it("matches lesser or equal values", () => {
        const evaluator = new Evaluator({ age: { lte: 20 } });
        expect(evaluator.match({ age: 10 })).toBe(true);
        expect(evaluator.match({ age: 20 })).toBe(true);
        expect(evaluator.match({ age: 30 })).toBe(false);
      });

      it("handles <= alias", () => {
        const evaluator = new Evaluator({ age: { "<=": 20 } });
        expect(evaluator.match({ age: 20 })).toBe(true);
      });
    });

    describe("in", () => {
      it("matches values in array", () => {
        const evaluator = new Evaluator({ status: { in: ["active", "pending"] } });
        expect(evaluator.match({ status: "active" })).toBe(true);
        expect(evaluator.match({ status: "pending" })).toBe(true);
        expect(evaluator.match({ status: "inactive" })).toBe(false);
      });

      it("returns false for non-array expected", () => {
        const evaluator = new Evaluator({ status: { in: "active" } });
        expect(evaluator.match({ status: "active" })).toBe(false);
      });
    });

    describe("nin / not_in", () => {
      it("matches values not in array", () => {
        const evaluator = new Evaluator({ status: { not_in: ["inactive", "deleted"] } });
        expect(evaluator.match({ status: "active" })).toBe(true);
        expect(evaluator.match({ status: "inactive" })).toBe(false);
      });

      it("handles nin alias", () => {
        const evaluator = new Evaluator({ status: { nin: ["inactive"] } });
        expect(evaluator.match({ status: "active" })).toBe(true);
      });

      it("returns false for non-array expected", () => {
        const evaluator = new Evaluator({ status: { not_in: "inactive" } });
        expect(evaluator.match({ status: "active" })).toBe(false);
      });
    });

    describe("between", () => {
      it("matches values in range", () => {
        const evaluator = new Evaluator({ age: { between: [18, 65] } });
        expect(evaluator.match({ age: 30 })).toBe(true);
        expect(evaluator.match({ age: 18 })).toBe(true);
        expect(evaluator.match({ age: 65 })).toBe(true);
        expect(evaluator.match({ age: 10 })).toBe(false);
        expect(evaluator.match({ age: 70 })).toBe(false);
      });

      it("returns false for invalid between array", () => {
        const evaluator = new Evaluator({ age: { between: [18] } });
        expect(evaluator.match({ age: 30 })).toBe(false);
      });

      it("returns false for null actual value", () => {
        const evaluator = new Evaluator({ age: { between: [18, 65] } });
        expect(evaluator.match({ age: null })).toBe(false);
      });
    });

    describe("like", () => {
      it("matches substring", () => {
        const evaluator = new Evaluator({ name: { like: "%ohn%" } });
        expect(evaluator.match({ name: "John Doe" })).toBe(true);
        expect(evaluator.match({ name: "Jane" })).toBe(false);
      });

      it("returns false for null values", () => {
        const evaluator = new Evaluator({ name: { like: "%test%" } });
        expect(evaluator.match({ name: null })).toBe(false);
        expect(evaluator.match({})).toBe(false);
      });
    });

    describe("exists", () => {
      it("matches non-null values", () => {
        const evaluator = new Evaluator({ name: { exists: true } });
        expect(evaluator.match({ name: "John" })).toBe(true);
        expect(evaluator.match({ name: "" })).toBe(true);
        expect(evaluator.match({ name: null })).toBe(false);
        expect(evaluator.match({})).toBe(false);
      });
    });

    describe("not_exists / null", () => {
      it("matches null/undefined values", () => {
        const evaluator = new Evaluator({ name: { not_exists: true } });
        expect(evaluator.match({ name: null })).toBe(true);
        expect(evaluator.match({})).toBe(true);
        expect(evaluator.match({ name: "John" })).toBe(false);
      });

      it("handles null alias", () => {
        const evaluator = new Evaluator({ name: { null: true } });
        expect(evaluator.match({})).toBe(true);
      });
    });

    describe("startswith / starts_with", () => {
      it("matches string prefix", () => {
        const evaluator = new Evaluator({ name: { starts_with: "John" } });
        expect(evaluator.match({ name: "John Doe" })).toBe(true);
        expect(evaluator.match({ name: "Jane Doe" })).toBe(false);
      });

      it("handles startswith alias", () => {
        const evaluator = new Evaluator({ name: { startswith: "John" } });
        expect(evaluator.match({ name: "John Doe" })).toBe(true);
      });

      it("returns false for null values", () => {
        const evaluator = new Evaluator({ name: { starts_with: "John" } });
        expect(evaluator.match({ name: null })).toBe(false);
      });
    });

    describe("endswith / ends_with", () => {
      it("matches string suffix", () => {
        const evaluator = new Evaluator({ name: { ends_with: "Doe" } });
        expect(evaluator.match({ name: "John Doe" })).toBe(true);
        expect(evaluator.match({ name: "John Smith" })).toBe(false);
      });

      it("handles endswith alias", () => {
        const evaluator = new Evaluator({ name: { endswith: "Doe" } });
        expect(evaluator.match({ name: "John Doe" })).toBe(true);
      });

      it("returns false for null values", () => {
        const evaluator = new Evaluator({ name: { ends_with: "Doe" } });
        expect(evaluator.match({ name: null })).toBe(false);
      });
    });

    describe("contains", () => {
      it("matches array containing value", () => {
        const evaluator = new Evaluator({ tags: { contains: "important" } });
        expect(evaluator.match({ tags: ["urgent", "important"] })).toBe(true);
        expect(evaluator.match({ tags: ["low", "normal"] })).toBe(false);
      });

      it("returns false for null values", () => {
        const evaluator = new Evaluator({ tags: { contains: "test" } });
        expect(evaluator.match({ tags: null })).toBe(false);
      });
    });

    describe("match / regex", () => {
      it("matches regex pattern", () => {
        const evaluator = new Evaluator({ email: { match: "^[a-z]+@" } });
        expect(evaluator.match({ email: "john@example.com" })).toBe(true);
        expect(evaluator.match({ email: "123@example.com" })).toBe(false);
      });

      it("handles regex alias", () => {
        const evaluator = new Evaluator({ email: { regex: "^[a-z]+@" } });
        expect(evaluator.match({ email: "john@example.com" })).toBe(true);
      });

      it("returns false for null values", () => {
        const evaluator = new Evaluator({ email: { match: "^test" } });
        expect(evaluator.match({ email: null })).toBe(false);
      });

      it("returns false for invalid regex", () => {
        const evaluator = new Evaluator({ email: { match: "[invalid" } });
        expect(evaluator.match({ email: "test@example.com" })).toBe(false);
      });
    });

    describe("empty", () => {
      it("matches empty values", () => {
        const evaluator = new Evaluator({ name: { empty: true } });
        expect(evaluator.match({ name: null })).toBe(true);
        expect(evaluator.match({ name: "" })).toBe(true);
        expect(evaluator.match({ name: [] })).toBe(true);
        expect(evaluator.match({ name: {} })).toBe(true);
        expect(evaluator.match({ name: "John" })).toBe(false);
        expect(evaluator.match({ name: ["a"] })).toBe(false);
      });
    });

    describe("not_empty", () => {
      it("matches non-empty values", () => {
        const evaluator = new Evaluator({ name: { not_empty: true } });
        expect(evaluator.match({ name: "John" })).toBe(true);
        expect(evaluator.match({ name: ["a"] })).toBe(true);
        expect(evaluator.match({ name: { a: 1 } })).toBe(true);
        expect(evaluator.match({ name: null })).toBe(false);
        expect(evaluator.match({ name: "" })).toBe(false);
        expect(evaluator.match({ name: [] })).toBe(false);
      });
    });

    describe("unknown operator", () => {
      it("returns false", () => {
        const evaluator = new Evaluator({ name: { unknown: "value" } });
        expect(evaluator.match({ name: "John" })).toBe(false);
      });
    });
  });

  describe("count conditions", () => {
    it("evaluates count condition", () => {
      const evaluator = new Evaluator({ orders_count: { gte: 2 } });

      expect(evaluator.match({ orders: [{ id: 1 }, { id: 2 }] })).toBe(true);
      expect(evaluator.match({ orders: [{ id: 1 }] })).toBe(false);
    });

    it("evaluates count with where filter", () => {
      const evaluator = new Evaluator({
        orders_count: { gte: 2, where: { status: "completed" } },
      });

      expect(
        evaluator.match({
          orders: [
            { id: 1, status: "completed" },
            { id: 2, status: "completed" },
            { id: 3, status: "pending" },
          ],
        }),
      ).toBe(true);

      expect(
        evaluator.match({
          orders: [
            { id: 1, status: "completed" },
            { id: 2, status: "pending" },
          ],
        }),
      ).toBe(false);
    });

    it("handles missing array field", () => {
      const evaluator = new Evaluator({ orders_count: { eq: 0 } });
      expect(evaluator.match({})).toBe(true);
    });

    it("handles non-array field value", () => {
      const evaluator = new Evaluator({ orders_count: { eq: 0 } });
      expect(evaluator.match({ orders: "not an array" })).toBe(true);
    });
  });

  describe("sum conditions", () => {
    it("evaluates sum condition", () => {
      const evaluator = new Evaluator({ orders_price_sum: { gte: 100 } });

      expect(
        evaluator.match({
          orders: [{ price: 50 }, { price: 60 }],
        }),
      ).toBe(true);

      expect(
        evaluator.match({
          orders: [{ price: 30 }, { price: 40 }],
        }),
      ).toBe(false);
    });

    it("evaluates sum with where filter", () => {
      const evaluator = new Evaluator({
        orders_price_sum: { gte: 100, where: { status: "completed" } },
      });

      expect(
        evaluator.match({
          orders: [
            { price: 80, status: "completed" },
            { price: 50, status: "completed" },
            { price: 100, status: "pending" },
          ],
        }),
      ).toBe(true);

      expect(
        evaluator.match({
          orders: [
            { price: 30, status: "completed" },
            { price: 40, status: "completed" },
            { price: 100, status: "pending" },
          ],
        }),
      ).toBe(false);
    });

    it("returns false for invalid sum field pattern", () => {
      const evaluator = new Evaluator({ invalid_sum: { gte: 100 } });
      expect(evaluator.match({ orders: [{ price: 200 }] })).toBe(false);
    });

    it("handles missing price field", () => {
      const evaluator = new Evaluator({ orders_price_sum: { eq: 50 } });
      expect(
        evaluator.match({
          orders: [{ price: 50 }, { name: "no price" }],
        }),
      ).toBe(true);
    });

    it("handles missing base field for sum", () => {
      const evaluator = new Evaluator({ orders_price_sum: { eq: 0 } });
      expect(evaluator.match({})).toBe(true);
    });
  });
});
