"use strict";

const DOMException = require("domexception");

const NODE_TYPE = require("../node-type");
const { getHTMLElementInterface } = require("../create-element");

const { HTML_NS } = require("../helpers/namespaces");
const { isValidCustomElementName, tryUpgradeElement,
  enqueueCustomElementUpgradeReaction } = require("../helpers/custom-elements");
const { shadowIncludingInclusiveDescendantsIterator } = require("../helpers/shadow-dom");

const { implForWrapper } = require("../generated/utils");

const LIFECYCLE_CALLBACKS = [
  "connectedCallback",
  "disconnectedCallback",
  "adoptedCallback",
  "attributeChangedCallback"
];

// Poor man implementation of convertion to WebIDL function
// https://heycam.github.io/webidl/#es-callback-function
function convertToWebIDLFunction(obj) {
  if (typeof obj !== "function") {
    throw new TypeError("Invalid function");
  }

  return obj;
}

function convertToSequenceDOMString(obj) {
  if (!obj || !obj[Symbol.iterator]) {
    throw new TypeError("Invalid Sequence");
  }

  return Array.from(obj).map(String);
}

// Returns true is the passed value is a valid constructor.
// Borrowed from: https://stackoverflow.com/a/39336206/3832710
function isConstructor(value) {
  try {
    const P = new Proxy(value, {
      construct() {
        return {};
      }
    });

    // eslint-disable-next-line no-new
    new P();

    return true;
  } catch (err) {
    return false;
  }
}

// https://html.spec.whatwg.org/#customelementregistry
class CustomElementRegistryImpl {
  constructor(args, privateData) {
    this._customElementDefinitions = [];
    this._elementDefinitionIsRunning = false;
    this._whenDefinedPromiseMap = Object.create(null);

    const { _ownerDocument } = privateData;
    this._ownerDocument = _ownerDocument;
  }

  // https://html.spec.whatwg.org/#dom-customelementregistry-define
  define(name, ctor, options) {
    // TODO: Add better check if the ctor is a constructor
    if (typeof ctor !== "function" || !isConstructor(ctor)) {
      throw new TypeError("Constructor argument is not a constructor.");
    }

    if (!isValidCustomElementName(name)) {
      throw new DOMException("Name argument is not a valid custom element name.", "SyntaxError");
    }

    const nameAlreadyRegistered = this._customElementDefinitions.some(entry => entry.name === name);
    if (nameAlreadyRegistered) {
      throw new DOMException("This name has already been registered in the registry.", "NotSupportedError");
    }

    const ctorAlreadyRegistered = this._customElementDefinitions.some(entry => entry.ctor === ctor);
    if (ctorAlreadyRegistered) {
      throw new DOMException("This constructor has already been registered in the registry.", "NotSupportedError");
    }

    let localName = name;

    let extendsOption = null;
    if (options !== undefined && options.extends) {
      extendsOption = options.extends;
    }

    if (extendsOption !== null) {
      if (isValidCustomElementName(extendsOption)) {
        throw new DOMException("Option extends value can't be a valid custom element name.", "NotSupportedError");
      }

      const { interface: extendsInterface } = getHTMLElementInterface(extendsOption).interface;
      if (extendsInterface.name === "HTMLUnknownElement") {
        throw new DOMException(
          `${extendsOption} is an HTMLUnknownElement.`,
          "NotSupportedError"
        );
      }

      localName = extendsOption;
    }

    if (this._elementDefinitionIsRunning) {
      // TODO: Improve wording
      throw new DOMException(
        "Can't define a new custom element in the middle of the definition of another one.",
        "NotSupportedError"
      );
    }

    this._elementDefinitionIsRunning = true;

    let observedAttributes = [];
    const lifecycleCallbacks = {
      connectedCallback: null,
      disconnectedCallback: null,
      adoptedCallback: null,
      attributeChangedCallback: null
    };

    let caughtError;
    try {
      const { prototype } = ctor;

      if (typeof prototype !== "object") {
        throw new TypeError("Invalid constructor prototype.");
      }

      for (const callbackName of LIFECYCLE_CALLBACKS) {
        const callbackValue = prototype[callbackName];

        if (callbackValue !== undefined) {
          lifecycleCallbacks[callbackName] = convertToWebIDLFunction(callbackValue);
        }
      }

      if (lifecycleCallbacks.attributeChangedCallback !== null) {
        const observedAttributesIterable = ctor.observedAttributes;

        if (observedAttributesIterable !== undefined) {
          observedAttributes = convertToSequenceDOMString(observedAttributesIterable);
        }
      }
    } catch (err) {
      caughtError = err;
    } finally {
      this._elementDefinitionIsRunning = false;
    }

    if (caughtError !== undefined) {
      throw caughtError;
    }

    const definition = {
      name,
      localName,
      ctor,
      observedAttributes,
      lifecycleCallbacks,
      constructionStack: []
    };

    this._customElementDefinitions.push(definition);

    const upgradeCandidates = [];
    for (const candidate of shadowIncludingInclusiveDescendantsIterator(this._ownerDocument)) {
      if (
        candidate.nodeType === NODE_TYPE.ELEMENT_NODE &&
        candidate._namespaceURI === HTML_NS &&
        candidate._localName === localName &&
        (extendsOption !== null && candidate.isValue === name)
      ) {
        upgradeCandidates.push(candidate);
      }
    }

    for (const upgradeCandidate of upgradeCandidates) {
      enqueueCustomElementUpgradeReaction(upgradeCandidate, definition);
    }

    if (this._whenDefinedPromiseMap[name] !== undefined) {
      this._whenDefinedPromiseMap[name].resolve(undefined);
      delete this._whenDefinedPromiseMap[name];
    }
  }

  // https://html.spec.whatwg.org/#dom-customelementregistry-get
  get(name) {
    const definition = this._customElementDefinitions.find(entry => entry.name === name);
    return definition && definition.ctor;
  }

  // https://html.spec.whatwg.org/#dom-customelementregistry-whendefined
  whenDefined(name) {
    if (!isValidCustomElementName(name)) {
      return Promise.reject(new DOMException("Name argument is not a valid custom element name.", "SyntaxError"));
    }

    const alreadyRegistered = this._customElementDefinitions.some(entry => entry.name === name);
    if (alreadyRegistered) {
      return Promise.resolve();
    }

    if (this._whenDefinedPromiseMap[name] === undefined) {
      let resolve;
      const promise = new Promise(r => {
        resolve = r;
      });

      // Store the pending Promise along with the extracted resolve callback to actually resolve the returned Promise,
      // once the custom element is registered.
      this._whenDefinedPromiseMap[name] = {
        promise,
        resolve
      };
    }

    return this._whenDefinedPromiseMap[name].promise;
  }

  // https://html.spec.whatwg.org/#dom-customelementregistry-upgrade
  upgrade(root) {
    // TODO: This need to be done by the wrapper, not here.
    const rootImpl = implForWrapper(root);

    for (const candidate of shadowIncludingInclusiveDescendantsIterator(rootImpl)) {
      if (candidate.nodeType === NODE_TYPE.ELEMENT_NODE) {
        tryUpgradeElement(candidate);
      }
    }
  }
}

module.exports = {
  implementation: CustomElementRegistryImpl
};
