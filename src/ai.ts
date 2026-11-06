import { summableFields } from "./schema";
import { deserializeGroup } from "./serializer";
import type { AiRequest, ConditionHash, Group, Schema, Settings } from "./types";

const FORMAT = `You write filter conditions in a JSON format, from a request in plain language.

Format:
- A field with an operator: { "age": { "gte": 18 } }
- Several operators on one field must all match: { "age": { "gte": 18, "lte": 65 } }
- Fields side by side in one object must all match: { "name": { "eq": "John" }, "age": { "gte": 18 } }
- Logic: { "and": [ ... ] } or { "or": [ ... ] }, nested to any depth
- Nested object fields use dot notation: { "address.city": { "eq": "Amsterdam" } }
- Lists of objects are filtered by aggregate fields: "<field>:count" counts the items, "<field>:<number field>:sum" sums a number field. Add "where" to count or sum only matching items: { "orders:count": { "gte": 2, "where": { "status": { "eq": "completed" } } } }
- Add "distinct" to a count to count different values of item fields instead of items: { "orders:count": { "gte": 2, "distinct": { "product": true } } } counts the different products. List values to count only those: { "distinct": { "tags": ["a", "b"] } }
- Values: numbers and booleans are JSON numbers and booleans; "in" and "not_in" take an array; "intersects" takes an array and matches when a list field has any of its values; "between" takes [min, max]; "mod" takes [divisor, remainder]; "exists", "not_exists", "empty" and "not_empty" take true.`;

const RULES = `Rules:
- Return the complete condition, not only the part that changed.
- If there is a current condition, change it as the request asks and keep everything else, unless the request asks to start over.
- Use only the fields and operators listed here. If the request mentions something that has no field, leave it out.
- Return {} when nothing in the request can be expressed.
- Reply with only the condition as a JSON object, without explanation.`;

export function aiInstructions(settings: Pick<Settings, "schema" | "conditionOperators">): string {
  const operators = Object.entries(settings.conditionOperators).map(
    ([operator, label]) => `- ${operator}: ${label}`,
  );

  const fields = settings.schema
    ? describeSchema(settings.schema)
    : ["- Any field name the request mentions"];

  return [
    FORMAT,
    `Operators:\n${operators.join("\n")}`,
    `Fields:\n${fields.join("\n")}`,
    RULES,
  ].join("\n\n");
}

export function aiRequest(
  prompt: string,
  condition: ConditionHash,
  settings: Pick<Settings, "schema" | "conditionOperators">,
): AiRequest {
  const message = `Current condition:\n${JSON.stringify(condition, null, 2)}\n\nRequest: ${prompt}`;

  return { prompt, condition, instructions: aiInstructions(settings), message };
}

export function parseAiResponse(response: unknown): Group {
  const condition = typeof response === "string" ? JSON.parse(response) : response;

  if (typeof condition !== "object" || condition === null) {
    throw new Error("Expected a condition object");
  }

  return deserializeGroup(condition);
}

function describeSchema(schema: Schema, prefix = "", indent = ""): string[] {
  return Object.entries(schema).flatMap(([key, item]) => {
    const path = `${prefix}${key}`;
    const line = `${indent}- ${path} (${item.type}): ${item.label}`;

    if (!item.schema) return [line];

    const children = describeSchema(
      item.schema,
      item.type === "object" ? `${path}.` : "",
      `${indent}  `,
    );

    if (item.type === "object") return [line, ...children];

    const aggregates = [
      ...(item.count === false ? [] : [`${path}:count`]),
      ...summableFields(item.schema).map(([key]) => `${path}:${key}:sum`),
    ];
    if (aggregates.length === 0) return [];

    return [
      `${line}. Filter with ${aggregates.join(" or ")}; its items have these fields for "where" and "distinct":`,
      ...children,
    ];
  });
}
