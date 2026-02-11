import {
  fieldList,
  fieldSchemaItem,
  fieldKey,
  fieldType,
  fieldIsArray,
  operatorHasValue,
  fieldOperatorValid,
} from "../src/schema";
import type { Schema } from "../src/types";

describe("fieldKey", () => {
  it("returns empty string for null/undefined", () => {
    expect(fieldKey(null)).toBe("");
    expect(fieldKey(undefined)).toBe("");
  });

  it("removes _count suffix", () => {
    expect(fieldKey("orders_count")).toBe("orders");
  });

  it("removes _sum suffix with field name", () => {
    expect(fieldKey("orders_price_sum")).toBe("orders");
  });

  it("returns key unchanged if no suffix", () => {
    expect(fieldKey("name")).toBe("name");
  });
});

describe("fieldType", () => {
  it("returns empty string for null/undefined", () => {
    expect(fieldType(null)).toBe("");
    expect(fieldType(undefined)).toBe("");
  });

  it("removes array brackets", () => {
    expect(fieldType("text[]")).toBe("text");
    expect(fieldType("number[]")).toBe("number");
    expect(fieldType("object[]")).toBe("object");
  });

  it("returns type unchanged if not array", () => {
    expect(fieldType("text")).toBe("text");
    expect(fieldType("number")).toBe("number");
  });
});

describe("fieldIsArray", () => {
  it("returns true for array types", () => {
    expect(fieldIsArray("text[]")).toBe(true);
    expect(fieldIsArray("number[]")).toBe(true);
    expect(fieldIsArray("object[]")).toBe(true);
  });

  it("returns false for non-array types", () => {
    expect(fieldIsArray("text")).toBe(false);
    expect(fieldIsArray("number")).toBe(false);
    expect(fieldIsArray("object")).toBe(false);
  });
});

describe("operatorHasValue", () => {
  it("returns false for valueless operators", () => {
    expect(operatorHasValue("exists")).toBe(false);
    expect(operatorHasValue("not_exists")).toBe(false);
    expect(operatorHasValue("null")).toBe(false);
    expect(operatorHasValue("empty")).toBe(false);
    expect(operatorHasValue("not_empty")).toBe(false);
  });

  it("returns true for operators with values", () => {
    expect(operatorHasValue("eq")).toBe(true);
    expect(operatorHasValue("gt")).toBe(true);
    expect(operatorHasValue("in")).toBe(true);
    expect(operatorHasValue("like")).toBe(true);
  });
});

describe("fieldOperatorValid", () => {
  describe("eq/ne operators", () => {
    it("returns true for non-array types", () => {
      expect(fieldOperatorValid("eq", "text")).toBe(true);
      expect(fieldOperatorValid("ne", "number")).toBe(true);
      expect(fieldOperatorValid("eq", "boolean")).toBe(true);
    });

    it("returns true for object arrays", () => {
      expect(fieldOperatorValid("eq", "object[]")).toBe(true);
    });

    it("returns false for non-object array types", () => {
      expect(fieldOperatorValid("eq", "text[]")).toBe(false);
      expect(fieldOperatorValid("ne", "number[]")).toBe(false);
    });
  });

  describe("in/not_in/exists/not_exists operators", () => {
    it("returns true for non-array types", () => {
      expect(fieldOperatorValid("in", "text")).toBe(true);
      expect(fieldOperatorValid("not_in", "number")).toBe(true);
      expect(fieldOperatorValid("exists", "boolean")).toBe(true);
      expect(fieldOperatorValid("not_exists", "object")).toBe(true);
    });

    it("returns false for array types", () => {
      expect(fieldOperatorValid("in", "text[]")).toBe(false);
      expect(fieldOperatorValid("not_in", "number[]")).toBe(false);
      expect(fieldOperatorValid("exists", "object[]")).toBe(false);
    });
  });

  describe("comparison operators (gt/gte/lt/lte/between)", () => {
    it("returns true for number type", () => {
      expect(fieldOperatorValid("gt", "number")).toBe(true);
      expect(fieldOperatorValid("gte", "number")).toBe(true);
      expect(fieldOperatorValid("lt", "number")).toBe(true);
      expect(fieldOperatorValid("lte", "number")).toBe(true);
      expect(fieldOperatorValid("between", "number")).toBe(true);
    });

    it("returns true for object arrays (aggregations)", () => {
      expect(fieldOperatorValid("gt", "object[]")).toBe(true);
      expect(fieldOperatorValid("between", "object[]")).toBe(true);
    });

    it("returns false for text/boolean types", () => {
      expect(fieldOperatorValid("gt", "text")).toBe(false);
      expect(fieldOperatorValid("lt", "boolean")).toBe(false);
    });
  });

  describe("string operators (like/starts_with/ends_with/match)", () => {
    it("returns true for text type", () => {
      expect(fieldOperatorValid("like", "text")).toBe(true);
      expect(fieldOperatorValid("starts_with", "text")).toBe(true);
      expect(fieldOperatorValid("ends_with", "text")).toBe(true);
      expect(fieldOperatorValid("match", "text")).toBe(true);
    });

    it("returns false for non-text types", () => {
      expect(fieldOperatorValid("like", "number")).toBe(false);
      expect(fieldOperatorValid("starts_with", "boolean")).toBe(false);
    });

    it("returns false for text arrays", () => {
      expect(fieldOperatorValid("like", "text[]")).toBe(false);
      expect(fieldOperatorValid("match", "text[]")).toBe(false);
    });
  });

  describe("array operators (contains/empty/not_empty)", () => {
    it("returns true for non-object array types", () => {
      expect(fieldOperatorValid("contains", "text[]")).toBe(true);
      expect(fieldOperatorValid("empty", "number[]")).toBe(true);
      expect(fieldOperatorValid("not_empty", "boolean[]")).toBe(true);
    });

    it("returns false for object arrays", () => {
      expect(fieldOperatorValid("contains", "object[]")).toBe(false);
      expect(fieldOperatorValid("empty", "object[]")).toBe(false);
    });

    it("returns false for non-array types", () => {
      expect(fieldOperatorValid("contains", "text")).toBe(false);
      expect(fieldOperatorValid("empty", "number")).toBe(false);
    });
  });

  it("returns false for unknown operators", () => {
    expect(fieldOperatorValid("unknown" as any, "text")).toBe(false);
  });
});

