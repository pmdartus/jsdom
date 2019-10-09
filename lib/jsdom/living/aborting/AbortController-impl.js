"use strict";

const idlUtils = require("../generated/utils");
const AbortSignal = require("../generated/AbortSignal");

class AbortControllerImpl {
  constructor(args, { window }) {
    this._signal = AbortSignal.createImpl([], { window });
  }

  get signal() {
    return idlUtils.wrapperForImpl(this._signal);
  }

  abort() {
    this._signal._signalAbort();
  }
}

module.exports = {
  implementation: AbortControllerImpl
};
