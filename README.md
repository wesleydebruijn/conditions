# Conditions

A language-agnostic, zero-dependency way to build complex queries that can be evaluated in the front- and backend.

## Overview

Conditions lets you define filter rules in a structured JSON format, build them through a visual UI, and evaluate them against records—all without external dependencies. The same condition payload works in JavaScript, Ruby, Python, or any language that can parse JSON.

### Key features

- **JSON format** — Conditions are plain JSON, making them easy to store, transmit, and reimplement in other languages
- **Visual builder** — Filters read as sentences ("Age is at least 18"), grouped with AND/OR brackets that can be nested to any depth; non-technical users can edit them
- **Evaluator** — Match records against conditions in memory, or translate to SQL/API filters
- **Schema support** — Optional schema for typed fields, nested objects, and automatic operator validation
- **Zero dependencies** — No runtime dependencies

## Installation

```bash
npm install
```

## Quick start

### Building conditions (UI)

Attach the `Conditions` class to an input or textarea. The element stores the JSON; the UI is rendered next to it.

```javascript
import Conditions from './src/conditions';

const input = document.querySelector('#condition-input');
new Conditions(input, {
  schema: {
    name: { label: 'Name', type: 'text' },
    age: { label: 'Age', type: 'number' },
  },
});
```

### Evaluating conditions (backend or frontend)

```javascript
import Evaluator from './src/evaluator';

const condition = { name: 'John', age: { gte: 18, lte: 65 } };
const evaluator = new Evaluator(condition);

evaluator.match({ name: 'John', age: 30 });  // true
evaluator.match({ name: 'John', age: 17 });  // false
evaluator.filter([{ name: 'John', age: 30 }, { name: 'Jane', age: 30 }]);  // [{ name: 'John', age: 30 }]
evaluator.any([{ name: 'Jane', age: 30 }, { name: 'John', age: 30 }]);  // true

// Or pass the condition per call
new Evaluator().match({ age: 30 }, { age: { gte: 18 } });  // true
```

## Condition format

Conditions are JSON objects (or arrays of objects) describing rules. A simple equality:

```json
{ "name": "John" }
```

With operators:

```json
{
  "age": { "gte": 18, "lte": 65 },
  "status": { "in": ["active", "pending"] }
}
```

Nested fields use dot notation. A record key that literally contains the dot wins over the nested lookup:

```json
{ "address.city": "Amsterdam" }
```

A list of values means "is one of":

```json
{ "status": ["active", "pending"] }
```

AND/OR logic:

```json
{
  "or": [
    { "role": "admin" },
    { "and": [{ "role": "editor" }, { "active": true }] }
  ]
}
```

### Supported operators

| Operator | Matches when | Example |
|----------|--------------|---------|
| `eq` | the value equals | `{ "age": { "eq": 30 } }` |
| `ne` | the value differs | `{ "status": { "ne": "archived" } }` |
| `gt`, `gte`, `lt`, `lte` | the value is greater / at least / less / at most | `{ "age": { "gte": 18 } }` |
| `between` | the value lies within `[min, max]`, inclusive | `{ "age": { "between": [18, 65] } }` |
| `in` | the value is one of a list | `{ "role": { "in": ["admin", "editor"] } }` |
| `not_in` | the value is not one of a list | `{ "status": { "not_in": ["deleted"] } }` |
| `intersects` | a list shares at least one value with the given list | `{ "tags": { "intersects": ["sale", "new"] } }` |
| `contains` | the text contains the given text; for lists, one of the items does | `{ "name": { "contains": "oh" } }` |
| `starts_with` | the text starts with | `{ "name": { "starts_with": "Jo" } }` |
| `ends_with` | the text ends with | `{ "email": { "ends_with": "@example.com" } }` |
| `match` | the text matches a regular expression | `{ "code": { "match": "^[A-Z]{3}" } }` |
| `mod` | dividing by the first number leaves the second as remainder | `{ "quantity": { "mod": [2, 0] } }` |
| `exists` | the value is set | `{ "email": { "exists": true } }` |
| `not_exists` | the value is not set | `{ "deleted_at": { "not_exists": true } }` |
| `empty` | the value is not set, or an empty text, list or object | `{ "notes": { "empty": true } }` |
| `not_empty` | the value is set and not empty | `{ "tags": { "not_empty": true } }` |

Unknown operators never match. There are no aliases such as `=`, `>`, `nin` or `regex`.

### Aggregations

Lists of objects are filtered on aggregates: `<field>:count` counts the items and `<field>:<number field>:sum` adds up a number field. Missing values count as 0.

```json
{
  "orders:count": { "gte": 3 },
  "orders:total:sum": { "gt": 100 }
}
```

`where` filters the items before counting or summing:

```json
{
  "orders:count": {
    "gte": 2,
    "where": { "status": "completed" }
  }
}
```

`distinct` counts different values instead of items. `true` counts every different value of a field; a list counts only those values. List fields count each of their values, and with several fields the different values of all of them are added up:

