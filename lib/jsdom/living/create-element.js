/* eslint global-require: 0 */

"use strict";

const DOMException = require("domexception");

const { HTML_NS, SVG_NS } = require("./helpers/namespaces");
const reportException = require("./helpers/runtime-script-errors");
const { validateAndExtract } = require("./helpers/validate-names");
const { domSymbolTree } = require("./helpers/internal-constants");
const {
  CUSTOM_ELEMENT_STATE,
  isValidCustomElementName,
  upgradeElement,
  lookupCEDefinition,
  enqueueCEUpgradeReaction
} = require("./helpers/custom-elements");

const { implForWrapper } = require("./generated/utils");

// Lazy require Elements interfaces to avoid running into circular dependencies issues.
function interfaceLoader(path) {
  return {
    get interface() {
      const resolvedInterface = require(path);

      // Once the interface is resolved replace the getter replace itself with the resolved value.
      Object.defineProperty(this, "interface", {
        value: resolvedInterface,
        enumerable: true
      });

      return resolvedInterface;
    }
  };
}

const Element = interfaceLoader("./generated/Element");
const HTMLElement = interfaceLoader("./generated/HTMLElement");
const HTMLUnknownElement = interfaceLoader("./generated/HTMLUnknownElement");
const SVGElement = interfaceLoader("./generated/SVGElement");

