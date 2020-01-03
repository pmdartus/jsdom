"use strict";

const { parseFragment } = require("../../browser/parser");
const { fragmentSerialization } = require("../domparsing/serialization.js");
const { nodeRoot } = require("../helpers/node");
const { mixin } = require("../../utils");

const DocumentFragment = require("./DocumentFragment-impl").implementation;
const DocumentOrShadowRootImpl = require("./DocumentOrShadowRoot-impl").implementation;

class ShadowRootImpl extends DocumentFragment {
  constructor(globalObject, args, privateData) {
    super(globalObject, args, privateData);

    const { mode } = privateData;
    this._mode = mode;

    // A shadow root is always associated with a host element, because of this a shadow root is always considered
    // attached to a DOM tree.
    this._attached = true;
  }

  _getTheParent(event) {
    if (!event.composed && this === nodeRoot(event._path[0].item)) {
      return null;
    }

    return this._host;
  }

  get mode() {
    return this._mode;
  }

  get host() {
    return this._host;
  }

  // https://w3c.github.io/DOM-Parsing/#dfn-innerhtml
  get innerHTML() {
    return fragmentSerialization(this, {
      requireWellFormed: true,
      globalObject: this._globalObject
    });
  }
  set innerHTML(markup) {
    const fragment = parseFragment(markup, this._host);
    this._replaceAll(fragment);
  }
}

mixin(ShadowRootImpl.prototype, DocumentOrShadowRootImpl.prototype);

module.exports = {
  implementation: ShadowRootImpl
};
