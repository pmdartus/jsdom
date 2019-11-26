"use strict";

const http = require('http');
const https = require('https');
const { URL } = require("whatwg-url");

const HeaderList = require("./header-list");
const { Response } = require("./response");
const { REQUEST_DESTINATION, REQUEST_ORIGIN } = require("./request");


// https://fetch.spec.whatwg.org/#append-a-request-origin-header
function appendRequestOriginHeader(request) {
  // TODO
}

// https://fetch.spec.whatwg.org/#concept-fetch
// TODO: handle abort
function fetch(request) {
  // TODO: Step 1.1.

  if (request.origin === REQUEST_ORIGIN.CLIENT) {
    request.client.origin = request.origin;
  }

  if (!request.headerList.contains("Accept")) {
    let value = "*/*";

    // TODO: Step 1.3.2.

    if (request.destination === REQUEST_DESTINATION.IMAGE) {
      value = "image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5";
    } else if (request.destination === REQUEST_DESTINATION.STYLE) {
      value = "text/css,*/*;q=0.1";
    }

    request.headerList.append(value);
  }

  if (!request.headerList.contains("Accept-Language")) {
    // TODO: allow parameterization for the UA default language
    request.headerList.append("Accept-Language", "en-US");
  }

  // TODO: Step 1.6.

  // TODO: Step 2. - Abort

  return mainFetch(request);
}

// https://fetch.spec.whatwg.org/#concept-main-fetch
function mainFetch(request) {
  let response = null;

  // Skip step 2.

  // TODO
  const { synchronous } = request;

  if (
    (request.currentUrl.origin === request.origin && request.responseTainting === "basic") ||
    (request.currentUrl.scheme === "data") ||
    (request.currentUrl.mode === "navigate" || request.currentUrl.mode === "websocket")
  ) {
    request.responseTainting = "basic";
    return schemeFetch(request);
  }
}

// https://fetch.spec.whatwg.org/#concept-scheme-fetch
function schemeFetch(request) {
  switch (request.currentUrl.scheme) {
    case "about": {
      // TODO: Handle request current URL’s cannot-be-a-base-URL flag.

      if (request.path === "blank") {
        const headerList = new HeaderList({
          "Content-Type": "text/html;charset=utf-8"
        });

        let httpsState;
        if (request.client) {
          httpsState = request.client.httpsState;
        }

        return new Response({
          statusMessage: "OK",
          headerList,
          body: new Body(),
          httpsState
        });
      }

      return Response.createNetworkError();
    }

    case "blob":
    case "data":
    case "file":
      return Response.createNetworkError();

    case "http":
    case "https":
      return httpFetch(request);

    case "ftp":
      return Response.createNetworkError();

    default:
      return Response.createNetworkError();
  }
}

// https://fetch.spec.whatwg.org/#concept-http-fetch
function httpFetch(request, corsPreflight) {
  let response = null;
  let actualResponse = null;

  // Skip step 3. TODO: service worker

  if (corsPreflight) {
    // TODO
  }

  response = actualResponse = httpNetworkOrCacheFetch(request);

  if (request.responseTainting === "cors" && !checkCORS(request, response)) {
    return Response.createNetworkError();
  }

  if (isRedirectStatus(actualResponse.status)) {
    // TODO
  }

  return response;
}

// https://fetch.spec.whatwg.org/#concept-http-network-or-cache-fetch
function httpNetworkOrCacheFetch(request, authenticationFetch) {
  let httpRequest = null;
  let response = null;
  let storedResponse = null;
  let isRevalidating = false;

  if (request.window === "no-window" && request.redirectMode === "error") {
    httpRequest = request;
  } else {
    httpRequest = request.clone();

    const { body } = request;
    httpRequest.body = body;

    // TODO: Understand this code, it's WTF
    if (body !== null) {
      request.body = new Body();
    }
  }

  const hasCredentials =
    request.credentialsMode === "include" ||
    (request.credentialsMode === "same-origin" && request.responseTainting === "basic");

  let contentLengthValue = null;

  if (httpRequest.body === null && (httpRequest.method === "GET" || httpRequest.method === "POST")) {
    contentLengthValue = "0";
  } else if (httpRequest.body !== null && httpRequest.body.source !== null) {
    contentLengthValue = String(httpRequest.body.totalBytes);
  }

  if (contentLengthValue !== null) {
    httpRequest.headerList.append("Content-Length", contentLengthValue);
  }

  if (contentLengthValue !== null && httpRequest.keepAlive) {
    // TODO: Step 8.
  }

  if (httpRequest.referer instanceof URL) {
    httpRequest.headerList.append("Referer", String(httpRequest.referer));
  }

  appendRequestOriginHeader(request);

  if (httpRequest.headerList.contains("User-Agent")) {
    // TODO: Step 11.
  }

  if (
    httpRequest.cacheMode === "default" && (
      httpRequest.headerList.contains("If-Modified-Since") ||
      httpRequest.headerList.contains("If-None-Match") ||
      httpRequest.headerList.contains("If-Unmodified-Since") ||
      httpRequest.headerList.contains("If-Match") ||
      httpRequest.headerList.contains("If-Range")
    )
  ) {
    httpRequest.cacheMode = "no-store";
  }

  if (httpRequest.cacheMode === "no-cache") {
    // TODO: Step 13.
  }

  if (httpRequest.cacheMode === "no-store" || httpRequest.cacheMode === "reload") {
    if (!httpRequest.headerList.contains("Pragma")) {
      httpRequest.headerList.append("Pragma", "no-cache");
    }
    if (!httpRequest.headerList.contains("Cache-Control")) {
      httpRequest.headerList.append("Cache-Control", "no-cache");
    }
  }

  if (httpRequest.headerList.contains("Range")) {
    httpRequest.headerList.append("Accept-Encoding", "identity");
  }

  // TODO: Step 16.

  if (hasCredentials) {
    // TODO: Step 17.1.

    if (!httpRequest.headerList.contains("Authorization")) {
      // TODO: Step 17.2.
    }
  }

  // TODO: Step 18.

  if (httpRequest.cacheMode === "no-store" && httpRequest.cacheMode === "reload") {
    // TODO: Step 19.
  }

  if (response === null) {
    if (httpRequest.cacheMode === "only-if-cached") {
      return Response.createNetworkError();
    }

    const forwardResponse = httpNetworkFetch(request, hasCredentials);

    // TODO
  }

  // TODO
}

// https://fetch.spec.whatwg.org/#concept-http-network-fetch
function httpNetworkFetch(request, hasCredentials) {
  let response = null;

  http.request({

  })
}

module.exports = {
  fetch
};