// TODO: Evaluate a better data structure to resolve the interfaces.
const INTERFACE_TAG_MAPPING = {
  // https://html.spec.whatwg.org/multipage/dom.html#elements-in-the-dom%3Aelement-interface
  // https://html.spec.whatwg.org/multipage/indices.html#elements-3
  [HTML_NS]: {
    HTMLElement: {
      file: interfaceLoader("./generated/HTMLElement.js"),
      tags: [
        "abbr",
        "address",
        "article",
        "aside",
        "b",
        "bdi",
        "bdo",
        "cite",
        "code",
        "dd",
        "dfn",
        "dt",
        "em",
        "figcaption",
        "figure",
        "footer",
        "header",
        "hgroup",
        "i",
        "kbd",
        "main",
        "mark",
        "nav",
        "noscript",
        "rp",
        "rt",
        "ruby",
        "s",
        "samp",
        "section",
        "small",
        "strong",
        "sub",
        "summary",
        "sup",
        "u",
        "var",
        "wbr"
      ]
    },
    HTMLAnchorElement: {
      file: interfaceLoader("./generated/HTMLAnchorElement.js"),
      tags: ["a"]
    },
    HTMLAreaElement: {
      file: interfaceLoader("./generated/HTMLAreaElement.js"),
      tags: ["area"]
    },
    HTMLAudioElement: {
      file: interfaceLoader("./generated/HTMLAudioElement.js"),
      tags: ["audio"]
    },
    HTMLBaseElement: {
      file: interfaceLoader("./generated/HTMLBaseElement.js"),
      tags: ["base"]
    },
    HTMLBodyElement: {
      file: interfaceLoader("./generated/HTMLBodyElement.js"),
      tags: ["body"]
    },
    HTMLBRElement: {
      file: interfaceLoader("./generated/HTMLBRElement.js"),
      tags: ["br"]
    },
    HTMLButtonElement: {
      file: interfaceLoader("./generated/HTMLButtonElement.js"),
      tags: ["button"]
    },
    HTMLCanvasElement: {
      file: interfaceLoader("./generated/HTMLCanvasElement.js"),
      tags: ["canvas"]
    },
    HTMLDataElement: {
      file: interfaceLoader("./generated/HTMLDataElement.js"),
      tags: ["data"]
    },
    HTMLDataListElement: {
      file: interfaceLoader("./generated/HTMLDataListElement.js"),
      tags: ["datalist"]
    },
    HTMLDetailsElement: {
      file: interfaceLoader("./generated/HTMLDetailsElement.js"),
      tags: ["details"]
    },
    HTMLDialogElement: {
      file: interfaceLoader("./generated/HTMLDialogElement.js"),
      tags: ["dialog"]
    },
    HTMLDirectoryElement: {
      file: interfaceLoader("./generated/HTMLDirectoryElement.js"),
      tags: ["dir"]
    },
    HTMLDivElement: {
      file: interfaceLoader("./generated/HTMLDivElement.js"),
      tags: ["div"]
    },
    HTMLDListElement: {
      file: interfaceLoader("./generated/HTMLDListElement.js"),
      tags: ["dl"]
    },
    HTMLEmbedElement: {
      file: interfaceLoader("./generated/HTMLEmbedElement.js"),
      tags: ["embed"]
    },
    HTMLFieldSetElement: {
      file: interfaceLoader("./generated/HTMLFieldSetElement.js"),
      tags: ["fieldset"]
    },
    HTMLFontElement: {
      file: interfaceLoader("./generated/HTMLFontElement.js"),
      tags: ["font"]
    },
    HTMLFormElement: {
      file: interfaceLoader("./generated/HTMLFormElement.js"),
      tags: ["form"]
    },
    HTMLFrameElement: {
      file: interfaceLoader("./generated/HTMLFrameElement.js"),
      tags: ["frame"]
    },
    HTMLFrameSetElement: {
      file: interfaceLoader("./generated/HTMLFrameSetElement.js"),
      tags: ["frameset"]
    },
    HTMLHeadingElement: {
      file: interfaceLoader("./generated/HTMLHeadingElement.js"),
      tags: ["h1", "h2", "h3", "h4", "h5", "h6"]
    },
    HTMLHeadElement: {
      file: interfaceLoader("./generated/HTMLHeadElement.js"),
      tags: ["head"]
    },
    HTMLHRElement: {
      file: interfaceLoader("./generated/HTMLHRElement.js"),
      tags: ["hr"]
    },
    HTMLHtmlElement: {
      file: interfaceLoader("./generated/HTMLHtmlElement.js"),
      tags: ["html"]
    },
    HTMLIFrameElement: {
      file: interfaceLoader("./generated/HTMLIFrameElement.js"),
      tags: ["iframe"]
    },
    HTMLImageElement: {
      file: interfaceLoader("./generated/HTMLImageElement.js"),
      tags: ["img"]
    },
    HTMLInputElement: {
      file: interfaceLoader("./generated/HTMLInputElement.js"),
      tags: ["input"]
    },
    HTMLLabelElement: {
      file: interfaceLoader("./generated/HTMLLabelElement.js"),
      tags: ["label"]
    },
    HTMLLegendElement: {
      file: interfaceLoader("./generated/HTMLLegendElement.js"),
      tags: ["legend"]
    },
    HTMLLIElement: {
      file: interfaceLoader("./generated/HTMLLIElement.js"),
      tags: ["li"]
    },
    HTMLLinkElement: {
      file: interfaceLoader("./generated/HTMLLinkElement.js"),
      tags: ["link"]
    },
    HTMLMapElement: {
      file: interfaceLoader("./generated/HTMLMapElement.js"),
      tags: ["map"]
    },
    HTMLMarqueeElement: {
      file: interfaceLoader("./generated/HTMLMarqueeElement.js"),
      tags: ["marquee"]
    },
    HTMLMediaElement: {
      file: interfaceLoader("./generated/HTMLMediaElement.js"),
      tags: []
    },
    HTMLMenuElement: {
      file: interfaceLoader("./generated/HTMLMenuElement.js"),
      tags: ["menu"]
    },
    HTMLMetaElement: {
      file: interfaceLoader("./generated/HTMLMetaElement.js"),
      tags: ["meta"]
    },
    HTMLMeterElement: {
      file: interfaceLoader("./generated/HTMLMeterElement.js"),
      tags: ["meter"]
    },
    HTMLModElement: {
      file: interfaceLoader("./generated/HTMLModElement.js"),
      tags: ["del", "ins"]
    },
    HTMLObjectElement: {
      file: interfaceLoader("./generated/HTMLObjectElement.js"),
      tags: ["object"]
    },
    HTMLOListElement: {
      file: interfaceLoader("./generated/HTMLOListElement.js"),
      tags: ["ol"]
    },
    HTMLOptGroupElement: {
      file: interfaceLoader("./generated/HTMLOptGroupElement.js"),
      tags: ["optgroup"]
    },
    HTMLOptionElement: {
      file: interfaceLoader("./generated/HTMLOptionElement.js"),
      tags: ["option"]
    },
    HTMLOutputElement: {
      file: interfaceLoader("./generated/HTMLOutputElement.js"),
      tags: ["output"]
    },
    HTMLParagraphElement: {
      file: interfaceLoader("./generated/HTMLParagraphElement.js"),
      tags: ["p"]
    },
    HTMLParamElement: {
      file: interfaceLoader("./generated/HTMLParamElement.js"),
      tags: ["param"]
    },
    HTMLPictureElement: {
      file: interfaceLoader("./generated/HTMLPictureElement.js"),
      tags: ["picture"]
    },
    HTMLPreElement: {
      file: interfaceLoader("./generated/HTMLPreElement.js"),
      tags: ["listing", "pre", "xmp"]
    },
    HTMLProgressElement: {
      file: interfaceLoader("./generated/HTMLProgressElement.js"),
      tags: ["progress"]
    },
    HTMLQuoteElement: {
      file: interfaceLoader("./generated/HTMLQuoteElement.js"),
      tags: ["blockquote", "q"]
    },
    HTMLScriptElement: {
      file: interfaceLoader("./generated/HTMLScriptElement.js"),
      tags: ["script"]
    },
    HTMLSelectElement: {
      file: interfaceLoader("./generated/HTMLSelectElement.js"),
      tags: ["select"]
    },
    HTMLSlotElement: {
      file: interfaceLoader("./generated/HTMLSlotElement.js"),
      tags: ["slot"]
    },
    HTMLSourceElement: {
      file: interfaceLoader("./generated/HTMLSourceElement.js"),
      tags: ["source"]
    },
    HTMLSpanElement: {
      file: interfaceLoader("./generated/HTMLSpanElement.js"),
      tags: ["span"]
    },
    HTMLStyleElement: {
      file: interfaceLoader("./generated/HTMLStyleElement.js"),
      tags: ["style"]
    },
    HTMLTableCaptionElement: {
      file: interfaceLoader("./generated/HTMLTableCaptionElement.js"),
      tags: ["caption"]
    },
    HTMLTableCellElement: {
      file: interfaceLoader("./generated/HTMLTableCellElement.js"),
      tags: ["th", "td"]
    },
    HTMLTableColElement: {
      file: interfaceLoader("./generated/HTMLTableColElement.js"),
      tags: ["col", "colgroup"]
    },
    HTMLTableElement: {
      file: interfaceLoader("./generated/HTMLTableElement.js"),
      tags: ["table"]
    },
    HTMLTimeElement: {
      file: interfaceLoader("./generated/HTMLTimeElement.js"),
      tags: ["time"]
    },
    HTMLTitleElement: {
      file: interfaceLoader("./generated/HTMLTitleElement.js"),
      tags: ["title"]
    },
    HTMLTableRowElement: {
      file: interfaceLoader("./generated/HTMLTableRowElement.js"),
      tags: ["tr"]
    },
    HTMLTableSectionElement: {
      file: interfaceLoader("./generated/HTMLTableSectionElement.js"),
      tags: ["thead", "tbody", "tfoot"]
    },
    HTMLTemplateElement: {
      file: interfaceLoader("./generated/HTMLTemplateElement.js"),
      tags: ["template"]
    },
    HTMLTextAreaElement: {
      file: interfaceLoader("./generated/HTMLTextAreaElement.js"),
      tags: ["textarea"]
    },
    HTMLTrackElement: {
      file: interfaceLoader("./generated/HTMLTrackElement.js"),
      tags: ["track"]
    },
    HTMLUListElement: {
      file: interfaceLoader("./generated/HTMLUListElement.js"),
      tags: ["ul"]
    },
    HTMLUnknownElement: {
      file: interfaceLoader("./generated/HTMLUnknownElement.js"),
      tags: []
    },
    HTMLVideoElement: {
      file: interfaceLoader("./generated/HTMLVideoElement.js"),
      tags: ["video"]
    }
  },
  [SVG_NS]: {
    SVGElement: {
      file: interfaceLoader("./generated/SVGElement.js"),
      tags: []
    },
    SVGGraphicsElement: {
      file: interfaceLoader("./generated/SVGGraphicsElement.js"),
      tags: []
    },
    SVGSVGElement: {
      file: interfaceLoader("./generated/SVGSVGElement.js"),
      tags: ["svg"]
    },
    SVGTitleElement: {
      file: interfaceLoader("./generated/SVGTitleElement.js"),
      tags: ["title"]
    }
  }
};