describe("fieldSchemaItem", () => {
  const schema: Schema = {
    name: { label: "Name", type: "text" },
    age: { label: "Age", type: "number" },
    address: {
      label: "Address",
      type: "object",
      schema: {
        city: { label: "City", type: "text" },
        zip: { label: "Zip", type: "number" },
      },
    },
    tags: { label: "Tags", type: "text[]" },
  };

  it("returns undefined for undefined schema", () => {
    expect(fieldSchemaItem(undefined, "name")).toBeUndefined();
  });

  it("returns top-level schema item", () => {
    expect(fieldSchemaItem(schema, "name")).toEqual({ label: "Name", type: "text" });
    expect(fieldSchemaItem(schema, "age")).toEqual({ label: "Age", type: "number" });
  });

  it("returns nested schema item", () => {
    expect(fieldSchemaItem(schema, "address.city")).toEqual({ label: "City", type: "text" });
    expect(fieldSchemaItem(schema, "address.zip")).toEqual({ label: "Zip", type: "number" });
  });

  it("returns parent item if no nested schema", () => {
    expect(fieldSchemaItem(schema, "tags.0")).toEqual({ label: "Tags", type: "text[]" });
  });
});

describe("fieldList", () => {
  it("returns flat list of non-object fields", () => {
    const schema: Schema = {
      name: { label: "Name", type: "text" },
      age: { label: "Age", type: "number" },
    };

    expect(fieldList(schema)).toEqual([
      { key: "name", label: "Name" },
      { key: "age", label: "Age" },
    ]);
  });

  it("flattens nested object schema", () => {
    const schema: Schema = {
      address: {
        label: "Address",
        type: "object",
        schema: {
          city: { label: "City", type: "text" },
        },
      },
    };

    expect(fieldList(schema)).toEqual([{ key: "address.city", label: "Address → City" }]);
  });

  it("returns empty array for object without schema", () => {
    const schema: Schema = {
      address: { label: "Address", type: "object" },
    };

    expect(fieldList(schema)).toEqual([]);
  });

  it("returns count and sum fields for object arrays", () => {
    const schema: Schema = {
      orders: {
        label: "Orders",
        type: "object[]",
        schema: {
          price: { label: "Price", type: "number" },
          name: { label: "Name", type: "text" },
        },
      },
    };

    expect(fieldList(schema)).toEqual([
      { key: "orders_count", label: "Orders (count)" },
      { key: "orders_price_sum", label: "Orders → Price (sum)" },
    ]);
  });
});
