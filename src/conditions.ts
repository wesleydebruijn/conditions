import {
  append,
  create,
  createButton,
  createIconButton,
  createSelect,
  createText,
  find,
  visible,
} from "./dom";
import {
  defaultOperator,
  fieldIsNumeric,
  fieldKey,
  fieldList,
  fieldOperatorValid,
  fieldSchemaItem,
  fieldType,
  valueKind,
} from "./schema";
import { deserialize, serialize } from "./serializer";

import type {
  Condition,
  ConditionOperator,
  Field,
  FieldSet,
  Group,
  Operator,
  Options,
  Schema,
  SchemaItem,
  Settings,
} from "./types";

declare global {
  interface HTMLInputElement {
    conditions?: Conditions | null;
  }

  interface HTMLTextAreaElement {
    conditions?: Conditions | null;
  }
}

const DEFAULT_SETTINGS: Settings = {
  classNames: {
    wrapper: "conditions-wrapper",
    groupsContainer: "conditions-groups-container",

    groupSection: "conditions-group-section",
    groupHeader: "conditions-group-header",
    groupLabel: "conditions-group-label",
    groupBody: "conditions-group-body",
    groupEmpty: "conditions-group-empty",
    groupFooter: "conditions-group-footer",
    groupSelect: "conditions-group-operator-select",

    fieldsetSection: "conditions-fieldset-section",
    fieldsetLabel: "conditions-fieldset-label",
    fieldsetBody: "conditions-fieldset-body",

    fieldSection: "conditions-field-section",
    fieldBody: "conditions-field-body",
    fieldActions: "conditions-field-actions",
    fieldConditions: "conditions-field-conditions",
    fieldNestedGroups: "conditions-field-nested-groups",
    fieldInput: "conditions-field-input",
    fieldSelect: "conditions-field-select",

    conditionSection: "conditions-condition-section",
    conditionSelect: "conditions-condition-operator-select",
    conditionValue: "conditions-condition-value",
    conditionValueInput: "conditions-condition-value-input",
    conditionValueSeparator: "conditions-condition-value-separator",

    isBoxed: "is-boxed",

    buttonAddGroup: "conditions-btn-add-group",
    buttonAddField: "conditions-btn-add-field",
    buttonJoinField: "conditions-btn-join-field",
    buttonAddCondition: "conditions-btn-add-condition",
    buttonAddFilter: "conditions-btn-add-filter",
    buttonRemove: "conditions-btn-remove",
  },
  labels: {
    match: "Match",
    where: "Only items where",
    ofTheFollowing: "of the following",
    and: "and",
    or: "or",
    all: "all",
    any: "any",
    allOf: "All of these",
    empty: "No rules yet, so everything matches.",
    addGroup: "Add group",
    addField: "Add rule",
    joinField: "And",
    addCondition: "Add condition",
    addFilter: "Filter items",
    remove: "Remove",
    choose: "Choose…",
    fieldPlaceholder: "Choose a field…",
    fieldNamePlaceholder: "Field name",
    fieldLabel: "Field",
    operatorLabel: "Comparison",
    valueLabel: "Value",
    valuePlaceholder: "Enter a value",
    listPlaceholder: "Values, separated by commas",
    yes: "Yes",
    no: "No",
  },
  conditionOperators: {
    eq: "is",
    ne: "is not",
    gt: "is greater than",
    gte: "is at least",
    lt: "is less than",
    lte: "is at most",
    between: "is between",
    in: "is one of",
    not_in: "is not one of",
    contains: "contains",
    like: "includes",
    starts_with: "starts with",
    ends_with: "ends with",
    match: "matches pattern",
    exists: "is set",
    not_exists: "is not set",
    empty: "is empty",
    not_empty: "is not empty",
  },
};

function removeFrom<T>(array: T[], item: T) {
  array.splice(array.indexOf(item), 1);
}

type Renderer<T, S> = (element: HTMLElement, array: T[], item: T, schema?: S) => void;

export default class Conditions {
  private settings: Settings;
  private groups: Group[] = [];
  private focusField?: Field;

  private input: HTMLInputElement | HTMLTextAreaElement;
  private wrapperElement: HTMLElement;

  constructor(input: HTMLInputElement | HTMLTextAreaElement | string, options: Options = {}) {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...options,
      classNames: { ...DEFAULT_SETTINGS.classNames, ...options.classNames },
      labels: { ...DEFAULT_SETTINGS.labels, ...options.labels },
    };

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
    const schema = this.settings.schema;

    this.setConnector(this.wrapperElement, "--conditions-and", this.settings.labels.and);

    for (const group of this.groups) {
      this.renderGroup(container, this.groups, group, schema);
    }

