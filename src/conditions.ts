import { deserialize, serialize } from "./serializer";
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
import {
  append,
  className,
  create,
  createButton,
  createIconButton,
  createSelect,
  createText,
  find,
  visible,
} from "./dom";

import type {
  Condition,
  ConditionOperator,
  Group,
  Options,
  Rule,
  Schema,
  SchemaItem,
  Settings,
  ValueKind,
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

    group: "conditions-group",
    groupBody: "conditions-group-body",
    groupRail: "conditions-group-rail",
    groupOperator: "conditions-group-operator",
    groupChildren: "conditions-group-children",
    groupEmpty: "conditions-group-empty",
    groupActions: "conditions-group-actions",

    rule: "conditions-rule",
    ruleRow: "conditions-rule-row",
    rulePill: "conditions-rule-pill",
    ruleEditor: "conditions-rule-editor",
    ruleEditorFooter: "conditions-rule-editor-footer",
    ruleField: "conditions-rule-field",
    ruleWhere: "conditions-rule-where",
    ruleWhereLabel: "conditions-rule-where-label",

    summaryPath: "conditions-summary-path",
    summaryField: "conditions-summary-field",
    summaryOperator: "conditions-summary-operator",
    summaryValue: "conditions-summary-value",
    summaryMuted: "conditions-summary-muted",

    fieldInput: "conditions-field-input",
    fieldSelect: "conditions-field-select",
    fieldConditions: "conditions-field-conditions",

    conditionSection: "conditions-condition-section",
    conditionSelect: "conditions-condition-operator-select",
    conditionValue: "conditions-condition-value",
    conditionValueInput: "conditions-condition-value-input",
    conditionValueSeparator: "conditions-condition-value-separator",

    isRoot: "is-root",
    isNested: "is-nested",
    isOpen: "is-open",

    buttonAddRule: "conditions-btn-add-rule",
    buttonAddGroup: "conditions-btn-add-group",
    buttonAddCondition: "conditions-btn-add-condition",
    buttonAddWhere: "conditions-btn-add-where",
    buttonDone: "conditions-btn-done",
    buttonRemove: "conditions-btn-remove",
  },
  labels: {
    and: "AND",
    or: "OR",
    andTitle: "All of these must match. Click to switch to OR.",
    orTitle: "At least one of these must match. Click to switch to AND.",
    where: "Only items where",
    empty: "No filters yet, so everything matches.",
    addRule: "Add filter",
    addGroup: "Add group",
    addInnerGroup: "Add inner group",
    addCondition: "Add condition",
    addWhere: "Only items where…",
    edit: "Click to edit",
    done: "Done",
    remove: "Remove",
    removeRule: "Remove filter",
    removeGroup: "Remove group",
    choose: "Choose…",
    fieldPlaceholder: "Choose a field…",
    fieldNamePlaceholder: "Field name",
    fieldLabel: "Field",
    operatorLabel: "Comparison",
    valueLabel: "Value",
    valuePlaceholder: "Enter a value",
    listPlaceholder: "Values, separated by commas",
    rangeSeparator: "and",
    conditionSeparator: "and",
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

type GroupContext = {
  schema?: Schema;
  isRoot?: boolean;
  onRemove?: () => void;
  removeWhenEmpty?: boolean;
};
type RuleContext = { schema?: Schema; onRemove: () => void };

function removeFrom<T>(array: T[], item: T) {
  array.splice(array.indexOf(item), 1);
}

export default class Conditions {
  private settings: Settings;
  private root: Group;
  private openRule?: Rule;
  private closeOpenRule?: () => void;
  private focusRule?: Rule;
  private focusGroup?: Group;
  private draftGroup?: Group;

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
    this.root = deserialize(this.input.value);
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
    append(
      this.wrapperElement,
      this.renderGroup(this.root, { schema: this.settings.schema, isRoot: true }),
    );

    this.input.after(this.wrapperElement);
  }

  private renderGroup(group: Group, context: GroupContext): HTMLElement {
    const { labels } = this.settings;
    const element = create("div", this.className("group"));
    const body = create("div", this.className("groupBody"));
    const rail = create("div", this.className("groupRail"));
    const children = create("div", this.className("groupChildren"));
    const actions = create("div", this.className("groupActions"));

    const update = () => {
      this.onChange();
      element.replaceWith(this.renderGroup(group, context));
    };

    const removeChild = (child: Group["children"][number]) => {
      removeFrom(group.children, child);

      if (group.children.length === 0 && context.onRemove) {
        context.onRemove();
      } else {
        update();
      }
    };

    const operatorBtn = create("button", this.className("groupOperator"));
    operatorBtn.type = "button";
    operatorBtn.textContent = labels[group.operator];
    operatorBtn.title = group.operator === "and" ? labels.andTitle : labels.orTitle;
    operatorBtn.addEventListener("click", () => {
      group.operator = group.operator === "and" ? "or" : "and";
      update();
    });

    for (const child of group.children) {
      const childContext = { schema: context.schema, onRemove: () => removeChild(child) };

      append(
        children,
        child.type === "group"
          ? this.renderGroup(child, childContext)
          : this.renderRule(child, childContext),
      );
    }

    const empty = createText(this.className("groupEmpty"), labels.empty);
    visible(empty, group.children.length === 0);
    append(children, empty);

    let draft: HTMLElement | undefined;

    const startDraft = () => {
      if (draft) return;

      draft = this.renderDraft(context.schema, (key) => {
        draft?.remove();
        draft = undefined;

        if (key) {
          const rule = this.newRule(key, context.schema);
          group.children.push(rule);
          this.edit(rule);
          update();
        } else if (group.children.length === 0 && context.removeWhenEmpty) {
          context.onRemove?.();
        } else {
          visible(empty, group.children.length === 0);
          addRuleBtn.focus();
        }
      });

      visible(empty, false);
      append(children, draft);
    };

    const addRuleBtn = createButton(this.className("buttonAddRule"), "plus", labels.addRule, () => {
      this.closeOpenRule?.();
      startDraft();
    });

    const addGroupBtn = createButton(
      this.className("buttonAddGroup"),
      "group",
      context.isRoot ? labels.addGroup : labels.addInnerGroup,
      () => {
        const operator = group.operator === "and" ? "or" : "and";
        const innerGroup: Group = { type: "group", operator, children: [] };
        group.children.push(innerGroup);
        this.focusGroup = innerGroup;
        update();
      },
    );

    element.dataset.operator = group.operator;
    className(element, this.className(context.isRoot ? "isRoot" : "isNested"));
    if (group.children.length < 2) rail.style.visibility = "hidden";

    append(rail, operatorBtn);
    append(body, rail, children);
    append(actions, addRuleBtn, addGroupBtn);
    append(element, body, actions);

    if (context.onRemove) {
      append(
        actions,
        createButton(this.className("buttonRemove"), "close", labels.removeGroup, context.onRemove),
      );
    }

    if (this.focusGroup === group) {
      this.focusGroup = undefined;
      queueMicrotask(() => addRuleBtn.focus());
    }

    if (this.draftGroup === group) {
      this.draftGroup = undefined;
      startDraft();
    }

    return element;
  }

  private renderDraft(schema: Schema | undefined, onDone: (key: string) => void): HTMLElement {
    const { labels } = this.settings;
    const element = create("div", this.className("rule"));
    const editor = create("div", this.className("ruleEditor"));
    const conditionsElement = create("div", this.className("fieldConditions"));
    const conditionElement = create("div", this.className("conditionSection"));
    const valueElement = create("div", this.className("conditionValue"));
    const footer = create("div", this.className("ruleEditorFooter"));

    const picker = this.createFieldPicker(schema, onDone);
    const operatorSelect = createSelect(this.className("conditionSelect"), [], () => {}, {
      placeholder: labels.operatorLabel,
    });
    const valueInput = this.createValueInput("text", "", labels.valuePlaceholder, () => {});

    operatorSelect.disabled = true;
    valueInput.disabled = true;

    const cancelBtn = createButton(this.className("buttonRemove"), "close", labels.remove, () =>
      onDone(""),
    );

    className(element, this.className("isOpen"));
    append(valueElement, valueInput);
    append(conditionElement, operatorSelect, valueElement);
    append(conditionsElement, conditionElement);
    append(footer, cancelBtn);
    append(editor, picker, conditionsElement, footer);
    append(element, editor);

    queueMicrotask(() => {
      picker.focus();

      if (picker instanceof HTMLSelectElement) {
        try {
          picker.showPicker();
        } catch {}
      }
    });

    return element;
  }

  private renderRule(rule: Rule, context: RuleContext): HTMLElement {
    const { labels } = this.settings;
    const schema = context.schema;
    const element = create("div", this.className("rule"));
    const row = create("div", this.className("ruleRow"));
    const pill = create("button", this.className("rulePill"));
    const editor = create("div", this.className("ruleEditor"));
    const conditionsElement = create("div", this.className("fieldConditions"));
    const footer = create("div", this.className("ruleEditorFooter"));
    const whereElement = create("div", this.className("ruleWhere"));

    const schemaItem = () => fieldSchemaItem(schema, fieldKey(rule.key));

    const setOpen = (open: boolean) => {
      element.classList.toggle(this.className("isOpen"), open);
      visible(row, !open);
      visible(editor, open);
    };

    const close = () => {
      if (this.openRule === rule) {
        this.openRule = undefined;
        this.closeOpenRule = undefined;
      }

      this.renderSummary(pill, rule, schema);
      setOpen(false);
    };

    const open = () => {
      this.edit(rule);
      this.focusRule = undefined;
      this.closeOpenRule = close;
      setOpen(true);
      editor.querySelector<HTMLElement>("select, input")?.focus();
    };

    const refresh = () => {
      const canFilterItems = !schema || fieldType(schemaItem()?.type) === "object";

      visible(addWhereBtn, canFilterItems && !rule.where);
      visible(addFirstConditionBtn, rule.conditions.length === 0);
    };

    const addCondition = () => {
      const usedOperators = rule.conditions.map((condition) => condition.operator);
      const condition = this.newCondition(schemaItem(), usedOperators);

      rule.conditions.push(condition);
      this.onChange();
      renderCondition(condition);
      refresh();
      conditionsElement.lastElementChild?.querySelector("select")?.focus();
    };

    const renderCondition = (condition: Condition) =>
      this.renderCondition(conditionsElement, rule.conditions, condition, schemaItem(), {
        add: addCondition,
        remove: refresh,
      });

    const renderConditions = () => {
      conditionsElement.replaceChildren();
      for (const condition of rule.conditions) renderCondition(condition);
    };

    const renderWhere = () => {
      whereElement.replaceChildren();
      visible(whereElement, !!rule.where);

      if (!rule.where) return;

      append(
        whereElement,
        createText(this.className("ruleWhereLabel"), labels.where),
        this.renderGroup(rule.where, {
          schema: schemaItem()?.schema,
          removeWhenEmpty: true,
          onRemove: () => {
            rule.where = undefined;
            this.onChange();
            renderWhere();
            refresh();
          },
        }),
      );
    };

    const field = create("div", this.className("ruleField"));
    append(field, ...this.fieldName(rule.key, schema));

    const addFirstConditionBtn = createButton(
      this.className("buttonAddCondition"),
      "plus",
      labels.addCondition,
      addCondition,
    );

    const addWhereBtn = createButton(
      this.className("buttonAddWhere"),
      "filter",
      labels.addWhere,
      () => {
        rule.where = { type: "group", operator: "and", children: [] };
        this.draftGroup = rule.where;
        renderWhere();
        refresh();
      },
    );

    const removeBtn = createButton(
      this.className("buttonRemove"),
      "close",
      labels.removeRule,
      context.onRemove,
    );

    const doneBtn = createButton(this.className("buttonDone"), "check", labels.done, () => {
      close();
      pill.focus();
    });

    editor.addEventListener("keydown", (event) => {
      const isTextInput = event.target instanceof HTMLInputElement;

      if (event.key === "Escape" || (event.key === "Enter" && isTextInput)) {
        event.preventDefault();
        doneBtn.click();
      }
    });

    pill.type = "button";
    pill.title = labels.edit;
    pill.addEventListener("click", open);
    this.renderSummary(pill, rule, schema);

    renderConditions();
    renderWhere();
    refresh();

    append(
      row,
      pill,
      createIconButton(
        this.className("buttonRemove"),
        "close",
        labels.removeRule,
        context.onRemove,
      ),
    );
    append(footer, addFirstConditionBtn, addWhereBtn, removeBtn, doneBtn);
    append(editor, field, conditionsElement, footer);
    append(element, row, editor, whereElement);

    if (this.openRule === rule) {
      this.closeOpenRule = close;
      setOpen(true);
    } else {
      setOpen(false);
    }

    if (this.focusRule === rule) {
      this.focusRule = undefined;
      queueMicrotask(() => this.focusFirstValue(conditionsElement));
    }

    return element;
  }

  private renderSummary(pill: HTMLElement, rule: Rule, schema?: Schema) {
    const parts = this.summarize(rule, schema);

    pill.replaceChildren(...parts.flatMap((part, index) => (index > 0 ? [" ", part] : [part])));
  }

  private fieldName(key: string, schema?: Schema): HTMLElement[] {
    const label = schema ? fieldList(schema).find((field) => field.key === key)?.label : undefined;
    const path = (label ?? key).split(" → ");
    const name = path.pop() ?? key;

    return [
      ...path.map((segment) => createText(this.className("summaryPath"), segment)),
      createText(this.className("summaryField"), name),
    ];
  }

  private summarize(rule: Rule, schema?: Schema): HTMLElement[] {
    const { labels, conditionOperators } = this.settings;
    const schemaItem = fieldSchemaItem(schema, fieldKey(rule.key));
    const parts = this.fieldName(rule.key, schema);

    rule.conditions.forEach((condition, index) => {
      if (index > 0) {
        parts.push(createText(this.className("summaryMuted"), labels.conditionSeparator));
      }

      const operator = conditionOperators[condition.operator] ?? condition.operator;
      const kind = valueKind(condition.operator, schemaItem);

      parts.push(createText(this.className("summaryOperator"), operator));
      if (kind !== "none") parts.push(this.summarizeValue(condition.value, kind));
    });

    return parts;
  }

  private summarizeValue(value: string, kind: ValueKind): HTMLElement {
    const { labels } = this.settings;
    const items = value.split(",").map((item) => item.trim());

    if (items.every((item) => item === "")) {
      return createText(this.className("summaryMuted"), "…");
    }

    const text =
      kind === "boolean"
        ? ({ true: labels.yes, false: labels.no }[value] ?? value)
        : kind === "range"
          ? items.join(` ${labels.rangeSeparator} `)
          : kind === "list"
            ? items.filter(Boolean).join(", ")
            : value;

    return createText(this.className("summaryValue"), text);
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
        removeFrom(conditions, condition);
        this.onChange();
        conditionElement.remove();
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
        createText(this.className("conditionValueSeparator"), labels.rangeSeparator),
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

  private createFieldPicker(
    schema: Schema | undefined,
    onDone: (key: string) => void,
  ): HTMLSelectElement | HTMLInputElement {
    const { labels } = this.settings;
    let done = false;

    const finish = (key: string) => {
      if (done) return;

      done = true;
      onDone(key.trim());
    };

    const picker = schema
      ? createSelect(
          this.className("fieldSelect"),
          fieldList(schema).map(({ key, label }) => [key, label]),
          finish,
          { placeholder: labels.fieldPlaceholder },
        )
      : create("input", this.className("fieldInput"));

    if (picker instanceof HTMLInputElement) picker.placeholder = labels.fieldNamePlaceholder;
    picker.setAttribute("aria-label", labels.fieldLabel);

    const typedKey = () => (picker instanceof HTMLInputElement ? picker.value : "");

    const element: HTMLElement = picker;

    element.addEventListener("blur", () => finish(typedKey()));
    element.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" && event.key !== "Enter") return;
      if (event.key === "Enter" && picker instanceof HTMLSelectElement) return;

      event.preventDefault();
      event.stopPropagation();
      finish(event.key === "Enter" ? typedKey() : "");
    });

    return picker;
  }

  private focusFirstValue(conditionsElement: HTMLElement) {
    const [operator, value] = Array.from(
      conditionsElement.firstElementChild?.querySelectorAll<HTMLElement>("input, select") ?? [],
    );

    (value ?? operator)?.focus();
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

  private edit(rule: Rule) {
    if (this.openRule !== rule) this.closeOpenRule?.();

    this.openRule = rule;
    this.focusRule = rule;
  }

  private newRule(key: string, schema?: Schema): Rule {
    return {
      type: "rule",
      key,
      conditions: [this.newCondition(fieldSchemaItem(schema, fieldKey(key)))],
    };
  }

  private newCondition(schema?: SchemaItem, usedOperators: ConditionOperator[] = []): Condition {
    const operators = Object.keys(this.settings.conditionOperators) as ConditionOperator[];
    const unused = operators.filter((operator) => !usedOperators.includes(operator));

    return { operator: defaultOperator(unused.length > 0 ? unused : operators, schema), value: "" };
  }

  private onChange() {
    this.input.value = serialize(this.root);

    const event = new Event("change", { bubbles: true });
    this.input.dispatchEvent(event);
  }

  private boundOnInputChange = (event: Event) => this.onInputChange(event);

  private onInputChange(event: Event) {
    if (!event.isTrusted) return; // ignore programmatic events

    this.root = deserialize(this.input.value);
    this.openRule = undefined;
    this.closeOpenRule = undefined;
    this.wrapperElement.remove();
    this.wrapperElement = create("div", this.className("wrapper"));

    this.render();
  }

  private className(className: keyof Settings["classNames"]) {
    return this.settings.classNames[className];
  }
}
