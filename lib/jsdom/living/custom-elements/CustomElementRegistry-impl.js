"use strict";

const DOMException = require("domexception");

const NODE_TYPE = require("../node-type");

const { HTML_NS } = require("../helpers/namespaces");
const { CUSTOM_ELEMENT_STATE, isValidCustomElementName } = require("../helpers/custom-elements");
const { shadowDomInclusiveDescendantIterator } = require("../helpers/shadow-dom");

// https://html.spec.whatwg.org/multipage/custom-elements.html#custom-element-reactions-stack
// TODO: This not be global and unit of related similar-origin browsing contexts.
const CUSTOM_ELEMENT_REACTION_STACK = [];

// https://html.spec.whatwg.org/multipage/custom-elements.html#backup-element-queue
// TODO: This not be global should be associated with a custom element stack.
const BACKUP_ELEMENT_QUEUE = [];

// https://html.spec.whatwg.org/multipage/custom-elements.html#processing-the-backup-element-queue
let PROCESSING_BACKUP_ELEMENT_QUEUE = false;

// https://html.spec.whatwg.org/multipage/custom-elements.html#current-element-queue
function currentElementQueue() {
  return CUSTOM_ELEMENT_REACTION_STACK[CUSTOM_ELEMENT_REACTION_STACK.length - 1];
}

// Borrowed from: https://esdiscuss.org/topic/isconstructor#content-11
function isConstructor(o) {
  try {
    /* eslint-disable no-new */
    new new Proxy(o, { construct: () => ({}) })();
    return true;
  } catch (e) {
    return false;
  }
}

// https://html.spec.whatwg.org/multipage/custom-elements.html#concept-try-upgrade
function tryToUpgrade(element) {
  const { _ownerDocument, _namespaceURI, _localName, _isValue } = element;
  const definition = lookupCEDefinition(_ownerDocument, _namespaceURI, _localName, _isValue);

  if (definition !== null) {
    enqueueCEUpgradeReaction(element, definition);
  }
}

// https://html.spec.whatwg.org/multipage/custom-elements.html#look-up-a-custom-element-definition
function lookupCEDefinition(document, namespace, localName, is) {
  if (namespace !== HTML_NS) {
    return null;
  }

  // If document does not have a browsing context, return null.
  // TODO

  const registry = document.customElements;

  const definitionByName = registry._customElementDefinitions.find(entry => {
    return entry.name === localName && entry.localName === localName;
  });
  if (definitionByName) {
    return definitionByName;
  }

  const definitionByIs = registry._customElementDefinitions.find(entry => {
    return entry.name === is && entry.localName === localName;
  });
  if (definitionByName) {
    return definitionByIs;
  }

  return null;
}

