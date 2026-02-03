# Conditions

Build and evaluate JSON conditions in the browser. Use **Conditions** for the UI builder; use **Evaluator** to run conditions against records (front-end or back-end).

## Usage

### Conditions (UI builder)

Attach the visual builder to an `<input>` or `<textarea>`. The element’s value must hold (or will hold) JSON in the [condition format](#condition-format) the Evaluator expects. The builder hides the element and renders the UI; changes are synced back into the element’s value.

```ts
import Conditions from './conditions';

const textarea = document.querySelector('#condition-input');
const settings = {
  mapping: {
    status: { label: 'Status', type: 'text' },
    amount: { label: 'Amount', type: 'number' },
  },
};

const conditions = new Conditions(textarea, { mapping: settings.mapping });

// Tear down and show raw JSON again
conditions.destroy();
```

- **First argument** — `HTMLInputElement`, `HTMLTextAreaElement`, or a CSS selector string.
- **Second argument** — Optional [Settings](#settings). At minimum you can pass `{ mapping }` so the builder knows which fields exist and their types; other options (e.g. `items`, `operators`, `conditionOperators`) customize labels.

### Evaluator (run conditions)

Evaluator takes a condition object (or array) and evaluates it against records. No DOM.

```ts
import Evaluator from './evaluator';

const condition = {
  status: { eq: 'active' },
  amount: { gte: 100 },
};

const evaluator = new Evaluator(condition);

evaluator.match({ status: 'active', amount: 150 });  // true
evaluator.match({ status: 'draft', amount: 200 });   // false

const records = [
  { status: 'active', amount: 50 },
  { status: 'active', amount: 200 },
];
evaluator.filter(records);  // [{ status: 'active', amount: 200 }]
```

- **Constructor** — `new Evaluator(conditions)`. `conditions` is a [ConditionHash](src/types.ts): either a single object or an array of condition objects.
- **match(record)** — Returns `true` if `record` matches the conditions, otherwise `false`.
- **filter(records)** — Returns a new array of records that match the conditions.

### Condition format

The JSON that Conditions writes (and Evaluator reads) is a hash of **field keys** to **condition specs**:

- **Simple:** `{ "fieldKey": { "eq": "value" } }` — field must equal value. Other operators: `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `contains`, `like`, `exists`, `startswith`, `endswith`, etc.
- **Logical groups:** Use top-level keys `and` or `or` with an array of such hashes; each item must match (and) or at least one (or).
- **Aggregations:** Special keys like `items_count` / `items_price_sum` support `gte`, `lte`, etc., and an optional `where` to filter the array before counting/summing.

Example (same shape as in the demo):

```json
{
  "items_count": { "gte": 2, "where": { "type": { "eq": "accessory" } } },
  "items_price_sum": { "gte": 100, "where": { "type": { "eq": "phone" } } },
  "coupons": { "contains": "GRATIS_AIRPODS" }
}
```

---

## Settings
The `Settings` configures the Conditions UI builder (labels and schema). It is passed when constructing `new Conditions(element, settings)`.

```ts
type Settings = {
  hideInput: boolean     // hide original form input
  items: {
    group: string;       // e.g. "Group" — label for top-level groups
    fieldset: string;    // e.g. "Fieldset" — label for field-set blocks
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
