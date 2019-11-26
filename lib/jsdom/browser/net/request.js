"use strict";

const HeaderList = require("./header-list");

const HTTP_METHODS = {
  GET: "GET"
};

// https://fetch.spec.whatwg.org/#concept-request-origin
const REQUEST_ORIGIN = {
  CLIENT: "client"
};

// https://fetch.spec.whatwg.org/#concept-request-destination
const REQUEST_DESTINATION = {
  DOCUMENT: "document",
  FONT: "font",
  IMAGE: "image",
  OBJECT: "object",
  SCRIPT: "script",
  STYLE: "style"
};

// https://fetch.spec.whatwg.org/#concept-request-referrer
const REQUEST_REFERRER = {
  NO_REFERRER: "no-referrer",
  CLIENT: "client"
};

// https://fetch.spec.whatwg.org/#concept-request-mode
const REQUEST_MODE = {
  SAME_ORIGIN: "same-origin",
  CORS: "cors",
  NO_CORS: "no-cors",
  NAVIGATE: "navigate"
};

// https://fetch.spec.whatwg.org/#concept-request-cache-mode
const REQUEST_CACHE_MODE = {
  DEFAULT: "default",
  NO_STORE: "no-store",
  RELOAD: "reload",
  NO_CACHE: "no-cache",
  FORCE_CACHE: "force-cache",
  ONLY_IF_CACHED: "only-if-cached"
};

// https://fetch.spec.whatwg.org/#concept-request-response-tainting
const REQUEST_RESPONSE_TAINTING = {
  BASIC: "basic",
  CORS: "cors",
  OPAQUE: "opaque"
};

// https://fetch.spec.whatwg.org/#concept-request
class Request {
  constructor(url, init = {}) {
    this.method = init.method || HTTP_METHODS.GET;
    this.url = url;
    this.headerList = new HeaderList();
    this.unsafeRequest = init.unsafeRequest || false;
    this.body = init.body || null;
    this.destination = "";
    this.origin = init.origin || REQUEST_ORIGIN.CLIENT;
    this.referrer = init.referrer || REQUEST_REFERRER.CLIENT;
    this.synchronous = init.synchronous || false;
    this.mode = init.synchronous || REQUEST_MODE.NO_CORS;
    this.useCorsPreflight = init.useCorsPreflight || false;
    this.cacheMode = init.cacheMode || REQUEST_CACHE_MODE.DEFAULT;
    this.taintedOrigin = init.taintedOrigin || false;
    this.urlList = [url.clone()];
    this.responseTainting = init.responseTainting || REQUEST_RESPONSE_TAINTING.BASIC;
  }

  get currentUrl() {
    const { urlList } = this;
    return urlList[urlList.length - 1];
  }

  // https://fetch.spec.whatwg.org/#navigation-request
  isNavigationRequest() {
    return this.destination === REQUEST_DESTINATION.DOCUMENT;
  }
}

/** Convert a request to Node.js http option */
function getNodeRequestOptions(request) {
  // return {
  //   headers: request.headerList, // TODO: to object
  //   method: request.method,

  // }
}

module.exports = {
  REQUEST_ORIGIN,
  REQUEST_DESTINATION,
  REQUEST_REFERRER,
  REQUEST_MODE,
  REQUEST_CACHE_MODE,
  REQUEST_RESPONSE_TAINTING,

  Request
};
