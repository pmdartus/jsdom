/* eslint-disable no-console, no-process-exit */

"use strict";

const path = require("path");
const fs = require("fs");
const rimraf = require("rimraf");

const Webidl2js = require("webidl2js");

const transformer = new Webidl2js({
  implSuffix: "-impl",
  suppressErrors: true,
  processCEReactions(operationIdl, body) {
    // In the case of an attribute or a standard method the object holding the reference to the impl is the this value.
    // In the case of a setter or a deleter it is the target argument passed to the proxy.
    const obj = operationIdl.setter || operationIdl.deleter ? "target" : "this";

    return `
      ${obj}[impl]._ceReactionsPreSteps();

      try {
        ${body}
      } finally {
        ${obj}[impl]._ceReactionsPostSteps();
      }
    `;
  },
  processHTMLConstructor(interfaceIdl, content) {
    const { name } = interfaceIdl;

    return content + `
      module.exports.installConstructor = function({ globalObject, HTMLConstructor }) {
        const constructorName = "${name}";

        const constructor = function() {
          const newTarget = new.target;
          return HTMLConstructor({ globalObject, newTarget, constructorName });
        };
        constructor.prototype = ${name}.prototype;

        Object.defineProperty(globalObject, constructorName, {
          enumerable: false,
          configurable: true,
          writable: true,
          value: constructor
        });
      }
    `;
  }
});

function addDir(dir) {
  const resolved = path.resolve(__dirname, dir);
  transformer.addSource(resolved, resolved);
}

addDir("../../lib/jsdom/living/aborting");
addDir("../../lib/jsdom/living/attributes");
addDir("../../lib/jsdom/living/constraint-validation");
addDir("../../lib/jsdom/living/custom-elements");
addDir("../../lib/jsdom/living/domparsing");
addDir("../../lib/jsdom/living/events");
addDir("../../lib/jsdom/living/fetch");
addDir("../../lib/jsdom/living/file-api");
addDir("../../lib/jsdom/living/hr-time");
addDir("../../lib/jsdom/living/mutation-observer");
addDir("../../lib/jsdom/living/navigator");
addDir("../../lib/jsdom/living/nodes");
addDir("../../lib/jsdom/living/svg");
addDir("../../lib/jsdom/living/traversal");
addDir("../../lib/jsdom/living/websockets");
addDir("../../lib/jsdom/living/webstorage");
addDir("../../lib/jsdom/living/window");
addDir("../../lib/jsdom/living/xhr");

const outputDir = path.resolve(__dirname, "../../lib/jsdom/living/generated/");

// Clean up any old stuff lying around.
rimraf.sync(outputDir);
fs.mkdirSync(outputDir);

transformer.generate(outputDir)
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
