"use strict";

const vm = require("vm");
const whatwgURL = require("whatwg-url");
const whatwgEncoding = require("whatwg-encoding");
const whatwgMIMEType = require("whatwg-mimetype");

const HTMLElementImpl = require("./HTMLElement-impl").implementation;

const { nodeRoot } = require("../helpers/node");
const { fireAnEvent } = require("../helpers/events");
const { childTextContent } = require("../helpers/text");
const { asciiLowercase } = require("../helpers/strings");
const { documentBaseURL } = require("../helpers/document-base-url");
const reportException = require("../helpers/runtime-script-errors");
const { cloningSteps } = require("../helpers/internal-constants");

const nodeTypes = require("../node-type");
const { reflectURLAttribute } = require("../../utils");

// https://mimesniff.spec.whatwg.org/#javascript-mime-type
const JS_MIME_TYPES = new Set([
  "application/ecmascript",
  "application/javascript",
  "application/x-ecmascript",
  "application/x-javascript",
  "text/ecmascript",
  "text/javascript",
  "text/javascript1.0",
  "text/javascript1.1",
  "text/javascript1.2",
  "text/javascript1.3",
  "text/javascript1.4",
  "text/javascript1.5",
  "text/jscript",
  "text/livescript",
  "text/x-ecmascript",
  "text/x-javascript"
]);

const SCRIPT_TYPE = {
  CLASSIC: "classic",
  MODULE: "module"
};

// https://html.spec.whatwg.org/#htmlscriptelement
class HTMLScriptElementImpl extends HTMLElementImpl {
  constructor(globalObject, args, privateData) {
    super(globalObject, args, privateData);

    // https://html.spec.whatwg.org/#script-processing-model
    this._alreadyStarted = false;
    this._parserInserted = false;
    this._nonBlocking = true;
    this._readyToBeParserExecuted = false;
    this._scriptType = null;
    this._fromExternalFile = null;
    this._scriptScript = null;
  }

  // https://html.spec.whatwg.org/#dom-script-text
  get text() {
    return childTextContent(this);
  }
  set text(text) {
    this.textContent = text;
  }

  // https://html.spec.whatwg.org/#dom-script-text
  get src() {
    return reflectURLAttribute(this, "src");
  }
  set src(V) {
    const wasSrcPreviouslySet = this.hasAttributeNS(null, "src");

    this.setAttributeNS(null, "src", V);

    // https://html.spec.whatwg.org/#script-processing-model:connected
    if (!this._parserInserted && !wasSrcPreviouslySet && this.isConnected) {
      this._prepareScript();
    }
  }

  // https://html.spec.whatwg.org/#script-processing-model:concept-node-clone-ext
  [cloningSteps](copy, node) {
    copy._alreadyStarted = node._alreadyStarted;
  }

  _insertionSteps() {
    super._insertionSteps();

    // https://html.spec.whatwg.org/#script-processing-model:becomes-connected
    if (!this._parserInserted && this.isConnected) {
      this._prepareScript();
    }
  }

  _poppedOffStackOfOpenElements() {
    // Rough approximation of
    // https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-incdata:prepare-a-script
    this._prepareScript();
  }

  _isScriptDisabled() {
    const { _ownerDocument } = this;

    // Equivalent to the spec's "scripting is disabled" check.
    return (
      !_ownerDocument._defaultView ||
      _ownerDocument._defaultView._runScripts !== "dangerously" ||
      _ownerDocument._scriptingDisabled
    );
  }