    const addGroupBtn = createButton(
      this.className("buttonAddGroup"),
      "plus",
      this.settings.labels.addGroup,
      () => {
        const group = this.newGroup();
        this.focusField = group.fieldSets[0].fields[0];
        this.addItem(container, this.groups, group, schema, this.renderGroup.bind(this));
      },
    );

    append(this.wrapperElement, container, addGroupBtn);

    this.input.after(this.wrapperElement);
  }

  private renderGroup(
    element: HTMLElement,
    groups: Group[],
    group: Group,
    schema?: Schema,
    nested = false,
  ) {
    const { labels } = this.settings;
    const groupSection = create("div", this.className("groupSection"));
    const groupHeader = create("div", this.className("groupHeader"));
    const groupBody = create("div", this.className("groupBody"));
    const groupFooter = create("div", this.className("groupFooter"));

    this.normalizeFieldSets(group);

    const renderBody = () => {
      groupBody.replaceChildren();
      this.setConnector(groupSection, "--conditions-connector", labels[group.operator]);

      for (const fieldset of group.fieldSets) {
        this.renderFieldSet(groupBody, group, fieldset, schema, renderBody);
      }
    };

    const operatorSelect = createSelect(
      this.className("groupSelect"),
      [
        ["and", labels.all],
        ["or", labels.any],
      ],
      (value: Operator) => {
        this.changeOperator(group, value);
        this.onChange();
        renderBody();
      },
      { selected: group.operator },
    );

    const addFieldBtn = createButton(
      this.className("buttonAddField"),
      "plus",
      labels.addField,
      () => {
        const field = this.newField();
        const lastFieldSet = group.fieldSets[group.fieldSets.length - 1];

        if (group.operator === "and" && lastFieldSet) {
          lastFieldSet.fields.push(field);
        } else {
          group.fieldSets.push({ fields: [field] });
        }

        this.focusField = field;
        this.onChange();
        renderBody();
      },
    );

    const removeGroupBtn = createIconButton(
      this.className("buttonRemove"),
      "close",
      labels.remove,
      () => this.removeItem(groupSection, groups, group),
    );

    renderBody();

    append(
      groupHeader,
      createText(this.className("groupLabel"), nested ? labels.where : labels.match),
      operatorSelect,
      createText(this.className("groupLabel"), labels.ofTheFollowing),
      removeGroupBtn,
    );
    append(groupFooter, addFieldBtn);
    append(
      groupSection,
      groupHeader,
      groupBody,
      createText(this.className("groupEmpty"), labels.empty),
      groupFooter,
    );
    append(element, groupSection);
  }

  private renderFieldSet(
    element: HTMLElement,
    group: Group,
    fieldset: FieldSet,
    schema: Schema | undefined,
    renderGroupBody: () => void,
  ) {
    const isAlternative = group.operator === "or";
    const isBoxed = isAlternative && fieldset.fields.length > 1;
    const fieldSetSection = create("div", this.className("fieldsetSection"));
    const fieldSetBody = create("div", this.className("fieldsetBody"));

    const update = () => {
      this.onChange();
      renderGroupBody();
    };

    const join = () => {
      const field = this.newField();
      fieldset.fields.push(field);
      this.focusField = field;
      update();
    };

    const remove = (field: Field) => {
      removeFrom(fieldset.fields, field);
      if (fieldset.fields.length === 0) removeFrom(group.fieldSets, fieldset);
      update();
    };

    fieldset.fields.forEach((field, index) => {
      this.renderField(fieldSetBody, field, schema, {
        canJoin: isAlternative && index === fieldset.fields.length - 1,
        join,
        remove: () => remove(field),
      });
    });

    if (isBoxed) {
      fieldSetSection.classList.add(this.className("isBoxed"));
      append(
        fieldSetSection,
        createText(this.className("fieldsetLabel"), this.settings.labels.allOf),
      );
    }

    append(fieldSetSection, fieldSetBody);
    append(element, fieldSetSection);
  }

  private renderField(
    element: HTMLElement,
    field: Field,
    schema: Schema | undefined,
    context: { canJoin: boolean; join: () => void; remove: () => void },
  ) {
    const { labels } = this.settings;
    const fieldSection = create("div", this.className("fieldSection"));
    const fieldBody = create("div", this.className("fieldBody"));
    const conditionsElement = create("div", this.className("fieldConditions"));
    const actionsElement = create("div", this.className("fieldActions"));
    const nestedGroupsElement = create("div", this.className("fieldNestedGroups"));

    const schemaItem = () => fieldSchemaItem(schema, fieldKey(field.key));

    const refresh = () => {
      const canFilter = !schema || fieldType(schemaItem()?.type) === "object";
      const hasConditions = field.conditions.length > 0;
      const awaitingField = !!schema && !schemaItem();

      visible(joinFieldBtn, context.canJoin);
      visible(addNestedGroupBtn, canFilter);
      visible(addFirstConditionBtn, !hasConditions);
      visible(removeFieldBtn, !hasConditions);
      visible(actionsElement, context.canJoin || canFilter || !hasConditions);

      for (const control of conditionsElement.querySelectorAll("input, select")) {
        (control as HTMLInputElement | HTMLSelectElement).disabled = awaitingField;
      }
    };

    const onConditionRemoved = () => {
      if (field.conditions.length === 0 && !field.where?.length) {
        context.remove();
      } else {
        refresh();
      }
    };

    const renderNestedGroup: Renderer<Group, Schema> = (el, groups, group, nestedSchema) =>
      this.renderGroup(el, groups, group, nestedSchema, true);

    const renderCondition: Renderer<Condition, SchemaItem> = (el, conditions, condition, item) =>
      this.renderCondition(el, conditions, condition, item, {
        add: addCondition,
        remove: onConditionRemoved,
      });

    const addCondition = () => {
      const usedOperators = field.conditions.map((condition) => condition.operator);
      const condition = this.newCondition(schemaItem(), usedOperators);

      this.addItem(conditionsElement, field.conditions, condition, schemaItem(), renderCondition);
      refresh();
      conditionsElement.lastElementChild?.querySelector("select")?.focus();
    };

    const renderConditions = () => {
      conditionsElement.replaceChildren();

      for (const condition of field.conditions) {
        renderCondition(conditionsElement, field.conditions, condition, schemaItem());
      }
    };

    const fieldInput = schema
      ? createSelect(
          this.className("fieldSelect"),
          fieldList(schema).map(({ key, label }) => [key, label]),
          (value: string) => {
            const previousKey = fieldKey(field.key);
            const previousType = schemaItem()?.type;

            field.key = value;

            if (schemaItem()?.type !== previousType) {
              field.conditions = [this.newCondition(schemaItem())];
              renderConditions();
            }

            if (fieldKey(value) !== previousKey) {
              field.where = [];
              nestedGroupsElement.replaceChildren();
            }

            this.onChange();
            refresh();
          },
          { selected: field.key, placeholder: labels.fieldPlaceholder },
        )
      : this.createFieldInput(field);

    fieldInput.setAttribute("aria-label", labels.fieldLabel);

    const joinFieldBtn = createButton(
      this.className("buttonJoinField"),
      "plus",
      labels.joinField,
      context.join,
    );

    const addNestedGroupBtn = createButton(
      this.className("buttonAddFilter"),
      "filter",
      labels.addFilter,
      () => {
        const group = this.newGroup();
        field.where ??= [];
        this.focusField = group.fieldSets[0].fields[0];
        this.addItem(
          nestedGroupsElement,
          field.where,
          group,
          schemaItem()?.schema,
          renderNestedGroup,
        );
      },
    );

    const addFirstConditionBtn = createButton(
      this.className("buttonAddCondition"),
      "plus",
      labels.addCondition,
      addCondition,
    );

    const removeFieldBtn = createIconButton(
      this.className("buttonRemove"),
      "close",
      labels.remove,
      context.remove,
    );

    renderConditions();

    for (const group of field.where ?? []) {
      renderNestedGroup(nestedGroupsElement, field.where ?? [], group, schemaItem()?.schema);
    }

    refresh();

    append(actionsElement, addFirstConditionBtn, joinFieldBtn, addNestedGroupBtn, removeFieldBtn);
    append(fieldBody, conditionsElement, actionsElement);
    append(fieldSection, fieldInput, fieldBody, nestedGroupsElement);
    append(element, fieldSection);

    if (this.focusField === field) {
      this.focusField = undefined;
      queueMicrotask(() => fieldInput.focus());
    }
  }

  private renderCondition(
    element: HTMLElement,
    conditions: Condition[],
    condition: Condition,
    schema: SchemaItem | undefined,
    context: { add: () => void; remove: () => void },
  ) {
    const conditionElement = create("div", this.className("conditionSection"));
    const valueElement = create("div", this.className("conditionValue"));

    const operators = Object.entries(this.settings.conditionOperators).filter(
      ([operator]) => !schema || fieldOperatorValid(operator as ConditionOperator, schema.type),
    );

    const operatorSelect = createSelect(
      this.className("conditionSelect"),
      operators,
      (value: ConditionOperator) => {
        const previousKind = valueKind(condition.operator, schema);

        condition.operator = value;

        if (valueKind(value, schema) !== previousKind) {
          condition.value = "";
          this.renderValue(valueElement, condition, schema);
        }

        this.onChange();
      },
      { selected: condition.operator, placeholder: this.settings.labels.choose },
    );
    operatorSelect.setAttribute("aria-label", this.settings.labels.operatorLabel);

    const removeConditionBtn = createIconButton(
      this.className("buttonRemove"),
      "close",
      this.settings.labels.remove,
      () => {
        this.removeItem(conditionElement, conditions, condition);
        context.remove();
      },
    );

    const addConditionBtn = createIconButton(
      this.className("buttonAddCondition"),
      "plus",
      this.settings.labels.addCondition,
      context.add,
    );

    this.renderValue(valueElement, condition, schema);

    append(conditionElement, operatorSelect, valueElement, addConditionBtn, removeConditionBtn);
    append(element, conditionElement);
  }

  private renderValue(element: HTMLElement, condition: Condition, schema?: SchemaItem) {
    const { labels } = this.settings;
    const kind = valueKind(condition.operator, schema);
    const inputType = fieldIsNumeric(schema?.type) ? "number" : "text";

    const update = (value: string) => {
      condition.value = value;
      this.onChange();
    };

    element.replaceChildren();

    if (kind === "boolean") {
      const select = createSelect(
        this.className("conditionValueInput"),
        [
          ["true", labels.yes],
          ["false", labels.no],
        ],
        update,
        { selected: condition.value, placeholder: labels.choose },
      );
      select.setAttribute("aria-label", labels.valueLabel);
      append(element, select);
    } else if (kind === "range") {
      const [from = "", to = ""] = condition.value.split(",");
      const updateRange = () => update(`${fromInput.value},${toInput.value}`);
      const fromInput = this.createValueInput(
        inputType,
        from,
        labels.valuePlaceholder,
        updateRange,
      );
      const toInput = this.createValueInput(inputType, to, labels.valuePlaceholder, updateRange);

      append(
        element,
        fromInput,
        createText(this.className("conditionValueSeparator"), labels.and),
        toInput,
      );
    } else if (kind === "list") {
      append(
        element,
        this.createValueInput("text", condition.value, labels.listPlaceholder, update),
      );
    } else if (kind === "text" || kind === "number") {
      append(
        element,
        this.createValueInput(inputType, condition.value, labels.valuePlaceholder, update),
      );
    }
  }

  private createFieldInput(field: Field): HTMLInputElement {
    const input = create("input", this.className("fieldInput"));
    input.value = field.key;
    input.placeholder = this.settings.labels.fieldNamePlaceholder;
    input.addEventListener("input", () => {
      field.key = input.value;
      this.onChange();
    });

    return input;
  }

  private createValueInput(
    type: string,
    value: string,
    placeholder: string,
    onInput: (value: string) => void,
  ): HTMLInputElement {
    const input = create("input", this.className("conditionValueInput"));
    input.type = type;
    input.value = value;
    input.placeholder = placeholder;
    input.setAttribute("aria-label", this.settings.labels.valueLabel);
    input.addEventListener("input", () => onInput(input.value));

    return input;
  }

  private newGroup(): Group {
    return { operator: "and", fieldSets: [this.newFieldSet()] };
  }

  private newFieldSet(): FieldSet {
    return { fields: [this.newField()] };
  }

  private newField(): Field {
    return { key: "", conditions: [this.newCondition()] };
  }

  private newCondition(schema?: SchemaItem, usedOperators: ConditionOperator[] = []): Condition {
    const operators = Object.keys(this.settings.conditionOperators) as ConditionOperator[];
    const unused = operators.filter((operator) => !usedOperators.includes(operator));

    return { operator: defaultOperator(unused.length > 0 ? unused : operators, schema), value: "" };
  }

  private normalizeFieldSets(group: Group) {
    const fieldSets = group.fieldSets.filter((fieldset) => fieldset.fields.length > 0);
    const fields = fieldSets.flatMap((fieldset) => fieldset.fields);

    group.fieldSets = group.operator === "and" && fieldSets.length > 1 ? [{ fields }] : fieldSets;
  }

  private changeOperator(group: Group, operator: Operator) {
    const fields = group.fieldSets.flatMap((fieldset) => fieldset.fields);

    if (operator === "or" && group.fieldSets.length === 1) {
      group.fieldSets = fields.map((field) => ({ fields: [field] }));
    } else if (operator === "and") {
      group.fieldSets = fields.length > 0 ? [{ fields }] : [];
    }

    group.operator = operator;
  }

  private setConnector(element: HTMLElement, property: string, label: string) {
    element.style.setProperty(property, JSON.stringify(label));
  }

  private addItem<T, S>(
    element: HTMLElement,
    array: T[],
    item: T,
    schema: S | undefined,
    renderItem: Renderer<T, S>,
  ) {
    array.push(item);

    this.onChange();

    renderItem(element, array, item, schema);
  }

  private removeItem<T>(element: HTMLElement, array: T[], item: T) {
    removeFrom(array, item);

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
