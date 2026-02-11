# Conditions

A language-agnostic, zero-dependency way to build complex queries that can be evaluated in the front- and backend.

## Overview

Conditions lets you define filter rules in a structured JSON format, build them through a visual UI, and evaluate them against records—all without external dependencies. The same condition payload works in JavaScript, Ruby, Python, or any language that can parse JSON.

### Key features

- **JSON format** — Conditions are plain JSON, making them easy to store, transmit, and reimplement in other languages
- **Visual builder** — Interactive UI to create groups, fields, and conditions with AND/OR logic
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
- **settings** — Optional: `schema`, `classNames`, `items`, `operators`, `conditionOperators`

Methods:

- `destroy()` — Remove the UI and event listeners

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

const json = serialize(groups);   // Group[] → JSON string
const groups = deserialize(json); // JSON string → Group[]
```

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

## License

See [LICENSE](LICENSE).
