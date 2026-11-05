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

    it("adds an inner group with the opposite operator and an open filter", () => {
      load({ a: { eq: 1 } });
      $(".conditions-btn-add-group").click();

      const inner = $(".conditions-group.is-nested");
      expect(inner.dataset.operator).toBe("or");
      expect(openEditors()).toHaveLength(1);
      expect($(".conditions-btn-add-group", inner).textContent).toBe("Add inner group");
      expect(json()).toEqual({ and: [{ a: { eq: 1 } }, { "": { eq: "" } }] });
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
      load({ items_price_sum: { gt: 10 } }, { schema });
      expect($(".conditions-summary-path").textContent).toBe("Items");
      expect(pills()).toEqual(["Items Price (sum) is greater than 10"]);
    });

    it("formats ranges, lists and missing values", () => {
      load({ age: { between: [18, 65] }, name: { in: ["a", "b"] }, x: { eq: "" } }, { schema });
      expect(pills()).toEqual(["Age is between 18 and 65", "Name is one of a, b", "x is …"]);
    });

    it("adds a filter in edit mode and focuses its field", async () => {
      load({ a: { eq: 1 } });
      $(".conditions-btn-add-rule").click();
      expect(json()).toEqual({ a: { eq: 1 }, "": { eq: "" } });
      expect(openEditors()).toHaveLength(1);

      await Promise.resolve();
      expect(document.activeElement).toBe($$(".conditions-field-input")[1]);
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
      const press = (target: HTMLElement, key: string) =>
        target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

      $(".conditions-rule-pill").click();
      press($(".conditions-condition-value-input"), "Enter");
      expect(openEditors()).toHaveLength(0);

      $(".conditions-rule-pill").click();
      press($(".conditions-condition-operator-select"), "Escape");
      expect(openEditors()).toHaveLength(0);
    });

    it("removes a filter from its pill or from the editor", () => {
      load({ a: { eq: 1 }, b: { eq: 2 }, c: { eq: 3 } });
      $(".conditions-rule-row > .conditions-btn-remove").click();
      expect(json()).toEqual({ b: { eq: 2 }, c: { eq: 3 } });

      $(".conditions-rule-pill").click();
      $(".conditions-rule-editor-footer > .conditions-btn-remove").click();
      expect(json()).toEqual({ c: { eq: 3 } });
    });

    it("updates the field name while typing when there is no schema", () => {
      load({ old: { eq: 1 } });
      const fieldInput = $<HTMLInputElement>(".conditions-field-input");
      expect(fieldInput.placeholder).toBe("Field name");
      change(fieldInput, "new");
      expect(json()).toEqual({ new: { eq: 1 } });
    });

    it("labels controls for assistive technology", () => {
      load({ a: { eq: 1 } });
      expect($(".conditions-field-input").getAttribute("aria-label")).toBe("Field");
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

    it("keeps the filter when its last condition is removed and offers to add one", () => {
      load({ a: { eq: 1 } });
      $(".conditions-condition-section .conditions-btn-remove").click();

      expect(json()).toEqual({ a: {} });
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
    it("disables the comparison until a field is chosen", () => {
      new Conditions(input, { schema });
      $(".conditions-btn-add-rule").click();
      const operator = () => $<HTMLSelectElement>(".conditions-condition-operator-select");
      expect(operator().disabled).toBe(true);
      expect($<HTMLSelectElement>(".conditions-field-select").options[0].textContent).toBe(
        "Choose a field…",
      );

      change($<HTMLSelectElement>(".conditions-field-select"), "name");
      expect(operator().disabled).toBe(false);
    });

    it("resets conditions to the type's default when the field type changes", () => {
      load({ name: { eq: "x" } }, { schema });
      change($<HTMLSelectElement>(".conditions-field-select"), "tags");
      expect(json()).toEqual({ tags: { contains: "" } });
    });

    it("only offers operators that fit the field type", () => {
      load({ age: { eq: 1 } }, { schema });
      const options = Array.from(
        $<HTMLSelectElement>(".conditions-condition-operator-select").options,
      ).map((option) => option.value);
      expect(options).toContain("gte");
      expect(options).not.toContain("starts_with");
    });

    it("offers item filters only for object fields", () => {
      load({ name: { eq: "x" }, items_count: { gte: 1 } }, { schema });
      const [nameWhere, itemsWhere] = $$(".conditions-btn-add-where");
      expect(isShown(nameWhere)).toBe(false);
      expect(isShown(itemsWhere)).toBe(true);
    });

    it("adds item filters with the nested schema's fields", () => {
      load({ items_count: { gte: 1 } }, { schema });
      $(".conditions-btn-add-where").click();

      const where = $(".conditions-rule-where");
      expect($(".conditions-rule-where-label", where).textContent).toBe("Only items where");
      const options = Array.from(
        $<HTMLSelectElement>(".conditions-field-select", where).options,
      ).map((option) => option.value);
      expect(options).toEqual(["", "type", "price"]);

      change($<HTMLSelectElement>(".conditions-field-select", where), "type");
      change($<HTMLInputElement>(".conditions-condition-value-input", where), "product");
      expect(json()).toEqual({ items_count: { gte: 1, where: { type: { eq: "product" } } } });
      expect(isShown($(".conditions-btn-add-where"))).toBe(false);
    });

    it("removes item filters once their last filter is removed", () => {
      load({ items_count: { gte: 1, where: { type: { eq: "x" } } } }, { schema });
      $(".conditions-rule-where .conditions-rule-row > .conditions-btn-remove").click();
      expect(json()).toEqual({ items_count: { gte: 1 } });
      expect(isShown($(".conditions-rule-where"))).toBe(false);
    });

    it("clears item filters when the field changes", () => {
      load({ items_count: { gte: 1, where: { type: { eq: "x" } } } }, { schema });
      change($<HTMLSelectElement>(".conditions-field-select"), "age");
      expect(input.value).not.toContain("where");
    });

    it("keeps several item filters on the same field", () => {
      const condition = {
        and: [
          { items_count: { gte: 1, where: { type: { eq: "proposition" } } } },
          { items_count: { gte: 1, where: { type: { eq: "product" } } } },
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
      expect(json().and[0].items_count.gte).toBe(2);
      expect(json().and[1]).toEqual(condition.and[1]);
    });
  });
});
