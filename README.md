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
evaluator.filter([{ name: 'John' }, { name: 'Jane' }]);  // [{ name: 'John' }]
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

Nested fields use dot notation:

```json
{ "address.city": "Amsterdam" }
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

| Operator | Aliases | Example |
|----------|---------|---------|
| `eq` | `=` | `{ "age": { "eq": 30 } }` |
| `ne` | `!=` | `{ "status": { "ne": "archived" } }` |
| `gt`, `gte`, `lt`, `lte` | `>`, `>=`, `<`, `<=` | `{ "age": { "gte": 18 } }` |
| `in` | — | `{ "role": { "in": ["admin", "editor"] } }` |
| `not_in` | `nin` | `{ "status": { "not_in": ["deleted"] } }` |
| `between` | — | `{ "age": { "between": [18, 65] } }` |
| `like` | — | `{ "name": { "like": "John" } }` |
| `exists` | — | `{ "email": { "exists": true } }` |
| `not_exists` | `null` | `{ "deleted_at": { "not_exists": true } }` |
| `starts_with` | `startswith` | `{ "name": { "starts_with": "Jo" } }` |
| `ends_with` | `endswith` | `{ "email": { "ends_with": "@example.com" } }` |
| `contains` | — | `{ "tags": { "contains": "featured" } }` |
| `match` | `regex` | `{ "code": { "match": "^[A-Z]{3}" } }` |
| `empty` | — | `{ "notes": { "empty": true } }` |
| `not_empty` | — | `{ "tags": { "not_empty": true } }` |

### Aggregations

For array fields, you can use `_count` and `_sum`:

```json
{
  "orders_count": { "gte": 3 },
  "orders_total_sum": { "gt": 100 }
}
```

`where` filters nested items before counting/summing:

```json
{
  "orders_count": {
    "gte": 2,
    "where": { "status": "completed" }
  }
}
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
  - `ai` — async function that turns a natural-language request into a condition; shows a prompt box above the builder (see [AI input](#ai-input))

Methods:

- `setReadOnly(readOnly)` — Switch between viewing and editing; closes any open editor
- `destroy()` — Remove the UI and event listeners

### AI input

Pass an `ai` handler and the builder shows a prompt box. People describe the filters they want ("smartphones under 500, or anything from KPN"), or how to change the current ones ("also require a 24 month contract"), and the response replaces the filters.

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

When the handler throws, or returns something that isn't a condition, the filters stay as they were and an error shows under the prompt. `aiInstructions`, `aiRequest` and `parseAiResponse` are exported from `src/ai` for building requests outside the UI.

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
