/**
 * @jest-environment jsdom
 */

import Conditions from "./conditions";
import type { Schema, Settings } from "./types";

describe("Conditions", () => {
  let input: HTMLInputElement;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    input = document.createElement("input");
    input.type = "text";
    input.value = "{}";
    container.appendChild(input);
  });

  afterEach(() => {
    if (input.conditions) {
      input.conditions.destroy();
    }
    container.remove();
  });

  describe("constructor", () => {
    it("accepts element and renders wrapper", () => {
      const c = new Conditions(input);
      expect(input.conditions).toBe(c);
      expect(document.querySelector(".conditions-wrapper")).not.toBeNull();
      // Constructor does not call onChange(), so value stays initial "{}"
      expect(input.value).toBe("{}");
      c.destroy();
    });

    it("accepts selector string when element exists", () => {
      input.id = "cond-input";
      container.appendChild(input);
      const c = new Conditions("#cond-input");
      expect(document.querySelector(".conditions-wrapper")).not.toBeNull();
      c.destroy();
    });

    it("merges custom classNames", () => {
      const c = new Conditions(input, {
        classNames: { wrapper: "custom-wrapper" },
      } as Partial<Settings>);
      expect(document.querySelector(".custom-wrapper")).not.toBeNull();
      c.destroy();
    });

    it("re-renders on trusted change event", () => {
      let changeListener: Function | undefined;
      const origAdd = input.addEventListener.bind(input);
      (input as any).addEventListener = (type: string, listener: any, ...args: any[]) => {
        if (type === "change") changeListener = listener;
        return origAdd(type, listener, ...args);
      };
      const c = new Conditions(input);
      input.addEventListener = origAdd;

      const wrapper = document.querySelector(".conditions-wrapper");
      expect(wrapper).not.toBeNull();
      input.value = '{"name":"x"}';
      changeListener!({ isTrusted: true } as unknown as Event);
      expect(document.querySelector(".conditions-wrapper")).not.toBe(wrapper);
      c.destroy();
    });

    it("ignores programmatic (untrusted) change events", () => {
      const c = new Conditions(input);
      const wrapper = document.querySelector(".conditions-wrapper");
      input.value = "[]";
      const ev = new Event("change", { bubbles: true });
      input.dispatchEvent(ev);
      expect(document.querySelector(".conditions-wrapper")).toBe(wrapper);
      c.destroy();
    });
  });

  describe("destroy", () => {
    it("removes wrapper and clears reference", () => {
      const c = new Conditions(input);
      const wrapper = document.querySelector(".conditions-wrapper");
      c.destroy();
      expect(wrapper?.parentNode).toBeNull();
      expect(input.conditions).toBeNull();
    });
  });

  describe("render and interactions", () => {
    it("renders add group button and adds group on click", () => {
      input.value = "[]";
      const c = new Conditions(input);
      const addGroupBtn = document.querySelector(".conditions-btn-add-group");
      expect(addGroupBtn).not.toBeNull();
      (addGroupBtn as HTMLElement).click();
      expect(input.value).not.toBe("[]");
      expect(document.querySelectorAll(".conditions-group-section").length).toBe(1);
      c.destroy();
    });

    it("removes group when remove group button clicked", () => {
      input.value = JSON.stringify([
        { operator: "and", fieldSets: [{ fields: [{ key: "a", conditions: [] }] }] },
      ]);
      const c = new Conditions(input);
      const removeBtn = document.querySelector(".conditions-btn-remove");
      expect(removeBtn).not.toBeNull();
      (removeBtn as HTMLElement).click();
      expect(document.querySelectorAll(".conditions-group-section").length).toBe(0);
      c.destroy();
    });

    it("toggles group collapse when badge clicked", () => {
      input.value = JSON.stringify([
        { operator: "and", fieldSets: [{ fields: [{ key: "x", conditions: [] }] }] },
      ]);
      const c = new Conditions(input);
      const badge = document.querySelector(".conditions-group-badge");
      const section = document.querySelector(".conditions-group-section");
      expect(section?.classList.contains("is-collapsed")).toBeFalsy();
      (badge as HTMLElement).click();
      expect(section?.classList.contains("is-collapsed")).toBe(true);
      (badge as HTMLElement).click();
      expect(section?.classList.contains("is-collapsed")).toBe(false);
      c.destroy();
    });

    it("changes group operator on select change", () => {
      input.value = JSON.stringify([
        { operator: "and", fieldSets: [{ fields: [{ key: "a", conditions: [] }] }] },
      ]);
      const c = new Conditions(input);
      const select = document.querySelector(
        ".conditions-group-operator-select",
      ) as HTMLSelectElement;
      expect(select).not.toBeNull();
      select.value = "or";
      select.dispatchEvent(new Event("change"));
      expect(input.value).toContain("or");
      c.destroy();
    });

    it("adds fieldset when add fieldset button clicked", () => {
      input.value = JSON.stringify([
        { operator: "and", fieldSets: [{ fields: [{ key: "a", conditions: [] }] }] },
      ]);
      const c = new Conditions(input);
      const addFieldSetBtn = document.querySelector(".conditions-btn-add-fieldset");
      (addFieldSetBtn as HTMLElement).click();
      expect(document.querySelectorAll(".conditions-fieldset-section").length).toBe(2);
      c.destroy();
    });

    it("removes fieldset when remove clicked", () => {
      input.value = JSON.stringify({ and: [{ a: {} }, { b: {} }] });
      const c = new Conditions(input);
      const removeBtns = document.querySelectorAll(".conditions-btn-remove");
      // Index 0 is group remove; index 1 is first fieldset remove (fieldsets are prepended)
      (removeBtns[1] as HTMLElement).click();
      expect(document.querySelectorAll(".conditions-fieldset-section").length).toBe(1);
      c.destroy();
    });

    it("toggles fieldset collapse when badge clicked", () => {
      input.value = JSON.stringify([
        { operator: "and", fieldSets: [{ fields: [{ key: "a", conditions: [] }] }] },
      ]);
      const c = new Conditions(input);
      const badge = document.querySelector(".conditions-fieldset-badge");
      const section = document.querySelector(".conditions-fieldset-section");
      (badge as HTMLElement).click();
      expect(section?.classList.contains("is-collapsed")).toBe(true);
      c.destroy();
    });

    it("toggles field collapse when badge clicked", () => {
      input.value = JSON.stringify([
        { operator: "and", fieldSets: [{ fields: [{ key: "x", conditions: [] }] }] },
      ]);
      const c = new Conditions(input);
      const badge = document.querySelector(".conditions-field-badge");
      const section = document.querySelector(".conditions-field-section");
      expect(section?.classList.contains("is-collapsed")).toBeFalsy();
      (badge as HTMLElement).click();
      expect(section?.classList.contains("is-collapsed")).toBe(true);
      (badge as HTMLElement).click();
      expect(section?.classList.contains("is-collapsed")).toBe(false);
      c.destroy();
    });

    it("adds field when add field button clicked", () => {
      input.value = JSON.stringify({ a: {} });
      const c = new Conditions(input);
      const addFieldBtn = document.querySelector(".conditions-btn-add-field");
      (addFieldBtn as HTMLElement).click();
      expect(document.querySelectorAll(".conditions-field-section").length).toBe(2);
      c.destroy();
    });

    it("removes field when remove field clicked", () => {
      input.value = JSON.stringify([
        {
          operator: "and",
          fieldSets: [
            {
              fields: [
                { key: "a", conditions: [] },
                { key: "b", conditions: [] },
              ],
            },
          ],
        },
      ]);
      const c = new Conditions(input);
      const removeBtns = document.querySelectorAll(".conditions-btn-remove");
      // Index 0 = group, 1 = fieldset, 2 and 3 = fields (fields prepended)
      (removeBtns[2] as HTMLElement).click();
      expect(document.querySelectorAll(".conditions-field-section").length).toBe(1);
      c.destroy();
    });

    it("without schema uses text input for field key and updates on change", () => {
      input.value = JSON.stringify({ old: {} });
      const c = new Conditions(input);
      const fieldInput = document.querySelector(".conditions-field-input") as HTMLInputElement;
      expect(fieldInput?.value).toBe("old");
      fieldInput.value = "new";
      fieldInput.dispatchEvent(new Event("change"));
      expect(input.value).toContain("new");
      c.destroy();
    });

    it("with schema uses select for field and clears conditions when type changes", () => {
      const schema: Schema = {
        name: { label: "Name", type: "text" },
        count: { label: "Count", type: "number" },
      };
      input.value = JSON.stringify({ name: { eq: "x" } });
      const c = new Conditions(input, { schema });
      const fieldSelect = document.querySelector(".conditions-field-select") as HTMLSelectElement;
      expect(fieldSelect?.value).toBe("name");
      fieldSelect.value = "count";
      fieldSelect.dispatchEvent(new Event("change"));
      expect(input.value).not.toContain('"eq"');
      c.destroy();
    });

    it("with schema clears nested groups when field changes", () => {
      const schema: Schema = {
        a: { label: "A", type: "text" },
        b: { label: "B", type: "object", schema: {} },
      };
      input.value = JSON.stringify([
        {
          operator: "and",
          fieldSets: [
            {
              fields: [
                {
                  key: "a",
                  conditions: [],
                  where: [
                    { operator: "and", fieldSets: [{ fields: [{ key: "", conditions: [] }] }] },
                  ],
                },
              ],
            },
          ],
        },
      ]);
      const c = new Conditions(input, { schema });
      const fieldSelect = document.querySelector(".conditions-field-select") as HTMLSelectElement;
      fieldSelect.value = "b";
      fieldSelect.dispatchEvent(new Event("change"));
      expect(input.value).not.toContain("where");
      c.destroy();
    });

    it("adds condition when add condition clicked", () => {
      input.value = JSON.stringify({ a: {} });
      const c = new Conditions(input);
      const addCondBtn = document.querySelector(".conditions-btn-add-condition");
      (addCondBtn as HTMLElement).click();
      expect(document.querySelectorAll(".conditions-condition-section").length).toBe(1);
      c.destroy();
    });

    it("updates condition operator and value and toggles value input visibility", () => {
      input.value = JSON.stringify([
        {
          operator: "and",
          fieldSets: [
            {
              fields: [
                {
                  key: "a",
                  conditions: [{ operator: "eq", value: "v" }],
                },
              ],
            },
          ],
        },
      ]);
      const c = new Conditions(input);
      const operatorSelect = document.querySelector(
        ".conditions-condition-operator-select",
      ) as HTMLSelectElement;
      const valueInput = document.querySelector(
        ".conditions-condition-value-input",
      ) as HTMLInputElement;
      expect(valueInput.style.display).not.toBe("none");
      operatorSelect.value = "exists";
      operatorSelect.dispatchEvent(new Event("change"));
      expect(valueInput.style.display).toBe("none");
      operatorSelect.value = "eq";
      operatorSelect.dispatchEvent(new Event("change"));
      expect(valueInput.style.display).not.toBe("none");
      valueInput.value = "newval";
      valueInput.dispatchEvent(new Event("change"));
      expect(input.value).toContain("newval");
      c.destroy();
    });

    it("removes condition when remove clicked", () => {
      input.value = JSON.stringify({ a: { eq: 1, gt: 2 } });
      const c = new Conditions(input);
      const removeBtns = document.querySelectorAll(".conditions-btn-remove");
      (removeBtns[removeBtns.length - 1] as HTMLElement).click();
      expect(document.querySelectorAll(".conditions-condition-section").length).toBe(1);
      c.destroy();
    });

    it("adds nested group when add filter clicked (object type with schema)", () => {
      const schema: Schema = {
        meta: {
          label: "Meta",
          type: "object",
          schema: { tag: { label: "Tag", type: "text" } },
        },
      };
      input.value = JSON.stringify([
        {
          operator: "and",
          fieldSets: [
            {
              fields: [
                {
                  key: "meta",
                  conditions: [],
                },
              ],
            },
          ],
        },
      ]);
      const c = new Conditions(input, { schema });
      const addFilterBtn = document.querySelector(".conditions-btn-add-filter");
      expect(addFilterBtn).not.toBeNull();
      (addFilterBtn as HTMLElement).click();
      expect(document.querySelectorAll(".conditions-group-section").length).toBe(2);
      expect(input.value).toContain("where");
      c.destroy();
    });

    it("adds nested group when field has no where yet", () => {
      input.value = JSON.stringify([
        {
          operator: "and",
          fieldSets: [
            {
              fields: [{ key: "a", conditions: [] }],
            },
          ],
        },
      ]);
      const c = new Conditions(input);
      const addFilterBtn = document.querySelector(".conditions-btn-add-filter");
      (addFilterBtn as HTMLElement).click();
      expect(input.value).toContain("where");
      c.destroy();
    });

    it("renders existing nested groups", () => {
      input.value = JSON.stringify({ a: { where: { b: {} } } });
      const c = new Conditions(input);
      expect(document.querySelectorAll(".conditions-group-section").length).toBe(2);
      const nestedBadge = document.querySelector(
        ".conditions-field-nested-groups .conditions-group-badge",
      );
      expect(nestedBadge?.textContent).toContain("Filter");
      c.destroy();
    });

    it("nested group is prepended", () => {
      input.value = JSON.stringify({ a: { where: { x: {} } } });
      const c = new Conditions(input);
      const fieldNestedGroups = document.querySelector(".conditions-field-nested-groups");
      const sections = fieldNestedGroups?.querySelectorAll(".conditions-group-section");
      expect(sections?.length).toBe(1);
      c.destroy();
    });

    it("condition with schema filters operators by type", () => {
      const schema: Schema = {
        num: { label: "Num", type: "number" },
      };
      input.value = JSON.stringify([
        {
          operator: "and",
          fieldSets: [
            {
              fields: [
                {
                  key: "num",
                  conditions: [{ operator: "eq", value: "1" }],
                },
              ],
            },
          ],
        },
      ]);
      const c = new Conditions(input, { schema });
      const operatorSelect = document.querySelector(
        ".conditions-condition-operator-select",
      ) as HTMLSelectElement;
      const options = Array.from(operatorSelect.options).map((o) => o.value);
      expect(options).toContain("eq");
      expect(options).toContain("gt");
      c.destroy();
    });

    it("createSelect with no selected sets first option", () => {
      // Use "{}" so we have one group and thus a group operator select
      input.value = "{}";
      const c = new Conditions(input);
      const groupSelect = document.querySelector(
        ".conditions-group-operator-select",
      ) as HTMLSelectElement;
      expect(groupSelect).not.toBeNull();
      expect(groupSelect.value).toBe("and");
      c.destroy();
    });

    it("add group with schema renders new field with empty key (currentSchema undefined)", () => {
      const schema: Schema = {
        name: { label: "Name", type: "text" },
      };
      input.value = "[]";
      const c = new Conditions(input, { schema });
      const addGroupBtn = document.querySelector(".conditions-btn-add-group") as HTMLElement;
      addGroupBtn.click();
      const fieldSelects = document.querySelectorAll(".conditions-field-select");
      expect(fieldSelects.length).toBeGreaterThanOrEqual(1);
      const emptyOption = (
        fieldSelects[fieldSelects.length - 1] as HTMLSelectElement
      ).querySelector('option[value=""]');
      expect(emptyOption).not.toBeNull();
      c.destroy();
    });
  });
});
