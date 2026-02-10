const ICONS = {
  collapse:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
  plus: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  close:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  filter:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="7" x2="20" y2="7"/><circle cx="7" cy="7" r="1.5"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="17" cy="12" r="1.5"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="12" cy="17" r="1.5"/></svg>',
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

export function prepend(element: HTMLElement, ...children: HTMLElement[]): void {
  element.prepend(...children);
}

export function createSelect<T>(
  className: string,
  options: string[][],
  callback: (value: T) => void,
  settings?: { selected?: T; allowEmpty?: boolean },
): HTMLSelectElement {
  const element = create("select", className);

  const allOptions = settings?.allowEmpty ? [["", " -- select an option --"], ...options] : options;
  element.innerHTML = allOptions
    .map(
      ([key, value]) =>
        `<option value="${key}"${settings?.selected === key ? " selected" : ""}>${value}</option>`,
    )
    .join("");
  element.addEventListener("change", () => {
    callback(element.value as T);
  });

  return element;
}

export function createButton(
  className: string,
  icon: keyof typeof ICONS,
  callback: () => void,
): HTMLButtonElement {
  const element = create("button", className);
  element.appendChild(createIcon(icon));
  element.addEventListener("click", (event) => {
    event.preventDefault();
    callback();
  });

  return element;
}

export function createBadge(className: string, text: string, callback: () => void): HTMLElement {
  const element = create("span", className);
  element.appendChild(createIcon("collapse"));
  element.appendChild(document.createTextNode(text));
  element.addEventListener("click", () => {
    callback();
  });

  return element;
}
