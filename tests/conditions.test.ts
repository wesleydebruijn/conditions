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

  const change = (element: HTMLInputElement | HTMLSelectElement, value: string) => {
    element.value = value;
    element.dispatchEvent(new Event(element.tagName === "SELECT" ? "change" : "input"));
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
      expect($(".conditions-group-section")).not.toBeNull();
    });

    it("merges custom labels with the defaults", () => {
      new Conditions(input, { labels: { match: "Zoek" } });
      const labels = $$(".conditions-group-label").map((el) => el.textContent);
      expect(labels).toEqual(["Zoek", "of the following"]);
    });

    it("re-renders on trusted change event", () => {
      let changeListener: ((event: Event) => void) | undefined;
      const origAdd = input.addEventListener.bind(input);
      (input as any).addEventListener = (type: string, listener: any, ...args: any[]) => {
        if (type === "change") changeListener = listener;
        return origAdd(type, listener, ...args);
      };
      new Conditions(input);
      input.addEventListener = origAdd;

      const wrapper = $(".conditions-wrapper");
      input.value = '{"name":"x"}';
      changeListener?.({ isTrusted: true } as unknown as Event);
      expect($(".conditions-wrapper")).not.toBe(wrapper);
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
    it("adds a group with a ready-to-fill rule", () => {
      input.value = "[]";
      new Conditions(input);
      $(".conditions-btn-add-group").click();
      expect($$(".conditions-group-section")).toHaveLength(1);
      expect($$(".conditions-condition-section")).toHaveLength(1);
      expect(json()).toEqual({ "": { eq: "" } });
    });

    it("labels the add group button", () => {
      new Conditions(input);
      expect($(".conditions-btn-add-group").textContent).toBe("Add group");
    });

    it("explains that an empty group matches everything", () => {
      new Conditions(input);
      expect($(".conditions-group-body").children).toHaveLength(0);
      expect($(".conditions-group-empty").textContent).toBe("No rules yet, so everything matches.");
    });

    it("removes a group", () => {
      input.value = JSON.stringify({ a: { eq: 1 } });
      new Conditions(input);
      $(".conditions-group-header .conditions-btn-remove").click();
      expect($$(".conditions-group-section")).toHaveLength(0);
      expect(input.value).toBe("[]");
    });

    it("defaults the operator to 'all'", () => {
      new Conditions(input);
      const select = $<HTMLSelectElement>(".conditions-group-operator-select");
      expect(select.value).toBe("and");
      expect(select.selectedOptions[0].textContent).toBe("all");
    });

    it("changes operator and updates the connector between rule groups", () => {
      input.value = JSON.stringify({ and: [{ a: { eq: 1 } }, { b: { eq: 2 } }] });
      new Conditions(input);
      const group = $(".conditions-group-section");
      expect(group.style.getPropertyValue("--conditions-connector")).toBe('"and"');

      change($<HTMLSelectElement>(".conditions-group-operator-select"), "or");

      expect(json()).toEqual({ or: [{ a: { eq: 1 } }, { b: { eq: 2 } }] });
      expect(group.style.getPropertyValue("--conditions-connector")).toBe('"or"');
    });
  });

  describe("match any", () => {
    const joinButtons = () => $$(".conditions-btn-join-field");

    it("makes every rule its own alternative when switching to 'any'", () => {
      input.value = JSON.stringify({ a: { eq: 1 }, b: { eq: 2 } });
      new Conditions(input);
      change($<HTMLSelectElement>(".conditions-group-operator-select"), "or");
      expect(json()).toEqual({ or: [{ a: { eq: 1 } }, { b: { eq: 2 } }] });
      expect($$(".conditions-fieldset-section")).toHaveLength(2);
    });

    it("combines all alternatives when switching back to 'all'", () => {
      input.value = JSON.stringify({ or: [{ a: { eq: 1 } }, { b: { eq: 2 }, c: { eq: 3 } }] });
      new Conditions(input);
      change($<HTMLSelectElement>(".conditions-group-operator-select"), "and");
      expect(json()).toEqual({ a: { eq: 1 }, b: { eq: 2 }, c: { eq: 3 } });
      expect($$(".conditions-fieldset-section")).toHaveLength(1);
    });

    it("adds a new alternative with 'Add rule'", () => {
      input.value = JSON.stringify({ or: [{ a: { eq: 1 } }, { b: { eq: 2 } }] });
      new Conditions(input);
      $(".conditions-btn-add-field").click();
      expect(json().or).toHaveLength(3);
    });

    it("offers 'And' only on the last rule of each alternative", () => {
      input.value = JSON.stringify({ or: [{ a: { eq: 1 } }, { b: { eq: 2 }, c: { eq: 3 } }] });
      new Conditions(input);
      expect(joinButtons().map((button) => button.style.display)).toEqual(["", "none", ""]);
    });

    it("does not offer 'And' when matching all", () => {
      input.value = JSON.stringify({ a: { eq: 1 }, b: { eq: 2 } });
      new Conditions(input);
      expect(joinButtons().every((button) => button.style.display === "none")).toBe(true);
    });

    it("joins a rule into an alternative with 'And'", () => {
      input.value = JSON.stringify({ or: [{ a: { eq: 1 } }, { b: { eq: 2 } }] });
      new Conditions(input);
      joinButtons()[0].click();
      expect(json()).toEqual({ or: [{ a: { eq: 1 }, "": { eq: "" } }, { b: { eq: 2 } }] });

      const [joined, single] = $$(".conditions-fieldset-section");
      expect(joined.classList.contains("is-boxed")).toBe(true);
      expect($(".conditions-fieldset-label", joined).textContent).toBe("All of these");
      expect(single.classList.contains("is-boxed")).toBe(false);
    });

    it("drops an alternative once its last rule is removed", () => {
      input.value = JSON.stringify({ or: [{ a: { eq: 1 } }, { b: { eq: 2 } }] });
      new Conditions(input);
      $(".conditions-condition-section .conditions-btn-remove").click();
      expect(json()).toEqual({ b: { eq: 2 } });
      expect($$(".conditions-fieldset-section")).toHaveLength(1);
    });

    it("shows rule sets combined with 'all' as one list of rules", () => {
      input.value = JSON.stringify({ and: [{ a: { eq: 1 } }, { b: { eq: 2 } }] });
      new Conditions(input);
      expect($$(".conditions-fieldset-section")).toHaveLength(1);
      expect($(".is-boxed")).toBeNull();
      expect($$(".conditions-field-section")).toHaveLength(2);
    });

    it("keeps several item filters on the same field", () => {
      const condition = {
        and: [
          { items_count: { gte: 1, where: { type: { eq: "proposition" } } } },
          { items_count: { gte: 1, where: { type: { eq: "product" } } } },
        ],
      };
      input.value = JSON.stringify(condition);
      new Conditions(input);
      const topLevelRules = $$(".conditions-field-section").filter(
        (rule) => !rule.closest(".conditions-field-nested-groups"),
      );
      expect(topLevelRules).toHaveLength(2);

      change($$<HTMLInputElement>(".conditions-condition-value-input")[0], "2");
      expect(json().and[0].items_count.gte).toBe(2);
      expect(json().and[1]).toEqual(condition.and[1]);
    });
  });

  describe("multiple conditions on one field", () => {
    const addButtons = () => $$(".conditions-btn-add-condition");

    it("adds another condition to the same field", () => {
      input.value = JSON.stringify({ age: { gte: 18 } });
      new Conditions(input);
      addButtons()[0].click();
      expect($$(".conditions-field-section")).toHaveLength(1);
      expect($$(".conditions-condition-section")).toHaveLength(2);
      expect(Object.keys(json().age)).toEqual(["gte", "eq"]);
    });

    it("picks an operator the field is not using yet", () => {
      input.value = JSON.stringify({ age: { eq: 1, ne: 2 } });
      new Conditions(input);
      addButtons()[1].click();
      expect(Object.keys(json().age)).toEqual(["eq", "ne", "gt"]);
    });

    it("works in 'any' mode without creating a new alternative", () => {
      input.value = JSON.stringify({ or: [{ age: { gte: 18 } }, { name: { eq: "x" } }] });
      new Conditions(input);
      addButtons()[0].click();
      expect(json().or).toHaveLength(2);
      expect(Object.keys(json().or[0].age)).toEqual(["gte", "eq"]);
    });

    it("adds a first condition to a field that has none", () => {
      input.value = JSON.stringify({ items_count: { where: { a: { eq: 1 } } } });
      new Conditions(input);
      const fieldSection = $(".conditions-field-section");
      const button = $(
        ":scope > .conditions-field-body .conditions-btn-add-condition",
        fieldSection,
      );
      expect(button.textContent).toBe("Add condition");
      button.click();
      expect(json()).toEqual({ items_count: { eq: "", where: { a: { eq: 1 } } } });
      expect(button.style.display).toBe("none");
    });

    it("labels the add button and focuses the new comparison", async () => {
      input.value = JSON.stringify({ age: { gte: 18 } });
      new Conditions(input);
      const [button] = addButtons();
      expect(button.getAttribute("aria-label")).toBe("Add condition");
      button.click();
      const operators = $$(".conditions-condition-operator-select");
      expect(document.activeElement).toBe(operators[1]);
    });
  });

  describe("rules", () => {
    it("renders rules in the same order as the JSON", () => {
      input.value = JSON.stringify({ a: { gte: 1, lte: 9 }, b: { eq: 2 } });
      new Conditions(input);
      const keys = $$<HTMLInputElement>(".conditions-field-input").map((el) => el.value);
      const operators = $$<HTMLSelectElement>(".conditions-condition-operator-select").map(
        (el) => el.value,
      );
      expect(keys).toEqual(["a", "b"]);
      expect(operators).toEqual(["gte", "lte", "eq"]);
    });

    it("appends a new rule with a default condition", () => {
      input.value = JSON.stringify({ a: { eq: 1 } });
      new Conditions(input);
      $(".conditions-btn-add-field").click();
      expect($$(".conditions-field-section")).toHaveLength(2);
      expect(Object.keys(json())).toEqual(["a", ""]);
    });

    it("updates the field name while typing when there is no schema", () => {
      input.value = JSON.stringify({ old: { eq: 1 } });
      new Conditions(input);
      const fieldInput = $<HTMLInputElement>(".conditions-field-input");
      expect(fieldInput.placeholder).toBe("Field name");
      change(fieldInput, "new");
      expect(json()).toEqual({ new: { eq: 1 } });
    });

    it("removes the rule when its last condition is removed", () => {
      input.value = JSON.stringify({ a: { eq: 1 }, b: { eq: 2 } });
      new Conditions(input);
      $(".conditions-condition-section .conditions-btn-remove").click();
      expect($$(".conditions-field-section")).toHaveLength(1);
      expect(json()).toEqual({ b: { eq: 2 } });
    });

    it("keeps the rule when other conditions remain", () => {
      input.value = JSON.stringify({ a: { gt: 1, lt: 5 } });
      new Conditions(input);
      $(".conditions-condition-section .conditions-btn-remove").click();
      expect($$(".conditions-condition-section")).toHaveLength(1);
      expect(json()).toEqual({ a: { lt: 5 } });
    });

    it("keeps the rule when it still has item filters", () => {
      input.value = JSON.stringify({ a: { gt: 1, where: { b: { eq: 2 } } } });
      new Conditions(input);
      const fieldSection = $(".conditions-field-section");
      $(".conditions-condition-section .conditions-btn-remove", fieldSection).click();
      expect($$(".conditions-field-section")).toHaveLength(2);
      expect(json()).toEqual({ a: { where: { b: { eq: 2 } } } });
    });

    it("only shows the rule remove button when it has no conditions", () => {
      input.value = JSON.stringify({ a: { eq: 1 }, b: {} });
      new Conditions(input);
      const [withCondition, withoutCondition] = $$(
        ".conditions-field-actions .conditions-btn-remove",
      );
      expect(withCondition.style.display).toBe("none");
      expect(withoutCondition.style.display).toBe("");
      withoutCondition.click();
      expect(json()).toEqual({ a: { eq: 1 } });
    });

    it("drops empty rule sets when loading", () => {
      input.value = JSON.stringify({ or: [{}, { a: { eq: 1 } }] });
      new Conditions(input);
      $(".conditions-btn-add-field").click();
      expect(json().or).toEqual([{ a: { eq: 1 } }, { "": { eq: "" } }]);
    });

    it("moves focus to the field of a new rule", async () => {
      input.value = JSON.stringify({ a: { eq: 1 } });
      new Conditions(input);
      $(".conditions-btn-add-field").click();
      await Promise.resolve();
      expect(document.activeElement).toBe($$(".conditions-field-input")[1]);
    });

    it("labels controls for assistive technology", () => {
      input.value = JSON.stringify({ a: { eq: 1 } });
      new Conditions(input);
      expect($(".conditions-field-input").getAttribute("aria-label")).toBe("Field");
      expect($(".conditions-condition-operator-select").getAttribute("aria-label")).toBe(
        "Comparison",
      );
      expect($(".conditions-condition-value-input").getAttribute("aria-label")).toBe("Value");
    });
  });

  describe("schema", () => {
    const schema: Schema = {
      name: { label: "Name", type: "text" },
      age: { label: "Age", type: "number" },
      active: { label: "Active", type: "boolean" },
      tags: { label: "Tags", type: "text[]" },
      jobs: {
        label: "Jobs",
        type: "object[]",
        schema: { title: { label: "Title", type: "text" } },
      },
    };

    it("disables the comparison until a field is chosen", () => {
      input.value = "[]";
      new Conditions(input, { schema });
      $(".conditions-btn-add-group").click();
      const operator = () => $<HTMLSelectElement>(".conditions-condition-operator-select");
      expect(operator().disabled).toBe(true);
      expect($<HTMLInputElement>(".conditions-condition-value-input").disabled).toBe(true);

      change($<HTMLSelectElement>(".conditions-field-select"), "name");
      expect(operator().disabled).toBe(false);
    });

    it("shows a field placeholder for new rules", () => {
      input.value = "[]";
      new Conditions(input, { schema });
      $(".conditions-btn-add-group").click();
      const select = $<HTMLSelectElement>(".conditions-field-select");
      expect(select.value).toBe("");
      expect(select.options[0].textContent).toBe("Choose a field…");
    });

    it("resets conditions to the type's default when the field type changes", () => {
      input.value = JSON.stringify({ name: { eq: "x" } });
      new Conditions(input, { schema });
      change($<HTMLSelectElement>(".conditions-field-select"), "tags");
      expect(json()).toEqual({ tags: { contains: "" } });
      expect($$(".conditions-condition-section")).toHaveLength(1);
    });

    it("clears item filters when the field changes", () => {
      input.value = JSON.stringify({ jobs_count: { gte: 1, where: { title: { eq: "x" } } } });
      new Conditions(input, { schema });
      change($<HTMLSelectElement>(".conditions-field-select"), "name");
      expect(input.value).not.toContain("where");
      expect($$(".conditions-group-section")).toHaveLength(1);
    });

    it("only offers operators that fit the field type", () => {
      input.value = JSON.stringify({ age: { eq: 1 } });
      new Conditions(input, { schema });
      const options = Array.from(
        $<HTMLSelectElement>(".conditions-condition-operator-select").options,
      ).map((o) => o.value);
      expect(options).toContain("gte");
      expect(options).not.toContain("starts_with");
    });

    it("uses friendly operator labels", () => {
      input.value = JSON.stringify({ age: { gte: 1 } });
      new Conditions(input, { schema });
      const select = $<HTMLSelectElement>(".conditions-condition-operator-select");
      expect(select.selectedOptions[0].textContent).toBe("is at least");
    });

    it("shows item filters only for object fields", () => {
      input.value = JSON.stringify({ name: { eq: "x" }, jobs_count: { gte: 1 } });
      new Conditions(input, { schema });
      const [nameFilter, jobsFilter] = $$(".conditions-btn-add-filter");
      expect(nameFilter.style.display).toBe("none");
      expect(jobsFilter.style.display).toBe("");
    });

    it("adds item filters to object fields", () => {
      input.value = JSON.stringify({ jobs_count: { gte: 1 } });
      new Conditions(input, { schema });
      $(".conditions-btn-add-filter").click();
      expect($$(".conditions-group-section")).toHaveLength(2);
      expect(json()).toEqual({ jobs_count: { gte: 1, where: { "": { eq: "" } } } });
    });

    it("offers the nested schema's fields inside item filters", () => {
      input.value = JSON.stringify({ jobs_count: { gte: 1, where: { title: { eq: "x" } } } });
      new Conditions(input, { schema });
      const nested = $(".conditions-field-nested-groups");
      const options = Array.from(
        $<HTMLSelectElement>(".conditions-field-select", nested).options,
      ).map((o) => o.value);
      expect(options).toEqual(["", "title"]);
    });
  });

  describe("values", () => {
    const schema: Schema = {
      age: { label: "Age", type: "number" },
      active: { label: "Active", type: "boolean" },
      name: { label: "Name", type: "text" },
    };

    const valueInputs = () => $$<HTMLInputElement>(".conditions-condition-value-input");

    it("hides the value when the operator needs none and restores it after", () => {
      input.value = JSON.stringify({ name: { eq: "v" } });
      new Conditions(input, { schema });
      const operator = $<HTMLSelectElement>(".conditions-condition-operator-select");

      change(operator, "exists");
      expect(valueInputs()).toHaveLength(0);
      expect(json()).toEqual({ name: { exists: true } });

      change(operator, "eq");
      expect(valueInputs()).toHaveLength(1);
      change(valueInputs()[0], "newval");
      expect(json()).toEqual({ name: { eq: "newval" } });
    });

    it("keeps the value when switching between operators of the same kind", () => {
      input.value = JSON.stringify({ name: { eq: "v" } });
      new Conditions(input, { schema });
      change($<HTMLSelectElement>(".conditions-condition-operator-select"), "starts_with");
      expect(json()).toEqual({ name: { starts_with: "v" } });
    });

    it("uses a number input for number fields", () => {
      input.value = JSON.stringify({ age: { gt: 18 } });
      new Conditions(input, { schema });
      expect(valueInputs()[0].type).toBe("number");
    });

    it("uses two inputs for 'between'", () => {
      input.value = JSON.stringify({ age: { between: [18, 65] } });
      new Conditions(input, { schema });
      const [from, to] = valueInputs();
      expect([from.value, to.value]).toEqual(["18", "65"]);
      expect($(".conditions-condition-value-separator").textContent).toBe("and");

      change(to, "70");
      expect(json()).toEqual({ age: { between: [18, 70] } });
    });

    it("uses a comma separated input for lists", () => {
      input.value = JSON.stringify({ name: { in: ["a", "b"] } });
      new Conditions(input, { schema });
      const [list] = valueInputs();
      expect(list.placeholder).toBe("Values, separated by commas");
      change(list, "a, b, c");
      expect(json()).toEqual({ name: { in: ["a", "b", "c"] } });
    });

    it("uses a yes/no select for boolean fields", () => {
      input.value = JSON.stringify({ active: { eq: true } });
      new Conditions(input, { schema });
      const select = $<HTMLSelectElement>(
        ".conditions-condition-value .conditions-condition-value-input",
      );
      expect(select.tagName).toBe("SELECT");
      expect(select.selectedOptions[0].textContent).toBe("Yes");
      change(select, "false");
      expect(json()).toEqual({ active: { eq: false } });
    });
  });

  describe("nested groups", () => {
    it("renders existing item filters with their own label", () => {
      input.value = JSON.stringify({ a: { where: { b: { eq: 1 } } } });
      new Conditions(input);
      expect($$(".conditions-group-section")).toHaveLength(2);
      const nestedLabel = $(".conditions-field-nested-groups .conditions-group-label");
      expect(nestedLabel.textContent).toBe("Only items where");
    });

    it("appends item filters to a field without any yet", () => {
      input.value = JSON.stringify({ a: { eq: 1 } });
      new Conditions(input);
      $(".conditions-btn-add-filter").click();
      expect(json()).toEqual({ a: { eq: 1, where: { "": { eq: "" } } } });
    });
  });
});
