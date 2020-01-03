"use strict";

const idlUtils = require("../generated/utils");

// https://drafts.csswg.org/cssom/#stylesheetlist
class StyleSheetListImpl {
  constructor() {
    this._sheets = [];
  }

  // https://drafts.csswg.org/cssom/#dom-stylesheetlist-item
  item(index) {
    return this._sheets[index] || null;
  }

  // https://drafts.csswg.org/cssom/#dom-stylesheetlist-length
  get length() {
    return this._sheets.length;
  }

  [idlUtils.supportsPropertyIndex](index) {
    return index >= 0 && index < this.length;
  }

  [idlUtils.supportedPropertyIndices]() {
    return this._sheets.keys();
  }
}

exports.implementation = StyleSheetListImpl;
