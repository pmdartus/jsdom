"use strict";
const fs = require("fs");
const { Readable } = require("stream");

const request = require("request");
const { parseURL } = require("whatwg-url");
const dataURLFromRecord = require("data-urls").fromURLRecord;

const packageVersion = require("../../../../package.json").version;
const wrapCookieJarForRequest = require("../../living/helpers/wrap-cookie-jar-for-request");

const IS_BROWSER = Object.prototype.toString.call(process) !== "[object process]";

class Request {
  constructor({ method = "GET", url, headers = {}, body }) {
    this.method = method;
    this.url = url;
    this.headers = headers;
    this.body = body;
  }
}
class Response {
  constructor(url, headers, body) {
    this.url = url;
    this.headers = headers;
    this.body = body;
  }

  abort(err) {
    const { body } = this;
    if (body) {
      body.stream.destroy(err);
    }
  }
}

class Body {
  constructor({ stream, transmittedBytes = 0, totalBytes = 0, source = null }) {
    this.stream = stream;
    this.transmittedBytes = transmittedBytes;
    this.totalBytes = totalBytes;
    this.source = source;
  }

  get done() {
    return this.stream.readableEnded;
  }

  wait() {
    return new Promise(resolve => {
      if (this.done) {
        resolve();
      } else {
        this.stream.on("end", () => {
          return resolve();
        });
      }
    });
  }
}

module.exports = class ResourceLoader {
  constructor({
    strictSSL = true,
    proxy = undefined,
    userAgent = `Mozilla/5.0 (${process.platform || "unknown OS"}) AppleWebKit/537.36 ` +
                `(KHTML, like Gecko) jsdom/${packageVersion}`
  } = {}) {
    this._strictSSL = strictSSL;
    this._proxy = proxy;
    this._userAgent = userAgent;
  }

  _getRequestOptions({ cookieJar, referrer, accept = "*/*" }) {
    const requestOptions = {
      encoding: null,
      gzip: true,
      jar: wrapCookieJarForRequest(cookieJar),
      strictSSL: this._strictSSL,
      proxy: this._proxy,
      forever: true,
      headers: {
        "User-Agent": this._userAgent,
        "Accept-Language": "en",
        Accept: accept
      }
    };

    if (referrer && !IS_BROWSER) {
      requestOptions.headers.referer = referrer;
    }

    return requestOptions;
  }

  fetchStream(urlString, options, callback) {
    const url = parseURL(urlString);

    if (!url) {
      const err = new Error(`Tried to fetch invalid URL ${urlString}`);
      return callback(err);
    }

    switch (url.scheme) {
      case "data": {
        const buffer = dataURLFromRecord(url).body;

        const requestObj = new Request({ url: urlString });

        const stream = new Readable();
        stream.push(buffer);

        const body = new Body({ stream });
        const response = new Response(urlString, {}, body);

        return callback(null, { request: requestObj, response });
      }

      case "http":
      case "https": {
        const requestOptions = this._getRequestOptions(options);

        const requestObj = new Request({ url: urlString, headers: requestOptions.headers });

        return request(urlString, requestOptions)
          .on("error", err => callback(err))
          .on("response", res => {
            const body = new Body({ stream: res });
            const response = new Response(urlString, res.headers, body);

            return callback(null, { request: requestObj, response });
          });
      }

      case "file": {
        // TODO: Improve the URL => file algorithm. See https://github.com/jsdom/jsdom/pull/2279#discussion_r199977987
        const filePath = urlString
          .replace(/^file:\/\//, "")
          .replace(/^\/([a-z]):\//i, "$1:/")
          .replace(/%20/g, " ");

        const stream = fs.createReadStream(filePath);

        const requestObj = new Request({ url: urlString });

        const body = new Body({ stream });
        const response = new Response(urlString, {}, body);

        return callback(null, { request: requestObj, response });
      }

      default: {
        const err = new Error(`Tried to fetch URL ${urlString} with invalid scheme ${url.scheme}`);
        return callback(err);
      }
    }
  }
};
