"use strict";

const DOMException = require("domexception");

const { HTML_NS } = require("./namespaces");
const { CUSTOM_ELEMENT_STATE } = require("./custom-elements");

const { createElement, INTERFACE_TAG_MAPPING } = require("../create-element");
const { implForWrapper, wrapperForImpl } = require("../generated/utils");

// https://html.spec.whatwg.org/multipage/custom-elements.html#concept-already-constructed-marker
const ALREADY_CONSTRUCTED_MARKER = Symbol("already-constructed-marker");

const CONSTRUCTORS_TO_PATCH = [
  "HTMLAnchorElement",
  "HTMLAreaElement",
  "HTMLAudioElement",
  "HTMLBaseElement",
  "HTMLBodyElement",
  "HTMLBRElement",
  "HTMLButtonElement",
  "HTMLCanvasElement",
  "HTMLDataElement",
  "HTMLDataListElement",
  "HTMLDetailsElement",
  "HTMLDialogElement",
  "HTMLDirectoryElement",
  "HTMLDivElement",
  "HTMLDListElement",
  "HTMLElement",
  "HTMLEmbedElement",
  "HTMLFieldSetElement",
  "HTMLFontElement",
  "HTMLFormElement",
  "HTMLFrameElement",
  "HTMLFrameSetElement",
  "HTMLHeadElement",
  "HTMLHeadingElement",
  "HTMLHRElement",
  "HTMLHtmlElement",
  "HTMLIFrameElement",
  "HTMLImageElement",
  "HTMLInputElement",
  "HTMLLabelElement",
  "HTMLLegendElement",
  "HTMLLIElement",
  "HTMLLinkElement",
  "HTMLMapElement",
  "HTMLMarqueeElement",
  "HTMLMenuElement",
  "HTMLMetaElement",
  "HTMLMeterElement",
  "HTMLModElement",
  "HTMLObjectElement",
  "HTMLOListElement",
  "HTMLOptGroupElement",
  "HTMLOptionElement",
  "HTMLOutputElement",
  "HTMLParagraphElement",
  "HTMLParamElement",
  "HTMLPictureElement",
  "HTMLPreElement",
  "HTMLProgressElement",
  "HTMLQuoteElement",
  "HTMLScriptElement",
  "HTMLSelectElement",
  "HTMLSlotElement",
  "HTMLSourceElement",
  "HTMLSpanElement",
  "HTMLStyleElement",
  "HTMLTableCaptionElement",
  "HTMLTableCellElement",
  "HTMLTableColElement",
  "HTMLTableElement",
  "HTMLTableRowElement",
  "HTMLTableSectionElement",
  "HTMLTemplateElement",
  "HTMLTextAreaElement",
  "HTMLTimeElement",
  "HTMLTitleElement",
  "HTMLTrackElement",
  "HTMLUListElement",
  "HTMLVideoElement",
];

function patchHTMLConstructor(window) {
  for (const constructorName of CONSTRUCTORS_TO_PATCH) {
    // https://html.spec.whatwg.org/multipage/dom.html#htmlconstructor
    function HTMLConstructor() {
      const registry = window._customElements;

      const newTarget = new.target;

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
        const documentImpl = implForWrapper(window.document);

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
        throw new DOMException("TODO", "InvalidStateError");
      }

      Object.setPrototypeOf(element, prototype);

      definition.constructionStack[definition.constructionStack.length - 1] = ALREADY_CONSTRUCTED_MARKER;

      return element;
    }

    const originalPrototype = window[constructorName].prototype;

    window[constructorName] = HTMLConstructor;
    window[constructorName].prototype = originalPrototype;
  }
}

module.exports = {
  patchHTMLConstructor
};
