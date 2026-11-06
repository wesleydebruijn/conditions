import { aiInstructions, aiRequest, parseAiResponse } from "../src/ai";
import type { Schema } from "../src/types";

describe("ai", () => {
  const schema: Schema = {
    name: { label: "Name", type: "text" },
    address: {
      label: "Address",
      type: "object",
      schema: { city: { label: "City", type: "text" } },
    },
    items: {
      label: "Items",
      type: "object[]",
      schema: {
        price: { label: "Price", type: "number" },
        term: { label: "Term", type: "number", sum: false },
      },
    },
  };
  const conditionOperators = { eq: "is", gte: "is at least" };

  describe("aiInstructions", () => {
    it("lists the offered operators with their labels", () => {
      const instructions = aiInstructions({ conditionOperators });

      expect(instructions).toContain("- eq: is");
      expect(instructions).toContain("- gte: is at least");
      expect(instructions).not.toContain("- lte:");
    });

    it("describes schema fields, nested paths and aggregates", () => {
      const instructions = aiInstructions({ schema, conditionOperators });

      expect(instructions).toContain("- name (text): Name");
      expect(instructions).toContain("  - address.city (text): City");
      expect(instructions).toContain("Filter with items:count or items:price:sum;");
      expect(instructions).toContain("  - price (number): Price");
    });

    it("offers only the aggregates the schema allows", () => {
      const instructions = aiInstructions({
        schema: { ...schema, items: { ...schema.items, count: false } },
        conditionOperators,
      });

      expect(instructions).toContain("Filter with items:price:sum;");
      expect(instructions).not.toContain("items:count");
      expect(instructions).not.toContain("items:term:sum");
      expect(instructions).toContain("  - term (number): Term");
    });

    it("explains aggregates, distinct, intersects and mod", () => {
      const instructions = aiInstructions({ conditionOperators });

      expect(instructions).toContain('"<field>:count" counts the items');
      expect(instructions).toContain('"<field>:<number field>:sum" sums a number field');
      expect(instructions).toContain('"distinct"');
      expect(instructions).toContain('"intersects" takes an array');
      expect(instructions).toContain('"mod" takes [divisor, remainder]');
    });

    it("allows any field without a schema", () => {
      expect(aiInstructions({ conditionOperators })).toContain("Any field name");
    });
  });

  describe("aiRequest", () => {
    it("includes the current condition and the prompt in the message", () => {
      const condition = { name: { eq: "John" } };
      const request = aiRequest("also older than 18", condition, { conditionOperators });

      expect(request.prompt).toBe("also older than 18");
      expect(request.condition).toBe(condition);
      expect(request.message).toContain(JSON.stringify(condition, null, 2));
      expect(request.message).toContain("Request: also older than 18");
      expect(request.instructions).toBe(aiInstructions({ conditionOperators }));
    });
  });

  describe("parseAiResponse", () => {
    it("accepts a condition object", () => {
      expect(parseAiResponse({ age: { gte: 18 } }).children).toEqual([
        { type: "rule", key: "age", conditions: [{ operator: "gte", value: "18" }] },
      ]);
    });

    it("accepts a JSON string", () => {
      expect(parseAiResponse('{"or":[{"a":1},{"b":2}]}').operator).toBe("or");
    });

    it("rejects invalid JSON and non-objects", () => {
      expect(() => parseAiResponse("not json")).toThrow();
      expect(() => parseAiResponse("42")).toThrow("Expected a condition object");
      expect(() => parseAiResponse(null)).toThrow("Expected a condition object");
    });
  });
});
