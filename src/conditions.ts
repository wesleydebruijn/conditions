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
    items: {
      group: 'Group',
      field: 'Field',
      condition: 'Condition',
      nestedGroup: 'Nested Group',
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
    const buttonGroup = create('div', 'conditions-button-group');
    const addGroupBtn = create('button', 'conditions-btn conditions-btn-primary');
    const groupsContainer = create('div', 'conditions-groups-container');

    addGroupBtn.textContent = `+ ${this.settings.items.group}`;
    addGroupBtn.addEventListener('click', event => {
      event.preventDefault()

      const newGroup: Group = { operator: 'and', fields: [] };
      this.addItem(groupsContainer, this.groups, newGroup, this.settings.mapping, this.renderGroup.bind(this));
    });

    this.groups.forEach(group => this.renderGroup(groupsContainer, this.groups, group, this.settings.mapping));

    append(buttonGroup, addGroupBtn);
    append(this.wrapperElement, groupsContainer, buttonGroup);

    this.input.after(this.wrapperElement);
  }
  
  private renderGroup(element: HTMLElement, groups: Group[], group: Group, mapping?: Mapping, nested?: boolean) {
    const groupElement = create('div', nested ? 'conditions-group nested' : 'conditions-group');
    const groupContainer = create('div', 'conditions-group-container');
    const groupHeader = create('div', 'conditions-group-header');
    const groupBadge = create('span', 'conditions-group-badge');
    const operatorSelect = create('select', 'conditions-select');
    const removeGroupBtn = create('button', 'conditions-btn conditions-btn-ghost conditions-btn-destructive conditions-remove-group-btn');
    const fieldsContainer = create('div', 'conditions-fields-container');
    const groupButtonGroup = create('div', 'conditions-button-group');
    const addFieldBtn = create('button', 'conditions-btn conditions-btn-secondary');

    // badge
    groupBadge.textContent = this.settings.items.group;

    // operator select
    operatorSelect.innerHTML = Object.entries(this.settings.operators)
      .map(([key, label]) => `<option value="${key}"${group.operator === key ? " selected" : ""}>${label}</option>`)
      .join('');

    operatorSelect.addEventListener('change', () => {
      group.operator = operatorSelect.value as Operator;
      this.onChange();
    });

    // remove group button
    removeGroupBtn.textContent = 'x';
    removeGroupBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeItem(groupElement, groups, group);
    });

    // fields
    group.fields.forEach(field => this.renderField(fieldsContainer, group.fields, field, mapping));

    // add field button
    addFieldBtn.textContent = `+ ${this.settings.items.field}`;
    addFieldBtn.addEventListener('click', event => {
      event.preventDefault()

      const newField: Field = { key: '', conditions: [] };
      this.addItem(fieldsContainer, group.fields, newField, mapping, this.renderField.bind(this));
    });

    append(groupHeader, groupBadge, operatorSelect, removeGroupBtn);
    append(groupButtonGroup, addFieldBtn);
    append(groupContainer, groupHeader, fieldsContainer, groupButtonGroup);
    append(groupElement, groupContainer);
    append(element, groupElement);
  }

  private renderNestedGroups(element: HTMLElement, groups: Group[], group: Group, mapping?: Mapping) {
    this.renderGroup(element, groups, group, mapping, true);
  }

  private renderField(element: HTMLElement, fields: Field[], field: Field, mapping?: Mapping) {
    let fieldInput: HTMLInputElement | HTMLSelectElement;

    const fieldElement = create('div', 'conditions-field-block');
    const fieldHeader = create('div', 'conditions-field-header');
    const fieldBadge = create('span', 'conditions-field-badge');
    const removeFieldBtn = create('button', 'conditions-btn conditions-btn-ghost conditions-btn-destructive');
    const conditionsElement = create('div', 'conditions-field-conditions');
    const addConditionBtn = create('button', 'conditions-btn conditions-btn-outline');
    const nestedGroupsElement = create('div', 'conditions-nested-groups');
    const buttonGroup = create('div', 'conditions-button-group');
    const addNestedGroupBtn = create('button', 'conditions-btn');

    // badge
    fieldBadge.textContent = this.settings.items.field;

    if(!mapping) {
      fieldInput = create('input', 'conditions-field-input');
      fieldInput.value = field.key;
    } else {
      fieldInput = create('select', 'conditions-field-select');
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

    removeFieldBtn.textContent = 'x';
    removeFieldBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeItem(fieldElement, fields, field);
    });

    field.conditions.forEach(condition => this.renderCondition(conditionsElement, field.conditions, condition));

    addConditionBtn.textContent = `+ ${this.settings.items.condition}`;
    addConditionBtn.addEventListener('click', event => {
      event.preventDefault()

      const currentField = fieldKey(fieldInput.getAttribute('data-field'));
      const currentMapping = mapping && mapping[currentField] ? mapping[currentField].mapping : undefined;

      const newCondition: Condition = { operator: 'eq', value: '' };
      this.addItem(conditionsElement, field.conditions, newCondition, currentMapping, this.renderCondition.bind(this));
    });

    const currentField = fieldKey(field.key)
    if(!mapping || mapping[currentField] && mapping[currentField].type === 'object') {
      field.where?.forEach(group => this.renderNestedGroups(nestedGroupsElement, field.where!, group, mapping && mapping[fieldKey(field.key)] ? mapping[fieldKey(field.key)].mapping : undefined));
      visible(addNestedGroupBtn, true);
    } else {
      visible(addNestedGroupBtn, false);
    }

    addNestedGroupBtn.textContent = `+ ${this.settings.items.nestedGroup}`;
    addNestedGroupBtn.addEventListener('click', event => {
      event.preventDefault()

      const currentField = fieldKey(fieldInput.getAttribute('data-field'));
      const currentMapping = mapping && mapping[currentField] ? mapping[currentField].mapping : undefined;

      if(!field.where) field.where = [];

      const newGroup: Group = { operator: 'and', fields: [] };
      this.addItem(nestedGroupsElement, field.where, newGroup, currentMapping, this.renderNestedGroups.bind(this));
    });

    append(fieldHeader, fieldBadge, fieldInput, removeFieldBtn);
    append(buttonGroup, addConditionBtn, addNestedGroupBtn);
    append(fieldElement, fieldHeader, nestedGroupsElement, conditionsElement, buttonGroup);
    append(element, fieldElement);
  }

  private renderCondition(element: HTMLElement, conditions: Condition[], condition: Condition, _mapping?: Mapping) {
    const conditionElement = create('div', 'conditions-condition-row');
    const conditionBadge = create('span', 'conditions-condition-badge');
    const conditionInputs = create('div', 'conditions-condition-inputs');
    const operatorSelect = create('select', 'conditions-operator-select');
    const valueInput = create('input', 'conditions-value-input');
    const removeConditionBtn = create('button', 'conditions-btn conditions-btn-ghost conditions-btn-destructive');

    // badge
    conditionBadge.textContent = this.settings.items.condition;

    // operator select
    operatorSelect.innerHTML = Object.entries(this.settings.conditionOperators)
      .map(([key, label]) => `<option value="${key}"${condition.operator === key ? " selected" : ""}>${label}</option>`)
      .join('');

    operatorSelect.addEventListener('change', event => {
      event.preventDefault();
      condition.operator = operatorSelect.value as ConditionOperator;
      this.onChange();
    });

    // value input
    valueInput.value = condition.value;
    valueInput.addEventListener('change', event => {
      event.preventDefault();
      condition.value = valueInput.value;
      this.onChange();
    });

    // remove button
    removeConditionBtn.textContent = 'x';
    removeConditionBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeItem(conditionElement, conditions, condition);
    });

    append(conditionInputs, operatorSelect, valueInput);
    append(conditionElement, conditionBadge, conditionInputs, removeConditionBtn);
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