// https://html.spec.whatwg.org/multipage/custom-elements.html#enqueue-a-custom-element-upgrade-reaction
function enqueueCEUpgradeReaction(element, definition) {
  element._customElementReactionQueue.push({
    type: "upgrade",
    definition
  });

  enqueueCEOnElementQueue(element);
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
    enqueueCECallbackReaction(element, "attributeChangedCallback", [
      attribute._localName,
      null,
      attribute._value,
      attribute._namespace
    ]);
  }

  if (element.isConnected()) {
    enqueueCECallbackReaction(element, "connectedCallback", []);
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

// https://html.spec.whatwg.org/multipage/custom-elements.html#enqueue-a-custom-element-callback-reaction
function enqueueCECallbackReaction(element, callbackName, args) {
  const { _customElementDefinition: definition } = element;

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

  element._customElementReactionQueue.push({
    type: "callback",
    callback,
    args
  });

  enqueueCEOnElementQueue(element);
}

// https://html.spec.whatwg.org/multipage/custom-elements.html#enqueue-an-element-on-the-appropriate-element-queue
function enqueueCEOnElementQueue(element) {
  if (CUSTOM_ELEMENT_REACTION_STACK.length === 0) {
    BACKUP_ELEMENT_QUEUE.push(element);

    if (PROCESSING_BACKUP_ELEMENT_QUEUE) {
      return;
    }

    PROCESSING_BACKUP_ELEMENT_QUEUE = true;

    Promise.resolve().then(() => {
      invokeCEReactions(BACKUP_ELEMENT_QUEUE);

      PROCESSING_BACKUP_ELEMENT_QUEUE = false;
    });
  } else {
    currentElementQueue().push(element);
  }
}

// https://html.spec.whatwg.org/multipage/custom-elements.html#invoke-custom-element-reactions
function invokeCEReactions(queue) {
  for (const element of queue) {
    if (queue._isCustom()) {
      const { _customElementReactionQueue: reactions } = element;

      while (reactions.length > 0) {
        const reaction = reactions.unshift();

        try {
          switch (reaction.type) {
            case "upgrade":
              upgradeElement(reaction.definition, element);
              break;

            case "callback": {
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

// https://html.spec.whatwg.org/multipage/custom-elements.html#customelementregistry
class CustomElementRegistryImpl {
  constructor(args, privateData) {
    this._customElementDefinitions = [];
    this._elementDefinitionIsRunning = false;
    this._whenDefinedPromiseMap = {};

    const { ownerDocument } = privateData;
    this._ownerDocument = ownerDocument;
  }

  // https://html.spec.whatwg.org/multipage/custom-elements.html#dom-customelementregistry-define
  define(name, constructor, options = {}) {
    if (!isConstructor(constructor)) {
      throw new TypeError("Invalid custom element constructor.");
    }

    if (!isValidCustomElementName(name)) {
      throw new DOMException("Invalid custom element name.", "SyntaxError");
    }

    if (this._customElementDefinitions.some(entry => entry.name === name)) {
      throw new DOMException(
        `Custom element "${name}" has already been registered in the registry.`,
        "NotSupportedError"
      );
    }

    if (this._customElementDefinitions.some(entry => entry.constructor === constructor)) {
      throw new DOMException(
        `Custom element constructor has already been registered in the registry.`,
        "NotSupportedError"
      );
    }

    let localName = name;
    const extendsName = options.extends;

    if (extendsName) {
      if (isValidCustomElementName(extendsName)) {
        throw new DOMException("Option extends can't be a custom element name.", "NotSupportedError");
      }

      // If the element interface for extends and the HTML namespace is HTMLUnknownElement (e.g., if extends does not indicate an element definition in this specification), then throw a "NotSupportedError" DOMException.
      // TODO

      localName = extendsName;
    }

    if (this._elementDefinitionIsRunning) {
      throw new DOMException("Invalid reentrant element definition invocation.", "NotSupportedError");
    }

    this._elementDefinitionIsRunning = true;

    const lifecycleCallbacks = {
      connectedCallback: null,
      disconnectedCallback: null,
      adoptedCallback: null,
      attributeChangedCallback: null
    };
    let observedAttributes = [];

    try {
      const { prototype } = constructor;
      if (typeof prototype !== "object") {
        throw new TypeError("Invalid constructor prototype.");
      }

      for (const callbackName of Object.keys(lifecycleCallbacks)) {
        const callbackValue = prototype[callbackName];

        if (callbackValue !== undefined) {
          if (typeof callbackValue !== "function") {
            throw new TypeError(`Invalid lifecycle callback definition for "${callbackName}", ` +
              `expected to be a function.`);
          }

          lifecycleCallbacks[callbackName] = callbackValue;
        }
      }

      if (lifecycleCallbacks.attributeChangedCallback !== null) {
        const observedAttributesIterable = constructor.observedAttributes;

        if (observedAttributesIterable) {
          if (!(Symbol.iterator in observedAttributesIterable)) {
            throw new TypeError(`Invalid "attributeChangedCallback" property, expected to be an iterable.`);
          }

          observedAttributes = Array.from(observedAttributesIterable);
        }
      }
    } finally {
      this._elementDefinitionIsRunning = false;
    }

    const definition = {
      name,
      localName,
      constructor,
      observedAttributes,
      lifecycleCallbacks,
      constructionStack: []
    };

    this._customElementDefinitions.push(definition);

    const document = this._ownerDocument;

    const upgradeCandidates = [];
    for (const descendant of shadowDomInclusiveDescendantIterator(document)) {
      if (
        descendant.nodeType === NODE_TYPE.ELEMENT_NODE &&
        descendant._namespaceURI === HTML_NS &&
        descendant._localName === localName
      ) {
        upgradeCandidates.push(descendant);
      }

      if (extendsName && extendsName._isValue === name) {
        upgradeCandidates.push(descendant);
      }
    }

    for (const candidate of upgradeCandidates) {
      enqueueCEUpgradeReaction(candidate, definition);
    }

    if (this._whenDefinedPromiseMap[name]) {
      const promise = this._whenDefinedPromiseMap[name];

      promise.resolve();

      delete this._whenDefinedPromiseMap[name];
    }
  }

  // https://html.spec.whatwg.org/multipage/custom-elements.html#dom-customelementregistry-get
  get(name) {
    const definition = this._customElementDefinitions.find(entry => entry.name === name);
    return definition && definition.constructor;
  }

  // https://html.spec.whatwg.org/multipage/custom-elements.html#dom-customelementregistry-whendefined
  whenDefined(name) {
    if (!isValidCustomElementName(name)) {
      const err = new DOMException("Invalid custom element name.", "SyntaxError");
      return Promise.reject(err);
    }

    if (this._customElementDefinitions.some(entry => entry.name === name)) {
      return Promise.resolve();
    }

    if (!this._whenDefinedPromiseMap[name]) {
      // TODO: See how to make it better.
      /* eslint-disable no-new */
      new Promise(resolve => {
        this._whenDefinedPromiseMap = { resolve };
      });
    }

    return this._customElementDefinitions[name];
  }

  // https://html.spec.whatwg.org/multipage/custom-elements.html#dom-customelementregistry-upgrade
  upgrade(root) {
    const candidates = Array.from(shadowDomInclusiveDescendantIterator(root));

    for (const candidate of candidates) {
      tryToUpgrade(candidate);
    }
  }
}

module.exports = {
  implementation: CustomElementRegistryImpl
};
