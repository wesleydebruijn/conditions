# Conditions

## Settings
The `Settings` configures the Conditions UI builder (labels and schema). It is passed when constructing `new Conditions(element, settings)`.

```ts
type Settings = {
  items: {
    group: string;       // e.g. "Group" — label for top-level groups
    fieldSet: string;    // e.g. "Field Set" — label for field-set blocks
    field: string;       // e.g. "Field" — label in field selector and buttons
    condition: string;   // e.g. "Condition" — label for condition rows
    nestedGroup: string; // e.g. "Filter" — label for nested AND/OR groups
  };
  operators: Record<Operator, string>;           // labels for "and" | "or"
  conditionOperators: Partial<Record<ConditionOperator, string>>;  // labels for eq, ne, gt, gte, ...
  mapping?: Mapping;     // optional schema: which fields exist, their labels and types
};
```

- **items** — Copy used in the builder (buttons like “+ Group”, “+ Field”, and the “Select Field” placeholder). Change these to localize or rename concepts.
- **operators** — Labels for the logical operators `and` and `or` in the group header.
- **conditionOperators** — Labels for condition operators (`eq`, `ne`, `gt`, `gte`, `in`, `contains`, etc.). Partial: you can override only some; the rest keep default labels.
- **mapping** — Optional. Describes the record shape: field keys, human-readable labels, and types (`text`, `number`, `boolean`, `date`, `object`). When provided, the builder uses it for the field dropdown and for typing value inputs. Nested objects use a nested `mapping`.
