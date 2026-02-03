const ICONS = {
  collapse: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
  plus: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  close: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  filter: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="7" x2="20" y2="7"/><circle cx="7" cy="7" r="1.5"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="17" cy="12" r="1.5"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="12" cy="17" r="1.5"/></svg>',
}

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

export function createIcon(icon: keyof typeof ICONS): SVGElement {
  const wrap = document.createElement('div');
  wrap.innerHTML = ICONS[icon];
  return wrap.firstElementChild as SVGElement;
}

export function append(element: HTMLElement, ...children: HTMLElement[]): void {
  children.forEach(child => element.appendChild(child));
}

export function prepend(element: HTMLElement, ...children: HTMLElement[]): void {
  children.forEach(child => element.prepend(child));
}