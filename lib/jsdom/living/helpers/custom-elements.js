"use strict";

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

module.exports = {
  CUSTOM_ELEMENT_STATE,

  isValidCustomElementName
};
