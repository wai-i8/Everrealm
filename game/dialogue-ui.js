(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmDialogueUi = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  function create(options = {}) {
    const getDom = typeof options.getDom === "function"
      ? options.getDom
      : () => options.dom || {};
    const getDialogue = options.getDialogue;
    const getChoiceIndex = options.getChoiceIndex;
    const createElement = typeof options.createElement === "function"
      ? options.createElement
      : (tagName) => root.document.createElement(tagName);
    const chooseDialogueOption = options.onChooseDialogueOption || (() => {});

    function renderDialogue() {
      const dom = getDom() || {};
      const dialogue = getDialogue();
      const dialogueChoiceIndex = getChoiceIndex();
      dom.dialogueText.textContent = dialogue.lines[dialogue.index];
      const choices = dom.dialogueChoices;
      const next = dom.dialogueNext;
      const nextLabel = next.querySelector(".dialogue-next-label");
      const atEnd = dialogue.index >= dialogue.lines.length - 1;
      if (nextLabel) nextLabel.textContent = atEnd ? "確定" : "繼續";
      next.dataset.dialogueState = atEnd ? "terminal" : "continue";
      next.setAttribute("aria-label", atEnd ? "確定並關閉對話" : "繼續對話");
      if (atEnd && dialogue.choices?.length) {
        choices.hidden = false;
        choices.classList.toggle("is-compact", dialogue.choiceLayout === "compact");
        next.hidden = true;
        choices.innerHTML = "";
        dialogue.choices.forEach((choice, index) => {
          const button = createElement("button");
          button.type = "button";
          const choiceStyle = choice.buttonStyle === "primary" ? " is-primary primary-button" : choice.buttonStyle === "secondary" ? " is-secondary secondary-button" : "";
          button.className = `dialogue-choice${choiceStyle}${index === dialogueChoiceIndex ? " selected" : ""}`;
          button.setAttribute("role", "listitem");
          button.setAttribute("aria-pressed", String(index === dialogueChoiceIndex));
          button.textContent = choice.label;
          button.addEventListener("click", () => chooseDialogueOption(index));
          choices.appendChild(button);
        });
        choices.children[dialogueChoiceIndex]?.focus({ preventScroll: true });
      } else {
        choices.hidden = true;
        choices.classList.remove("is-compact");
        choices.innerHTML = "";
        next.hidden = false;
      }
    }

    return Object.freeze({ renderDialogue });
  }

  return Object.freeze({ create });
});
