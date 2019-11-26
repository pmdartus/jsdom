"use strict";

function serializeRequestOrigin() {
  // TODO
}

// https://fetch.spec.whatwg.org/#concept-cors-check
function checkCORS(request, response) {
  // TODO
}

// https://fetch.spec.whatwg.org/#redirect-status
function isRedirectStatus() {
  // TODO
}

// https://fetch.spec.whatwg.org/#concept-cache
class CorsCache {
  constructor() {
    this.cache = [];
  }

  // https://fetch.spec.whatwg.org/#concept-cache-create-entry
  addCorsPreflightCacheEntry(request, maxAge, method, headerName) {
    this.cache.push({
      serializedOrigin: serializeRequestOrigin(request),
      url: request.currentUrl,
      maxAge,
      credentials: request.credentialsMode === "include",
      method,
      headerName
    });
  }

  // https://fetch.spec.whatwg.org/#concept-cache-clear
  clearCacheEntries(request) {
    // TODO
    this.cache = this.cache.filter(entry => {});
  }

  _cleanup() {
    // TODO
  }
}

module.exports = {
  CorsCache
};
