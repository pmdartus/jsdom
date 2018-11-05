"use strict";

const DOMException = require("domexception");

const { HTML_NS } = require("./namespaces");

// https://dom.spec.whatwg.org/#concept-element-custom-element-state
const CUSTOM_ELEMENT_STATE = {
  UNDEFINED: "undefined",
  FAILED: "failed",
  UNCUSTOMZIED: "uncustomized",
  CUSTOM: "custom"
};

// https://html.spec.whatwg.org/multipage/custom-elements.html#custom-element-reaction-queue
const REACTION_TYPE = {
  UPGRADE: "upgrade",
  CALLBACK: "callaback"
};

// https://html.spec.whatwg.org/multipage/custom-elements.html#custom-element-reactions-stack
class CustomElementReactionStack {
  constructor() {
    this._stack = [];
    this._backupElementQueue = [];
    this._processingBackupElementQueue = false;
  }

  _currentElementQueue() {
    return this._stack[this._stack.length - 1];
  }

  _push(element) {
    this._stack.push(element);
  }

  _pop() {
    return this._stack.pop();
  }

  // https://html.spec.whatwg.org/multipage/custom-elements.html#enqueue-an-element-on-the-appropriate-element-queue
  _enqueueElementOnTheAppropriateElementQueue(element) {
    if (this._stack.length === 0) {
      this._backupElementQueue.push(element);

      if (this._processingBackupElementQueue) {
        return;
      }
      this._processingBackupElementQueue = true;

      Promise.resolve().then(() => {
        this._invokeCEReactions(this._backupElementQueue);
        this._processingBackupElementQueue = false;
      });
    } else {
      this._currentElementQueue().push(element);
    }
  }

  // https://html.spec.whatwg.org/multipage/custom-elements.html#enqueue-a-custom-element-callback-reaction
  enqueueCECallbackReaction(element, callbackName, args) {
    const {
      _customElementReactionQueue: reactionQueue,
      _customElementDefinition: definition
    } = element;

    const callback = definition.lifecycleCallbacks[callbackName];
    if (callback === null) {
      return;
    }

    if (callbackName === "attributeChangedCallback") {
      const [attributeName] = args;

      if (!definition.observedAttributes.includes(attributeName)) {
        return;
      }
    }

    reactionQueue.push({
      type: REACTION_TYPE.CALLBACK,
      callback,
      args
    });

    this._enqueueElementOnTheAppropriateElementQueue(element);
  }

  // https://html.spec.whatwg.org/multipage/custom-elements.html#enqueue-a-custom-element-upgrade-reaction
  enqueueCEUpgradeReaction(element, definition) {
    const { _customElementReactionQueue: reactionQueue } = element;

    reactionQueue.push({
      type: REACTION_TYPE.UPGRADE,
      definition
    });

    this._enqueueElementOnTheAppropriateElementQueue(element);
  }

  // https://html.spec.whatwg.org/multipage/custom-elements.html#invoke-custom-element-reactions
  _invokeCEReactions(queue) {
    for (const element of queue) {
      if (element._isCustom()) {
        const { _customElementReactionQueue: reactions } = element;

        while (reactions.length > 0) {
          const reaction = reactions.unshift();

          try {
            switch (reaction.type) {
              case REACTION_TYPE.UPGRADE:
                upgradeElement(reaction.definition, element);
                break;

              case REACTION_TYPE.CALLBACK: {
                const { callback, args } = reaction;
                callback(...args);
                break;
              }
            }
          } catch (error) {
            // TODO: add report
          }
        }
      }
    }
  }
}

// TODO: This should not be global!
// Each unit of related similar-origin browsing contexts has a custom element reactions stack
const CUSTOM_ELEMENT_REACTION_STACK = new CustomElementReactionStack();

const RESTRICTED_CUSTOM_ELEMENT_NAME = new Set([
  "annotation-xml",
  "color-profile",
  "font-face",
  "font-face-src",
  "font-face-uri",
  "font-face-format",
  "font-face-name",
  "missing-glyph"
]);

const CUSTOM_ELEMENT_NAME_REGEXP = /^[a-z][-.0-9_a-z]*-[-.0-9_a-z]*$/;

// https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
function isValidCustomElementName(name) {
  // TODO: Improve to match the spec
  if (RESTRICTED_CUSTOM_ELEMENT_NAME.has(name)) {
    return false;
  }

  return CUSTOM_ELEMENT_NAME_REGEXP.test(name);
}

// https://html.spec.whatwg.org/multipage/custom-elements.html#look-up-a-custom-element-definition
function lookupCEDefinition(document, namespace, localName, is) {
  if (namespace !== HTML_NS) {
    return null;
  }

  if (!document._defaultView) {
    return null;
  }

  const { customElements } = document._defaultView;

  const definitionByName = customElements._customElementDefinitions.find(entry => {
    return entry.name === localName && entry.localName === localName;
  });
  if (definitionByName) {
    return definitionByName;
  }

  const definitionByIs = customElements._customElementDefinitions.find(entry => {
    return entry.name === is && entry.localName === localName;
  });
  if (definitionByName) {
    return definitionByIs;
  }

  return null;
}

// https://html.spec.whatwg.org/multipage/custom-elements.html#concept-upgrade-an-element
function upgradeElement(definition, element) {
  if (element._isCustom()) {
    return;
  }

  if (element._customElementState === CUSTOM_ELEMENT_STATE.FAILED) {
    return;
  }

  element._customElementDefinition = definition;

  for (const attribute of element._attributeList) {
    CUSTOM_ELEMENT_REACTION_STACK.enqueueCECallbackReaction(element, "attributeChangedCallback", [
      attribute._localName,
      null,
      attribute._value,
      attribute._namespace
    ]);
  }

  if (element.isConnected()) {
    CUSTOM_ELEMENT_REACTION_STACK.enqueueCECallbackReaction(element, "connectedCallback", []);
  }

  definition.constructionStack.push(element);

  const C = definition.constructor;
  try {
    try {
      const constructResult = new C();

      if (constructResult === element) {
        throw new DOMException("Invalid custom element constructor", "InvalidStateError");
      }
    } finally {
      definition.constructionStack.pop();
    }
  } catch (error) {
    element._customElementState = CUSTOM_ELEMENT_STATE.FAILED;
    element._customElementDefinition = null;
    element._customElementReactionQueue = [];

    throw error;
  }

  element._customElementState = CUSTOM_ELEMENT_STATE.CUSTOM;
}

// https://html.spec.whatwg.org/multipage/custom-elements.html#concept-try-upgrade
function tryToUpgrade(element) {
  const { _ownerDocument, _namespaceURI, _localName, _isValue } = element;
  const definition = lookupCEDefinition(_ownerDocument, _namespaceURI, _localName, _isValue);

  if (definition !== null) {
    CUSTOM_ELEMENT_REACTION_STACK.enqueueCEUpgradeReaction(element, definition);
  }
}

module.exports = {
  CUSTOM_ELEMENT_STATE,
  CUSTOM_ELEMENT_REACTION_STACK,

  isValidCustomElementName,

  lookupCEDefinition,
  tryToUpgrade
};
