const ICONS = {
  plus: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  close:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  filter:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="17" x2="14" y2="17"/></svg>',
};

export function className(element: HTMLElement | null, className: string): void {
  if (!element) return;

  element.classList.add(...className.split(" "));
}

export function visible(element: HTMLElement | null, visible: boolean): void {
  if (!element) return;

  element.style.display = visible ? "" : "none";
}

export function find<T extends HTMLElement>(input: T | string): T {
  let element: T | null;

  if (typeof input === "string") {
    element = document.querySelector<T>(input);
  } else {
    element = input;
  }

  if (!element) throw new Error(`Element ${input} not found`);

  return element;
}

export function create<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  baseClassName?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if (baseClassName) className(element, baseClassName);

  return element;
}

export function createIcon(icon: keyof typeof ICONS): HTMLElement {
  const temp = document.createElement("span");
  temp.innerHTML = ICONS[icon];

  return temp.firstElementChild as HTMLElement;
}

export function append(element: HTMLElement, ...children: HTMLElement[]): void {
  for (const child of children) element.appendChild(child);
}

export function createText(className: string, text: string): HTMLElement {
  const element = create("span", className);
  element.textContent = text;

  return element;
}

export function createSelect<T>(
  className: string,
  options: string[][],
  callback: (value: T) => void,
  settings?: { selected?: T; placeholder?: string },
): HTMLSelectElement {
  const element = create("select", className);

  if (settings?.placeholder !== undefined) {
    const placeholder = new Option(settings.placeholder, "");
    placeholder.disabled = true;
    placeholder.hidden = true;
    element.add(placeholder);
  }

  for (const [value, label] of options) element.add(new Option(label, value));

  element.value = String(settings?.selected ?? "");
  if (element.selectedIndex === -1) element.selectedIndex = 0;

  element.addEventListener("change", () => {
    callback(element.value as T);
  });

  return element;
}

export function createButton(
  className: string,
  icon: keyof typeof ICONS,
  label: string,
  callback: () => void,
): HTMLButtonElement {
  const element = create("button", className);
  element.type = "button";
  append(element, createIcon(icon), createText("", label));
  element.addEventListener("click", (event) => {
    event.preventDefault();
    callback();
  });

  return element;
}

export function createIconButton(
  className: string,
  icon: keyof typeof ICONS,
  label: string,
  callback: () => void,
): HTMLButtonElement {
  const element = create("button", className);
  element.type = "button";
  element.title = label;
  element.setAttribute("aria-label", label);
  element.appendChild(createIcon(icon));
  element.addEventListener("click", (event) => {
    event.preventDefault();
    callback();
  });

  return element;
}