const UNKNOWN_HTML_ELEMENTS_NAMES = ["applet", "bgsound", "blink", "isindex", "keygen", "multicol", "nextid", "spacer"];
const HTML_ELEMENTS_NAMES = [
  "acronym", "basefont", "big", "center", "nobr", "noembed", "noframes", "plaintext", "rb", "rtc",
  "strike", "tt"
];

const TAG_INTERFACE_LOOKUP = {};

for (const ns of [HTML_NS, SVG_NS]) {
  const interfaceNames = Object.keys(INTERFACE_TAG_MAPPING[ns]);
  const tagInterfaceLookup = {};

  for (const interfaceName of interfaceNames) {
    const { file, tags } = INTERFACE_TAG_MAPPING[ns][interfaceName];

    for (const tag of tags) {
      tagInterfaceLookup[tag] = file;
    }
  }

  TAG_INTERFACE_LOOKUP[ns] = tagInterfaceLookup;
}

// https://html.spec.whatwg.org/multipage/dom.html#elements-in-the-dom:element-interface
function getHTMLElementInterface(name) {
  if (UNKNOWN_HTML_ELEMENTS_NAMES.includes(name)) {
    return HTMLUnknownElement;
  }

  if (HTML_ELEMENTS_NAMES.includes(name)) {
    return HTMLElement;
  }

  const specDefinedInterface = TAG_INTERFACE_LOOKUP[HTML_NS][name];
  if (specDefinedInterface !== undefined) {
    return specDefinedInterface;
  }

  if (isValidCustomElementName(name)) {
    return HTMLElement;
  }

  return HTMLUnknownElement;
}

