"use strict";

const xmlParser = require("./xml");
const htmlParser = require("./html");

// https://w3c.github.io/DOM-Parsing/#dfn-fragment-parsing-algorithm
function parseFragment(markup, contextElement) {
  const { _parsingMode } = contextElement._ownerDocument;

  let parseAlgorithm;
  if (_parsingMode === "html") {
    parseAlgorithm = htmlParser.parseFragment;
  } else if (_parsingMode === "xml") {
    parseAlgorithm = xmlParser.parseFragment;
  }

  // Note: HTML and XML fragment parsing algorithm already return a document fragments; no need to do steps 3 and 4
  return parseAlgorithm(markup, contextElement);
}

function parseIntoDocument(markup, ownerDocument) {
  const { _parsingMode } = ownerDocument;

  let parseAlgorithm;
  if (_parsingMode === "html") {
    parseAlgorithm = htmlParser.parseIntoDocument;
  } else if (_parsingMode === "xml") {
    parseAlgorithm = xmlParser.parseIntoDocument;
  }

  const document = parseAlgorithm(markup, ownerDocument);

  theEnd(document);

  return document;
}

// https://html.spec.whatwg.org/#stop-parsing
async function theEnd(document) {
  await exhaustScriptsWhenFinishParsing(document);

  for (const script of document._scriptsThatWillExecuteASAP.values()) {
    script._executeScriptBlock();
  }
}

// https://html.spec.whatwg.org/#stop-parsing
// Step 3.
function exhaustScriptsWhenFinishParsing(document) {
  return new Promise(resolve => {
    if (document._scriptsToExecuteWhenDocumentParsingFinished.length === 0) {
      return resolve();
    }

    const [script, ...remainingScripts] = document._scriptsToExecuteWhenDocumentParsingFinished;

    if (!script._readyToBeParserExecuted) {
      setTimeout(() => {
        return resolve(exhaustScriptsWhenFinishParsing(document));
      });
    }

    script._executeScriptBlock();

    document._scriptsToExecuteWhenDocumentParsingFinished = remainingScripts;
    return exhaustScriptsWhenFinishParsing();
  });
}

module.exports = {
  parseFragment,
  parseIntoDocument
};
