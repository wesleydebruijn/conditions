import { aiRequest, parseAiResponse } from "./ai";
import { append, create, createButton, createInput, createText, visible } from "./dom";
import { deserializeGroup, serializeGroup } from "./serializer";
import type { AiHandler, Group, Hash, Settings } from "./types";

type Version = {
  condition: Hash;
  json: string;
  current: HTMLElement;
  restore: HTMLElement;
};

export type AiChatOptions = {
  ai: AiHandler;
  settings: Settings;
  root: () => Group;
  replaceRoot: (root: Group) => void;
};

export class AiChat {
  public readonly element: HTMLElement;

  private messages: HTMLElement;
  private input: HTMLInputElement;
  private submitButton: HTMLButtonElement;
  private versions: Version[] = [];
  private options: AiChatOptions;

  constructor(options: AiChatOptions) {
    const { labels } = options.settings;

    this.options = options;

    this.element = create("div", this.className("ai"));
    this.messages = create("div", this.className("aiMessages"));
    this.input = createInput(this.className("aiInput"));
    this.submitButton = createButton(this.className("buttonAi"), "sparkle", labels.aiSubmit, () =>
      this.submit(),
    );

    this.messages.setAttribute("role", "log");
    this.input.type = "text";
    this.input.placeholder = labels.aiPlaceholder;
    this.input.setAttribute("aria-label", labels.aiPlaceholder);
    this.input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      this.submit();
    });

    const form = create("div", this.className("aiForm"));
    append(form, this.input, this.submitButton);
    append(this.element, this.messages, form);
  }

  public sync() {
    const json = JSON.stringify(serializeGroup(this.options.root()));

    for (const version of this.versions) {
      const isCurrent = version.json === json;
      visible(version.current, isCurrent);
      visible(version.restore, !isCurrent);
    }
  }

  private async submit() {
    const prompt = this.input.value.trim();
    if (!prompt || this.submitButton.disabled) return;

    const { ai, settings } = this.options;
    this.addMessage(createText(this.messageClassName("aiPrompt"), prompt));
    this.setBusy(true);

    try {
      const condition = serializeGroup(this.options.root());
      const response = await ai(aiRequest(prompt, condition, settings));
      const root = parseAiResponse(response);
      this.addReply(serializeGroup(root));
      this.input.value = "";
      this.options.replaceRoot(root);
    } catch (exception) {
      this.addError(exception);
    } finally {
      this.setBusy(false);
      this.input.focus();
    }
  }

  private addReply(condition: Hash) {
    const { labels } = this.options.settings;
    const reply = create("div", this.messageClassName("aiReply"));
    const json = create("details", this.className("aiJson"));
    const summary = create("summary");
    const code = create("pre");
    const current = createText(this.className("aiCurrent"), labels.aiCurrent);
    const restore = createButton(
      this.className("buttonAiRestore"),
      "restore",
      labels.aiRestore,
      () => this.options.replaceRoot(deserializeGroup(condition)),
    );

    summary.textContent = labels.aiJson;
    code.textContent = JSON.stringify(condition, null, 2);
    append(json, summary, code);
    append(reply, createText("", labels.aiReply), json, current, restore);

    this.versions.push({ condition, json: JSON.stringify(condition), current, restore });
    this.addMessage(reply);
  }

  private addError(exception: unknown) {
    const { labels } = this.options.settings;
    const detail = exception instanceof Error ? ` ${exception.message}` : "";
    const error = createText(this.messageClassName("aiError"), `${labels.aiError}${detail}`);

    error.setAttribute("role", "alert");
    this.addMessage(error);
  }

  private addMessage(message: HTMLElement) {
    this.messages.append(message);
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  private setBusy(busy: boolean) {
    const { labels } = this.options.settings;
    const label = this.submitButton.querySelector("span") as HTMLElement;

    this.input.disabled = busy;
    this.submitButton.disabled = busy;
    label.textContent = busy ? labels.aiLoading : labels.aiSubmit;
    this.element.setAttribute("aria-busy", String(busy));
  }

  private messageClassName(className: keyof Settings["classNames"]) {
    return `${this.className("aiMessage")} ${this.className(className)}`;
  }

  private className(className: keyof Settings["classNames"]) {
    return this.options.settings.classNames[className];
  }
}
