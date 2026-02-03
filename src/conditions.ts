import { deserialize, serialize } from './serializer';
import { fieldList, fieldKey } from './mapping';
import { create, createIcon, find, visible, append } from './utils/dom';

import type {
  Group,
  Field,
  FieldSet,
  Condition,
  Operator,
  ConditionOperator,
  Settings,
  Mapping,
  ClassNames,
} from './types';

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
    classNames: {
      wrapper: 'conditions-wrapper',
      groupsContainer: 'conditions-groups-container',

      groupSection: 'conditions-group-section',
      groupHeader: 'conditions-group-header',
      groupBody: 'conditions-group-body',
      groupBadge: 'conditions-group-badge',
      select: 'conditions-select',

      fieldsetSection: 'conditions-fieldset-section',
      fieldsetHeader: 'conditions-fieldset-header',
      fieldsetBody: 'conditions-fieldset-body',
      fieldsetBadge: 'conditions-fieldset-badge',

      fieldSection: 'conditions-field-section',
      fieldHeader: 'conditions-field-header',
      fieldBody: 'conditions-field-body',
      fieldBadge: 'conditions-field-badge',
      fieldConditions: 'conditions-field-conditions',
      fieldNestedGroups: 'conditions-field-nested-groups',
      fieldInput: 'conditions-field-input',
      fieldSelect: 'conditions-field-select',

      conditionSection: 'conditions-condition-section',
      conditionInputs: 'conditions-condition-inputs',
      operatorSelect: 'conditions-operator-select',
      valueInput: 'conditions-value-input',

      isCollapsed: 'is-collapsed',

      buttonAddGroup: 'conditions-btn-add-group',
      buttonAddFieldSet: 'conditions-btn-add-fieldset',
      buttonAddField: 'conditions-btn-add-field',
      buttonAddCondition: 'conditions-btn-add-condition',
      buttonAddFilter: 'conditions-btn-add-filter',
      buttonRemove: 'conditions-btn-remove',
    },
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
      this.wrapperElement = create('div', this.settings.classNames.wrapper);

      this.render();
    });
    this.input.conditions = this;
    this.groups = deserialize(this.input.value);
    this.wrapperElement = create('div', this.settings.classNames.wrapper);
    visible(this.input, false);

    this.render();
  }

  public destroy() {
    this.input.conditions = null;
    this.wrapperElement.remove();

    visible(this.input, true);
  }

  private render() {
    const addGroupBtn = create('button', this.settings.classNames.buttonAddGroup);
    const groupsContainer = create('div', this.settings.classNames.groupsContainer);

    addGroupBtn.appendChild(createIcon('plus'));
    addGroupBtn.addEventListener('click', event => {
      event.preventDefault()

      const newGroup: Group = { operator: 'and', fieldSets: [{ fields: [{ key: '', conditions: [] }] }] };
      this.addItem(groupsContainer, this.groups, newGroup, this.settings.mapping, this.renderGroup.bind(this));
    });

    this.groups.forEach(group => this.renderGroup(groupsContainer, this.groups, group, this.settings.mapping));

    append(this.wrapperElement, groupsContainer, addGroupBtn);

    this.input.after(this.wrapperElement);
  }

  private renderGroup(element: HTMLElement, groups: Group[], group: Group, mapping?: Mapping, nested?: boolean) {
    const groupSection = create('div', this.settings.classNames.groupSection);
    const groupHeader = create('div', this.settings.classNames.groupHeader);
    const groupBody = create('div', this.settings.classNames.groupBody);
    const groupBadge = create('span', this.settings.classNames.groupBadge);
    const operatorSelect = create('select', this.settings.classNames.select);
    const removeGroupBtn = create('button', this.settings.classNames.buttonRemove);
    const addFieldSetBtn = create('button', this.settings.classNames.buttonAddFieldSet);

    // badge (collapse SVG + label; whole badge toggles collapse)
    groupBadge.appendChild(createIcon('collapse'));
    groupBadge.appendChild(document.createTextNode(nested ? this.settings.items.nestedGroup : this.settings.items.group));
    groupBadge.addEventListener('click', () => groupSection.classList.toggle(this.settings.classNames.isCollapsed));

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
      this.removeItem(groupSection, groups, group);
    });

    // field sets
    group.fieldSets.forEach(fieldSet => this.renderFieldSet(groupBody, group.fieldSets, fieldSet, mapping));

    // add field set button
    addFieldSetBtn.appendChild(createIcon('plus'));
    addFieldSetBtn.addEventListener('click', event => {
      event.preventDefault()

      const newFieldSet: FieldSet = { fields: [{ key: '', conditions: [] }] };
      this.addItem(groupBody, group.fieldSets, newFieldSet, mapping, this.renderFieldSet.bind(this));
    });

    append(groupHeader, groupBadge, operatorSelect, addFieldSetBtn, removeGroupBtn);
    append(groupSection, groupHeader, groupBody);
    append(element, groupSection);
  }

  private renderNestedGroups(element: HTMLElement, groups: Group[], group: Group, mapping?: Mapping) {
    this.renderGroup(element, groups, group, mapping, true);
  }

  private renderFieldSet(element: HTMLElement, fieldSets: FieldSet[], fieldSet: FieldSet, mapping?: Mapping) {
    const fieldSetSection = create('div', this.settings.classNames.fieldsetSection);
    const fieldSetHeader = create('div', this.settings.classNames.fieldsetHeader);
    const fieldSetBody = create('div', this.settings.classNames.fieldsetBody);
    const fieldSetBadge = create('span', this.settings.classNames.fieldsetBadge);
    const removeFieldSetBtn = create('button', this.settings.classNames.buttonRemove);
    const addFieldBtn = create('button', this.settings.classNames.buttonAddField);

    // badge (collapse SVG + label; whole badge toggles collapse)
    fieldSetBadge.appendChild(createIcon('collapse'));
    fieldSetBadge.appendChild(document.createTextNode(this.settings.items.fieldSet));
    fieldSetBadge.addEventListener('click', () => fieldSetSection.classList.toggle(this.settings.classNames.isCollapsed));

    // fields
    fieldSet.fields.forEach(field => this.renderField(fieldSetBody, fieldSet.fields, field, mapping));

    // remove field set button
    removeFieldSetBtn.appendChild(createIcon('close'));
    removeFieldSetBtn.setAttribute('aria-label', 'Remove');
    removeFieldSetBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeItem(fieldSetSection, fieldSets, fieldSet);
    });

    // add field button
    addFieldBtn.appendChild(createIcon('plus'));
    addFieldBtn.addEventListener('click', event => {
      event.preventDefault()

      const newField: Field = { key: '', conditions: [] };
      this.addItem(fieldSetBody, fieldSet.fields, newField, mapping, this.renderField.bind(this));
    });

    append(fieldSetHeader, fieldSetBadge, addFieldBtn, removeFieldSetBtn);
    append(fieldSetSection, fieldSetHeader, fieldSetBody);
    append(element, fieldSetSection);
  }

  private renderField(element: HTMLElement, fields: Field[], field: Field, mapping?: Mapping) {
    let fieldInput: HTMLInputElement | HTMLSelectElement;

    const fieldElement = create('div', this.settings.classNames.fieldSection);
    const fieldHeader = create('div', this.settings.classNames.fieldHeader);
    const fieldBody = create('div', this.settings.classNames.fieldBody);
    const fieldBadge = create('span', this.settings.classNames.fieldBadge);
    const removeFieldBtn = create('button', this.settings.classNames.buttonRemove);
    const conditionsElement = create('div', this.settings.classNames.fieldConditions);
    const addConditionBtn = create('button', this.settings.classNames.buttonAddCondition);
    const nestedGroupsElement = create('div', this.settings.classNames.fieldNestedGroups);
    const addNestedGroupBtn = create('button', this.settings.classNames.buttonAddFilter);

    // badge (collapse SVG + label; whole badge toggles collapse)
    fieldBadge.appendChild(createIcon('collapse'));
    fieldBadge.appendChild(document.createTextNode(this.settings.items.field));
    fieldBadge.addEventListener('click', () => fieldElement.classList.toggle(this.settings.classNames.isCollapsed));

    if(!mapping) {
      fieldInput = create('input', this.settings.classNames.fieldInput);
      fieldInput.value = field.key;
    } else {
      fieldInput = create('select', this.settings.classNames.fieldSelect);
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
    const conditionElement = create('div', this.settings.classNames.conditionSection);
    const conditionInputs = create('div', this.settings.classNames.conditionInputs);
    const operatorSelect = create('select', this.settings.classNames.operatorSelect);
    const valueInput = create('input', this.settings.classNames.valueInput);
    const removeConditionBtn = create('button', this.settings.classNames.buttonRemove);

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
