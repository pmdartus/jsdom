"use strict";

const isPotentialCustomElementName = require("is-potential-custom-element-name");

const NODE_TYPE = require("../node-type");
const { HTML_NS } = require("./namespaces");
const { shadowIncludingRoot } = require("./shadow-dom");
const reportException = require("./runtime-script-errors");

const { implForWrapper, wrapperForImpl } = require("../generated/utils");

// https://html.spec.whatwg.org/multipage/custom-elements.html#custom-element-reactions-stack
class CEReactionsStack {
  constructor() {
    this._stack = [];

    // https://html.spec.whatwg.org/multipage/custom-elements.html#backup-element-queue
    this.backupElementQueue = [];

    // https://html.spec.whatwg.org/multipage/custom-elements.html#processing-the-backup-element-queue
    this.processingBackupElementQueue = false;
  }

  push(elementQueue) {
    this._stack.push(elementQueue);
  }

  pop() {
    return this._stack.pop();
  }

  get currentElementQueue() {
    const { _stack } = this;
    return _stack[_stack.length - 1];
  }

  isEmpty() {
    return this._stack.length === 0;
  }
}

const CUSTOM_ELEMENT_REACTIONS_STACK = new CEReactionsStack();

// https://html.spec.whatwg.org/multipage/custom-elements.html#cereactions
//
// This class should be applied as a mixin to all the interfaces where on the properties is marked with the
// [CEReactions] IDL extended attribute.
class CeReactions {
  _ceReactionsPreSteps() {
    CUSTOM_ELEMENT_REACTIONS_STACK.push([]);
  }

  _ceReactionsPostSteps() {
    const queue = CUSTOM_ELEMENT_REACTIONS_STACK.pop();
    invokeCEReactions(queue);
  }
}

// https://dom.spec.whatwg.org/#concept-element-custom-element-state
const CUSTOM_ELEMENT_STATE = {
  UNDEFINED: "undefined",
  FAILED: "failed",
  UNCUSTOMIZED: "uncustomized",
  CUSTOM: "custom"
};

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

// https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
function isValidCustomElementName(name) {
  if (RESTRICTED_CUSTOM_ELEMENT_NAME.has(name)) {
    return false;
  }

  return isPotentialCustomElementName(name);
}

// https://html.spec.whatwg.org/multipage/custom-elements.html#concept-upgrade-an-element
function upgradeElement(definition, element) {
  if (element._ceState === CUSTOM_ELEMENT_STATE.CUSTOM || element._ceState === CUSTOM_ELEMENT_STATE.FAILED) {
    return;
  }

  element._ceDefinition = definition;

  for (const attribute of element._attributeList) {
    const { _localName, _namespace, _value } = attribute;
    enqueueCECallbackReaction(element, "attributeChangedCallback", [_localName, null, _value, _namespace]);
  }

  if (shadowIncludingRoot(element).nodeType === NODE_TYPE.DOCUMENT_NODE) {
    enqueueCECallbackReaction(element, "connectedCallback", []);
  }

  const { constructionStack, ctor: C } = definition;
  definition.constructionStack.push(element);

  let constructionError;
  try {
    const constructionResult = new C();
    const constructionResultImpl = implForWrapper(constructionResult);

    if (constructionResultImpl !== element) {
      throw new TypeError("Invalid custom element constructor return value");
    }
  } catch (error) {
    constructionError = error;
  }

  constructionStack.pop();

  if (constructionError !== undefined) {
    element._ceState = CUSTOM_ELEMENT_STATE.FAILED;
    element._ceDefinition = null;
    element._ceReactionQueue = [];

    // TODO: Verify if it should report an error instead of throwing.
    // See Document-createElement.html:
    //  - document.createElement must report an exception thrown by a custom built-in element constructor
    throw constructionError;
  }

  element._ceState = CUSTOM_ELEMENT_STATE.CUSTOM;
}

// https://html.spec.whatwg.org/#concept-try-upgrade
function tryUpgradeElement(element) {
  const { _ownerDocument, _namespaceURI, _localName, _isValue } = element;
  const definition = lookupCEDefinition(_ownerDocument, _namespaceURI, _localName, _isValue);

  if (definition !== null) {
    enqueueCEUpgradeReaction(element, definition);
  }
}