```json
{
  "orders:count": {
    "gte": 2,
    "where": { "status": "completed" },
    "distinct": { "product_id": true }
  }
}
```

```json
{ "orders:count": { "eq": 2, "distinct": { "tags": ["gift", "sale"] } } }
```

## Schema

A schema describes available fields and their types. Used by the UI for field selection and operator validation.

```javascript
const schema = {
  name: { label: 'Name', type: 'text' },
  age: { label: 'Age', type: 'number' },
  active: { label: 'Active', type: 'boolean' },
  tags: { label: 'Tags', type: 'text[]' },
  address: {
    label: 'Address',
    type: 'object',
    schema: {
      city: { label: 'City', type: 'text' },
      country: { label: 'Country', type: 'text' },
    },
  },
};
```

Schema types: `text`, `number`, `boolean`, `object`, `text[]`, `number[]`, `boolean[]`, `object[]`.

Give fields a `group` to show them under a heading in the field select. A field can be in several groups, and fields inside an object inherit its group:

```javascript
const schema = {
  provider: { label: 'Provider', type: 'text', group: 'Proposition' },
  version: { label: 'Version', type: 'text', group: ['Proposition', 'Product'] },
};
```

An `object[]` field offers a count of its items (`<field>:count`) and a sum of each of its number fields (`<field>:<number field>:sum`). Set `count: false` on the list, or `sum: false` on a number field, to leave those out of the field select and the AI instructions:

```javascript
const schema = {
  orders: {
    label: 'Orders',
    type: 'object[]',
    count: false,
    schema: {
      total: { label: 'Total', type: 'number' },
      term: { label: 'Term in months', type: 'number', sum: false },
    },
  },
};
```

## API

### Conditions

```javascript
const conditions = new Conditions(input, settings);
```

- **input** — `HTMLInputElement`, `HTMLTextAreaElement`, or CSS selector
- **settings** — Optional:
  - `schema` — available fields (see [Schema](#schema))
  - `readOnly` — show the conditions without any way to change them; default `false`
  - `labels` — UI text, e.g. `{ addRule: 'Filter toevoegen', addGroup: 'Groep toevoegen' }`; merged with the defaults
  - `classNames` — CSS class overrides; merged with the defaults
  - `conditionOperators` — operators to offer and their labels, e.g. `{ eq: 'is', gte: 'is at least' }`; replaces the defaults
  - `ai` — async function that turns a natural-language request into a condition; shows a chat next to the builder (see [AI input](#ai-input))

Methods:

- `setReadOnly(readOnly)` — Switch between viewing and editing; closes any open editor
- `destroy()` — Remove the UI and event listeners

### AI input

Pass an `ai` handler and the builder shows a chat next to it. People describe the filters they want ("smartphones under 500, or anything from KPN"), or how to change the current ones ("also require a 24 month contract"), and the response replaces the filters.

Each reply in the chat can be expanded to show the JSON it returned, and has a button to restore those filters, so people can go back to an earlier version. The reply that matches the current filters is marked as the current version.

The library makes no network calls itself. Your handler gets a request and returns the new condition, as an object or a JSON string:

```javascript
new Conditions(input, {
  schema,
  ai: async ({ instructions, message }) => {
    const response = await fetch('/conditions/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: instructions, prompt: message }),
    });
    return response.json();
  },
});
```

The request contains:

- `instructions` — a system prompt describing the JSON format, the offered operators and the schema's fields
- `message` — the current condition plus the request, to send as the user message
- `prompt` — what the person typed
- `condition` — the current condition as JSON

When the handler throws, or returns something that isn't a condition, the filters stay as they were and the error shows in the chat. `aiInstructions`, `aiRequest` and `parseAiResponse` are exported from `src/ai` for building requests outside the UI.

The demo calls DeepSeek straight from the browser with an API key you paste in, which keeps the demo free of a backend. In your own app, keep the key on your server and call the model from there.

### Evaluator

```javascript
const evaluator = new Evaluator(condition);
```

- **condition** — JSON condition object or array

Methods:

- `match(record)` — `true` if `record` matches the condition
- `filter(records)` — Array of records that match

### Serializer

```javascript
import { serialize, deserialize } from './src/serializer';

const json = serialize(group);   // Group → JSON string
const group = deserialize(json); // JSON string → Group
```

`Group` is the tree the builder edits: `{ type: 'group', operator: 'and' | 'or', children }`, where each child is a nested group or a rule `{ type: 'rule', key, conditions, where? }`. The JSON format is unchanged.

## Development

```bash
npm run dev       # Start Vite dev server
npm run build     # Build for production
npm run test      # Run Jest tests
npm run test:watch
npm run lint      # Biome lint
npm run format    # Biome format
```

## Demo

The project includes an interactive demo. Run `npm run dev` and open the app to:

- Build conditions with the visual editor
- Edit JSON directly
- Test against sample records in real time
- Describe filters in plain language (paste a DeepSeek API key in the header; it stays in your browser)

## License

See [LICENSE](LICENSE).
