import { deserialize, serialize } from './serializer';
import { fieldList, fieldKey, fieldOperatorValid, fieldType, operatorHasValue } from './schema';
import { create, createIcon, find, visible, append, prepend } from './dom';

import type {
  Group,
  Field,
  FieldSet,
  Condition,
  Operator,
  ConditionOperator,
  Settings,
  Schema,
  SchemaItem,
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
    hideInput: true,
    classNames: {
      wrapper: 'conditions-wrapper',
      groupsContainer: 'conditions-groups-container',

      groupSection: 'conditions-group-section',
      groupHeader: 'conditions-group-header',
      groupBody: 'conditions-group-body',
      groupBadge: 'conditions-group-badge',
      groupSelect: 'conditions-group-operator-select',

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
      conditionSelect: 'conditions-condition-operator-select',
      conditionValueInput: 'conditions-condition-value-input',

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
      fieldset: 'Fieldset',
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

    this.input = find<HTMLInputElement | HTMLTextAreaElement>(input);
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
    if(this.settings.hideInput) visible(this.input, false);

    this.render();
  }

  public destroy() {
    this.input.conditions = null;
    this.wrapperElement.remove();

    if(this.settings.hideInput) visible(this.input, true);
  }

  private render() {
    const addGroupBtn = create('button', this.settings.classNames.buttonAddGroup);
    const groupsContainer = create('div', this.settings.classNames.groupsContainer);

    addGroupBtn.appendChild(createIcon('plus'));
    addGroupBtn.addEventListener('click', event => {
      event.preventDefault()

      const newGroup: Group = { operator: 'and', fieldSets: [{ fields: [{ key: '', conditions: [] }] }] };
      this.addItem(groupsContainer, this.groups, newGroup, this.settings.schema, this.renderGroup.bind(this));
    });

    this.groups.forEach(group => this.renderGroup(groupsContainer, this.groups, group, this.settings.schema));

    append(this.wrapperElement, groupsContainer, addGroupBtn);

    this.input.after(this.wrapperElement);
  }

  private renderGroup(element: HTMLElement, groups: Group[], group: Group, schema?: Schema, nested?: boolean) {
    const groupSection = create('div', this.settings.classNames.groupSection);
    const groupHeader = create('div', this.settings.classNames.groupHeader);
    const groupBody = create('div', this.settings.classNames.groupBody);
    const groupBadge = create('span', this.settings.classNames.groupBadge);
    const groupOperatorSelect = create('select', this.settings.classNames.groupSelect);
    const removeGroupBtn = create('button', this.settings.classNames.buttonRemove);
    const addFieldSetBtn = create('button', this.settings.classNames.buttonAddFieldSet);

    // badge
    groupBadge.appendChild(createIcon('collapse'));
    groupBadge.appendChild(document.createTextNode(nested ? this.settings.items.nestedGroup : this.settings.items.group));
    groupBadge.addEventListener('click', () => groupSection.classList.toggle(this.settings.classNames.isCollapsed));

    // operator select
    groupOperatorSelect.innerHTML = Object.entries(this.settings.operators)
      .map(([key, label]) => `<option value="${key}"${group.operator === key ? " selected" : ""}>${label}</option>`)
      .join('');

      groupOperatorSelect.addEventListener('change', () => {
      group.operator = groupOperatorSelect.value as Operator;
      this.onChange();
    });

    // remove group button
    removeGroupBtn.appendChild(createIcon('close'));
    removeGroupBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeItem(groupSection, groups, group);
    });

    // field sets
    group.fieldSets.forEach(fieldset => this.renderFieldSet(groupBody, group.fieldSets, fieldset, schema));

    // add field set button
    addFieldSetBtn.appendChild(createIcon('plus'));
    addFieldSetBtn.addEventListener('click', event => {
      event.preventDefault()

      const newFieldSet: FieldSet = { fields: [{ key: '', conditions: [] }] };
      this.addItem(groupBody, group.fieldSets, newFieldSet, schema, this.renderFieldSet.bind(this));
    });

    append(groupHeader, groupBadge, groupOperatorSelect, addFieldSetBtn, removeGroupBtn);
    append(groupSection, groupHeader, groupBody);
    nested ? prepend(element, groupSection) : append(element, groupSection);
  }

  private renderNestedGroups(element: HTMLElement, groups: Group[], group: Group, schema?: Schema) {
    this.renderGroup(element, groups, group, schema, true);
  }

  private renderFieldSet(element: HTMLElement, fieldSets: FieldSet[], fieldset: FieldSet, schema?: Schema) {
    const fieldSetSection = create('div', this.settings.classNames.fieldsetSection);
    const fieldSetHeader = create('div', this.settings.classNames.fieldsetHeader);
    const fieldSetBody = create('div', this.settings.classNames.fieldsetBody);
    const fieldSetBadge = create('span', this.settings.classNames.fieldsetBadge);
    const removeFieldSetBtn = create('button', this.settings.classNames.buttonRemove);
    const addFieldBtn = create('button', this.settings.classNames.buttonAddField);

    // badge
    fieldSetBadge.appendChild(createIcon('collapse'));
    fieldSetBadge.appendChild(document.createTextNode(this.settings.items.fieldset));
    fieldSetBadge.addEventListener('click', () => fieldSetSection.classList.toggle(this.settings.classNames.isCollapsed));

    // fields
    fieldset.fields.forEach(field => this.renderField(fieldSetBody, fieldset.fields, field, schema));

    // remove field set button
    removeFieldSetBtn.appendChild(createIcon('close'));
    removeFieldSetBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeItem(fieldSetSection, fieldSets, fieldset);
    });

    // add field button
    addFieldBtn.appendChild(createIcon('plus'));
    addFieldBtn.addEventListener('click', event => {
      event.preventDefault()

      const newField: Field = { key: '', conditions: [] };
      this.addItem(fieldSetBody, fieldset.fields, newField, schema, this.renderField.bind(this));
    });

    append(fieldSetHeader, fieldSetBadge, addFieldBtn, removeFieldSetBtn);
    append(fieldSetSection, fieldSetHeader, fieldSetBody);
    prepend(element, fieldSetSection);
  }

  private renderField(element: HTMLElement, fields: Field[], field: Field, schema?: Schema) {
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

    const currentField = fieldKey(field.key);
    const currentSchema = schema && schema[currentField];

    // badge
    fieldBadge.appendChild(createIcon('collapse'));
    fieldBadge.appendChild(document.createTextNode(this.settings.items.field));
    fieldBadge.addEventListener('click', () => fieldElement.classList.toggle(this.settings.classNames.isCollapsed));

    // input
    if(!schema) {
      fieldInput = create('input', this.settings.classNames.fieldInput);
      fieldInput.value = field.key;

      fieldInput.addEventListener('change', event => {
        event.preventDefault();
        field.key = fieldInput.value;
        this.onChange();
      });
    } else {
      fieldInput = create('select', this.settings.classNames.fieldSelect);
      fieldInput.setAttribute('data-field', currentField);
      if(currentSchema) fieldInput.setAttribute('data-type', currentSchema.type);
      fieldInput.innerHTML =
        `<option value="">--- select ${this.settings.items.field.toLowerCase()} ---</option>` +
        fieldList(schema)
          .map(({ key, label }) => `<option value="${key}"${field.key === key ? " selected" : ""}>${label}</option>`)
          .join('');

      fieldInput.addEventListener('change', event => {
        event.preventDefault();

        const prevField = fieldKey(fieldInput.getAttribute('data-field'));
        const nextField = fieldKey(fieldInput.value);

        const prevType = fieldType(fieldInput.getAttribute('data-type'));
        const nextType = fieldType(schema[nextField]?.type);

        field.key = fieldInput.value;
        this.onChange();

        // clear conditions when type changes
        if(prevType !== nextType) {
          fieldInput.setAttribute('data-type', nextType);
          field.conditions = [];
          conditionsElement.innerHTML = '';
        }

        // clear nested groups when field changes
        if(prevField !== nextField) {
          fieldInput.setAttribute('data-field', fieldInput.value);
          field.where = [];
          nestedGroupsElement.innerHTML = '';
        }

        visible(addNestedGroupBtn, schema[nextField] && schema[nextField].type === 'object');
      });
    }
    // remove field button
    removeFieldBtn.appendChild(createIcon('close'));
    removeFieldBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeItem(fieldElement, fields, field);
    });

    field.conditions.forEach(condition => this.renderCondition(conditionsElement, field.conditions, condition, schema && schema[fieldKey(field.key)]));

    // add condition button
    addConditionBtn.appendChild(createIcon('plus'));
    addConditionBtn.addEventListener('click', event => {
      event.preventDefault()

      const currentField = fieldKey(fieldInput.getAttribute('data-field'));
      const currentSchema = schema && schema[currentField]

      const newCondition: Condition = { operator: 'eq', value: '' };
      this.addItem(conditionsElement, field.conditions, newCondition, currentSchema, this.renderCondition.bind(this));
    });

    if(!currentSchema || fieldType(currentSchema.type) === 'object') {
      field.where?.forEach(group => this.renderNestedGroups(nestedGroupsElement, field.where!, group, schema && schema[fieldKey(field.key)] ? schema[fieldKey(field.key)].schema : undefined));
      visible(addNestedGroupBtn, true);
    } else {
      visible(addNestedGroupBtn, false);
    }

    addNestedGroupBtn.appendChild(createIcon('filter'));
    addNestedGroupBtn.addEventListener('click', event => {
      event.preventDefault()

      const currentField = fieldKey(fieldInput.getAttribute('data-field'));
      const currentSchema = schema && schema[currentField] ? schema[currentField].schema : undefined;

      if(!field.where) field.where = [];

      const newGroup: Group = { operator: 'and', fieldSets: [{ fields: [{ key: '', conditions: [] }] }] };
      this.addItem(nestedGroupsElement, field.where, newGroup, currentSchema, this.renderNestedGroups.bind(this));
    });

    append(fieldHeader, fieldBadge, fieldInput, addConditionBtn, addNestedGroupBtn, removeFieldBtn);
    append(fieldBody, conditionsElement, nestedGroupsElement);
    append(fieldElement, fieldHeader, fieldBody);
    prepend(element, fieldElement);
  }

  private renderCondition(element: HTMLElement, conditions: Condition[], condition: Condition, schema?: SchemaItem) {
    const conditionElement = create('div', this.settings.classNames.conditionSection);
    const conditionInputs = create('div', this.settings.classNames.conditionInputs);
    const operatorSelect = create('select', this.settings.classNames.conditionSelect);
    const valueInput = create('input', this.settings.classNames.conditionValueInput);
    const removeConditionBtn = create('button', this.settings.classNames.buttonRemove);

    // operator select
    operatorSelect.innerHTML = `<option value="">--- select operator ---</option>` + Object.entries(this.settings.conditionOperators)
      .filter(([key, _label]) => !schema || fieldOperatorValid(key as ConditionOperator, schema.type))
      .map(([key, label]) => `<option value="${key}"${condition.operator === key ? " selected" : ""}>${label}</option>`)
      .join('');

    operatorSelect.addEventListener('change', event => {
      event.preventDefault();
      condition.operator = operatorSelect.value as ConditionOperator;

      visible(valueInput, operatorHasValue(condition.operator));

      this.onChange();
    });

    // value input
    valueInput.value = condition.value;
    valueInput.addEventListener('change', event => {
      event.preventDefault();
      condition.value = valueInput.value;
      this.onChange();
    });
    visible(valueInput, operatorHasValue(condition.operator));

    // remove button
    removeConditionBtn.appendChild(createIcon('close'));
    removeConditionBtn.addEventListener('click', event => {
      event.preventDefault();
      this.removeItem(conditionElement, conditions, condition);
    });

    append(conditionInputs, operatorSelect, valueInput);
    append(conditionElement, conditionInputs, removeConditionBtn);
    prepend(element, conditionElement);
  }

  private addItem<T, M>(element: HTMLElement, array: T[], item: T, schema: M | undefined, renderItem: (element: HTMLElement, array: T[], item: T, schema?: M) => void) {
    array.unshift(item);

    this.onChange();

    renderItem(element, array, item, schema);
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
