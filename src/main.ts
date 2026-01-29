import './style.css'

import Evaluator from './evaluator'
import Conditions from './conditions'
import type { Mapping } from './types'

const defaultRecord = {
  name: 'Alice',
  items: [
    {
      name: 'Item 1',
      type: 'phone',
      price: 100
    },
    {
      name: 'Item 2',
      type: 'accessory',
      price: 20
    },
    {
      name: 'Item 3',
      type: 'accessory',
      price: 20
    }
  ],
  is_active: true
}

const defaultCondition = {
  items_count: {
    gte: 2,
    where: {
      type: { eq: 'accessory' }
    }
  },
  items_price_sum: {
    gte: 100,
    where: {
      type: { eq: 'phone' }
    }
  },
  is_active: { eq: true }
}

const mapping: Mapping = {
  name: { label: 'Naam', type: 'text' },
  is_active: { label: 'Actief', type: 'boolean' },
  items: {
    label: 'Items',
    type: 'object',
    multiple: true,
    mapping: {
      name: { label: 'Naam', type: 'text' },
      type: { label: 'Type', type: 'text' },
      price: { label: "Prijs", type: "number" },
    }
  }
}

// Helper to auto-grow a textarea based on its contents
function autoGrow(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto';
  textarea.style.height = (textarea.scrollHeight) + "px";
}

function renderUI(
  recordStr: string,
  conditionStr: string,
  result: boolean,
) {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <p id="result-row"><b>${result ? 'Match ✅' : 'No Match ❌'}</b></p>
    <textarea id="record-input" style="width:100%;min-height:60px;overflow-y:hidden;resize:vertical;">${recordStr}</textarea>
    <textarea id="condition-input" style="width:100%;min-height:60px;overflow-y:hidden;resize:vertical;">${conditionStr}</textarea>
  `;
  // Auto-grow on render for initial values
  const recordInput = document.getElementById('record-input') as HTMLTextAreaElement;
  const conditionInput = document.getElementById('condition-input') as HTMLTextAreaElement;

  new Conditions(conditionInput, { mapping });

  if (recordInput) autoGrow(recordInput);
  if (conditionInput) autoGrow(conditionInput);
}

function updateResult(result: boolean, parseError?: string) {
  const resultRow = document.getElementById('result-row');
  resultRow!.innerHTML = `<b>${parseError ? `<span style="color: red">${parseError}</span>` : (result ? 'Match ✅' : 'No Match ❌')}</b>`;
}

function matchAndUpdate() {
  const recordInput = document.getElementById('record-input') as HTMLTextAreaElement;
  const conditionInput = document.getElementById('condition-input') as HTMLTextAreaElement;

  let record, condition, parseError;
  try {
    record = JSON.parse(recordInput.value);
  } catch {
    record = defaultRecord;
    parseError = "Invalid JSON in record input";
  }
  try {
    condition = JSON.parse(conditionInput.value);
  } catch {
    condition = defaultCondition;
    parseError = parseError ? parseError + "; Invalid JSON in conditions" : "Invalid JSON in conditions";
  }

  let result = false;
  if (!parseError) {
    try {
      const evaluator = new Evaluator(condition)

      result = evaluator.match(record);

    } catch (err) {
      parseError = (err as Error).message;
    }
  }
  updateResult(result, parseError);
}

// Ensure textareas auto-grow as the user types
function attachListeners() {
  const recordInput = document.getElementById('record-input') as HTMLTextAreaElement;
  const conditionInput = document.getElementById('condition-input') as HTMLTextAreaElement;

  if (recordInput && conditionInput) {
    recordInput.addEventListener('input', () => {
      autoGrow(recordInput);
      matchAndUpdate();
    });
    conditionInput.addEventListener('input', () => {
      autoGrow(conditionInput);
      matchAndUpdate();
    });
    // Initial autogrow in case style was lost
    setTimeout(() => {
      autoGrow(recordInput);
      autoGrow(conditionInput);
    }, 10)
  }
}

// Initial render
const defaultRecordStr = JSON.stringify(defaultRecord, null, 2);
const defaultConditionStr = JSON.stringify(defaultCondition, null, 2);

renderUI(
  defaultRecordStr,
  defaultConditionStr,
  new Evaluator(defaultCondition).match(defaultRecord),
);
setTimeout(attachListeners, 0);
