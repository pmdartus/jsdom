/* eslint-disable global-require */

"use strict";

const { HTML_NS } = require("./namespaces");
const { CUSTOM_ELEMENT_STATE } = require("./custom-elements");

const { createElement, INTERFACE_TAG_MAPPING } = require("../create-element");
const { implForWrapper, wrapperForImpl } = require("../generated/utils");

const GENERATED_INTERFACES = [
  require("../generated/HTMLElement.js"),
  require("../generated/HTMLAnchorElement.js"),
  require("../generated/HTMLAreaElement.js"),
  require("../generated/HTMLAudioElement.js"),
  require("../generated/HTMLBaseElement.js"),
  require("../generated/HTMLBodyElement.js"),
  require("../generated/HTMLBRElement.js"),
  require("../generated/HTMLButtonElement.js"),
  require("../generated/HTMLCanvasElement.js"),
  require("../generated/HTMLDataElement.js"),
  require("../generated/HTMLDataListElement.js"),
  require("../generated/HTMLDetailsElement.js"),
  require("../generated/HTMLDialogElement.js"),
  require("../generated/HTMLDirectoryElement.js"),
  require("../generated/HTMLDivElement.js"),
  require("../generated/HTMLDListElement.js"),
  require("../generated/HTMLEmbedElement.js"),
  require("../generated/HTMLFieldSetElement.js"),
  require("../generated/HTMLFontElement.js"),
  require("../generated/HTMLFormElement.js"),
  require("../generated/HTMLFrameElement.js"),
  require("../generated/HTMLFrameSetElement.js"),
  require("../generated/HTMLHeadingElement.js"),
  require("../generated/HTMLHeadElement.js"),
  require("../generated/HTMLHRElement.js"),
  require("../generated/HTMLHtmlElement.js"),
  require("../generated/HTMLIFrameElement.js"),
  require("../generated/HTMLImageElement.js"),
  require("../generated/HTMLInputElement.js"),
  require("../generated/HTMLLabelElement.js"),
  require("../generated/HTMLLegendElement.js"),
  require("../generated/HTMLLIElement.js"),
  require("../generated/HTMLLinkElement.js"),
  require("../generated/HTMLMapElement.js"),
  require("../generated/HTMLMarqueeElement.js"),
  require("../generated/HTMLMenuElement.js"),
  require("../generated/HTMLMetaElement.js"),
  require("../generated/HTMLMeterElement.js"),
  require("../generated/HTMLModElement.js"),
  require("../generated/HTMLObjectElement.js"),
  require("../generated/HTMLOListElement.js"),
  require("../generated/HTMLOptGroupElement.js"),
  require("../generated/HTMLOptionElement.js"),
  require("../generated/HTMLOutputElement.js"),
  require("../generated/HTMLParagraphElement.js"),
  require("../generated/HTMLParamElement.js"),
  require("../generated/HTMLPictureElement.js"),
  require("../generated/HTMLPreElement.js"),
  require("../generated/HTMLProgressElement.js"),
  require("../generated/HTMLQuoteElement.js"),
  require("../generated/HTMLScriptElement.js"),
  require("../generated/HTMLSelectElement.js"),
  require("../generated/HTMLSlotElement.js"),
  require("../generated/HTMLSourceElement.js"),
  require("../generated/HTMLSpanElement.js"),
  require("../generated/HTMLStyleElement.js"),
  require("../generated/HTMLTableCaptionElement.js"),
  require("../generated/HTMLTableCellElement.js"),
  require("../generated/HTMLTableColElement.js"),
  require("../generated/HTMLTableElement.js"),
  require("../generated/HTMLTimeElement.js"),
  require("../generated/HTMLTitleElement.js"),
  require("../generated/HTMLTableRowElement.js"),
  require("../generated/HTMLTableSectionElement.js"),
  require("../generated/HTMLTemplateElement.js"),
  require("../generated/HTMLTextAreaElement.js"),
  require("../generated/HTMLTrackElement.js"),
  require("../generated/HTMLUListElement.js"),
  require("../generated/HTMLVideoElement.js")
];

// https://html.spec.whatwg.org/multipage/custom-elements.html#concept-already-constructed-marker
const ALREADY_CONSTRUCTED_MARKER = Symbol("already-constructed-marker");

// https://html.spec.whatwg.org/multipage/dom.html#htmlconstructor
function HTMLConstructor({ globalObject, newTarget, constructorName }) {
  const registry = globalObject._customElements;

  if (newTarget === HTMLConstructor) {
    throw new TypeError("Invalid constructor");
  }

  const definition = registry._customElementDefinitions.find(entry => entry.ctor === newTarget);
  if (definition === undefined) {
    throw new TypeError("Invalid constructor, the constructor is not part of the custom element registry");
  }

  let isValue = null;

  if (definition.localName === definition.name) {
    if (constructorName !== "HTMLElement") {
      throw new TypeError("Invalid constructor, autonomous custom element should extend from HTMLElement");
    }
  } else {
    const validLocalNames = INTERFACE_TAG_MAPPING[HTML_NS][constructorName];
    if (!validLocalNames.tags.includes(definition.localName)) {
      throw new TypeError(`${definition.localName} is not valid local name for ${constructorName}`);
    }

    isValue = definition.name;
  }

  let { prototype } = newTarget;

  if (prototype === null || typeof prototype !== "object") {
    prototype = HTMLConstructor.prototype;
  }

  if (definition.constructionStack.length === 0) {
    const documentImpl = implForWrapper(globalObject.document);

    const elementImpl = createElement(documentImpl, definition.localName, HTML_NS);
    const element = wrapperForImpl(elementImpl);

    Object.setPrototypeOf(element, prototype);

    elementImpl._ceState = CUSTOM_ELEMENT_STATE.CUSTOM;
    elementImpl._ceDefinition = definition;
    elementImpl._isValue = isValue;

    return element;
  }

  const elementImpl = definition.constructionStack[definition.constructionStack.length - 1];
  const element = wrapperForImpl(elementImpl);

  if (elementImpl === ALREADY_CONSTRUCTED_MARKER) {
    // TODO: Open spec bug, should be TypeError and not InvalidStateError.
    throw new TypeError("This instance is already constructed");
  }

  Object.setPrototypeOf(element, prototype);

  definition.constructionStack[definition.constructionStack.length - 1] = ALREADY_CONSTRUCTED_MARKER;

  return element;
}

function installHTMLConstructors(globalObject) {
  for (const generatedInterface of GENERATED_INTERFACES) {
    generatedInterface.installConstructor(globalObject, HTMLConstructor);
  }
}

module.exports = {
  HTMLConstructor,
  installHTMLConstructors
};
