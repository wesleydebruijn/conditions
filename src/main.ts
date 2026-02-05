import './style.css';
import Conditions from './conditions';
import Evaluator from './evaluator';

const initialConfig = {
  hideInput: true,
  schema: {
    coupons: { label: 'Coupons', type: 'text[]' },
    items: {
      label: 'Items',
      type: 'object[]',
      schema: {
        name: { label: 'Naam', type: 'text' },
        type: { label: 'Type', type: 'text' },
        slug: { label: 'Slug', type: 'text' },
        price: { label: 'Price', type: 'number' },
        provider: { label: 'Provider', type: 'text' },
        monthly_fee: { label: 'Monthly Fee', type: 'number' },
        contract_term: { label: 'Contract Duration', type: 'number' },
        promotions: {
          label: 'Promotions',
          type: 'object[]',
          schema: {
            name: { label: 'Name', type: 'text' },
            discount: { label: 'Discount', type: 'number' },
          },
        },
        content: { 
          label: 'Content',
          type: 'object', 
          schema: {
            data: { label: 'Data', type: 'number' },
            minutes: { label: 'Minutes', type: 'number' },
            sms: { label: 'SMS', type: 'number' },
          },
        },
      },
    },
  },
};

const initialRecord = {
  coupons: ['FREE_AIRPODS'],
  items: [
    {
      name: 'Vodafone 10GB + Apple iPhone 15',
      type: 'proposition',
      slug: 'vodafone-10gb-iphone-15',
      provider: 'vodafone',
      price: 200,
      monthly_fee: 10,
      contract_term: 24,
      promotions: [
        {
          name: 'Discount 10 euro',
          discount: 10,
        },
      ],
      content: {
        data: 10000,
        minutes: 500,
        sms: 100,
      },
    },
    {
      name: 'Apple iPhone 16',
      type: 'phone',
      slug: 'iphone-16',
      price: 100,
    },
    {
      name: 'Apple AirPods Pro',
      type: 'accessory',
      slug: 'airpods-pro',
      price: 20,
    },
    {
      name: 'Apple Watch Series 10',
      type: 'accessory',
      slug: 'watch-series-10',
      price: 200,
    },
  ],
};

const initialCondition = {
  items_count: {
    gte: 2,
    where: {
      type: { eq: 'accessory' },
    },
  },
  items_price_sum: {
    gte: 100,
    where: {
      type: { eq: 'phone' },
    },
  },
  coupons: {
    contains: 'FREE_AIRPODS',
  },
};

let conditions: Conditions | null = null;
const recordInput = document.getElementById('record-input') as HTMLTextAreaElement | null;
const conditionInput = document.getElementById('condition-input') as HTMLTextAreaElement | null;
const configContainer = document.getElementById('config-container');
const configInput = document.getElementById('config-input') as HTMLTextAreaElement | null;
const toggleBtn = document.getElementById('toggle-btn');
const resultRow = document.getElementById('result-row');

if (!recordInput || !conditionInput || !resultRow || !toggleBtn || !configInput || !configContainer) {
  throw new Error('Missing HTML Elements');
}

setTimeout(init, 0);

function toggle(enable: boolean): void {
  if (enable) {
    if (conditions) return;
    let config: Record<string, unknown> = {};

    try {
      config = JSON.parse(configInput!.value) as Record<string, unknown>;
    } catch {
      config = {};
    }

    conditions = new Conditions(conditionInput!, config);

    configContainer!.style.display = 'none';
    toggleBtn!.innerHTML = '❌';
  } else {
    if (!conditions) return;
    conditions.destroy();
    conditions = null;

    configContainer!.style.display = '';
    toggleBtn!.innerHTML = '🛠️';
  }
}

function evaluate(): void {
  recordInput!.classList.remove('record-input--match', 'record-input--no-match');
  try {
    const condition = JSON.parse(conditionInput!.value);
    const record = JSON.parse(recordInput!.value);

    const match = new Evaluator(condition).match(record);

    resultRow!.innerHTML = match ? 'Match ✅' : 'No Match ❌';
    if (match) {
      recordInput!.classList.remove('record-input--match');
      void recordInput!.offsetHeight; // force reflow so animation replays
      recordInput!.classList.add('record-input--match');
    } else {
      recordInput!.classList.add('record-input--no-match');
    }
  } catch {
    resultRow!.innerHTML = '<span style="color: red">Invalid JSON</span>';
    recordInput!.classList.add('record-input--no-match');
  }
}

function init(): void {
  configInput!.value = JSON.stringify(initialConfig, null, 2);
  conditionInput!.value = JSON.stringify(initialCondition, null, 2);
  recordInput!.value = JSON.stringify(initialRecord, null, 2);

  recordInput!.addEventListener('input', () => evaluate());
  conditionInput!.addEventListener('input', () => evaluate());
  conditionInput!.addEventListener('change', () => evaluate());

  toggleBtn!.addEventListener('click', () => toggle(!conditions));

  toggle(true);
  evaluate();
}
