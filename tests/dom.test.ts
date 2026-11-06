/**
 * @jest-environment jsdom
 */

import {
  append,
  className,
  create,
  createButton,
  createIcon,
  createIconButton,
  createInput,
  createSelect,
  createText,
  find,
  visible,
} from "../src/dom";

describe("dom", () => {
  describe("createInput", () => {
    it("creates an input with the given class", () => {
      const input = createInput("foo");
      expect(input.tagName).toBe("INPUT");
      expect(input.classList.contains("foo")).toBe(true);
    });

    it("opts out of autofill and password manager icons", () => {
      const input = createInput("foo");
      expect(input.autocomplete).toBe("off");
      expect(input.dataset.lpignore).toBe("true");
      expect(input.dataset["1pIgnore"]).toBe("true");
    });
  });

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

  describe("createText", () => {
    it("creates span with class and text", () => {
      const el = createText("label", "Match");
      expect(el.tagName).toBe("SPAN");
      expect(el.classList.contains("label")).toBe(true);
      expect(el.textContent).toBe("Match");
    });
  });

  describe("createSelect", () => {
    it("puts grouped options in optgroups after the ungrouped ones", () => {
      const el = createSelect(
        "sel",
        [
          ["a", "A", ["Group 1"]],
          ["b", "B"],
          ["c", "C", ["Group 1", "Group 2"]],
        ],
        () => {},
        { selected: "c" },
      );

      expect(Array.from(el.children, (child) => child.tagName)).toEqual([
        "OPTION",
        "OPTGROUP",
        "OPTGROUP",
      ]);
      const [group1, group2] = Array.from(el.querySelectorAll("optgroup"));
      expect(group1.label).toBe("Group 1");
      expect(Array.from(group1.children, (option) => option.textContent)).toEqual(["A", "C"]);
      expect(group2.label).toBe("Group 2");
      expect(Array.from(group2.children, (option) => option.textContent)).toEqual(["C"]);
      expect(el.value).toBe("c");
    });

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

    it("adds a hidden placeholder option that is selected when nothing is", () => {
      const el = createSelect("sel", [["a", "A"]], () => {}, { placeholder: "Choose…" });
      expect(el.options.length).toBe(2);
      expect(el.options[0].value).toBe("");
      expect(el.options[0].textContent).toBe("Choose…");
      expect(el.options[0].hidden).toBe(true);
      expect(el.value).toBe("");
    });

    it("selects the matching option over the placeholder", () => {
      const el = createSelect("sel", [["x", "X"]], () => {}, {
        placeholder: "Choose…",
        selected: "x",
      });
      expect(el.value).toBe("x");
    });

    it("falls back to the placeholder when selected value is unknown", () => {
      const el = createSelect("sel", [["x", "X"]], () => {}, {
        placeholder: "Choose…",
        selected: "y",
      });
      expect(el.value).toBe("");
    });

    it("escapes option labels", () => {
      const el = createSelect("sel", [["a", "<b>bold</b>"]], () => {});
      expect(el.options[0].textContent).toBe("<b>bold</b>");
      expect(el.querySelector("b")).toBeNull();
    });
  });

  describe("createButton", () => {
    it("creates button with icon and label and invokes callback on click", () => {
      const callback = jest.fn();
      const el = createButton("btn", "plus", "Add rule", callback);
      expect(el.tagName).toBe("BUTTON");
      expect(el.type).toBe("button");
      expect(el.querySelector("svg")).not.toBeNull();
      expect(el.textContent).toBe("Add rule");
      const ev = new MouseEvent("click", { bubbles: true });
      const preventDefault = jest.spyOn(ev, "preventDefault");
      el.dispatchEvent(ev);
      expect(preventDefault).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe("createIconButton", () => {
    it("creates icon-only button with accessible label", () => {
      const callback = jest.fn();
      const el = createIconButton("btn", "close", "Remove", callback);
      expect(el.children.length).toBe(1);
      expect(el.getAttribute("aria-label")).toBe("Remove");
      expect(el.title).toBe("Remove");
      el.click();
      expect(callback).toHaveBeenCalled();
    });
  });
});
