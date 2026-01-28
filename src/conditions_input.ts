import { getInputElement } from './utils/input';
import { deserialize, serialize } from './serializer';
import type { Group, Field, Condition, Operator, ConditionOperator } from './types';

type Settings = {}

declare global {
  interface HTMLInputElement {
    conditionsInput?: ConditionsInput | null;
  }

  interface HTMLTextAreaElement {
    conditionsInput?: ConditionsInput | null;
  }
}

export class ConditionsInput {
  private settings: Settings = {};
  private groups: Group[] = [];

  private input: HTMLInputElement | HTMLTextAreaElement;
  private containerElement: HTMLElement;

  constructor(
    input: HTMLInputElement | HTMLTextAreaElement | string, 
    settings: Partial<Settings> = {}
  ) {
    this.settings = { ...this.settings, ...settings };
    this.input = getInputElement(input);
    this.input.addEventListener('change', (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      this.groups = deserialize(target.value);
      this.rerender();
    });
    this.groups = deserialize(this.input.value);
    this.containerElement = document.createElement('div');

    this.render();
  }

  private rerender() {
    if (this.containerElement) this.containerElement.remove();
    this.containerElement = document.createElement('div');

    this.render();
  }

  private render() {
    const addGroupBtn = document.createElement('button');
    addGroupBtn.textContent = '+';
    addGroupBtn.addEventListener('click', event => { 
      event.preventDefault()
      this.addGroup(this.containerElement, this.groups)
    });

    this.containerElement.appendChild(addGroupBtn);
    this.groups.forEach(group => this.renderGroup(this.containerElement, this.groups, group));

    this.input.after(this.containerElement);
  }

  private renderGroup(element: HTMLElement, groups: Group[], group: Group) {
    const groupElement = document.createElement('div');

    const operatorSelect = document.createElement('select');
    operatorSelect.innerHTML = `
      <option value="and"${group.operator === "and" ? " selected" : ""}>and</option>
      <option value="or"${group.operator === "or" ? " selected" : ""}>or</option>
    `;

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
    group.fields.forEach(field => this.renderField(fieldsElement, group.fields, field));

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

  private renderField(element: HTMLElement, fields: Field[], field: Field) {
    const fieldElement = document.createElement('div');
    
    const fieldSelect = document.createElement('select');
    fieldSelect.innerHTML = `
      <option value="${field.field} selected">${field.field}</option>
    `;

    fieldSelect.addEventListener('change', event => {
      event.preventDefault();
      field.field = fieldSelect.value;
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

    fieldElement.appendChild(fieldSelect);
    fieldElement.appendChild(removeFieldBtn);
    fieldElement.appendChild(conditionsElement);
    fieldElement.appendChild(addFieldBtn);
    
    element.appendChild(fieldElement);
  }

  private renderCondition(element: HTMLElement, conditions: Condition[], condition: Condition) {
    const conditionElement = document.createElement('div');

    const operatorSelect = document.createElement('select');
    operatorSelect.innerHTML = `
      <option value="eq"${condition.operator === "eq" ? " selected" : ""}>eq</option>
      <option value="ne"${condition.operator === "ne" ? " selected" : ""}>ne</option>
      <option value="gt"${condition.operator === "gt" ? " selected" : ""}>gt</option>
      <option value="gte"${condition.operator === "gte" ? " selected" : ""}>gte</option>
      <option value="lt"${condition.operator === "lt" ? " selected" : ""}>lt</option>
      <option value="lte"${condition.operator === "lte" ? " selected" : ""}>lte</option>
    `;

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
    const newCondition: Condition = {
      operator: 'eq',
      value: ''
    };
    conditions.push(newCondition);

    this.onChange();
  }

  private addField(element: HTMLElement, fields: Field[]) {
    const newField: Field = {
      field: '',
      conditions: []
    };
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
