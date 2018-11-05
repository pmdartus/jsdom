"use strict";

const { HTML_NS } = require("./namespaces");

// https://dom.spec.whatwg.org/#concept-element-custom-element-state
const CUSTOM_ELEMENT_STATE = {
  UNDEFINED: "undefined",
  FAILED: "failed",
  UNCUSTOMZIED: "uncustomized",
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

module.exports = {
  CUSTOM_ELEMENT_STATE,

  isValidCustomElementName,

  lookupCEDefinition
};
