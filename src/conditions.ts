import { deserialize, serialize } from './serializer';
import { fieldList } from './mapping';
import type { Group, Field, Condition, Operator, ConditionOperator, Settings, Mapping } from './types';

declare global {
  interface HTMLInputElement {
    conditions?: Conditions | null;
  }

  interface HTMLTextAreaElement {
    conditions?: Conditions | null;
  }
}

export default class Conditions {
  private settings: Settings = {
    operators: {
      and: 'and',
      or: 'or',
    },
    conditionOperators: {
      eq: 'equal to',
      ne: 'not equal to',
      gt: 'greater than',
      gte: 'greater than or equal to',
      lt: 'less than',
      lte: 'less than or equal to',
      in: 'in',
      nin: 'not in',
      not_in: 'not in',
      between: 'between',
      like: 'like',
      exists: 'exists',
      not_exists: 'not exists',
      starts_with: 'starts with',
      ends_with: 'ends with',
      contains: 'contains',
      match: 'match',
      empty: 'empty',
      not_empty: 'not empty',
    }
  };
  private groups: Group[] = [];

  private input: HTMLInputElement | HTMLTextAreaElement;
  private containerElement: HTMLElement;

  constructor(
    input: HTMLInputElement | HTMLTextAreaElement | string,
    settings: Partial<Settings> = {}
  ) {
    this.settings = { ...this.settings, ...settings };
    this.input = this.getInput(input);
    this.groups = deserialize(this.input.value);
    this.containerElement = document.createElement('div');

    this.render();
  }

  private getInput(
    input: HTMLInputElement | HTMLTextAreaElement | string,
  ): HTMLInputElement | HTMLTextAreaElement {
    let element: HTMLInputElement | HTMLTextAreaElement | null;

    if (typeof input === "string") {
      element = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(input);
    } else {
      element = input;
    }

    if (!element) throw new Error(`Element ${input} not found`);
    if (element.conditions) throw new Error("Conditions already initialized on element");

    return element;
  }

  private render() {
    const addGroupBtn = document.createElement('button');
    addGroupBtn.textContent = '+';
    addGroupBtn.addEventListener('click', event => {
      event.preventDefault()
      this.addGroup(this.containerElement, this.groups)
    });

    this.containerElement.appendChild(addGroupBtn);

    this.groups.forEach(group => this.renderGroup(this.containerElement, this.groups, group, this.settings.mapping));

    this.input.after(this.containerElement);
  }

