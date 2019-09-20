/* eslint-disable global-require */
"use strict";

const DOMException = require("domexception");
const { URL, URLSearchParams } = require("whatwg-url");
const { interface: XMLSerializer } = require("w3c-xmlserializer/lib/XMLSerializer");

// This one is OK but needs migration to webidl2js eventually.
const installNodeFilter = require("./node-filter");

// These need to be cleaned up...
const installStyle = require("../level2/style");
const installXPath = require("../level3/xpath");

const { HTMLConstructor } = require("./helpers/html-constructor");

const INTERFACE_MAPPING = {
  Attr: require("./generated/Attr"),
  CDATASection: require("./generated/CDATASection"),
  CharacterData: require("./generated/CharacterData"),
  Comment: require("./generated/Comment"),
  Document: require("./generated/Document"),
  DocumentFragment: require("./generated/DocumentFragment"),
  DocumentType: require("./generated/DocumentType"),
  DOMImplementation: require("./generated/DOMImplementation"),
  DOMStringMap: require("./generated/DOMStringMap"),
  DOMTokenList: require("./generated/DOMTokenList"),
  Element: require("./generated/Element"),
  HTMLCollection: require("./generated/HTMLCollection"),
  HTMLDocument: require("./generated/Document"),
  HTMLOptionsCollection: require("./generated/HTMLOptionsCollection"),
  NamedNodeMap: require("./generated/NamedNodeMap"),
  Node: require("./generated/Node"),
  NodeList: require("./generated/NodeList"),
  ProcessingInstruction: require("./generated/ProcessingInstruction"),
  Text: require("./generated/Text"),
  XMLDocument: require("./generated/XMLDocument"),

  HTMLElement: require("./generated/HTMLElement.js"),
  HTMLAnchorElement: require("./generated/HTMLAnchorElement.js"),
  HTMLAreaElement: require("./generated/HTMLAreaElement.js"),
  HTMLAudioElement: require("./generated/HTMLAudioElement.js"),
  HTMLBaseElement: require("./generated/HTMLBaseElement.js"),
  HTMLBodyElement: require("./generated/HTMLBodyElement.js"),
  HTMLBRElement: require("./generated/HTMLBRElement.js"),
  HTMLButtonElement: require("./generated/HTMLButtonElement.js"),
  HTMLCanvasElement: require("./generated/HTMLCanvasElement.js"),
  HTMLDataElement: require("./generated/HTMLDataElement.js"),
  HTMLDataListElement: require("./generated/HTMLDataListElement.js"),
  HTMLDetailsElement: require("./generated/HTMLDetailsElement.js"),
  HTMLDialogElement: require("./generated/HTMLDialogElement.js"),
  HTMLDirectoryElement: require("./generated/HTMLDirectoryElement.js"),
  HTMLDivElement: require("./generated/HTMLDivElement.js"),
  HTMLDListElement: require("./generated/HTMLDListElement.js"),
  HTMLEmbedElement: require("./generated/HTMLEmbedElement.js"),
  HTMLFieldSetElement: require("./generated/HTMLFieldSetElement.js"),
  HTMLFontElement: require("./generated/HTMLFontElement.js"),
  HTMLFormElement: require("./generated/HTMLFormElement.js"),
  HTMLFrameElement: require("./generated/HTMLFrameElement.js"),
  HTMLFrameSetElement: require("./generated/HTMLFrameSetElement.js"),
  HTMLHeadingElement: require("./generated/HTMLHeadingElement.js"),
  HTMLHeadElement: require("./generated/HTMLHeadElement.js"),
  HTMLHRElement: require("./generated/HTMLHRElement.js"),
  HTMLHtmlElement: require("./generated/HTMLHtmlElement.js"),
  HTMLIFrameElement: require("./generated/HTMLIFrameElement.js"),
  HTMLImageElement: require("./generated/HTMLImageElement.js"),
  HTMLInputElement: require("./generated/HTMLInputElement.js"),
  HTMLLabelElement: require("./generated/HTMLLabelElement.js"),
  HTMLLegendElement: require("./generated/HTMLLegendElement.js"),
  HTMLLIElement: require("./generated/HTMLLIElement.js"),
  HTMLLinkElement: require("./generated/HTMLLinkElement.js"),
  HTMLMapElement: require("./generated/HTMLMapElement.js"),
  HTMLMarqueeElement: require("./generated/HTMLMarqueeElement.js"),
  HTMLMediaElement: require("./generated/HTMLMediaElement.js"),
  HTMLMenuElement: require("./generated/HTMLMenuElement.js"),
  HTMLMetaElement: require("./generated/HTMLMetaElement.js"),
  HTMLMeterElement: require("./generated/HTMLMeterElement.js"),
  HTMLModElement: require("./generated/HTMLModElement.js"),
  HTMLObjectElement: require("./generated/HTMLObjectElement.js"),
  HTMLOListElement: require("./generated/HTMLOListElement.js"),
  HTMLOptGroupElement: require("./generated/HTMLOptGroupElement.js"),
  HTMLOptionElement: require("./generated/HTMLOptionElement.js"),
  HTMLOutputElement: require("./generated/HTMLOutputElement.js"),
  HTMLParagraphElement: require("./generated/HTMLParagraphElement.js"),
  HTMLParamElement: require("./generated/HTMLParamElement.js"),
  HTMLPictureElement: require("./generated/HTMLPictureElement.js"),
  HTMLPreElement: require("./generated/HTMLPreElement.js"),
  HTMLProgressElement: require("./generated/HTMLProgressElement.js"),
  HTMLQuoteElement: require("./generated/HTMLQuoteElement.js"),
  HTMLScriptElement: require("./generated/HTMLScriptElement.js"),
  HTMLSelectElement: require("./generated/HTMLSelectElement.js"),
  HTMLSlotElement: require("./generated/HTMLSlotElement.js"),
  HTMLSourceElement: require("./generated/HTMLSourceElement.js"),
  HTMLSpanElement: require("./generated/HTMLSpanElement.js"),
  HTMLStyleElement: require("./generated/HTMLStyleElement.js"),
  HTMLTableCaptionElement: require("./generated/HTMLTableCaptionElement.js"),
  HTMLTableCellElement: require("./generated/HTMLTableCellElement.js"),
  HTMLTableColElement: require("./generated/HTMLTableColElement.js"),
  HTMLTableElement: require("./generated/HTMLTableElement.js"),
  HTMLTimeElement: require("./generated/HTMLTimeElement.js"),
  HTMLTitleElement: require("./generated/HTMLTitleElement.js"),
  HTMLTableRowElement: require("./generated/HTMLTableRowElement.js"),
  HTMLTableSectionElement: require("./generated/HTMLTableSectionElement.js"),
  HTMLTemplateElement: require("./generated/HTMLTemplateElement.js"),
  HTMLTextAreaElement: require("./generated/HTMLTextAreaElement.js"),
  HTMLTrackElement: require("./generated/HTMLTrackElement.js"),
  HTMLUListElement: require("./generated/HTMLUListElement.js"),
  HTMLUnknownElement: require("./generated/HTMLUnknownElement.js"),
  HTMLVideoElement: require("./generated/HTMLVideoElement.js"),

  SVGAnimatedString: require("./generated/SVGAnimatedString"),
  SVGElement: require("./generated/SVGElement.js"),
  SVGGraphicsElement: require("./generated/SVGGraphicsElement.js"),
  SVGNumber: require("./generated/SVGNumber"),
  SVGStringList: require("./generated/SVGStringList"),
  SVGSVGElement: require("./generated/SVGSVGElement.js"),
  SVGTitleElement: require("./generated/SVGTitleElement.js"),

  CloseEvent: require("./generated/CloseEvent"),
  CompositionEvent: require("./generated/CompositionEvent"),
  CustomEvent: require("./generated/CustomEvent"),
  ErrorEvent: require("./generated/ErrorEvent"),
  Event: require("./generated/Event"),
  EventTarget: require("./generated/EventTarget"),
  FocusEvent: require("./generated/FocusEvent"),
  HashChangeEvent: require("./generated/HashChangeEvent"),
  InputEvent: require("./generated/InputEvent"),
  KeyboardEvent: require("./generated/KeyboardEvent"),
  MessageEvent: require("./generated/MessageEvent"),
  MouseEvent: require("./generated/MouseEvent"),
  PageTransitionEvent: require("./generated/PageTransitionEvent"),
  PopStateEvent: require("./generated/PopStateEvent"),
  ProgressEvent: require("./generated/ProgressEvent"),
  StorageEvent: require("./generated/StorageEvent"),
  TouchEvent: require("./generated/TouchEvent"),
  UIEvent: require("./generated/UIEvent"),
  WheelEvent: require("./generated/WheelEvent"),

  BarProp: require("./generated/BarProp"),
  External: require("./generated/External"),
  History: require("./generated/History"),
  Location: require("./generated/Location"),
  Performance: require("./generated/Performance"),
  Screen: require("./generated/Screen"),

  MimeType: require("./generated/MimeType"),
  MimeTypeArray: require("./generated/MimeTypeArray"),
  Plugin: require("./generated/Plugin"),
  PluginArray: require("./generated/PluginArray"),

  Blob: require("./generated/Blob"),
  File: require("./generated/File"),
  FileList: require("./generated/FileList"),
  ValidityState: require("./generated/ValidityState"),

  DOMParser: require("./generated/DOMParser"),

  FormData: require("./generated/FormData"),
  XMLHttpRequestEventTarget: require("./generated/XMLHttpRequestEventTarget"),
  XMLHttpRequestUpload: require("./generated/XMLHttpRequestUpload"),

  NodeIterator: require("./generated/NodeIterator"),
  TreeWalker: require("./generated/TreeWalker"),

  Storage: require("./generated/Storage"),

  ShadowRoot: require("./generated/ShadowRoot"),

  MutationObserver: require("./generated/MutationObserver"),
  MutationRecord: require("./generated/MutationRecord"),

  CustomElementRegistry: require("./generated/CustomElementRegistry"),

  Headers: require("./generated/Headers")
};

// TODO: consider a mode of some sort where these are not shared between all DOM instances. It'd be very
// memory-expensive in most cases, though.
function installInterfaces(globalObject) {
  // Install interfaces originated from external packages
  globalObject.DOMException = DOMException;
  globalObject.XMLSerializer = XMLSerializer;
  globalObject.URL = URL;
  globalObject.URLSearchParams = URLSearchParams;

  // Install internal interfaces
  for (const [name, value] of Object.entries(INTERFACE_MAPPING)) {
    // If the generated interface exports an installConstructor method use it, otherwise directly assign the exported
    // interface on the global object.
    if (value.installConstructor) {
      value.installConstructor({ globalObject, HTMLConstructor });
    } else {
      Object.defineProperty(globalObject, name, {
        enumerable: false,
        configurable: true,
        writable: true,
        value: value.interface
      });
    }
  }

  // Install exotic interfaces
  // Note: The installation order matters here. All the exotic interfaces need to be installed after the internal
  // interfaces otherwise it throws.
  installNodeFilter(globalObject);
  installStyle(globalObject);
  installXPath(globalObject);
}

module.exports = {
  installInterfaces
};

