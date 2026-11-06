import { aiRequest, parseAiResponse } from "./ai";
import {
  append,
  className,
  create,
  createButton,
  createIconButton,
  createInput,
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
import { deserialize, serialize, serializeGroup } from "./serializer";

import type {
  AiHandler,
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
    isReadOnly: "is-read-only",

    buttonAddRule: "conditions-btn-add-rule",
    buttonAddGroup: "conditions-btn-add-group",
    buttonAddCondition: "conditions-btn-add-condition",
    buttonAddWhere: "conditions-btn-add-where",
    buttonDone: "conditions-btn-done",
    buttonRemove: "conditions-btn-remove",

    ai: "conditions-ai",
    aiInput: "conditions-ai-input",
    aiError: "conditions-ai-error",
    buttonAi: "conditions-btn-ai",
  },
  labels: {
    and: "AND",
    or: "OR",
    andTitle: "All of these must match. Click to switch to OR.",
    orTitle: "At least one of these must match. Click to switch to AND.",
    where: "WHERE",
    whereTitle: "Remove these item filters",
    empty: "No filters yet, so everything matches.",
    addRule: "Add filter",
    addGroup: "Add group",
    addInnerGroup: "Add group",
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
    count: "count",
    sum: "sum",
    aiPlaceholder: "Describe the filters you want, or how to change them…",
    aiSubmit: "Generate",
    aiLoading: "Generating…",
    aiError: "Couldn't update the filters.",
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

  private input: HTMLInputElement | HTMLTextAreaElement;
  private wrapperElement: HTMLElement;
  private aiElement?: HTMLElement;

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
    if (this.settings.ai) this.aiElement = this.renderAi(this.settings.ai);

    this.render();
  }

  public destroy() {
    this.wrapperElement.remove();
    this.input.removeEventListener("change", this.boundOnInputChange);
    this.input.removeEventListener("input", this.boundOnInputChange);
    this.input.conditions = null;
  }

  public setReadOnly(readOnly: boolean) {
    this.settings.readOnly = readOnly;
    this.rerender();
  }

  private render() {
    const group = this.renderGroup(this.root, { schema: this.settings.schema, isRoot: true });
    const ai = this.aiElement && !this.readOnly ? [this.aiElement] : [];

    this.wrapperElement.classList.toggle(this.className("isReadOnly"), this.readOnly);
    this.wrapperElement.replaceChildren(group, ...ai);
    this.input.after(this.wrapperElement);
  }

  private renderAi(ai: AiHandler): HTMLElement {
    const { labels } = this.settings;
    const element = create("div", this.className("ai"));
    const input = createInput(this.className("aiInput"));
    const error = createText(this.className("aiError"), "");
    const submitBtn = createButton(this.className("buttonAi"), "sparkle", labels.aiSubmit, () =>
      submit(),
    );
    const submitLabel = submitBtn.querySelector("span") as HTMLElement;

    const setBusy = (busy: boolean) => {
      input.disabled = busy;
      submitBtn.disabled = busy;
      submitLabel.textContent = busy ? labels.aiLoading : labels.aiSubmit;
      element.setAttribute("aria-busy", String(busy));
    };

    const submit = async () => {
      const prompt = input.value.trim();
      if (!prompt || submitBtn.disabled) return;

      visible(error, false);
      setBusy(true);

      try {
        const response = await ai(aiRequest(prompt, serializeGroup(this.root), this.settings));
        this.replaceRoot(parseAiResponse(response));
        input.value = "";
      } catch (exception) {
        const detail = exception instanceof Error ? ` ${exception.message}` : "";
        error.textContent = `${labels.aiError}${detail}`;
        visible(error, true);
      } finally {
        setBusy(false);
        input.focus();
      }
    };

    input.type = "text";
    input.placeholder = labels.aiPlaceholder;
    input.setAttribute("aria-label", labels.aiPlaceholder);
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      submit();
    });

    error.setAttribute("role", "alert");
    visible(error, false);
    append(element, input, submitBtn, error);

    return element;
  }

  private replaceRoot(root: Group) {
    this.root = root;
    this.onChange();
    this.rerender();
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
    operatorBtn.disabled = this.readOnly;
    if (!this.readOnly) {
      operatorBtn.title = group.operator === "and" ? labels.andTitle : labels.orTitle;
    }
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

    if (group.children.length === 0) {
      append(children, createText(this.className("groupEmpty"), labels.empty));
    }

    const addRuleBtn = createButton(this.className("buttonAddRule"), "plus", labels.addRule, () => {
      const rule = this.newRule();
      group.children.push(rule);
      this.edit(rule);
      update();
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
    append(element, body);
    if (!this.readOnly) append(element, actions);

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
      const awaitingField = !rule.key || (!!schema && !schemaItem());
      const canFilterItems = !schema || fieldType(schemaItem()?.type) === "object";

      visible(addWhereBtn, !awaitingField && canFilterItems && !rule.where);
      visible(addFirstConditionBtn, rule.conditions.length === 0);

      for (const control of conditionsElement.querySelectorAll<HTMLInputElement>("input, select")) {
        control.disabled = awaitingField;
      }

      for (const button of conditionsElement.querySelectorAll<HTMLElement>(
        `.${this.className("buttonRemove")}`,
      )) {
        visible(button, rule.conditions.length > 1);
      }
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

      const whereBtn = create("button", this.className("ruleWhereLabel"));
      whereBtn.type = "button";
      whereBtn.textContent = labels.where;
      whereBtn.disabled = this.readOnly;
      if (!this.readOnly) whereBtn.title = labels.whereTitle;
      whereBtn.addEventListener("click", () => {
        rule.where = undefined;
        this.onChange();
        renderWhere();
        refresh();
      });

      append(
        whereElement,
        whereBtn,
        this.renderGroup(rule.where, { schema: schemaItem()?.schema }),
      );
    };

    const changeField = (key: string) => {
      const previousKey = rule.key;
      const previousSchema = schemaItem();

      rule.key = key;

      if (schema) {
        rule.conditions = previousKey
          ? this.fitConditions(rule.conditions, previousSchema, schemaItem())
          : [this.newCondition(schemaItem())];
        renderConditions();

        if (rule.where && fieldKey(key) !== fieldKey(previousKey)) {
          rule.where = undefined;
          renderWhere();
        }
      }

      this.onChange();
      refresh();
    };

    const fieldControl = this.createFieldControl(rule.key, schema, changeField);

    const addFirstConditionBtn = createButton(
      this.className("buttonAddCondition"),
      "plus",
      labels.addCondition,
      addCondition,
    );

    const addWhere = () => {
      const first = this.newRule();
      rule.where = { type: "group", operator: "and", children: [first] };
      this.edit(first);
      renderWhere();
      refresh();
    };

    const addWhereBtn = createIconButton(
      this.className("buttonAddWhere"),
      "filter",
      labels.addWhere,
      addWhere,
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
    pill.disabled = this.readOnly;
    if (!this.readOnly) pill.title = labels.edit;
    pill.addEventListener("click", open);
    this.renderSummary(pill, rule, schema);

    renderConditions();
    renderWhere();
    refresh();

    append(row, pill);

    if (!this.readOnly) {
      append(
        row,
        addWhereBtn,
        createIconButton(
          this.className("buttonRemove"),
          "close",
          labels.removeRule,
          context.onRemove,
        ),
      );
    }
    append(footer, addFirstConditionBtn, doneBtn);
    append(editor, fieldControl, conditionsElement, footer);
    append(element, row, editor, whereElement);

    if (this.openRule === rule) {
      this.closeOpenRule = close;
      setOpen(true);
    } else {
      setOpen(false);
    }

    if (this.focusRule === rule) {
      this.focusRule = undefined;
      queueMicrotask(() =>
        rule.key ? this.focusFirstValue(conditionsElement) : fieldControl.focus(),
      );
    }

    return element;
  }

  private renderSummary(pill: HTMLElement, rule: Rule, schema?: Schema) {
    const parts = this.summarize(rule, schema);

    pill.replaceChildren(...parts.flatMap((part, index) => (index > 0 ? [" ", part] : [part])));
  }

  private fieldName(key: string, schema?: Schema): HTMLElement[] {
    const label = schema
      ? fieldList(schema, this.settings.labels).find((field) => field.key === key)?.label
      : undefined;
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

    if (!rule.key) {
      const placeholder = schema ? labels.fieldPlaceholder : labels.fieldNamePlaceholder;
      return [createText(this.className("summaryMuted"), placeholder)];
    }

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

  private createFieldControl(
    key: string,
    schema: Schema | undefined,
    onChange: (key: string) => void,
  ): HTMLSelectElement | HTMLInputElement {
    const { labels } = this.settings;

    if (schema) {
      const select = createSelect(
        this.className("fieldSelect"),
        fieldList(schema, labels).map((field) => [field.key, field.label, field.groups]),
        onChange,
        { selected: key, placeholder: labels.fieldPlaceholder },
      );
      select.setAttribute("aria-label", labels.fieldLabel);

      return select;
    }

    const input = createInput(this.className("fieldInput"));
    input.value = key;
    input.placeholder = labels.fieldNamePlaceholder;
    input.setAttribute("aria-label", labels.fieldLabel);
    input.addEventListener("input", () => onChange(input.value.trim()));

    return input;
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
    const input = createInput(this.className("conditionValueInput"));
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

  private newRule(): Rule {
    return { type: "rule", key: "", conditions: [this.newCondition()] };
  }

  private fitConditions(
    conditions: Condition[],
    previous?: SchemaItem,
    next?: SchemaItem,
  ): Condition[] {
    const fits = (condition: Condition) =>
      !next || fieldOperatorValid(condition.operator, next.type);
    const used = conditions.filter(fits).map((condition) => condition.operator);

    return conditions.map((condition) => {
      if (!fits(condition)) {
        const replacement = this.newCondition(next, used);
        used.push(replacement.operator);
        return replacement;
      }

      if (valueKind(condition.operator, previous) !== valueKind(condition.operator, next)) {
        return { ...condition, value: "" };
      }

      return condition;
    });
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
    this.rerender();
  }

  private rerender() {
    this.openRule = undefined;
    this.closeOpenRule = undefined;
    this.wrapperElement.remove();
    this.wrapperElement = create("div", this.className("wrapper"));

    this.render();
  }

  private get readOnly() {
    return !!this.settings.readOnly;
  }

  private className(className: keyof Settings["classNames"]) {
    return this.settings.classNames[className];
  }
}
