import { deserialize, serialize } from './serializer';
import { fieldList, fieldKey } from './mapping';
import { create, find, visible, append } from './utils/dom';

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
    buttons: {
      addGroup: '+ group',
      removeGroup: '- group',
      addField: '+ field',
      removeField: '- field',
      addCondition: '+ condition',
      removeCondition: '-',
    },
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
  private wrapperElement: HTMLElement;

  constructor(
    input: HTMLInputElement | HTMLTextAreaElement | string,
    settings: Partial<Settings> = {}
  ) {
    this.settings = { ...this.settings, ...settings };
    this.input = find(input);
    this.input.addEventListener('change', event => {
      if (!event.isTrusted) return; // ignore programmatic events

      this.groups = deserialize(this.input.value);
      this.wrapperElement.remove();
      this.wrapperElement = create('div', 'conditions-wrapper');
      this.render();
    });
    this.input.conditions = this;
    this.groups = deserialize(this.input.value);
    this.wrapperElement = create('div', 'conditions-wrapper');

    this.render();
  }

  public destroy() {
    this.input.conditions = null;
    this.wrapperElement.remove();
  }

  private render() {
    const addGroupBtn = create('button', 'conditions-button');
    addGroupBtn.textContent = this.settings.buttons.addGroup;
    addGroupBtn.addEventListener('click', event => {
      event.preventDefault()

      const newGroup: Group = { operator: 'and', fields: [] };
      this.addItem(this.wrapperElement, this.groups, newGroup, this.settings.mapping, this.renderGroup.bind(this));
    });

    append(this.wrapperElement, addGroupBtn);

    this.groups.forEach(group => this.renderGroup(this.wrapperElement, this.groups, group, this.settings.mapping));

    this.input.after(this.wrapperElement);
  }

  private renderGroup(element: HTMLElement, groups: Group[], group: Group, mapping?: Mapping) {
    const groupElement = create('div', 'conditions-group');

    const operatorSelect = create('select', 'conditions-select');
    operatorSelect.innerHTML = Object.entries(this.settings.operators)
      .map(([key, label]) => `<option value="${key}"${group.operator === key ? " selected" : ""}>${label}</option>`)
      .join('');

    operatorSelect.addEventListener('change', () => {
      group.operator = operatorSelect.value as Operator;
      this.onChange();
    });

    const removeGroupBtn = create('button', 'conditions-button');
    removeGroupBtn.textContent = this.settings.buttons.removeGroup;
    removeGroupBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeItem(groupElement, groups, group);
    });

    const fieldsElement = create('div', 'conditions-fields');
    group.fields.forEach(field => this.renderField(fieldsElement, group.fields, field, mapping));

    const addFieldBtn = create('button', 'conditions-button');
    addFieldBtn.textContent = this.settings.buttons.addField;
    addFieldBtn.addEventListener('click', event => {
      event.preventDefault()

      const newField: Field = { key: '', conditions: [] };
      this.addItem(fieldsElement, group.fields, newField, mapping, this.renderField.bind(this));
    });

    append(groupElement, operatorSelect, removeGroupBtn, fieldsElement, addFieldBtn);
    append(element, groupElement);
  }

  private renderField(element: HTMLElement, fields: Field[], field: Field, mapping?: Mapping) {
    const fieldElement = create('div', 'conditions-field');

    let fieldInput: HTMLInputElement | HTMLSelectElement;

    const removeFieldBtn = create('button', 'conditions-button');
    const conditionsElement = create('div', 'conditions-conditions');
    const addConditionBtn = create('button', 'conditions-button');
    const nestedGroupsElement = create('div', 'conditions-nested-groups');
    const addNestedGroupBtn = create('button', 'conditions-button');

    if(!mapping) {
      fieldInput = create('input', 'conditions-input');
      fieldInput.value = field.key;
    } else {
      fieldInput = create('select', 'conditions-select');
      fieldInput.setAttribute('data-field', fieldKey(field.key));
      fieldInput.innerHTML = fieldList(mapping)
        .map(({ key, label }) => `<option value="${key}"${field.key === key ? " selected" : ""}>${label}</option>`)
        .join('');

      fieldInput.addEventListener('change', event => {
        event.preventDefault();

        const prevField = fieldKey(fieldInput.getAttribute('data-field'));
        const nextField = fieldKey(fieldInput.value);

        if(prevField !== nextField) {
          fieldInput.setAttribute('data-field', fieldInput.value);

          nestedGroupsElement.innerHTML = '';
          if(mapping[nextField] && mapping[nextField].type === 'object') {
            visible(addNestedGroupBtn, true);
          } else {
            visible(addNestedGroupBtn, false);
            field.where = undefined;
          }
        }
      });
    }

    fieldInput.addEventListener('change', event => {
      event.preventDefault();
      field.key = fieldInput.value;
      this.onChange();
    });

    removeFieldBtn.textContent = this.settings.buttons.removeField;
    removeFieldBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeItem(fieldElement, fields, field);
    });

    field.conditions.forEach(condition => this.renderCondition(conditionsElement, field.conditions, condition));

    addConditionBtn.textContent = this.settings.buttons.addCondition;
    addConditionBtn.addEventListener('click', event => {
      event.preventDefault()

      const currentField = fieldKey(fieldInput.getAttribute('data-field'));
      const currentMapping = mapping && mapping[currentField] ? mapping[currentField].mapping : undefined;

      const newCondition: Condition = { operator: 'eq', value: '' };
      this.addItem(conditionsElement, field.conditions, newCondition, currentMapping, this.renderCondition.bind(this));
    });

    const currentField = fieldKey(field.key)
    if(!mapping || mapping[currentField] && mapping[currentField].type === 'object') {
      field.where?.forEach(group => this.renderGroup(nestedGroupsElement, field.where!, group, mapping && mapping[fieldKey(field.key)] ? mapping[fieldKey(field.key)].mapping : undefined));
      visible(addNestedGroupBtn, true);
    } else {
      visible(addNestedGroupBtn, false);
    }

    addNestedGroupBtn.textContent = this.settings.buttons.addGroup;
    addNestedGroupBtn.addEventListener('click', event => {
      event.preventDefault()

      const currentField = fieldKey(fieldInput.getAttribute('data-field'));
      const currentMapping = mapping && mapping[currentField] ? mapping[currentField].mapping : undefined;

      if(!field.where) field.where = [];

      const newGroup: Group = { operator: 'and', fields: [] };
      this.addItem(nestedGroupsElement, field.where, newGroup, currentMapping, this.renderGroup.bind(this));
    });

    append(fieldElement, fieldInput, removeFieldBtn, conditionsElement, addConditionBtn, nestedGroupsElement, addNestedGroupBtn);
    append(element, fieldElement);
  }

  private renderCondition(element: HTMLElement, conditions: Condition[], condition: Condition, _mapping?: Mapping) {
    const conditionElement = create('div', 'conditions-condition');

    const operatorSelect = create('select', 'conditions-select');
    operatorSelect.innerHTML = Object.entries(this.settings.conditionOperators)
      .map(([key, label]) => `<option value="${key}"${condition.operator === key ? " selected" : ""}>${label}</option>`)
      .join('');

    operatorSelect.addEventListener('change', event => {
      event.preventDefault();
      condition.operator = operatorSelect.value as ConditionOperator;
      this.onChange();
    });

    const valueInput = create('input', 'conditions-input');
    valueInput.value = condition.value;
    valueInput.addEventListener('change', event => {
      event.preventDefault();
      condition.value = valueInput.value;
      this.onChange();
    });

    const removeConditionBtn = create('button', 'conditions-button');
    removeConditionBtn.textContent = this.settings.buttons.removeCondition;
    removeConditionBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeItem(conditionElement, conditions, condition);
    });

    append(conditionElement, operatorSelect, valueInput, removeConditionBtn);
    append(element, conditionElement);
  }

  private addItem<T>(element: HTMLElement, array: T[], item: T, mapping: Mapping | undefined, renderItem: (element: HTMLElement, array: T[], item: T, mapping?: Mapping) => void) {
    array.push(item);

    this.onChange();

    renderItem(element, array, item, mapping);
  }

  private removeItem<T>(element: HTMLElement, array: T[], item: T) {
    const index = array.indexOf(item);
    array.splice(index, 1);

    this.onChange();

    element.remove();
  }

  private onChange() {
    this.input.value = serialize(this.groups);

    const event = new Event('change', { bubbles: true });
    this.input.dispatchEvent(event);
  }
}
