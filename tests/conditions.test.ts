/**
 * @jest-environment jsdom
 */

import Conditions from "../src/conditions";
import type { Schema } from "../src/types";

describe("Conditions", () => {
  let input: HTMLInputElement;
  let container: HTMLElement;

  const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) =>
    root.querySelector(selector) as T;
  const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) =>
    Array.from(root.querySelectorAll(selector)) as T[];
  const json = () => JSON.parse(input.value);
  const pills = () => $$(".conditions-rule-pill").map((pill) => pill.textContent);
  const isShown = (element: HTMLElement) => element.style.display !== "none";
  const openEditors = () => $$(".conditions-rule-editor").filter(isShown);

  const change = (element: HTMLInputElement | HTMLSelectElement, value: string) => {
    element.value = value;
    element.dispatchEvent(new Event(element.tagName === "SELECT" ? "change" : "input"));
  };

  const press = (target: HTMLElement, key: string) =>
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

  const picker = () =>
    (openEditors()
      .at(-1)
      ?.querySelector<HTMLSelectElement | HTMLInputElement>(
        ".conditions-field-select, .conditions-field-input",
      ) ?? null) as HTMLSelectElement | HTMLInputElement;

  const pick = (button: HTMLElement, key: string) => {
    button.click();
    change(picker(), key);
  };

  const load = (condition: unknown, options = {}) => {
    input.value = JSON.stringify(condition);
    return new Conditions(input, options);
  };

  const schema: Schema = {
    name: { label: "Name", type: "text" },
    age: { label: "Age", type: "number" },
    active: { label: "Active", type: "boolean" },
    tags: { label: "Tags", type: "text[]" },
    items: {
      label: "Items",
      type: "object[]",
      schema: {
        type: { label: "Type", type: "text" },
        price: { label: "Price", type: "number" },
      },
    },
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    input = document.createElement("input");
    input.type = "text";
    input.value = "{}";
    container.appendChild(input);
  });

  afterEach(() => {
    input.conditions?.destroy();
    container.remove();
  });

  describe("constructor", () => {
    it("accepts element and renders wrapper", () => {
      const c = new Conditions(input);
      expect(input.conditions).toBe(c);
      expect($(".conditions-wrapper")).not.toBeNull();
      expect(input.value).toBe("{}");
    });

    it("accepts selector string when element exists", () => {
      input.id = "cond-input";
      new Conditions("#cond-input");
      expect($(".conditions-wrapper")).not.toBeNull();
    });

    it("merges custom classNames with the defaults", () => {
      new Conditions(input, { classNames: { wrapper: "custom-wrapper" } });
      expect($(".custom-wrapper")).not.toBeNull();
      expect($(".conditions-group")).not.toBeNull();
    });

    it("merges custom labels with the defaults", () => {
      new Conditions(input, { labels: { addRule: "Filter toevoegen" } });
      expect($(".conditions-btn-add-rule").textContent).toBe("Filter toevoegen");
      expect($(".conditions-btn-add-group").textContent).toBe("Add group");
    });

    it("uses the count and sum labels for aggregate fields", () => {
      load({ "items:count": { gte: 1 } }, { schema, labels: { count: "aantal", sum: "totaal" } });
      expect(pills()).toEqual(["Items (aantal) is at least 1"]);
    });

    it("re-renders on trusted change event", () => {
      let changeListener: ((event: Event) => void) | undefined;
      const origAdd = input.addEventListener.bind(input);
      input.addEventListener = ((type: string, listener: EventListener) => {
        if (type === "change") changeListener = listener;
        return origAdd(type, listener);
      }) as typeof input.addEventListener;
      new Conditions(input);
      input.addEventListener = origAdd;

      const wrapper = $(".conditions-wrapper");
      input.value = '{"name":"x"}';
      changeListener?.({ isTrusted: true } as unknown as Event);
      expect($(".conditions-wrapper")).not.toBe(wrapper);
      expect(pills()).toEqual(["name is x"]);
    });

    it("ignores programmatic (untrusted) change events", () => {
      new Conditions(input);
      const wrapper = $(".conditions-wrapper");
      input.value = "[]";
      input.dispatchEvent(new Event("change", { bubbles: true }));
      expect($(".conditions-wrapper")).toBe(wrapper);
    });
  });

  describe("destroy", () => {
    it("removes wrapper and clears reference", () => {
      const c = new Conditions(input);
      const wrapper = $(".conditions-wrapper");
      c.destroy();
      expect(wrapper?.parentNode).toBeNull();
      expect(input.conditions).toBeNull();
    });
  });

  describe("read only", () => {
    const condition = {
      or: [{ a: { eq: 1 } }, { "items:count": { gte: 1, where: { type: { eq: "x" } } } }],
    };
    const controls = () =>
      $$<HTMLButtonElement>(
        ".conditions-group-actions, .conditions-rule-row > .conditions-btn-remove, .conditions-btn-add-where",
      );

    it("shows the filters without any way to change them", () => {
      load(condition, { schema, readOnly: true });

      expect(pills()).toHaveLength(3);
      expect(controls()).toEqual([]);
      expect($(".conditions-wrapper").classList.contains("is-read-only")).toBe(true);

      for (const button of $$<HTMLButtonElement>(
        ".conditions-rule-pill, .conditions-group-operator, .conditions-rule-where-label",
      )) {
        expect(button.disabled).toBe(true);
      }

      $(".conditions-rule-pill").click();
      $(".conditions-rule-where-label").click();
      expect(openEditors()).toHaveLength(0);
      expect(json()).toEqual(condition);
    });

    it("toggles read only at runtime, closing any open editor", () => {
      const conditions = load(condition, { schema });
      $(".conditions-rule-pill").click();

      conditions.setReadOnly(true);
      expect(openEditors()).toHaveLength(0);
      expect(controls()).toEqual([]);

      conditions.setReadOnly(false);
      expect(controls().length).toBeGreaterThan(0);
      expect($(".conditions-wrapper").classList.contains("is-read-only")).toBe(false);
      expect(json()).toEqual(condition);
    });
  });

  describe("groups", () => {
    it("explains that an empty group matches everything", () => {
      new Conditions(input);
      expect($(".conditions-group-empty").textContent).toBe(
        "No filters yet, so everything matches.",
      );
    });

    it("only shows the AND/OR bracket with two or more filters", () => {
      load({ a: { eq: 1 } });
      expect($(".conditions-group-rail").style.visibility).toBe("hidden");

      load({ a: { eq: 1 }, b: { eq: 2 } });
      expect($(".conditions-group-rail").style.visibility).toBe("");
    });

    it("switches between AND and OR when the operator is clicked", () => {
      load({ a: { eq: 1 }, b: { eq: 2 } });
      const operator = () => $(".conditions-group-operator");
      expect(operator().textContent).toBe("AND");
      expect(operator().title).toContain("All of these must match");

      operator().click();

      expect(json()).toEqual({ or: [{ a: { eq: 1 } }, { b: { eq: 2 } }] });
      expect(operator().textContent).toBe("OR");
      expect($(".conditions-group").dataset.operator).toBe("or");
    });

    it("renders inner groups at any depth", () => {
      load({ and: [{ a: { eq: 1 } }, { or: [{ b: { eq: 2 } }, { c: { eq: 3 }, d: { eq: 4 } }] }] });
      const operators = $$<HTMLElement>(".conditions-group").map((group) => group.dataset.operator);
      expect(operators).toEqual(["and", "or", "and"]);
      expect(pills()).toEqual(["a is 1", "b is 2", "c is 3", "d is 4"]);
    });

    it("adds an empty inner group with the opposite operator without picking a field", async () => {
      load({ a: { eq: 1 } }, { schema });
      $(".conditions-btn-add-group").click();

      const inner = $(".conditions-group.is-nested");
      expect(picker()).toBeNull();
      expect(inner.dataset.operator).toBe("or");
      expect(openEditors()).toHaveLength(0);
      expect($(".conditions-group-empty", inner)).not.toBeNull();
      expect($(".conditions-btn-add-group", inner).textContent).toBe("Add group");
      expect(json()).toEqual({ a: { eq: 1 } });

      await Promise.resolve();
      expect(document.activeElement).toBe($(".conditions-btn-add-rule", inner));
    });

    it("adds filters to an empty inner group", () => {
      load({ a: { eq: 1 } });
      $(".conditions-btn-add-group").click();
      pick($(".conditions-group.is-nested .conditions-btn-add-rule"), "b");

      expect(openEditors()).toHaveLength(1);
      expect(json()).toEqual({ and: [{ a: { eq: 1 } }, { b: { eq: "" } }] });
    });

    it("only nested groups can be removed", () => {
      load({ and: [{ a: { eq: 1 } }, { or: [{ b: { eq: 2 } }, { c: { eq: 3 } }] }] });
      expect(
        $(".conditions-group.is-root > .conditions-group-actions > .conditions-btn-remove"),
      ).toBeNull();

      $(".conditions-group.is-nested > .conditions-group-actions > .conditions-btn-remove").click();
      expect(json()).toEqual({ a: { eq: 1 } });
    });

    it("removes an inner group once its last filter is removed", () => {
      load({ and: [{ a: { eq: 1 } }, { or: [{ b: { eq: 2 } }, { c: { eq: 3 } }] }] });
      const inner = $(".conditions-group.is-nested");
      for (const button of $$(".conditions-rule-row > .conditions-btn-remove", inner)) {
        button.click();
      }
      expect($(".conditions-group.is-nested")).toBeNull();
      expect(json()).toEqual({ a: { eq: 1 } });
    });

    it("keeps the JSON unchanged when nothing is edited", () => {
      const condition = {
        and: [{ a: { eq: 1 } }, { or: [{ b: { eq: 2 } }, { c: { eq: 3 }, d: { eq: 4 } }] }],
      };
      load(condition);
      const inner = $(".conditions-group.is-nested .conditions-group-operator");
      inner.click();
      $(".conditions-group.is-nested .conditions-group-operator").click();
      expect(json()).toEqual(condition);
    });
  });

  describe("filters", () => {
    it("summarizes each filter as a sentence", () => {
      load(
        { age: { gte: 18, lte: 65 }, active: { eq: true }, tags: { not_empty: true } },
        { schema },
      );
      expect(pills()).toEqual([
        "Age is at least 18 and is at most 65",
        "Active is Yes",
        "Tags is not empty",
      ]);
    });

    it("shows parent fields as a path", () => {
      load({ "items:price:sum": { gt: 10 } }, { schema });
      expect($(".conditions-summary-path").textContent).toBe("Items");
      expect(pills()).toEqual(["Items Price (sum) is greater than 10"]);
    });

    it("formats ranges, lists and missing values", () => {
      load({ age: { between: [18, 65] }, name: { in: ["a", "b"] }, x: { eq: "" } }, { schema });
      expect(pills()).toEqual(["Age is between 18 and 65", "Name is one of a, b", "x is …"]);
    });

    it("adds a filter in edit mode that asks for its field first", async () => {
      load({ a: { eq: 1 } });
      $(".conditions-btn-add-rule").click();

      const draft = $$(".conditions-group-children > .conditions-rule").at(-1) as HTMLElement;
      expect($(".conditions-rule-editor > .conditions-field-input", draft)).toBe(picker());
      expect((picker() as HTMLInputElement).placeholder).toBe("Field name");
      expect($<HTMLSelectElement>(".conditions-condition-operator-select", draft).disabled).toBe(
        true,
      );
      expect($<HTMLInputElement>(".conditions-condition-value-input", draft).disabled).toBe(true);
      expect(json()).toEqual({ a: { eq: 1 } });

      await Promise.resolve();
      expect(document.activeElement).toBe(picker());
    });

    it("replaces the empty message with the new filter", () => {
      new Conditions(input);
      $(".conditions-btn-add-rule").click();
      expect($(".conditions-group-empty")).toBeNull();
    });

    it("enables the comparison and value once a field is typed", () => {
      load({ a: { eq: 1 } });
      pick($(".conditions-btn-add-rule"), "  b ");

      const operators = $$<HTMLSelectElement>(".conditions-condition-operator-select");
      expect(operators[1].disabled).toBe(false);
      expect(json()).toEqual({ a: { eq: 1 }, b: { eq: "" } });
      expect(openEditors()).toHaveLength(1);
    });

    it("keeps a filter without a field out of the JSON", () => {
      load({ a: { eq: 1 } });
      $(".conditions-btn-add-rule").click();
      press(picker(), "Escape");

      expect(openEditors()).toHaveLength(0);
      expect(pills()).toEqual(["a is 1", "Field name"]);
      expect(json()).toEqual({ a: { eq: 1 } });
    });

    it("opens the editor when the pill is clicked, one at a time", () => {
      load({ a: { eq: 1 }, b: { eq: 2 } });
      const [first, second] = $$(".conditions-rule-pill");

      first.click();
      expect(openEditors()).toHaveLength(1);

      second.click();
      expect(openEditors()).toHaveLength(1);
      expect($$(".conditions-rule")[1].classList.contains("is-open")).toBe(true);
    });

    it("updates the sentence when the editor is closed", () => {
      load({ a: { eq: 1 } });
      $(".conditions-rule-pill").click();
      change($<HTMLInputElement>(".conditions-condition-value-input"), "5");
      $(".conditions-btn-done").click();

      expect(openEditors()).toHaveLength(0);
      expect(pills()).toEqual(["a is 5"]);
      expect(json()).toEqual({ a: { eq: 5 } });
    });

    it("closes the editor with Escape or Enter", () => {
      load({ a: { eq: 1 } });

      $(".conditions-rule-pill").click();
      press($(".conditions-condition-value-input"), "Enter");
      expect(openEditors()).toHaveLength(0);

      $(".conditions-rule-pill").click();
      press($(".conditions-condition-operator-select"), "Escape");
      expect(openEditors()).toHaveLength(0);
    });

    it("removes a filter from its pill but not from the editor", () => {
      load({ a: { eq: 1 }, b: { eq: 2 } });
      $(".conditions-rule-row > .conditions-btn-remove").click();
      expect(json()).toEqual({ b: { eq: 2 } });

      $(".conditions-rule-pill").click();
      expect($(".conditions-rule-editor-footer > .conditions-btn-remove")).toBeNull();
    });

    it("changes the field in the editor, keeping conditions that still fit", () => {
      load({ age: { gte: 18, eq: 20 } }, { schema });
      $(".conditions-rule-pill").click();
      expect(picker().value).toBe("age");

      change(picker(), "items:count");
      expect(json()).toEqual({ "items:count": { gte: 18, eq: 20 } });

      change(picker(), "name");
      expect(json()).toEqual({ name: { ne: "", eq: "" } });
    });

    it("labels controls for assistive technology", () => {
      load({ a: { eq: 1 } });
      $(".conditions-btn-add-rule").click();
      expect(picker().getAttribute("aria-label")).toBe("Field");
      expect($(".conditions-condition-operator-select").getAttribute("aria-label")).toBe(
        "Comparison",
      );
      expect($(".conditions-condition-value-input").getAttribute("aria-label")).toBe("Value");
      expect($(".conditions-rule-row > .conditions-btn-remove").getAttribute("aria-label")).toBe(
        "Remove filter",
      );
    });
  });

  describe("conditions on one field", () => {
    const addButtons = () => $$(".conditions-condition-section .conditions-btn-add-condition");

    it("adds a condition with an operator the field is not using yet and focuses it", () => {
      load({ age: { gte: 18 } });
      $(".conditions-rule-pill").click();
      addButtons()[0].click();

      expect(json()).toEqual({ age: { gte: 18, eq: "" } });
      const operators = $$(".conditions-condition-operator-select");
      expect(document.activeElement).toBe(operators[1]);
    });

    const removeButtons = () => $$(".conditions-condition-section .conditions-btn-remove");

    it("does not allow removing the last condition", () => {
      load({ a: { eq: 1, gt: 0 } });
      expect(removeButtons().map(isShown)).toEqual([true, true]);

      removeButtons()[0].click();
      expect(json()).toEqual({ a: { gt: 0 } });
      expect(removeButtons().map(isShown)).toEqual([false]);

      addButtons()[0].click();
      expect(removeButtons().map(isShown)).toEqual([true, true]);
    });

    it("offers to add a condition to a filter without any", () => {
      load({ a: {} });
      const addFirst = $(".conditions-rule-editor-footer > .conditions-btn-add-condition");
      expect(isShown(addFirst)).toBe(true);

      addFirst.click();
      expect(json()).toEqual({ a: { eq: "" } });
      expect(isShown(addFirst)).toBe(false);
    });
  });

  describe("values", () => {
    const valueInputs = () => $$<HTMLInputElement>(".conditions-condition-value-input");

    it("hides the value when the operator needs none and restores it after", () => {
      load({ name: { eq: "v" } }, { schema });
      const operator = $<HTMLSelectElement>(".conditions-condition-operator-select");

      change(operator, "exists");
      expect(valueInputs()).toHaveLength(0);
      expect(json()).toEqual({ name: { exists: true } });

      change(operator, "eq");
      change(valueInputs()[0], "new");
      expect(json()).toEqual({ name: { eq: "new" } });
    });

    it("keeps the value when switching between operators of the same kind", () => {
      load({ name: { eq: "v" } }, { schema });
      change($<HTMLSelectElement>(".conditions-condition-operator-select"), "starts_with");
      expect(json()).toEqual({ name: { starts_with: "v" } });
    });

    it("uses a number input for number fields", () => {
      load({ age: { gt: 18 } }, { schema });
      expect(valueInputs()[0].type).toBe("number");
    });

    it("uses two inputs for 'between'", () => {
      load({ age: { between: [18, 65] } }, { schema });
      const [from, to] = valueInputs();
      expect([from.value, to.value]).toEqual(["18", "65"]);

      change(to, "70");
      expect(json()).toEqual({ age: { between: [18, 70] } });
    });

    it("uses a comma separated input for lists", () => {
      load({ name: { in: ["a", "b"] } }, { schema });
      const [list] = valueInputs();
      expect(list.placeholder).toBe("Values, separated by commas");
      change(list, "a, b, c");
      expect(json()).toEqual({ name: { in: ["a", "b", "c"] } });
    });

    it("uses a yes/no select for boolean fields", () => {
      load({ active: { eq: true } }, { schema });
      const [select] = valueInputs() as unknown as HTMLSelectElement[];
      expect(select.tagName).toBe("SELECT");
      change(select, "false");
      expect(json()).toEqual({ active: { eq: false } });
    });
  });

  describe("schema", () => {
    it("offers the schema's fields when adding a filter", () => {
      new Conditions(input, { schema });
      $(".conditions-btn-add-rule").click();

      const options = Array.from((picker() as HTMLSelectElement).options).map(
        (option) => option.textContent,
      );
      expect(options).toEqual([
        "Choose a field…",
        "Name",
        "Age",
        "Active",
        "Tags",
        "Items (count)",
        "Items → Price (sum)",
      ]);
    });

    it("renders the comparison and value inputs for the picked field's type", () => {
      new Conditions(input, { schema });
      const operator = () => $$<HTMLSelectElement>(".conditions-condition-operator-select").at(-1);
      const value = () => $$<HTMLElement>(".conditions-condition-value-input").at(-1);

      pick($(".conditions-btn-add-rule"), "age");
      expect(operator()?.value).toBe("eq");
      expect((value() as HTMLInputElement).type).toBe("number");

      pick($(".conditions-btn-add-rule"), "active");
      expect(value()?.tagName).toBe("SELECT");

      pick($(".conditions-btn-add-rule"), "tags");
      expect(operator()?.value).toBe("contains");
      expect(json()).toEqual({ age: { eq: "" }, active: { eq: "" }, tags: { contains: "" } });
    });

    it("only offers operators that fit the field type", () => {
      load({ age: { eq: 1 } }, { schema });
      const options = Array.from(
        $<HTMLSelectElement>(".conditions-condition-operator-select").options,
      ).map((option) => option.value);
      expect(options).toContain("gte");
      expect(options).not.toContain("starts_with");
    });

    it("does not offer item filters inside the editor", () => {
      load({ "items:count": { gte: 1 } }, { schema });
      $(".conditions-rule-pill").click();
      expect($(".conditions-rule-editor .conditions-btn-add-where")).toBeNull();
    });

    it("adds item filters from the pill row without opening the editor first", () => {
      load({ name: { eq: "x" }, "items:count": { gte: 1 } }, { schema });
      const [nameWhere, itemsWhere] = $$(".conditions-rule-row > .conditions-btn-add-where");
      expect(isShown(nameWhere)).toBe(false);
      expect(itemsWhere.textContent).toBe("");
      expect(itemsWhere.getAttribute("aria-label")).toBe("Only items where…");
      expect($("svg", itemsWhere)).not.toBeNull();

      itemsWhere.click();
      const where = $$(".conditions-rule-where")[1];
      expect(isShown(itemsWhere)).toBe(false);
      expect(openEditors()).toEqual([$(".conditions-rule-editor", where)]);
      expect((picker() as HTMLSelectElement).options).toHaveLength(3);
    });

    it("adds item filters with the nested schema's fields", () => {
      load({ "items:count": { gte: 1 } }, { schema });
      $(".conditions-rule-pill").click();
      $(".conditions-btn-add-where").click();

      const options = Array.from((picker() as HTMLSelectElement).options).map(
        (option) => option.value,
      );
      expect(options).toEqual(["", "type", "price"]);

      change(picker(), "type");
      const where = $(".conditions-rule-where");
      expect($(".conditions-rule-where-label", where).textContent).toBe("WHERE");
      change($<HTMLInputElement>(".conditions-condition-value-input", where), "product");
      expect(json()).toEqual({ "items:count": { gte: 1, where: { type: { eq: "product" } } } });
      expect(isShown($(".conditions-btn-add-where"))).toBe(false);
    });

    it("keeps item filters open to new filters once their last filter is removed", () => {
      load({ "items:count": { gte: 1, where: { type: { eq: "x" } } } }, { schema });
      $(".conditions-rule-where .conditions-rule-row > .conditions-btn-remove").click();

      const where = $(".conditions-rule-where");
      expect(json()).toEqual({ "items:count": { gte: 1 } });
      expect(isShown(where)).toBe(true);
      expect($(".conditions-btn-add-rule", where)).not.toBeNull();
      expect($(".conditions-btn-add-group", where)).not.toBeNull();
    });

    it("removes item filters with their WHERE button", () => {
      load({ "items:count": { gte: 1, where: { type: { eq: "x" } } } }, { schema });
      expect(
        $(".conditions-rule-where .conditions-group-actions > .conditions-btn-remove"),
      ).toBeNull();

      const whereBtn = $<HTMLButtonElement>(".conditions-rule-where-label");
      expect(whereBtn.tagName).toBe("BUTTON");
      expect(whereBtn.title).toBe("Remove these item filters");
      whereBtn.click();

      expect(json()).toEqual({ "items:count": { gte: 1 } });
      expect(isShown($(".conditions-rule-where"))).toBe(false);
      expect(isShown($(".conditions-btn-add-where"))).toBe(true);
    });

    it("adds a group to empty item filters", () => {
      load({ "items:count": { gte: 1 } }, { schema });
      $(".conditions-rule-pill").click();
      $(".conditions-btn-add-where").click();
      press(picker(), "Escape");
      $(".conditions-rule-where .conditions-btn-add-group").click();

      expect(
        $(".conditions-rule-where .conditions-group.is-nested .conditions-group"),
      ).not.toBeNull();
    });

    it("starts item filters with a new filter and keeps them once it is closed", () => {
      load({ "items:count": { gte: 1 } }, { schema });
      $(".conditions-rule-pill").click();
      $(".conditions-btn-add-where").click();

      const where = $(".conditions-rule-where");
      expect(openEditors()).toEqual([$(".conditions-rule-editor", where)]);

      press(picker(), "Escape");
      expect(openEditors()).toHaveLength(0);
      expect(isShown(where)).toBe(true);
      expect($(".conditions-btn-add-rule", where)).not.toBeNull();
      expect($(".conditions-btn-add-group", where)).not.toBeNull();
      expect(json()).toEqual({ "items:count": { gte: 1 } });
    });

    it("keeps several item filters on the same field", () => {
      const condition = {
        and: [
          { "items:count": { gte: 1, where: { type: { eq: "proposition" } } } },
          { "items:count": { gte: 1, where: { type: { eq: "product" } } } },
        ],
      };
      load(condition, { schema });
      expect(pills()).toEqual([
        "Items (count) is at least 1",
        "Type is proposition",
        "Items (count) is at least 1",
        "Type is product",
      ]);

      change($$<HTMLInputElement>(".conditions-condition-value-input")[0], "2");
      expect(json().and[0]["items:count"].gte).toBe(2);
      expect(json().and[1]).toEqual(condition.and[1]);
    });
  });

  describe("mod and intersects", () => {
    const valueInputs = () => $$<HTMLInputElement>(".conditions-condition-value-input");

    it("summarizes and edits mod as a divisor and remainder", () => {
      load({ age: { mod: [3, 1] } }, { schema });
      expect(pills()).toEqual(["Age divided by 3 leaves remainder 1"]);

      $(".conditions-rule-pill").click();
      expect(valueInputs().map((element) => element.value)).toEqual(["3", "1"]);
      expect(valueInputs().map((element) => element.type)).toEqual(["number", "number"]);

      change(valueInputs()[0], "4");
      expect(json()).toEqual({ age: { mod: [4, 1] } });
    });

    it("summarizes and edits intersects as a list", () => {
      load({ tags: { intersects: ["a", "b"] } }, { schema });
      expect(pills()).toEqual(["Tags has any of a, b"]);

      $(".conditions-rule-pill").click();
      change(valueInputs()[0], "a, c");
      expect(json()).toEqual({ tags: { intersects: ["a", "c"] } });
    });

    it("offers contains for text and no longer offers like", () => {
      load({ name: { eq: "x" } }, { schema });
      const options = Array.from(
        $<HTMLSelectElement>(".conditions-condition-operator-select").options,
      ).map((option) => option.value);

      expect(options).toContain("contains");
      expect(options).not.toContain("like");
    });
  });

  describe("distinct", () => {
    const addDistinct = () => $<HTMLButtonElement>(".conditions-btn-add-distinct");
    const distinct = () => $(".conditions-rule-distinct");
    const distinctFields = () => $$<HTMLSelectElement>(".conditions-distinct-field", distinct());
    const distinctValues = () => $$<HTMLInputElement>(".conditions-distinct-values", distinct());

    it("summarizes counting unique values", () => {
      load(
        {
          or: [
            { "items:count": { gte: 2, distinct: { type: true } } },
            { "items:count": { gte: 2, distinct: { type: ["a", "b"], price: true } } },
          ],
        },
        { schema },
      );

      expect(pills()).toEqual([
        "Items (count) of unique Type is at least 2",
        "Items (count) of unique Type (a, b), Price is at least 2",
      ]);
    });

    it("offers counting unique values as an icon button", () => {
      load({ "items:count": { gte: 2 } }, { schema });
      $(".conditions-rule-pill").click();

      expect(addDistinct().textContent).toBe("");
      expect(addDistinct().getAttribute("aria-label")).toBe("Count unique values");
      expect(addDistinct().title).toBe("Count unique values");
      expect($("svg", addDistinct())).not.toBeNull();
    });

    it("adds a field to count unique values of", () => {
      load({ "items:count": { gte: 2 } }, { schema });
      $(".conditions-rule-pill").click();
      expect(isShown(distinct())).toBe(false);

      addDistinct().click();
      expect(isShown(distinct())).toBe(true);
      expect(isShown(addDistinct())).toBe(false);
      expect(Array.from(distinctFields()[0].options, (option) => option.value)).toEqual([
        "",
        "type",
        "price",
      ]);

      change(distinctFields()[0], "type");
      expect(json()).toEqual({ "items:count": { gte: 2, distinct: { type: true } } });

      change(distinctValues()[0], "product, proposition");
      expect(json()).toEqual({
        "items:count": { gte: 2, distinct: { type: ["product", "proposition"] } },
      });
    });

    it("counts unique values of several fields", () => {
      load({ "items:count": { gte: 2, distinct: { type: true } } }, { schema });
      $(".conditions-rule-pill").click();

      $<HTMLButtonElement>(".conditions-btn-add-distinct-field").click();
      change(distinctFields()[1], "price");

      expect(json()).toEqual({ "items:count": { gte: 2, distinct: { type: true, price: true } } });
    });

    it("stops counting unique values when the last field is removed", () => {
      load({ "items:count": { gte: 2, distinct: { type: true } } }, { schema });
      $(".conditions-rule-pill").click();

      $<HTMLButtonElement>(".conditions-rule-distinct .conditions-btn-remove").click();

      expect(json()).toEqual({ "items:count": { gte: 2 } });
      expect(isShown(distinct())).toBe(false);
      expect(isShown(addDistinct())).toBe(true);
    });

    it("keeps distinct when editing the count", () => {
      load({ "items:count": { gte: 2, distinct: { type: true } } }, { schema });
      $(".conditions-rule-pill").click();

      change($<HTMLInputElement>(".conditions-condition-value-input"), "3");

      expect(json()).toEqual({ "items:count": { gte: 3, distinct: { type: true } } });
    });

    it("is only offered for counts", () => {
      load({ "items:price:sum": { gte: 2 } }, { schema });
      $(".conditions-rule-pill").click();

      expect(isShown(addDistinct())).toBe(false);
    });

    it("drops distinct when the field changes to something other than a count", () => {
      load({ "items:count": { gte: 2, distinct: { type: true } } }, { schema });
      $(".conditions-rule-pill").click();

      change(picker(), "items:price:sum");

      expect(json()).toEqual({ "items:price:sum": { gte: 2 } });
      expect(isShown(distinct())).toBe(false);
    });
  });

  describe("ai", () => {
    const aiInput = () => $<HTMLInputElement>(".conditions-ai-input");
    const aiButton = () => $<HTMLButtonElement>(".conditions-btn-ai");
    const aiError = () => $(".conditions-ai-error");
    const flush = () => new Promise((resolve) => setTimeout(resolve));

    const ask = (prompt: string) => {
      change(aiInput(), prompt);
      press(aiInput(), "Enter");
    };

    it("renders no prompt without an ai handler", () => {
      load({});
      expect($(".conditions-ai")).toBeNull();
    });

    it("hides the prompt in read-only mode", () => {
      const conditions = load({}, { ai: jest.fn(), readOnly: true });
      expect($(".conditions-ai")).toBeNull();

      conditions.setReadOnly(false);
      expect($(".conditions-ai")).not.toBeNull();
    });

    it("sends the prompt, current condition and instructions", async () => {
      const ai = jest.fn().mockResolvedValue({});
      load({ name: { eq: "John" } }, { schema, ai });

      ask("  also older than 18 ");
      await flush();

      const [request] = ai.mock.calls[0];
      expect(request.prompt).toBe("also older than 18");
      expect(request.condition).toEqual({ name: { eq: "John" } });
      expect(request.instructions).toContain("- age (number): Age");
      expect(request.message).toContain("Request: also older than 18");
    });

    it("replaces the filters with the response", async () => {
      const ai = jest.fn().mockResolvedValue({ name: { eq: "John" }, age: { gte: 18 } });
      const onChange = jest.fn();
      load({ name: { eq: "John" } }, { schema, ai });
      input.addEventListener("change", onChange);

      ask("also older than 18");
      await flush();

      expect(json()).toEqual({ name: { eq: "John" }, age: { gte: 18 } });
      expect(pills()).toEqual(["Name is John", "Age is at least 18"]);
      expect(onChange).toHaveBeenCalled();
      expect(aiInput().value).toBe("");
      expect(aiError()).toBeNull();
    });

    describe("chat", () => {
      const prompts = () => $$(".conditions-ai-prompt").map((element) => element.textContent);
      const replies = () => $$(".conditions-ai-reply");
      const replyJson = (reply: HTMLElement) =>
        JSON.parse(reply.querySelector(".conditions-ai-json pre")?.textContent ?? "");
      const part = (reply: HTMLElement, selector: string) =>
        reply.querySelector(selector) as HTMLElement;
      const currentReplies = () =>
        replies().filter((reply) => isShown(part(reply, ".conditions-ai-current")));
      const restore = (reply: HTMLElement) =>
        (part(reply, ".conditions-btn-ai-restore") as HTMLButtonElement).click();

      const responses = [{ name: { eq: "John" } }, { name: { eq: "John" }, age: { gte: 18 } }];

      const chat = async () => {
        const ai = jest.fn();
        for (const response of responses) ai.mockResolvedValueOnce(response);
        load({}, { schema, ai });

        ask("name is John");
        await flush();
        ask("also older than 18");
        await flush();
      };

      it("shows each prompt with a reply holding the returned JSON", async () => {
        await chat();

        expect(prompts()).toEqual(["name is John", "also older than 18"]);
        expect(replies().map(replyJson)).toEqual(responses);
        expect((part(replies()[0], "details") as HTMLDetailsElement).open).toBe(false);
      });

      it("marks the reply that matches the filters as current", async () => {
        await chat();

        expect(currentReplies()).toEqual([replies()[1]]);
        expect(isShown(part(replies()[1], ".conditions-btn-ai-restore"))).toBe(false);
      });

      it("restores the filters of an earlier reply", async () => {
        await chat();
        const onChange = jest.fn();
        input.addEventListener("change", onChange);

        restore(replies()[0]);

        expect(json()).toEqual(responses[0]);
        expect(pills()).toEqual(["Name is John"]);
        expect(onChange).toHaveBeenCalled();
        expect(currentReplies()).toEqual([replies()[0]]);
        expect(prompts()).toHaveLength(2);
      });

      it("marks no reply as current after editing the filters by hand", async () => {
        await chat();

        $<HTMLButtonElement>(".conditions-rule-row > .conditions-btn-remove").click();

        expect(currentReplies()).toEqual([]);
      });

      it("shows errors in the chat", async () => {
        load({}, { ai: async () => Promise.reject(new Error("Bad key")) });

        ask("older than 18");
        await flush();

        expect(prompts()).toEqual(["older than 18"]);
        expect(replies()).toEqual([]);
        expect(aiError().textContent).toBe("Couldn't update the filters. Bad key");
      });
    });

    it("accepts a JSON string response", async () => {
      load({}, { ai: async () => '{"or":[{"a":{"eq":1}},{"b":{"eq":2}}]}' });

      change(aiInput(), "a or b");
      aiButton().click();
      await flush();

      expect(json()).toEqual({ or: [{ a: { eq: 1 } }, { b: { eq: 2 } }] });
    });

    it("ignores an empty prompt", () => {
      const ai = jest.fn();
      load({}, { ai });

      ask("   ");
      expect(ai).not.toHaveBeenCalled();
    });

    it("disables the prompt while waiting", async () => {
      let resolve: (value: unknown) => void = () => {};
      load(
        {},
        {
          ai: () =>
            new Promise((r) => {
              resolve = r;
            }),
        },
      );

      ask("name is John");
      expect(aiInput().disabled).toBe(true);
      expect(aiButton().disabled).toBe(true);
      expect(aiButton().textContent).toBe("Generating…");

      resolve({ name: { eq: "John" } });
      await flush();

      expect(aiInput().disabled).toBe(false);
      expect(aiButton().textContent).toBe("Generate");
    });

    it("shows an error and keeps the filters and prompt when the handler fails", async () => {
      load({ name: { eq: "John" } }, { ai: async () => Promise.reject(new Error("Bad key")) });

      ask("older than 18");
      await flush();

      expect(isShown(aiError())).toBe(true);
      expect(aiError().textContent).toBe("Couldn't update the filters. Bad key");
      expect(json()).toEqual({ name: { eq: "John" } });
      expect(aiInput().value).toBe("older than 18");
    });

    it("shows an error for a response that is not a condition", async () => {
      load({ name: { eq: "John" } }, { ai: async () => "42" });

      ask("older than 18");
      await flush();

      expect(isShown(aiError())).toBe(true);
      expect(json()).toEqual({ name: { eq: "John" } });
    });

    it("keeps the prompt when the JSON is edited by hand", () => {
      let inputListener: ((event: Event) => void) | undefined;
      const origAdd = input.addEventListener.bind(input);
      input.addEventListener = ((type: string, listener: EventListener) => {
        if (type === "input") inputListener = listener;
        return origAdd(type, listener);
      }) as typeof input.addEventListener;
      load({}, { ai: jest.fn() });
      input.addEventListener = origAdd;
      change(aiInput(), "draft");

      input.value = JSON.stringify({ name: { eq: "Jane" } });
      inputListener?.({ isTrusted: true } as unknown as Event);

      expect(pills()).toEqual(["name is Jane"]);
      expect(aiInput().value).toBe("draft");
    });
  });
});