  // https://html.spec.whatwg.org/#prepare-a-script
  _prepareScript() {
    const { _ownerDocument } = this;
    // eslint-disable-next-line
    let scriptReadyStep = () => {};

    if (this._alreadyStarted) {
      return;
    }

    let wasParserInserted = false;
    if (this._parserInserted) {
      wasParserInserted = true;
      this._parserInserted = false;
    }

    if (wasParserInserted && !this.hasAttributeNS(null, "async")) {
      this._nonBlocking = true;
    }

    const sourceText = childTextContent(this);

    if (!this.hasAttributeNS(null, "src") && sourceText === "") {
      return;
    }

    if (!this.isConnected) {
      return;
    }

    let scriptBlockTypeString;
    if (
      (this.hasAttributeNS(null, "type") && this.getAttributeNS(null, "type") === "") ||
      (!this.hasAttributeNS(null, "type") && this.hasAttributeNS(null, "language") &&
        this.getAttributeNS(null, "language") === "") ||
      (!this.hasAttributeNS(null, "type") && !this.hasAttributeNS(null, "language"))
    ) {
      scriptBlockTypeString = "text/javascript";
    } else if (this.hasAttributeNS(null, "type")) {
      scriptBlockTypeString = this.getAttributeNS(null, "type").trim();
    } else {
      scriptBlockTypeString = `text/${this.getAttributeNS(null, "language")}`;
    }

    if (JS_MIME_TYPES.has(scriptBlockTypeString)) {
      this._scriptType = SCRIPT_TYPE.CLASSIC;
    } else if (asciiLowercase(scriptBlockTypeString) === "module") {
      this._scriptType = SCRIPT_TYPE.MODULE;
    } else {
      return;
    }

    if (wasParserInserted) {
      this._parserInserted = true;
      this._nonBlocking = false;
    }

    this._alreadyStarted = true;

    // TODO: Step. 10
    // If the element is flagged as "parser-inserted", but the element's node document is not the Document of the parser
    // that created the element, then return.

    if (this._isScriptDisabled()) {
      return;
    }

    // TODO: no-module and CSP

    if (this.hasAttributeNS(null, "event") && this.hasAttributeNS(null, "for") &&
      this._scriptType === SCRIPT_TYPE.CLASSIC) {
      const forValue = asciiLowercase(this.getAttributeNS(null, "for").trim());
      const eventValue = asciiLowercase(this.getAttributeNS(null, "value").trim());

      if (forValue === "window") {
        return;
      }

      if (eventValue === "onload" || eventValue === "onload()") {
        return;
      }
    }

    let encoding;
    if (this.hasAttributeNS(null, "charset")) {
      whatwgEncoding.labelToName(this.getAttributeNS(null, "charset"));
    }
    if (!encoding) {
      encoding = _ownerDocument._encoding;
    }

    // TODO: CORS, integrity, referrerpolicy

    const parserMetadata = this._parserInserted ? "parser-inserted" : "not-parser-inserted";

    const options = {
      parserMetadata
    };

    // https://html.spec.whatwg.org/#environment-settings-object
    // TODO: Associate this object with the window object as defined in: https://html.spec.whatwg.org/#set-up-a-window-environment-settings-object
    const settings = {
      realm: this._globalObject,
      responsibleDocument: _ownerDocument,
      apiBaseUrl: documentBaseURL(_ownerDocument)
    };

    if (this.hasAttributeNS(null, "src")) {
      const src = this.getAttributeNS(null, "src");

      if (src === "") {
        throw new Error("TODO");
      }

      this._fromExternalFile = true;

      let url;
      try {
        url = whatwgURL.parseURL(src, { baseURL: documentBaseURL(_ownerDocument) });
      } catch (error) {
        throw new Error("TODO");
      }

      let fetchMethod;
      if (this._scriptType === SCRIPT_TYPE.CLASSIC) {
        fetchMethod = fetchClassicScript(settings, url, options, encoding);
      } else {
        fetchMethod = fetchExternalModuleScriptGraph(url, options);
      }

      fetchMethod.then(script => {
        this._scriptScript = script;
        scriptReadyStep();
      });
    } else {
      const baseUrl = documentBaseURL(_ownerDocument);

      if (this._scriptType === SCRIPT_TYPE.CLASSIC) {
        const script = createClassicScript(sourceText, settings, baseUrl, options);
        this._scriptScript = script;
        scriptReadyStep();
      } else {
        fetchInlineModuleScriptGraph(sourceText, baseUrl, options).then(script => {
          this._scriptScript = script;
          scriptReadyStep();
        });
      }
    }

    if (
      (
        this._scriptType === SCRIPT_TYPE.CLASSIC && this.hasAttributeNS(null, "src") &&
        this.hasAttributeNS(null, "defer") && this._parserInserted && !this.hasAttributeNS(null, "async")
      ) || (
        this._scriptType === SCRIPT_TYPE.MODULE && this._parserInserted && !this.hasAttributeNS(null, "async")
      )
    ) {
      _ownerDocument._scriptsToExecuteWhenDocumentParsingFinished.push(this);
      scriptReadyStep = () => {
        this._readyToBeParserExecuted = true;
      };
    } else if (
      this._scriptType === SCRIPT_TYPE.CLASSIC && this.hasAttributeNS(null, "src") && this._parserInserted &&
      !this.hasAttributeNS(null, "async")
    ) {
      _ownerDocument._pendingParsingBlockingScript = this;
      scriptReadyStep = () => {
        this._readyToBeParserExecuted = true;
      };
    } else if (
      (
        this._scriptType === SCRIPT_TYPE.CLASSIC && this.hasAttributeNS(null, "src") &&
        !this.hasAttributeNS(null, "async") && !this._nonBlocking
      ) || (
        this._scriptType === SCRIPT_TYPE.MODULE && !this.hasAttributeNS(null, "async") && !this._nonBlocking
      )
    ) {
      _ownerDocument._scriptsThatWillExecuteInOrderASAP.push(this);
      scriptReadyStep = () => {
        // TODO
      };
    } else if (
      (this._scriptType === SCRIPT_TYPE.CLASSIC && this.hasAttributeNS(null, "src")) ||
      this._scriptType === SCRIPT_TYPE.MODULE
    ) {
      _ownerDocument._scriptsThatWillExecuteASAP.add(this);
      scriptReadyStep = () => {
        this._executeScriptBlock();
        _ownerDocument._scriptsThatWillExecuteASAP.remove(this);
      };
    } else if (
      !this.hasAttributeNS(null, "src") && this._parserInserted && true /* TODO */
    ) {
      _ownerDocument._pendingParsingBlockingScript = this;
      scriptReadyStep = () => {
        this._readyToBeParserExecuted = true;
      };
    } else {
      this._executeScriptBlock();
    }

    // Invoke the scriptReadyStep if the script was already ready before the scriptReadyStep was set. This is the case
    // when preparing an inline classic script.
    if (this._scriptScript) {
      scriptReadyStep();
    }
  }

