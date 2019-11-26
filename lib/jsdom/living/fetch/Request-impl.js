"use strict";

const { URL, parseURL, serializeURL } = require("whatwg-url");

const {
  Request, REQUEST_MODE, REQUEST_ORIGIN, REQUEST_REFERRER, REQUEST_CACHE_MODE
} = require("../../browser/net/request");

const Headers = require("../generated/Headers");

// https://fetch.spec.whatwg.org/#request
class RequestImpl {
  // https://fetch.spec.whatwg.org/#dom-request
  constructor(globalObject, args) {
    const [input, init] = args;

    this._globalObject = globalObject;

    let request = null;
    let fallbackMode = null;
    let fallbackCredentials = null;
    let baseUrl = null // TODO
    let signal = null;

    if (typeof input === "string") {
      let parsedUrl;

      try {
        parsedUrl = parseURL(input, {
          baseURL: baseUrl
        });
      } catch (error) {
        throw new TypeError("TODO");
      }

      if (parsedUrl.username !== "" && parsedUrl.password !== "") {
        throw new TypeError("TODO");
      }

      request = new Request(parsedUrl);
      fallbackCredentials = "cors";
      fallbackCredentials = "same-origin";
    } else {
      request = input.request;
      signal = input.signal;
    }

    // TODO

    request = new Request(request.currentUrl, {
      method: request.method,
      headerList: request.headerList.clone(),
      unsafeRequest: true,
      // TODO: client,
      // TODO: window
      // TODO: priority
      origin: REQUEST_ORIGIN.CLIENT,
      referrer: request.referrer,
      mode: request.mode,
      credentialMode: request.credentialMode,
      cacheMode: request.cacheMode
      // TODO: redirectMode
      // TODO: integrity
      // TODO: keepAlive
      // TODO: reloadNavigation
      // TODO: historyNavigation
    });

    if (init) {
      if (request.mode === REQUEST_MODE.NAVIGATE) {
        request.mode = REQUEST_MODE.SAME_ORIGIN;
      }

      // TODO

      request.referrer = REQUEST_REFERRER.CLIENT;

      // TODO
    }

    if (init && init.referrer) {
      const { referrer } = init;

      if (referrer === "") {
        request.referrer = REQUEST_REFERRER.NO_REFERRER;
      } else {
        let parsedReferrer;

        try {
          parsedReferrer = parseURL(referrer, {
            baseURL: null // TODO
          });
        } catch (error) {
          throw new TypeError("TODO");
        }

        // TODO

        request.referrer = parsedReferrer;
      }
    }

    // TODO

    const mode = init.mode || fallbackMode;
    if (mode === REQUEST_MODE.NAVIGATE) {
      throw new TypeError("TODO");
    } else if (mode) {
      request.mode = mode;
    }

    const credentials = init.credentials || fallbackCredentials;
    if (credentials) {
      request.credentials = credentials;
    }

    if (init.cache) {
      request.cacheMode = init.cache;
    }

    if (request.cacheMode === REQUEST_CACHE_MODE.ONLY_IF_CACHED && request.mode !== REQUEST_MODE.SAME_ORIGIN) {
      throw new TypeError("TODO");
    }

    // TODO

    if (init.method) {
      const { method } = init;

      // TODO

      request.method = method;
    }

    this.request = request;

    // TODO

    const headers = this.headers = Headers.createImpl();
    headers.headersList = request.headerList;
    headers.guard = "request"; // TODO: move to enum

    if (init) {
      // TODO
    }
  }

  // https://fetch.spec.whatwg.org/#dom-request-method
  get method() {
    return this.request.method;
  }

  // https://fetch.spec.whatwg.org/#dom-request-url
  get url() {
    const { url } = this.request;
    return url instanceof URL ? serializeURL(url) : url;
  }

  // https://fetch.spec.whatwg.org/#dom-request-headers
  get headers() {
    return this.headers;
  }

  // https://fetch.spec.whatwg.org/#dom-request-destination
  get destination() {
    return this.request.destination;
  }

  // https://fetch.spec.whatwg.org/#dom-request-referrer
  get referrer() {
    // TODO
  }

  // https://fetch.spec.whatwg.org/#dom-request-referrerpolicy
  get referrerPolicy() {
    // TODO
  }

  // https://fetch.spec.whatwg.org/#dom-request-mode
  get mode() {
    return this.request.mode;
  }

  // https://fetch.spec.whatwg.org/#dom-request-credentials
  get credentials() {
    return this.request.credentialsMode;
  }

  // https://fetch.spec.whatwg.org/#dom-request-cache
  get cache() {
    return this.request.cacheMode;
  }

  // https://fetch.spec.whatwg.org/#dom-request-redirect
  get redirect() {
    // TODO
  }

  // https://fetch.spec.whatwg.org/#dom-request-integrity
  get integrity() {
    // TODO
  }

  // https://fetch.spec.whatwg.org/#dom-request-keepalive
  get keepalive() {
    // TODO
  }

  // https://fetch.spec.whatwg.org/#dom-request-isreloadnavigation
  get isReloadNavigation() {
    // TODO
  }

  // https://fetch.spec.whatwg.org/#dom-request-ishistorynavigation
  get isHistoryNavigation() {
    // TODO
  }

  // https://fetch.spec.whatwg.org/#dom-request-signal
  get signal() {
    // TODO
  }

  // https://fetch.spec.whatwg.org/#dom-request-clone
  clone() {

    // TODO
    if (this.distributed || this.locked) {
      throw new TypeError("TODO");
    }

    const clonedRequestObject = cloneRequest(this);
  }
}

// https://fetch.spec.whatwg.org/#concept-request-clone
function cloneRequest(request) {
  // NOOOO
  const newRequest = new RequestImpl(this._globalObject, {
    method: this.method,
    headers: this.headers,
    referrer: this.referrer,
    referrerPolicy: this.referrerPolicy,
    mode: this.mode,
    credentials: this.credentials,
    cache: this.cache,
    redirect: this.redirect,
    integrity: this.integrity,
    keepalive: this.keepalive,
    signal: this.signal,
    window: this.window
  });

  if (request.body !== null) {
    newRequest.body = cloneBody(request.body);
  }

  return newRequest;
}

module.exports = {
  implementation: RequestImpl,

  cloneRequest
};
