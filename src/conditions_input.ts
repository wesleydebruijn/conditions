import { getInputElement } from './utils/input';
import { deserialize, serialize } from './serializer';
import type { Group, Operator } from './types';

type Settings = {}

declare global {
  interface HTMLInputElement {
    conditionsInput?: ConditionsInput | null;
  }

  interface HTMLTextAreaElement {
    conditionsInput?: ConditionsInput | null;
  }
}

export class ConditionsInput {
  private settings: Settings = {};
  private groups: Group[] = [];

  private input: HTMLInputElement | HTMLTextAreaElement;
  private containerElement: HTMLElement;

  constructor(
    input: HTMLInputElement | HTMLTextAreaElement | string, 
    settings: Partial<Settings> = {}
  ) {
    this.settings = { ...this.settings, ...settings };
    this.input = getInputElement(input);
    this.input.addEventListener('change', (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      this.groups = deserialize(target.value);
      this.rerender();
    });
    this.groups = deserialize(this.input.value);
    this.containerElement = document.createElement('div');

    this.render();
  }

  private rerender() {
    if (this.containerElement) this.containerElement.remove();
    this.containerElement = document.createElement('div');

    this.render();
  }

  private render() {
    const addGroupBtn = document.createElement('button');
    addGroupBtn.textContent = '+ Add Group';
    addGroupBtn.addEventListener('click', () => this.addGroup(this.containerElement, this.groups));

    this.containerElement.appendChild(addGroupBtn);
    this.groups.forEach(group => this.renderGroup(this.containerElement, this.groups, group));

    this.input.after(this.containerElement);
  }

  private renderGroup(element: HTMLElement, data: Group[], group: Group) {
    const groupElement = document.createElement('div');
    const operatorSelect = document.createElement('select');
    operatorSelect.innerHTML = `
      <option value="and"${group.operator === "and" ? " selected" : ""}>and</option>
      <option value="or"${group.operator === "or" ? " selected" : ""}>or</option>
    `;

    operatorSelect.addEventListener('change', () => {
      group.operator = operatorSelect.value as Operator;
      this.onChange();
    });

    const removeGroupBtn = document.createElement('button');
    removeGroupBtn.textContent = '- Remove Group';
    removeGroupBtn.addEventListener('click', () => this.removeGroup(groupElement, data, group));

    groupElement.appendChild(operatorSelect);
    groupElement.appendChild(removeGroupBtn);    
    element.appendChild(groupElement);
  }

  private addGroup(element: HTMLElement, data: Group[]) {
    const newGroup: Group = {
      operator: 'and',
      fields: []
    };
    data.push(newGroup);
    
    this.onChange();

    this.renderGroup(element, data, newGroup);
  }

  private removeGroup(element: HTMLElement, groups: Group[], group: Group) {
    const index = groups.indexOf(group);
    groups.splice(index, 1);
    
    this.onChange();

    element.remove();
  }

  private onChange() {
    this.input.value = serialize(this.groups);
  }
}
