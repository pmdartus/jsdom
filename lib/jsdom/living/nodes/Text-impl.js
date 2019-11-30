"use strict";

const DOMException = require("domexception");

const SlotableMixinImpl = require("./Slotable-impl").implementation;
const CharacterDataImpl = require("./CharacterData-impl").implementation;

const { domSymbolTree } = require("../helpers/internal-constants");

const NODE_TYPE = require("../node-type");
const { mixin } = require("../../utils");

const { implForWrapper } = require("../generated/utils");

// https://dom.spec.whatwg.org/#interface-text
class TextImpl extends CharacterDataImpl {
  // https://dom.spec.whatwg.org/#dom-text-text
  constructor(globalObject, args, privateData) {
    const [data] = args;

    if (data) {
      privateData.data = data;
      privateData.ownerDocument = implForWrapper(globalObject._document);
    }

    super(globalObject, args, privateData);

    this._initSlotableMixin();

    this.nodeType = NODE_TYPE.TEXT_NODE;
  }

  // https://dom.spec.whatwg.org/#dom-text-splittext
  // https://dom.spec.whatwg.org/#concept-text-split
  splitText(offset) {
    offset >>>= 0;

    const { length } = this;

    if (offset > length) {
      throw new DOMException("The index is not in the allowed range.", "IndexSizeError");
    }

    const count = length - offset;
    const newData = this.substringData(offset, count);

    const newNode = this._ownerDocument.createTextNode(newData);

    const parent = domSymbolTree.parent(this);

    if (parent !== null) {
      parent._insert(newNode, this.nextSibling);
    }

    this.replaceData(offset, count, "");

    return newNode;

    // TODO: range stuff
  }

  // https://dom.spec.whatwg.org/#dom-text-wholetext
  get wholeText() {
    let wholeText = this.textContent;
    let next;
    let current = this;
    while ((next = domSymbolTree.previousSibling(current)) && next.nodeType === NODE_TYPE.TEXT_NODE) {
      wholeText = next.textContent + wholeText;
      current = next;
    }
    current = this;
    while ((next = domSymbolTree.nextSibling(current)) && next.nodeType === NODE_TYPE.TEXT_NODE) {
      wholeText += next.textContent;
      current = next;
    }
    return wholeText;
  }
}

mixin(TextImpl.prototype, SlotableMixinImpl.prototype);

module.exports = {
  implementation: TextImpl
};