// https://html.spec.whatwg.org/#look-up-a-custom-element-definition
function lookupCEDefinition(document, namespace, localName, isValue) {
  const definition = null;

  if (namespace !== HTML_NS) {
    return definition;
  }

  if (!document._defaultView) {
    return definition;
  }

  const registry = implForWrapper(document._defaultView.customElements);

  const definitionByName = registry._customElementDefinitions.find(def => {
    return def.name === def.localName && def.localName === localName;
  });
  if (definitionByName !== undefined) {
    return definitionByName;
  }

  const definitionByIs = registry._customElementDefinitions.find(def => {
    return def.name === isValue && def.localName === localName;
  });
  if (definitionByIs !== undefined) {
    return definitionByIs;
  }

  return definition;
}

// https://html.spec.whatwg.org/multipage/custom-elements.html#invoke-custom-element-reactions
function invokeCEReactions(elementQueue) {
  for (const element of elementQueue) {
    // TODO: Open spec bug, the element custom element state can either be "custom" or "undefined" is the element is
    // pending for upgrade. The spec only consider the "custom" and the "uncustomized" case.
    if (
      element._ceState === CUSTOM_ELEMENT_STATE.CUSTOM ||
      element._ceState === CUSTOM_ELEMENT_STATE.UNDEFINED ||
      element._ceState === CUSTOM_ELEMENT_STATE.UNCUSTOMIZED
    ) {
      const reactions = element._ceReactionQueue;

      try {
        while (reactions.length > 0) {
          const reaction = reactions.shift();

          switch (reaction.type) {
            case "upgrade":
              upgradeElement(reaction.definition, element);
              break;

            case "callback":
              reaction.callback.apply(wrapperForImpl(element), reaction.args);
              break;
          }
        }
      } catch (error) {
        reportException(element._ownerDocument._defaultView, error);
      }
    }
  }
}

// https://html.spec.whatwg.org/multipage/custom-elements.html#enqueue-an-element-on-the-appropriate-element-queue
function enqueueElementOnAppropriateElementQueue(element) {
  if (CUSTOM_ELEMENT_REACTIONS_STACK.isEmpty()) {
    CUSTOM_ELEMENT_REACTIONS_STACK.backupElementQueue.push(element);

    if (CUSTOM_ELEMENT_REACTIONS_STACK.processingBackupElementQueue) {
      return;
    }

    CUSTOM_ELEMENT_REACTIONS_STACK.processingBackupElementQueue = true;

    Promise.resolve().then(() => {
      const elementQueue = CUSTOM_ELEMENT_REACTIONS_STACK.backupElementQueue;
      invokeCEReactions(elementQueue);

      CUSTOM_ELEMENT_REACTIONS_STACK.processingBackupElementQueue = false;
    });
  } else {
    CUSTOM_ELEMENT_REACTIONS_STACK.currentElementQueue.push(element);
  }
}

// https://html.spec.whatwg.org/multipage/custom-elements.html#enqueue-a-custom-element-callback-reaction
function enqueueCECallbackReaction(element, callbackName, args) {
  const { _ceDefinition: { lifecycleCallbacks, observedAttributes } } = element;

  const callback = lifecycleCallbacks[callbackName];
  if (callback === null) {
    return;
  }

  if (callbackName === "attributeChangedCallback") {
    const attributeName = args[0];
    if (!observedAttributes.includes(attributeName)) {
      return;
    }
  }

  element._ceReactionQueue.push({
    type: "callback",
    callback,
    args
  });

  enqueueElementOnAppropriateElementQueue(element);
}

// https://html.spec.whatwg.org/#enqueue-a-custom-element-upgrade-reaction
function enqueueCEUpgradeReaction(element, definition) {
  element._ceReactionQueue.push({
    type: "upgrade",
    definition
  });

  enqueueElementOnAppropriateElementQueue(element);
}

module.exports = {
  CUSTOM_ELEMENT_STATE,
  CUSTOM_ELEMENT_REACTIONS_STACK,

  CeReactions,

  isValidCustomElementName,

  upgradeElement,
  tryUpgradeElement,

  invokeCEReactions,
  lookupCEDefinition,
  enqueueCEUpgradeReaction,
  enqueueCECallbackReaction
};
