import './style.css'

import { ConditionEvaluator } from './condition_evaluator'
import { ConditionBuilder } from './condition_builder'

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

// Helper to auto-grow a textarea based on its contents
function autoGrow(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto';
  textarea.style.height = (textarea.scrollHeight) + "px";
}

function renderUI(
  recordStr: string,
  conditionStr: string,
  result: boolean,
  parseError?: string,
  builderStr?: string,
  builderOutputStr?: string,
  builderOutputMatch?: boolean
) {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div>
      <h1>Condition Evaluator Demo</h1>
      <div class="card">
        <label>
          <b>Record:</b><br>
          <textarea id="record-input" style="width:100%;min-height:60px;overflow-y:hidden;resize:vertical;">${recordStr}</textarea>
        </label>
        <label>
          <b>Conditions:</b><br>
          <textarea id="condition-input" style="width:100%;min-height:60px;overflow-y:hidden;resize:vertical;">${conditionStr}</textarea>
        </label>
        <p id="result-row"><b>${parseError ? `<span style="color: red">${parseError}</span>` : (result ? 'Matched ✅' : 'Not Matched ❌')}</b></p>
        <p id="builder-row"><b>Builder:</b><br>
          <textarea id="builder-input" style="width:100%;min-height:60px;overflow-y:hidden;resize:vertical;">${builderStr}</textarea>
        </p>
        <p id="builder-output-row"><b>Builder Output:</b><br>
          <textarea id="builder-output" style="width:100%;min-height:60px;overflow-y:hidden;resize:vertical;">${builderOutputStr}</textarea>
        </p>
        <p id="builder-output-match-row"><b>Conditions vs Builder Output:</b>
          <span>${typeof builderOutputMatch === "undefined" ? "" : (
            builderOutputMatch ? '✅' : '❌'
          )}</span>
        </p>
      </div>
      <p class="read-the-docs">
        Try editing the record or conditions. This demonstrates live evaluation using <code>ConditionEvaluator</code>.
      </p>
    </div>
  `;
  // Auto-grow on render for initial values
  const recordInput = document.getElementById('record-input') as HTMLTextAreaElement;
  const conditionInput = document.getElementById('condition-input') as HTMLTextAreaElement;
  const builderInput = document.getElementById('builder-input') as HTMLTextAreaElement;
  const builderOutput = document.getElementById('builder-output') as HTMLTextAreaElement;
  if (recordInput) autoGrow(recordInput);
  if (conditionInput) autoGrow(conditionInput);
  if (builderInput) autoGrow(builderInput);
  if (builderOutput) autoGrow(builderOutput);
}

function updateResult(result: boolean, parseError?: string, builder?: ConditionBuilder, builderOutputMatch?: boolean) {
  const resultRow = document.getElementById('result-row');

  if (resultRow) {
    resultRow.innerHTML = `<b>${parseError ? `<span style="color: red">${parseError}</span>` : (result ? 'Matched ✅' : 'Not Matched ❌')}</b>`;
  }
  const builderRow = document.getElementById('builder-row');
  if (builderRow) {
    builderRow.innerHTML = `<b>Builder:</b><br>
      <textarea id="builder-input" style="width:100%;min-height:60px;overflow-y:hidden;resize:vertical;">${JSON.stringify(builder?.groups, null, 2)}</textarea>
    `;
  }
  const builderOutputMatchRow = document.getElementById('builder-output-match-row');
  if (builderOutputMatchRow) {
    builderOutputMatchRow.innerHTML = `<b>Conditions vs Builder Output:</b>
      <span>${typeof builderOutputMatch === "undefined" ? "" : (
        builderOutputMatch
        ? '<span style="color: green">EQUAL ✅</span>'
        : '<span style="color: orange">NOT EQUAL ⚠️</span>'
      )}</span>
    `;
  }
}

function normalizeJsonString(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str));
  } catch {
    return str.trim();
  }
}

function matchAndUpdate() {
  const recordInput = document.getElementById('record-input') as HTMLTextAreaElement;
  const conditionInput = document.getElementById('condition-input') as HTMLTextAreaElement;

  let record, condition, builder, parseError, builderOutput, builderOutputMatch;
  try {
    record = JSON.parse(recordInput.value);
  } catch {
    record = defaultRecord;
    parseError = "Invalid JSON in record";
  }
  try {
    condition = JSON.parse(conditionInput.value);
  } catch {
    condition = defaultCondition;
    parseError = parseError ? parseError + "; Invalid JSON in condition" : "Invalid JSON in condition";
  }

  let result = false;
  if (!parseError) {
    try {
      const evaluator = new ConditionEvaluator(condition)
      builder = new ConditionBuilder(conditionInput.value);

      result = evaluator.match(record);

      builderOutput = builder.serialize(builder.groups);

      // Check if normalized condition input string matches normalized builder output
      const normalizedInput = normalizeJsonString(conditionInput.value);
      const normalizedOutput = normalizeJsonString(builderOutput);

      builderOutputMatch = normalizedInput === normalizedOutput;
      // Also update builder output textarea
      const builderOutputElem = document.getElementById('builder-output') as HTMLTextAreaElement;
      if (builderOutputElem) {
        builderOutputElem.value = builderOutput;
      }
    } catch (err) {
      parseError = (err as Error).message;
    }
  }
  updateResult(result, parseError, builder, builderOutputMatch);
}

// Ensure textareas auto-grow as the user types
function attachListeners() {
  const recordInput = document.getElementById('record-input') as HTMLTextAreaElement;
  const conditionInput = document.getElementById('condition-input') as HTMLTextAreaElement;
  const builderInput = document.getElementById('builder-input') as HTMLTextAreaElement;
  const builderOutput = document.getElementById('builder-output') as HTMLTextAreaElement;

  if (recordInput && conditionInput && builderInput && builderOutput) {
    recordInput.addEventListener('input', () => {
      autoGrow(recordInput);
      matchAndUpdate();
    });
    conditionInput.addEventListener('input', () => {
      autoGrow(conditionInput);
      matchAndUpdate();
    });
    builderInput.addEventListener('input', () => {
      autoGrow(builderInput);
      matchAndUpdate();
    });
    builderOutput.addEventListener('input', () => {
      autoGrow(builderOutput);
      matchAndUpdate();
    });
    // Initial autogrow in case style was lost
    setTimeout(() => {
      autoGrow(recordInput);
      autoGrow(conditionInput);
      autoGrow(builderInput);
      autoGrow(builderOutput);
    }, 10)
  }
}

// Initial render
const defaultRecordStr = JSON.stringify(defaultRecord, null, 2);
const defaultConditionStr = JSON.stringify(defaultCondition, null, 2);
const builder = new ConditionBuilder(defaultConditionStr);
const builderOutputStr = builder.serialize(builder.groups);

// Calculate initial match between defaultCondition and builder output
const builderOutputMatch =
  normalizeJsonString(defaultConditionStr) === normalizeJsonString(builderOutputStr);

renderUI(
  defaultRecordStr,
  defaultConditionStr,
  new ConditionEvaluator(defaultCondition).match(defaultRecord),
  undefined,
  JSON.stringify(builder.groups, null, 2),
  builderOutputStr,
  builderOutputMatch
);
setTimeout(attachListeners, 0);
