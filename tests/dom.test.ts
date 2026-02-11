/**
 * @jest-environment jsdom
 */

import {
  className,
  visible,
  find,
  create,
  createIcon,
  append,
  prepend,
  createSelect,
  createButton,
  createBadge,
} from "../src/dom";

describe("dom", () => {
  describe("className", () => {
    it("adds single class to element", () => {
      const el = document.createElement("div");
      className(el, "foo");
      expect(el.classList.contains("foo")).toBe(true);
    });

    it("adds multiple classes when string contains spaces", () => {
      const el = document.createElement("div");
      className(el, "foo bar baz");
      expect(el.classList.contains("foo")).toBe(true);
      expect(el.classList.contains("bar")).toBe(true);
      expect(el.classList.contains("baz")).toBe(true);
    });

    it("does nothing when element is null", () => {
      expect(() => className(null, "foo")).not.toThrow();
    });
  });

  describe("visible", () => {
    it("shows element when visible is true", () => {
      const el = document.createElement("div");
      el.style.display = "none";
      visible(el, true);
      expect(el.style.display).toBe("");
    });

    it("hides element when visible is false", () => {
      const el = document.createElement("div");
      visible(el, false);
      expect(el.style.display).toBe("none");
    });

    it("does nothing when element is null", () => {
      expect(() => visible(null, true)).not.toThrow();
      expect(() => visible(null, false)).not.toThrow();
    });
  });

  describe("find", () => {
    it("returns element when given HTMLElement", () => {
      const el = document.createElement("div");
      expect(find(el)).toBe(el);
    });

    it("returns element when given selector string that exists", () => {
      const el = document.createElement("div");
      el.id = "target";
      document.body.appendChild(el);
      try {
        expect(find<HTMLDivElement>("#target")).toBe(el);
      } finally {
        el.remove();
      }
    });

    it("throws when selector string matches nothing", () => {
      expect(() => find("#non-existent-selector-xyz")).toThrow(
        "Element #non-existent-selector-xyz not found",
      );
    });

    it("throws when given null (as element)", () => {
      expect(() => find(null as unknown as HTMLElement)).toThrow();
    });
  });

  describe("create", () => {
    it("creates element with tag name only", () => {
      const el = create("div");
      expect(el.tagName).toBe("DIV");
      expect(el.className).toBe("");
    });

    it("creates element with baseClassName", () => {
      const el = create("div", "my-class");
      expect(el.classList.contains("my-class")).toBe(true);
    });

    it("creates input element", () => {
      const el = create("input");
      expect(el.tagName).toBe("INPUT");
    });

    it("creates button element", () => {
      const el = create("button");
      expect(el.tagName).toBe("BUTTON");
    });
  });

  describe("createIcon", () => {
    it("creates collapse icon", () => {
      const el = createIcon("collapse");
      expect(el.tagName).toBe("svg");
      expect(el.innerHTML).toContain("polyline");
    });

    it("creates plus icon", () => {
      const el = createIcon("plus");
      expect(el.tagName).toBe("svg");
      expect(el.innerHTML).toContain("line");
    });

    it("creates close icon", () => {
      const el = createIcon("close");
      expect(el.tagName).toBe("svg");
    });

    it("creates filter icon", () => {
      const el = createIcon("filter");
      expect(el.tagName).toBe("svg");
    });
  });

  describe("append", () => {
    it("appends multiple children to element", () => {
      const parent = document.createElement("div");
      const a = document.createElement("span");
      const b = document.createElement("span");
      append(parent, a, b);
      expect(parent.children.length).toBe(2);
      expect(parent.children[0]).toBe(a);
      expect(parent.children[1]).toBe(b);
    });

    it("appends single child", () => {
      const parent = document.createElement("div");
      const child = document.createElement("span");
      append(parent, child);
      expect(parent.children.length).toBe(1);
      expect(parent.firstElementChild).toBe(child);
    });
  });

  describe("prepend", () => {
    it("prepends multiple children to element", () => {
      const parent = document.createElement("div");
      const existing = document.createElement("span");
      parent.appendChild(existing);
      const a = document.createElement("span");
      const b = document.createElement("span");
      prepend(parent, a, b);
      expect(parent.children.length).toBe(3);
      expect(parent.children[0]).toBe(a);
      expect(parent.children[1]).toBe(b);
      expect(parent.children[2]).toBe(existing);
    });
  });

  describe("createSelect", () => {
    it("creates select with options and invokes callback on change", () => {
      const callback = jest.fn();
      const el = createSelect("sel", [["a", "Option A"]], callback);
      expect(el.tagName).toBe("SELECT");
      expect(el.options.length).toBe(1);
      expect(el.value).toBe("a");
      el.value = "a";
      el.dispatchEvent(new Event("change"));
      expect(callback).toHaveBeenCalledWith("a");
    });

    it("uses selected setting", () => {
      const el = createSelect(
        "sel",
        [
          ["a", "A"],
          ["b", "B"],
        ],
        () => {},
        { selected: "b" },
      );
      expect(el.value).toBe("b");
    });

    it("adds empty option when allowEmpty is true", () => {
      const el = createSelect("sel", [["a", "A"]], () => {}, { allowEmpty: true });
      expect(el.options.length).toBe(2);
      expect(el.options[0].value).toBe("");
      expect(el.options[0].textContent).toContain("select an option");
      expect(el.options[1].value).toBe("a");
    });

    it("uses allowEmpty with selected", () => {
      const el = createSelect("sel", [["x", "X"]], () => {}, { allowEmpty: true, selected: "x" });
      expect(el.value).toBe("x");
    });
  });

  describe("createButton", () => {
    it("creates button with icon and invokes callback on click", () => {
      const callback = jest.fn();
      const el = createButton("btn", "plus", callback);
      expect(el.tagName).toBe("BUTTON");
      expect(el.children.length).toBe(1);
      const ev = new MouseEvent("click", { bubbles: true });
      const preventDefault = jest.spyOn(ev, "preventDefault");
      el.dispatchEvent(ev);
      expect(preventDefault).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    it("works with different icons", () => {
      const el = createButton("btn", "close", () => {});
      expect(el.children.length).toBe(1);
    });
  });

  describe("createBadge", () => {
    it("creates badge with text and invokes callback on click", () => {
      const callback = jest.fn();
      const el = createBadge("badge", "Label", callback);
      expect(el.tagName).toBe("SPAN");
      expect(el.textContent).toContain("Label");
      el.click();
      expect(callback).toHaveBeenCalled();
    });
  });
});
