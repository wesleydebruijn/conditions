export function className(
  element: HTMLElement | null,
  className: string,
  add: boolean = true
): void {
  if (!element) return;

  if (add) {
    element.classList.add(...className.split(" "));
  } else {
    element.classList.remove(...className.split(" "));
  }
}

export function visible(element: HTMLElement | null, visible: boolean): void {
  if (!element) return;

  element.style.display = visible ? "" : "none";
}

export function find(
  input: HTMLInputElement | HTMLTextAreaElement | string,
): HTMLInputElement | HTMLTextAreaElement {
  let element: HTMLInputElement | HTMLTextAreaElement | null;

  if (typeof input === "string") {
    element = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(input);
  } else {
    element = input;
  }

  if (!element) throw new Error(`Element ${input} not found`);
  if (element.conditions) throw new Error("Conditions already initialized on element");

  return element;
}

export function create<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  baseClassName?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if(baseClassName) className(element, baseClassName);

  return element;
}

export function append(element: HTMLElement, ...children: HTMLElement[]): void {
  children.forEach(child => element.appendChild(child));
}