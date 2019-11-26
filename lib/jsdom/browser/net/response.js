"use strict";

// https://fetch.spec.whatwg.org/#concept-response-type
const RESPONSE_TYPE = {
  BASIC: "basic",
  CORS: "cors",
  DEFAULT: "default",
  ERROR: "error",
  OPAQUE: "opaque",
  OPAQUEREDIRECT: "opaqueredirect"
};

// https://fetch.spec.whatwg.org/#concept-response
class Response {
  constructor(url, init = {}) {
    this.type = init.type || RESPONSE_TYPE.DEFAULT;
    this.url = url;
  }

  // https://fetch.spec.whatwg.org/#concept-network-error
  static createNetworkError() {
    return new Response(null, {
      type: RESPONSE_TYPE.ERROR,
      status: 0,
      statusMessage: "",
      body: null
    });
  }
}

module.exports = {
  RESPONSE_TYPE,

  Response
};