function getSVGInterface(name) {
  const specDefinedInterface = TAG_INTERFACE_LOOKUP[SVG_NS][name];
  if (specDefinedInterface !== undefined) {
    return specDefinedInterface;
  }

  return SVGElement;
}

// https://dom.spec.whatwg.org/#concept-create-element
function createElement(documentImpl, localName, namespace, prefix = null, isValue = null, synchronousCE = false) {
  let result = null;

  const definition = lookupCEDefinition(documentImpl, namespace, localName, isValue);

  if (definition !== null && definition.name !== localName) {
    const elementInterface = getHTMLElementInterface(localName);

    result = elementInterface.interface.createImpl([], {
      ownerDocument: documentImpl,
      localName,
      namespace: HTML_NS,
      prefix,
      ceState: CUSTOM_ELEMENT_STATE.UNCUSTOMIZED,
      ceDefinition: null,
      isValue
    });

    if (synchronousCE) {
      upgradeElement(definition, result);
    } else {
      enqueueCEUpgradeReaction(result, definition);
    }
  } else if (definition !== null) {
    if (synchronousCE) {
      try {
        const C = definition.ctor;

        const resultWrapper = new C();
        result = implForWrapper(resultWrapper);

        // TODO: check if implements HTMLElement

        if (result._attributeList.length !== 0) {
          throw new DOMException("Unexpected attributes.", "NotSupportedError");
        }
        if (domSymbolTree.hasChildren(result)) {
          throw new DOMException("Unexpected child nodes.", "NotSupportedError");
        }
        if (domSymbolTree.parent(result)) {
          throw new DOMException("Unexpected element parent.", "NotSupportedError");
        }
        if (result._ownerDocument !== documentImpl) {
          throw new DOMException("Unexpected element owner document.", "NotSupportedError");
        }
        if (result._namespaceURI !== namespace) {
          throw new DOMException("Unexpected element namespace URI.", "NotSupportedError");
        }
        if (result._localName !== localName) {
          throw new DOMException("Unexpected element local name.", "NotSupportedError");
        }

        result._prefix = prefix;
        result._isValue = isValue;
      } catch (error) {
        reportException(documentImpl._defaultView, error);

        result = HTMLUnknownElement.interface.createImpl([], {
          ownerDocument: documentImpl,
          localName,
          namespace: HTML_NS,
          prefix,
          ceState: CUSTOM_ELEMENT_STATE.FAILED,
          ceDefinition: null,
          isValue: null
        });
      }
    } else {
      result = HTMLElement.interface.createImpl([], {
        ownerDocument: documentImpl,
        localName,
        namespace: HTML_NS,
        prefix,
        ceState: CUSTOM_ELEMENT_STATE.UNDEFINED,
        ceDefinition: null,
        isValue: null
      });

      enqueueCEUpgradeReaction(result, definition);
    }
  } else {
    let elementInterface;

    switch (namespace) {
      case HTML_NS:
        elementInterface = getHTMLElementInterface(localName);
        break;

      case SVG_NS:
        elementInterface = getSVGInterface(localName);
        break;

      default:
        elementInterface = Element;
        break;
    }

    result = elementInterface.interface.createImpl([], {
      ownerDocument: documentImpl,
      localName,
      namespace,
      prefix,
      ceState: CUSTOM_ELEMENT_STATE.UNCUSTOMIZED,
      ceDefinition: null,
      isValue
    });

    if (namespace === HTML_NS && (isValidCustomElementName(localName) || isValue !== null)) {
      result._ceState = CUSTOM_ELEMENT_STATE.UNDEFINED;
    }
  }

  return result;
}

// https://dom.spec.whatwg.org/#internal-createelementns-steps
function createElementNS(documentImpl, namespace, qualifiedName, options) {
  const extracted = validateAndExtract(namespace, qualifiedName);

  let isValue = null;
  if (options && options.is !== undefined) {
    isValue = options.is;
  }

  return createElement(documentImpl, extracted.localName, extracted.namespace, extracted.prefix, isValue, true);
}

module.exports = {
  createElement,
  createElementNS,

  // TODO: This file can't export geElementInterface... Need to refactor this in a more logical way.
  getHTMLElementInterface,
  INTERFACE_TAG_MAPPING
};