  private renderGroup(element: HTMLElement, groups: Group[], group: Group, mapping?: Mapping) {
    const groupElement = document.createElement('div');

    const operatorSelect = document.createElement('select');
    operatorSelect.innerHTML = Object.entries(this.settings.operators)
      .map(([key, label]) => `<option value="${key}"${group.operator === key ? " selected" : ""}>${label}</option>`)
      .join('');

    operatorSelect.addEventListener('change', () => {
      group.operator = operatorSelect.value as Operator;
      this.onChange();
    });

    const removeGroupBtn = document.createElement('button');
    removeGroupBtn.textContent = '-';
    removeGroupBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeGroup(groupElement, groups, group);
    });

    const fieldsElement = document.createElement('div');
    group.fields.forEach(field => this.renderField(fieldsElement, group.fields, field, mapping));

    const addFieldBtn = document.createElement('button');
    addFieldBtn.textContent = '+';
    addFieldBtn.addEventListener('click', event => {
      event.preventDefault()
      this.addField(fieldsElement, group.fields)
    });

    groupElement.appendChild(operatorSelect);
    groupElement.appendChild(removeGroupBtn);
    groupElement.appendChild(fieldsElement);
    groupElement.appendChild(addFieldBtn);

    element.appendChild(groupElement);
  }

  private renderField(element: HTMLElement, fields: Field[], field: Field, mapping?: Mapping) {
    const fieldElement = document.createElement('div');

    let fieldInput: HTMLInputElement | HTMLSelectElement;

    if(!mapping) {
      fieldInput = document.createElement('input');
      fieldInput.value = field.key;
    } else {
      fieldInput = document.createElement('select');
      fieldInput.innerHTML = fieldList(mapping)
        .map(({ key, label }) => `<option value="${key}"${field.key === key ? " selected" : ""}>${label}</option>`)
        .join('');
    }

    fieldInput.addEventListener('change', event => {
      event.preventDefault();
      field.key = fieldInput.value;
      this.onChange();
    });

    const removeFieldBtn = document.createElement('button');
    removeFieldBtn.textContent = '-';
    removeFieldBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeField(fieldElement, fields, field);
    });

    const conditionsElement = document.createElement('div');
    field.conditions.forEach(condition => this.renderCondition(conditionsElement, field.conditions, condition));

    const addFieldBtn = document.createElement('button');
    addFieldBtn.textContent = '+ condition';
    addFieldBtn.addEventListener('click', event => {
      event.preventDefault()
      this.addCondition(conditionsElement, field.conditions)
    });

    fieldElement.appendChild(fieldInput);
    fieldElement.appendChild(removeFieldBtn);
    fieldElement.appendChild(conditionsElement);
    fieldElement.appendChild(addFieldBtn);

    element.appendChild(fieldElement);
  }

  private renderCondition(element: HTMLElement, conditions: Condition[], condition: Condition) {
    const conditionElement = document.createElement('div');

    const operatorSelect = document.createElement('select');
    operatorSelect.innerHTML = Object.entries(this.settings.conditionOperators)
      .map(([key, label]) => `<option value="${key}"${condition.operator === key ? " selected" : ""}>${label}</option>`)
      .join('');

    operatorSelect.addEventListener('change', event => {
      event.preventDefault();
      condition.operator = operatorSelect.value as ConditionOperator;
      this.onChange();
    });

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.value = condition.value;
    valueInput.addEventListener('change', event => {
      event.preventDefault();
      condition.value = valueInput.value;
      this.onChange();
    });

    const removeConditionBtn = document.createElement('button');
    removeConditionBtn.textContent = '-';
    removeConditionBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeCondition(conditionElement, conditions, condition);
    });

    conditionElement.appendChild(operatorSelect);
    conditionElement.appendChild(valueInput);
    conditionElement.appendChild(removeConditionBtn);

    element.appendChild(conditionElement);
  }

  private removeCondition(element: HTMLElement, conditions: Condition[], condition: Condition) {
    const index = conditions.indexOf(condition);
    conditions.splice(index, 1);

    this.onChange();

    element.remove();
  }

  private addCondition(element: HTMLElement, conditions: Condition[]) {
    const newCondition: Condition = { operator: 'eq', value: '' };
    conditions.push(newCondition);

    this.onChange();

    this.renderCondition(element, conditions, newCondition);
  }

  private addField(element: HTMLElement, fields: Field[]) {
    const newField: Field = { key: '', conditions: [] };
    fields.push(newField);

    this.onChange();

    this.renderField(element, fields, newField);
  }

  private removeField(element: HTMLElement, fields: Field[], field: Field) {
    const index = fields.indexOf(field);
    fields.splice(index, 1);

    this.onChange();

    element.remove();
  }

  private addGroup(element: HTMLElement, groups: Group[]) {
    const newGroup: Group = {
      operator: 'and',
      fields: []
    };
    groups.push(newGroup);

    this.onChange();

    this.renderGroup(element, groups, newGroup);
  }

  private removeGroup(element: HTMLElement, groups: Group[], group: Group) {
    const index = groups.indexOf(group);
    groups.splice(index, 1);

    this.onChange();

    element.remove();
  }

  private onChange() {
    this.input.value = serialize(this.groups);

    const event = new Event('change', { bubbles: true });
    this.input.dispatchEvent(event);
  }
}
