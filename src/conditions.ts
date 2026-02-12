import { deserialize, serialize } from "./serializer";
import {
  fieldList,
  fieldKey,
  fieldOperatorValid,
  fieldType,
  operatorHasValue,
  fieldSchemaItem,
} from "./schema";
import {
  create,
  createSelect,
  createButton,
  createBadge,
  find,
  visible,
  append,
  prepend,
} from "./dom";

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
} from "./types";

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
      wrapper: "conditions-wrapper",
      groupsContainer: "conditions-groups-container",

      groupSection: "conditions-group-section",
      groupHeader: "conditions-group-header",
      groupBody: "conditions-group-body",
      groupBadge: "conditions-group-badge",
      groupSelect: "conditions-group-operator-select",

      fieldsetSection: "conditions-fieldset-section",
      fieldsetHeader: "conditions-fieldset-header",
      fieldsetBody: "conditions-fieldset-body",
      fieldsetBadge: "conditions-fieldset-badge",

      fieldSection: "conditions-field-section",
      fieldHeader: "conditions-field-header",
      fieldBody: "conditions-field-body",
      fieldBadge: "conditions-field-badge",
      fieldConditions: "conditions-field-conditions",
      fieldNestedGroups: "conditions-field-nested-groups",
      fieldInput: "conditions-field-input",
      fieldSelect: "conditions-field-select",

      conditionSection: "conditions-condition-section",
      conditionInputs: "conditions-condition-inputs",
      conditionSelect: "conditions-condition-operator-select",
      conditionValueInput: "conditions-condition-value-input",

      isCollapsed: "is-collapsed",

      buttonAddGroup: "conditions-btn-add-group",
      buttonAddFieldSet: "conditions-btn-add-fieldset",
      buttonAddField: "conditions-btn-add-field",
      buttonAddCondition: "conditions-btn-add-condition",
      buttonAddFilter: "conditions-btn-add-filter",
      buttonRemove: "conditions-btn-remove",
    },
    items: {
      group: "Group",
      field: "Field",
      fieldset: "Fieldset",
      condition: "Condition",
      nestedGroup: "Filter",
    },
    operators: {
      and: "and",
      or: "or",
    },
    conditionOperators: {
      eq: "equal to",
      ne: "not equal to",
      gt: "greater than",
      gte: "greater than or equal to",
      lt: "less than",
      lte: "less than or equal to",
      in: "in",
      not_in: "not in",
      between: "between",
      like: "like",
      exists: "exists",
      not_exists: "not exists",
      starts_with: "starts with",
      ends_with: "ends with",
      contains: "contains",
      match: "match",
      empty: "empty",
      not_empty: "not empty",
    },
  };
  private groups: Group[] = [];

  private input: HTMLInputElement | HTMLTextAreaElement;
  private wrapperElement: HTMLElement;

  constructor(
    input: HTMLInputElement | HTMLTextAreaElement | string,
    settings: Partial<Settings> = {},
  ) {
    this.settings = { ...this.settings, ...settings };

    this.input = find<HTMLInputElement | HTMLTextAreaElement>(input);
    this.input.addEventListener("change", this.boundOnInputChange);
    this.input.addEventListener("input", this.boundOnInputChange);
    this.input.conditions = this;
    this.groups = deserialize(this.input.value);
    this.wrapperElement = create("div", this.className("wrapper"));

    this.render();
  }

  public destroy() {
    this.wrapperElement.remove();
    this.input.removeEventListener("change", this.boundOnInputChange);
    this.input.removeEventListener("input", this.boundOnInputChange);
    this.input.conditions = null;
  }

  private render() {
    const container = create("div", this.className("groupsContainer"));

    const addBtn = createButton(this.className("buttonAddGroup"), "plus", () => {
      const newGroup: Group = {
        operator: "and",
        fieldSets: [{ fields: [{ key: "", conditions: [] }] }],
      };
      this.addItem(
        container,
        this.groups,
        newGroup,
        this.settings.schema,
        this.renderGroup.bind(this),
      );
    });

    for (const group of this.groups) {
      this.renderGroup(container, this.groups, group, this.settings.schema);
    }

    append(this.wrapperElement, container, addBtn);

    this.input.after(this.wrapperElement);
  }

  private renderGroup(
    element: HTMLElement,
    groups: Group[],
    group: Group,
    schema?: Schema,
    nested?: boolean,
  ) {
    const groupSection = create("div", this.className("groupSection"));
    const groupHeader = create("div", this.className("groupHeader"));
    const groupBody = create("div", this.className("groupBody"));

    // badge
    const groupBadge = createBadge(
      this.className("groupBadge"),
      nested ? this.settings.items.nestedGroup : this.settings.items.group,
      () => groupSection.classList.toggle(this.className("isCollapsed")),
    );

    // operator select
    const groupOperatorSelect = createSelect(
      this.className("groupSelect"),
      Object.entries(this.settings.operators),
      (value: Operator) => {
        group.operator = value;
        this.onChange();
      },
      { selected: group.operator },
    );

    // remove group button
    const removeGroupBtn = createButton(this.className("buttonRemove"), "close", () =>
      this.removeItem(groupSection, groups, group),
    );

    // field sets
    for (const fieldset of group.fieldSets) {
      this.renderFieldSet(groupBody, group.fieldSets, fieldset, schema);
    }

    // add field set button
    const addFieldSetBtn = createButton(this.className("buttonAddFieldSet"), "plus", () => {
      const newFieldSet: FieldSet = { fields: [{ key: "", conditions: [] }] };
      this.addItem(groupBody, group.fieldSets, newFieldSet, schema, this.renderFieldSet.bind(this));
    });

    append(groupHeader, groupBadge, groupOperatorSelect, addFieldSetBtn, removeGroupBtn);
    append(groupSection, groupHeader, groupBody);
    nested ? prepend(element, groupSection) : append(element, groupSection);
  }

  private renderNestedGroups(element: HTMLElement, groups: Group[], group: Group, schema?: Schema) {
    this.renderGroup(element, groups, group, schema, true);
  }

  private renderFieldSet(
    element: HTMLElement,
    fieldSets: FieldSet[],
    fieldset: FieldSet,
    schema?: Schema,
  ) {
    const fieldSetSection = create("div", this.className("fieldsetSection"));
    const fieldSetHeader = create("div", this.className("fieldsetHeader"));
    const fieldSetBody = create("div", this.className("fieldsetBody"));

    // badge
    const fieldSetBadge = createBadge(
      this.className("fieldsetBadge"),
      this.settings.items.fieldset,
      () => fieldSetSection.classList.toggle(this.className("isCollapsed")),
    );

    // fields
    for (const field of fieldset.fields) {
      this.renderField(fieldSetBody, fieldset.fields, field, schema);
    }

    // remove field set button
    const removeFieldSetBtn = createButton(this.className("buttonRemove"), "close", () =>
      this.removeItem(fieldSetSection, fieldSets, fieldset),
    );

    const addFieldBtn = createButton(this.className("buttonAddField"), "plus", () => {
      const newField: Field = { key: "", conditions: [] };
      this.addItem(fieldSetBody, fieldset.fields, newField, schema, this.renderField.bind(this));
    });

    append(fieldSetHeader, fieldSetBadge, addFieldBtn, removeFieldSetBtn);
    append(fieldSetSection, fieldSetHeader, fieldSetBody);
    prepend(element, fieldSetSection);
  }

  private renderField(element: HTMLElement, fields: Field[], field: Field, schema?: Schema) {
    let fieldInput: HTMLInputElement | HTMLSelectElement;

    const fieldElement = create("div", this.className("fieldSection"));
    const fieldHeader = create("div", this.className("fieldHeader"));
    const fieldBody = create("div", this.className("fieldBody"));
    const conditionsElement = create("div", this.className("fieldConditions"));
    const nestedGroupsElement = create("div", this.className("fieldNestedGroups"));

    const addNestedGroupBtn = createButton(this.className("buttonAddFilter"), "filter", () => {
      const currentField = fieldKey(fieldInput.getAttribute("data-field"));
      const currentSchema = fieldSchemaItem(schema, currentField)?.schema;

      if (!field.where) field.where = [];

      const newGroup: Group = {
        operator: "and",
        fieldSets: [{ fields: [{ key: "", conditions: [] }] }],
      };
      this.addItem(
        nestedGroupsElement,
        field.where,
        newGroup,
        currentSchema,
        this.renderNestedGroups.bind(this),
      );
    });

    const currentField = fieldKey(field.key);
    const currentSchema = fieldSchemaItem(schema, currentField);

    // badge
    const fieldBadge = createBadge(this.className("fieldBadge"), this.settings.items.field, () =>
      fieldElement.classList.toggle(this.className("isCollapsed")),
    );

    // input
    if (!schema) {
      fieldInput = create("input", this.className("fieldInput"));
      fieldInput.value = field.key;

      fieldInput.addEventListener("change", (event) => {
        event.preventDefault();
        field.key = fieldInput.value;
        this.onChange();
      });
    } else {
      fieldInput = createSelect(
        this.className("fieldSelect"),
        fieldList(schema).map(({ key, label }) => [key, label]),
        (value: string) => {
          const prevField = fieldKey(fieldInput.getAttribute("data-field"));
          const nextField = fieldKey(value);

          const prevType = fieldType(fieldInput.getAttribute("data-type"));
          const nextType = fieldType(fieldSchemaItem(schema, nextField)?.type);

          field.key = value;

          // clear conditions when type changes
          if (prevType !== nextType) {
            fieldInput.setAttribute("data-type", nextType);
            field.conditions = [];
            conditionsElement.innerHTML = "";
          }

          // clear nested groups when field changes
          if (prevField !== nextField) {
            fieldInput.setAttribute("data-field", value);
            field.where = [];
            nestedGroupsElement.innerHTML = "";
          }

          this.onChange();

          visible(
            addNestedGroupBtn,
            fieldType(fieldSchemaItem(schema, nextField)?.type) === "object",
          );
        },
        { selected: field.key, allowEmpty: true },
      );

      fieldInput.setAttribute("data-field", currentField);
      if (currentSchema) fieldInput.setAttribute("data-type", currentSchema.type);
    }

    // remove field button
    const removeFieldBtn = createButton(this.className("buttonRemove"), "close", () =>
      this.removeItem(fieldElement, fields, field),
    );

    // conditions
    for (const condition of field.conditions) {
      this.renderCondition(
        conditionsElement,
        field.conditions,
        condition,
        fieldSchemaItem(schema, fieldKey(field.key)),
      );
    }

    // add condition button
    const addConditionBtn = createButton(this.className("buttonAddCondition"), "plus", () => {
      const currentField = fieldKey(fieldInput.getAttribute("data-field"));
      const currentSchema = fieldSchemaItem(schema, currentField);

      const newCondition: Condition = { operator: "eq", value: "" };
      this.addItem(
        conditionsElement,
        field.conditions,
        newCondition,
        currentSchema,
        this.renderCondition.bind(this),
      );
    });

    if (field.where) {
      for (const group of field.where) {
        this.renderNestedGroups(
          nestedGroupsElement,
          field.where,
          group,
          fieldSchemaItem(schema, currentField)?.schema,
        );
      }
    }

    // show/hide add nested group button
    visible(addNestedGroupBtn, !schema || fieldType(currentSchema?.type) === "object");

    append(fieldHeader, fieldBadge, fieldInput, addConditionBtn, addNestedGroupBtn, removeFieldBtn);
    append(fieldBody, conditionsElement, nestedGroupsElement);
    append(fieldElement, fieldHeader, fieldBody);
    prepend(element, fieldElement);
  }

  private renderCondition(
    element: HTMLElement,
    conditions: Condition[],
    condition: Condition,
    schema?: SchemaItem,
  ) {
    const conditionElement = create("div", this.className("conditionSection"));
    const conditionInputs = create("div", this.className("conditionInputs"));
    const valueInput = create("input", this.className("conditionValueInput"));

    // operator select
    const filteredOptions = Object.entries(this.settings.conditionOperators).filter(
      ([key, _label]) => !schema || fieldOperatorValid(key as ConditionOperator, schema.type),
    );

    const operatorSelect = createSelect(
      this.className("conditionSelect"),
      filteredOptions,
      (value: ConditionOperator) => {
        condition.operator = value;
        visible(valueInput, operatorHasValue(condition.operator));

        this.onChange();
      },
      { selected: condition.operator, allowEmpty: true },
    );

    // value input
    valueInput.value = condition.value;
    valueInput.addEventListener("change", () => {
      condition.value = valueInput.value;
      this.onChange();
    });
    visible(valueInput, operatorHasValue(condition.operator));

    // remove button
    const removeConditionBtn = createButton(this.className("buttonRemove"), "close", () =>
      this.removeItem(conditionElement, conditions, condition),
    );

    append(conditionInputs, operatorSelect, valueInput);
    append(conditionElement, conditionInputs, removeConditionBtn);
    prepend(element, conditionElement);
  }

  private addItem<T, M>(
    element: HTMLElement,
    array: T[],
    item: T,
    schema: M | undefined,
    renderItem: (element: HTMLElement, array: T[], item: T, schema?: M) => void,
  ) {
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

    const event = new Event("change", { bubbles: true });
    this.input.dispatchEvent(event);
  }

  private boundOnInputChange = (event: Event) => this.onInputChange(event);

  private onInputChange(event: Event) {
    if (!event.isTrusted) return; // ignore programmatic events

    this.groups = deserialize(this.input.value);
    this.wrapperElement.remove();
    this.wrapperElement = create("div", this.className("wrapper"));

    this.render();
  }

  private className(className: keyof Settings["classNames"]) {
    return this.settings.classNames[className];
  }
}
