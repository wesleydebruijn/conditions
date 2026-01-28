export function getInputElement(
  input: HTMLInputElement | HTMLTextAreaElement | string,
): HTMLInputElement | HTMLTextAreaElement {
  let element: HTMLInputElement | HTMLTextAreaElement | null;
 
  if (typeof input === "string") {
    element = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(input);
  } else {
    element = input;
  }

  if (!element) throw new Error(`Element ${input} not found`);
  if (element.conditionsInput) throw new Error("ConditionsInput already initialized on element");

  return element;
}
