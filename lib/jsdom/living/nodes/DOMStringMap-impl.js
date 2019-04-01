"use strict";

const idlUtils = require("../generated/utils.js");
const { setAttributeValue, removeAttributeByName } = require("../attributes");
const validateName = require("../helpers/validate-names").name;
const DOMException = require("domexception");
const { wrapWithCEReactions } = require("../helpers/ce-reactions");

const dataAttrRe = /^data-([^A-Z]*)$/;

function attrCamelCase(name) {
  return name.replace(/-([a-z])/g, (match, alpha) => alpha.toUpperCase());
}

function attrSnakeCase(name) {
  return name.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
}

class DOMStringMapImpl {
  constructor(args, privateData) {
    this._element = privateData.element;
  }
  get [idlUtils.supportedPropertyNames]() {
    const result = new Set();
    const { attributes } = this._element;
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes.item(i);
      const matches = dataAttrRe.exec(attr.localName);
      if (matches) {
        result.add(attrCamelCase(matches[1]));
      }
    }
    return result;
  }
  [idlUtils.namedGet](name) {
    const { attributes } = this._element;
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes.item(i);
      const matches = dataAttrRe.exec(attr.localName);
      if (matches && attrCamelCase(matches[1]) === name) {
        return attr.value;
      }
    }
    return undefined;
  }
  [idlUtils.namedSetNew](name, value) {
    if (/-[a-z]/.test(name)) {
      throw new DOMException(`'${name}' is not a valid property name`, "SyntaxError");
    }
    name = `data-${attrSnakeCase(name)}`;
    validateName(name);
    setAttributeValue(this._element, name, value);
  }
  [idlUtils.namedSetExisting](name, value) {
    this[idlUtils.namedSetNew](name, value);
  }
  [idlUtils.namedDelete](name) {
    name = `data-${attrSnakeCase(name)}`;
    removeAttributeByName(this._element, name);
  }
}

// This is poor work-around to make [CEReactions] work with interfaces using proxies.
// Instead of patching the interfaces, in those cases we patch directly the class impl
DOMStringMapImpl.prototype[idlUtils.namedSetNew] = wrapWithCEReactions(DOMStringMapImpl.prototype[idlUtils.namedSetNew]);
DOMStringMapImpl.prototype[idlUtils.namedSetExisting] = wrapWithCEReactions(DOMStringMapImpl.prototype[idlUtils.namedSetExisting]);
DOMStringMapImpl.prototype[idlUtils.namedDelete] = wrapWithCEReactions(DOMStringMapImpl.prototype[idlUtils.namedDelete]);

exports.implementation = DOMStringMapImpl;
