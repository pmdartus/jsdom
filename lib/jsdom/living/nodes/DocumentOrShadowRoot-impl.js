"use strict";

const NODE_TYPE = require("../node-type");
const { nodeRoot } = require("../helpers/node");
const { retarget } = require("../helpers/shadow-dom");

const StyleSheetList = require("../generated/StyleSheetList");

// https://dom.spec.whatwg.org/#documentorshadowroot
class DocumentOrShadowRootImpl {
  // https://html.spec.whatwg.org/multipage/interaction.html#dom-documentorshadowroot-activeelement
  get activeElement() {
    let candidate = this._ownerDocument._lastFocusedElement || this._ownerDocument.body;
    if (!candidate) {
      return null;
    }
    candidate = retarget(candidate, this);
    if (nodeRoot(candidate) !== this) {
      return null;
    }
    if (candidate.nodeType !== NODE_TYPE.DOCUMENT_NODE) {
      return candidate;
    }
    if (candidate.body !== null) {
      return candidate.body;
    }
    return candidate.documentElement;
  }

  // https://drafts.csswg.org/cssom/#dom-documentorshadowroot-stylesheets
  get styleSheets() {
    if (!this._styleSheets) {
      this._styleSheets = StyleSheetList.createImpl(this._globalObject);
    }

    return this._styleSheets;
  }
}

module.exports = {
  implementation: DocumentOrShadowRootImpl
};