  // https://html.spec.whatwg.org/#execute-the-script-block
  _executeScriptBlock() {
    // TODO 1.

    if (!this._scriptScript) {
      fireAnEvent("error", this);
      return;
    }

    if (this._scriptType === SCRIPT_TYPE.CLASSIC) {
      const oldScriptElement = this._ownerDocument._currentScript;

      this._ownerDocument._currentScript = nodeRoot(this).nodeType !== nodeTypes.DOCUMENT_FRAGMENT_NODE ? this : null;
      runClassicScript(this._scriptScript);

      this._ownerDocument._currentScript = oldScriptElement;
    } else {
      // TODO: Assert
      runModuleScript(this._scriptScript);
    }

    if (this._fromExternalFile) {
      fireAnEvent("load", this);
    }
  }
}

// https://html.spec.whatwg.org/#fetch-a-classic-script
function fetchClassicScript(settings, url, options, characterEncoding) {
  return new Promise(resolve => {
    const serializedUrl = whatwgURL.serializeURL(url);
    const request = settings.responsibleDocument._resourceLoader.fetch(serializedUrl, {
      // element: this,
      onLoad(data) {
        const { response } = request;

        if (response && response.statusCode !== undefined && response.statusCode >= 400) {
          return resolve();
        }

        if (response && response.headers["content-type"]) {
          const parsedContentType = whatwgMIMEType.parse(response.headers["content-type"]);

          if (parsedContentType && parsedContentType.parameters.has("charset")) {
            characterEncoding = whatwgEncoding.labelToName(parsedContentType.parameters.get("charset"));
          }
        }

        // TODO: BOM

        const sourceText = whatwgEncoding.decode(data, characterEncoding);

        // TODO: CORS

        const script = createClassicScript(sourceText, settings, url, options);
        return resolve(script);
      }
    });
  });
}

// https://html.spec.whatwg.org/#fetch-an-inline-module-script-graph
function fetchInlineModuleScriptGraph() {
  throw new Error("Not implemented");
}

// https://html.spec.whatwg.org/#fetch-a-module-script-tree
function fetchExternalModuleScriptGraph() {
  throw new Error("Not implemented");
}

// https://html.spec.whatwg.org/#creating-a-classic-script
function createClassicScript(source, settings, baseURL, options, mutedError = false) {
  // TODO: scripting disabled

  const script = {
    baseURL,
    settings,
    fetchOptions: options,
    mutedError,
    record: null,
    parseError: null,
    errorToRethrow: null
  };

  try {
    script.record = new vm.Script(source, {
      filename: whatwgURL.serializeURL(baseURL),
      lineOffset: 0 // TODO
    });
  } catch (error) {
    script.parseError = error;
    script.errorToRethrow = error;
  }

  return script;
}

// https://html.spec.whatwg.org/#run-a-classic-script
function runClassicScript(script, rethrowError = false) {
  const { record, settings } = script;

  if (!settings.responsibleDocument._defaultView || settings.responsibleDocument._scriptingDisabled) {
    return;
  }

  let evaluationStatus = null;

  if (script.errorToRethrow) {
    evaluationStatus = script.errorToRethrow;
  }

  try {
    record.runInContext(settings.realm);
  } catch (error) {
    evaluationStatus = error;
  }

  if (evaluationStatus !== null) {
    if (rethrowError && !script.mutedError) {
      throw evaluationStatus;
    } else if (rethrowError && script.mutedError) {
      throw new Error("TODO");
    } else {
      reportException(settings.realm, evaluationStatus);
    }
  }
}

// https://html.spec.whatwg.org/#run-a-module-script
function runModuleScript(script, rethrowError = false) {
  throw new Error("Not implemented");
}

module.exports = {
  implementation: HTMLScriptElementImpl
};
