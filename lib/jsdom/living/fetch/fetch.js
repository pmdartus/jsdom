"use strict";

const { fetch: netFetch } = require("../../browser/net/fetch");

const Headers = require("../generated/Headers");
const Request = require("../generated/request");
const Response = require("../generated/Response");
const RequestInit = require("../generated/RequestInit");

function install(globalObject) {
  // https://fetch.spec.whatwg.org/#dom-global-fetch
  function fetch(input, init) {
    return new globalObject.Promise((resolve, reject) => {
      let requestObject;

      try {
        requestObject = Request.createImpl(globalObject, [input, init]);
      } catch (error) {
        return reject(error);
      }

      const { request } = requestObject;

      // TODO: signal

      const responseObject = Response.createImpl(globalObject);
      responseObject.headers = Headers.createImpl(globalObject);
      responseObject.headers.guards = "immutable"; // TODO: convert to enum and/or pass it as private args

      let locallyAborted = false;

      // TODO: aborted

      return netFetch(request, {
        processResponse(response) {
          if (locallyAborted) {
            return;
          }

          if (response.aborted) {
            abortFetch();
            return;
          }

          if (response.isNetworkError) {
            reject(new TypeError("TODO"));
            return;
          }

          responseObject.response = response;
          resolve(responseObject);
        },
        processResponseDone(response) {
          // TODO: trailer
        }
      });
    });
  }

  // https://fetch.spec.whatwg.org/#abort-fetch
  function abortFetch() {

  }

  Object.defineProperty(globalObject, "fetch", {
    value: fetch,
    writable: true
  });
}

module.exports = {
  install
};
