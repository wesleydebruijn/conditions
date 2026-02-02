import { deserialize, serialize } from './serializer';
import { fieldList, fieldKey } from './mapping';
import { create, createIcon, find, visible, append } from './utils/dom';

import type { Group, Field, FieldSet, Condition, Operator, ConditionOperator, Settings, Mapping } from './types';

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
      fieldSet: 'Field Set',
      condition: 'Condition',
      nestedGroup: 'Filter',
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
    visible(this.input, false);

    this.render();
  }

  public destroy() {
    this.input.conditions = null;
    this.wrapperElement.remove();

    visible(this.input, true);
  }

  private render() {
    const buttonGroup = create('div', 'conditions-button-group');
    const addGroupBtn = create('button', 'conditions-btn conditions-btn-add-group');
    const groupsContainer = create('div', 'conditions-groups-container');

    addGroupBtn.appendChild(createIcon('plus'));
    addGroupBtn.addEventListener('click', event => {
      event.preventDefault()

      const newGroup: Group = { operator: 'and', fieldSets: [{ fields: [{ key: '', conditions: [] }] }] };
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
    const groupBody = create('div', 'conditions-group-body');
    const groupBadge = create('span', 'conditions-group-badge');
    const fieldSetsContainer = create('div', 'conditions-field-sets-container');
    const operatorSelect = create('select', 'conditions-select');
    const removeGroupBtn = create('button', 'conditions-btn conditions-btn-ghost conditions-btn-destructive conditions-remove-group-btn');
    const addFieldSetBtn = create('button', 'conditions-btn conditions-btn-add-fieldset');

    // badge (collapse SVG + label; whole badge toggles collapse)
    groupBadge.appendChild(createIcon('collapse'));
    groupBadge.appendChild(document.createTextNode(nested ? this.settings.items.nestedGroup : this.settings.items.group));
    groupBadge.addEventListener('click', () => groupElement.classList.toggle('is-collapsed'));

    // operator select
    operatorSelect.innerHTML = Object.entries(this.settings.operators)
      .map(([key, label]) => `<option value="${key}"${group.operator === key ? " selected" : ""}>${label}</option>`)
      .join('');

    operatorSelect.addEventListener('change', () => {
      group.operator = operatorSelect.value as Operator;
      this.onChange();
    });

    // remove group button
    removeGroupBtn.appendChild(createIcon('close'));
    removeGroupBtn.setAttribute('aria-label', 'Remove');
    removeGroupBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeItem(groupElement, groups, group);
    });

    // field sets
    group.fieldSets.forEach(fieldSet => this.renderFieldSet(fieldSetsContainer, group.fieldSets, fieldSet, mapping));

    // add field set button
    addFieldSetBtn.appendChild(createIcon('plus'));
    addFieldSetBtn.addEventListener('click', event => {
      event.preventDefault()

      const newFieldSet: FieldSet = { fields: [{ key: '', conditions: [] }] };
      this.addItem(fieldSetsContainer, group.fieldSets, newFieldSet, mapping, this.renderFieldSet.bind(this));
    });

    append(groupHeader, groupBadge, operatorSelect, addFieldSetBtn, removeGroupBtn);
    append(groupBody, fieldSetsContainer);
    append(groupContainer, groupHeader, groupBody);
    append(groupElement, groupContainer);
    append(element, groupElement);
  }

  private renderNestedGroups(element: HTMLElement, groups: Group[], group: Group, mapping?: Mapping) {
    this.renderGroup(element, groups, group, mapping, true);
  }

  private renderFieldSet(element: HTMLElement, fieldSets: FieldSet[], fieldSet: FieldSet, mapping?: Mapping) {
    const fieldSetElement = create('div', 'conditions-field-set');
    const fieldSetHeader = create('div', 'conditions-field-set-header');
    const fieldSetBody = create('div', 'conditions-field-set-body');
    const fieldSetBadge = create('span', 'conditions-field-set-badge');
    const fieldsContainer = create('div', 'conditions-fields-container');
    const removeFieldSetBtn = create('button', 'conditions-btn conditions-btn-ghost conditions-btn-destructive conditions-remove-group-btn');
    const addFieldBtn = create('button', 'conditions-btn conditions-btn-add-field');

    // badge (collapse SVG + label; whole badge toggles collapse)
    fieldSetBadge.appendChild(createIcon('collapse'));
    fieldSetBadge.appendChild(document.createTextNode(this.settings.items.fieldSet));
    fieldSetBadge.addEventListener('click', () => fieldSetElement.classList.toggle('is-collapsed'));

    // fields
    fieldSet.fields.forEach(field => this.renderField(fieldsContainer, fieldSet.fields, field, mapping));

    // remove field set button
    removeFieldSetBtn.appendChild(createIcon('close'));
    removeFieldSetBtn.setAttribute('aria-label', 'Remove');
    removeFieldSetBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeItem(fieldSetElement, fieldSets, fieldSet);
    });

    // add field button
    addFieldBtn.appendChild(createIcon('plus'));
    addFieldBtn.addEventListener('click', event => {
      event.preventDefault()

      const newField: Field = { key: '', conditions: [] };
      this.addItem(fieldsContainer, fieldSet.fields, newField, mapping, this.renderField.bind(this));
    });

    append(fieldSetHeader, fieldSetBadge, addFieldBtn, removeFieldSetBtn);
    append(fieldSetBody, fieldsContainer);
    append(fieldSetElement, fieldSetHeader, fieldSetBody);
    append(element, fieldSetElement);
  }

  private renderField(element: HTMLElement, fields: Field[], field: Field, mapping?: Mapping) {
    let fieldInput: HTMLInputElement | HTMLSelectElement;

    const fieldElement = create('div', 'conditions-field');
    const fieldHeader = create('div', 'conditions-field-header');
    const fieldBody = create('div', 'conditions-field-body');
    const fieldBadge = create('span', 'conditions-field-badge');
    const removeFieldBtn = create('button', 'conditions-btn conditions-btn-ghost conditions-btn-destructive');
    const conditionsElement = create('div', 'conditions-field-conditions');
    const addConditionBtn = create('button', 'conditions-btn conditions-btn-add-condition');
    const nestedGroupsElement = create('div', 'conditions-nested-groups');
    const addNestedGroupBtn = create('button', 'conditions-btn conditions-btn-add-filter');

    // badge (collapse SVG + label; whole badge toggles collapse)
    fieldBadge.appendChild(createIcon('collapse'));
    fieldBadge.appendChild(document.createTextNode(this.settings.items.field));
    fieldBadge.addEventListener('click', () => fieldElement.classList.toggle('is-collapsed'));

    if(!mapping) {
      fieldInput = create('input', 'conditions-field-input');
      fieldInput.value = field.key;
    } else {
      fieldInput = create('select', 'conditions-field-select');
      fieldInput.setAttribute('data-field', fieldKey(field.key));
      fieldInput.innerHTML =
        `<option value="">--- Select ${this.settings.items.field} ---</option>` +
        fieldList(mapping)
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

    removeFieldBtn.appendChild(createIcon('close'));
    removeFieldBtn.setAttribute('aria-label', 'Remove');
    removeFieldBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeItem(fieldElement, fields, field);
    });

    field.conditions.forEach(condition => this.renderCondition(conditionsElement, field.conditions, condition));

    addConditionBtn.appendChild(createIcon('plus'));
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

    addNestedGroupBtn.appendChild(createIcon('filter'));
    addNestedGroupBtn.addEventListener('click', event => {
      event.preventDefault()

      const currentField = fieldKey(fieldInput.getAttribute('data-field'));
      const currentMapping = mapping && mapping[currentField] ? mapping[currentField].mapping : undefined;

      if(!field.where) field.where = [];

      const newGroup: Group = { operator: 'and', fieldSets: [{ fields: [{ key: '', conditions: [] }] }] };
      this.addItem(nestedGroupsElement, field.where, newGroup, currentMapping, this.renderNestedGroups.bind(this));
    });

    append(fieldHeader, fieldBadge, fieldInput, addConditionBtn, addNestedGroupBtn, removeFieldBtn);
    append(fieldBody, conditionsElement, nestedGroupsElement);
    append(fieldElement, fieldHeader, fieldBody);
    append(element, fieldElement);
  }

  private renderCondition(element: HTMLElement, conditions: Condition[], condition: Condition, _mapping?: Mapping) {
    const conditionElement = create('div', 'conditions-condition-row');
    const conditionInputs = create('div', 'conditions-condition-inputs');
    const operatorSelect = create('select', 'conditions-operator-select');
    const valueInput = create('input', 'conditions-value-input');
    const removeConditionBtn = create('button', 'conditions-btn conditions-btn-ghost conditions-btn-destructive');

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
    removeConditionBtn.appendChild(createIcon('close'));
    removeConditionBtn.setAttribute('aria-label', 'Remove');
    removeConditionBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeItem(conditionElement, conditions, condition);
    });

    append(conditionInputs, operatorSelect, valueInput);
    append(conditionElement, conditionInputs, removeConditionBtn);
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
