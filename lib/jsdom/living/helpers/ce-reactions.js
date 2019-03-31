"use strict";

const { CUSTOM_ELEMENT_REACTIONS_STACK, invokeCEReactions } = require("./custom-elements");

/**
 * Mapping of all the property interfaces that are marked with the [CEReaction] attributes.
 */
const CE_REACTIONS_INTERFACES = {
  HTMLMetaElement: [
    "name",
    "httpEquiv",
    "content",
    "scheme"
  ],
  HTMLOutputElement: [
    "name",
    "defaultValue",
    "value"
  ],
  HTMLMapElement: ["name"],
  HTMLImageElement: [
    "alt",
    "src",
    "srcset",
    "sizes",
    "crossOrigin",
    "useMap",
    "isMap",
    "width",
    "height",
    "referrerPolicy",
    "name",
    "lowsrc",
    "align",
    "hspace",
    "vspace",
    "longDesc",
    "border"
  ],
  CharacterData: [
    // Inherited from: ChildNode mixin
    "before",
    "after",
    "replaceWith",
    "remove"
  ],
  HTMLQuoteElement: ["cite"],
  HTMLTableCaptionElement: ["align"],
  HTMLDataElement: ["value"],
  HTMLTitleElement: ["text"],
  HTMLStyleElement: [
    "media",
    "nonce",
    "type"
  ],
  ShadowRoot: ["innerHTML"],
  HTMLMediaElement: [
    "src",
    "crossOrigin",
    "preload",
    "autoplay",
    "loop",
    "controls",
    "defaultMuted"
  ],
  HTMLMenuElement: ["compact"],
  HTMLDialogElement: [
    "open",
    "show",
    "showModal",
    "close"
  ],
  HTMLTableCellElement: [
    "colSpan",
    "rowSpan",
    "headers",
    "scope",
    "abbr",
    "align",
    "axis",
    "height",
    "width",
    "ch",
    "chOff",
    "noWrap",
    "vAlign",
    "bgColor"
  ],
  HTMLParagraphElement: ["align"],
  HTMLOptionsCollection: [
    "length",
    "void",
    "add",
    "remove"
  ],
  HTMLObjectElement: [
    "data",
    "type",
    "typeMustMatch",
    "name",
    "useMap",
    "width",
    "height",
    "align",
    "archive",
    "code",
    "declare",
    "hspace",
    "standby",
    "vspace",
    "codeBase",
    "codeType",
    "border"
  ],
  HTMLAnchorElement: [
    "target",
    "download",
    "ping",
    "rel",
    "hreflang",
    "type",
    "text",
    "referrerPolicy",
    "coords",
    "charset",
    "name",
    "rev",
    "shape",

    // Inherited from: HTMLHyperlinkElementUtils mixin
    "href",
    "protocol",
    "username",
    "password",
    "host",
    "hostname",
    "port",
    "pathname",
    "search",
    "hash"
  ],
  HTMLHtmlElement: ["version"],
  HTMLBRElement: ["clear"],
  HTMLBodyElement: [
    "text",
    "link",
    "vLink",
    "aLink",
    "bgColor",
    "background"
  ],
  HTMLFontElement: [
    "color",
    "face",
    "size"
  ],
  HTMLIFrameElement: [
    "src",
    "srcdoc",
    "name",
    "allowFullscreen",
    "allowPaymentRequest",
    "allowUserMedia",
    "width",
    "height",
    "referrerPolicy",
    "align",
    "scrolling",
    "frameBorder",
    "longDesc",
    "marginHeight",
    "marginWidth"
  ],
  HTMLDListElement: ["compact"],
  HTMLMeterElement: [
    "value",
    "min",
    "max",
    "low",
    "high",
    "optimum"

  ],
  HTMLHRElement: [
    "align",
    "color",
    "noShade",
    "size",
    "width"
  ],
  HTMLLinkElement: [
    "href",
    "crossOrigin",
    "rel",
    "as",
    "media",
    "nonce",
    "integrity",
    "hreflang",
    "type",
    "referrerPolicy",
    "scope",
    "workerType",
    "updateViaCache",
    "charset",
    "rev",
    "target"
  ],
  HTMLSourceElement: [
    "src",
    "type",
    "srcset",
    "sizes",
    "media"

  ],
  HTMLTrackElement: [
    "kind",
    "src",
    "srclang",
    "label",
    "default"
  ],
  HTMLLegendElement: ["align"],
  HTMLLabelElement: ["htmlFor"],
  HTMLTableElement: [
    "caption",
    "deleteCaption",
    "tHead",
    "deleteTHead",
    "tFoot",
    "deleteTFoot",
    "deleteRow",
    "align",
    "border",
    "frame",
    "rules",
    "summary",
    "width",
    "bgColor",
    "cellPadding",
    "cellSpacing"
  ],
  HTMLMarqueeElement: [
    "behavior",
    "bgColor",
    "direction",
    "height",
    "hspace",
    "loop",
    "scrollAmount",
    "scrollDelay",
    "trueSpeed",
    "vspace",
    "width"
  ],
  HTMLDirectoryElement: ["compact"],
  HTMLParamElement: [

    "name",
    "value",
    "type",
    "valueType"
  ],
  HTMLTableColElement: [
    "span",
    "align",
    "ch",
    "chOff",
    "vAlign",
    "width"
  ],
  HTMLTableSectionElement: [
    "deleteRow",
    "align",
    "ch",
    "chOff",
    "vAlign"
  ],
  HTMLFrameSetElement: [
    "cols",
    "rows"
  ],
  HTMLLIElement: [

    "value",
    "type"
  ],
  HTMLFormElement: [
    "acceptCharset",
    "action",
    "autocomplete",
    "enctype",
    "encoding",
    "method",
    "name",
    "noValidate",
    "target",
    "reset"
  ],
  HTMLCanvasElement: [
    "width",
    "height"
  ],
  HTMLInputElement: [

    "accept",
    "alt",
    "autocomplete",
    "autofocus",
    "defaultChecked",
    "dirName",
    "disabled",
    "formAction",
    "formEnctype",
    "formMethod",
    "formNoValidate",
    "formTarget",
    "height",
    "inputMode",
    "max",
    "maxLength",
    "min",
    "minLength",
    "multiple",
    "name",
    "pattern",
    "placeholder",
    "readOnly",
    "required",
    "size",
    "src",
    "step",
    "type",
    "defaultValue",
    "value",
    "width",
    "align",
    "useMap"
  ],
  HTMLDetailsElement: ["open"],

  HTMLTableRowElement: [
    "deleteCell",
    "align",
    "ch",
    "chOff",
    "vAlign",
    "bgColor"
  ],
  HTMLTimeElement: ["dateTime"],
  DOMStringMap: ["void"],
  HTMLElement: [
    "title",
    "lang",
    "translate",
    "dir",
    "hidden",
    "tabIndex",
    "accessKey",
    "draggable",
    "spellcheck",
    "innerText",
    "style",

    // Inherited from: ElementContentEditable mixin
    "contentEditable"
  ],
  HTMLProgressElement: [
    "value",
    "max"
  ],
  HTMLDivElement: ["align"],
  Element: [
    "id",
    "className",
    "slot",
    "setAttribute",
    "setAttributeNS",
    "removeAttribute",
    "removeAttributeNS",
    "toggleAttribute",
    "setAttributeNode",
    "setAttributeNodeNS",
    "removeAttributeNode",
    "insertAdjacentElement",
    "innerHTML",
    "outerHTML",
    "insertAdjacentHTML",

    // Inherited from: ChildNode mixin
    "before",
    "after",
    "replaceWith",
    "remove",

    // Inherited from: ParentNode mixin
    "prepend",
    "append"
  ],
  HTMLBaseElement: [
    "href",
    "target"
  ],
  HTMLSelectElement: [
    "autocomplete",
    "autofocus",
    "disabled",
    "multiple",
    "name",
    "required",
    "size",
    "length",
    "add",
    "remove",
    "remove",
    "void"
  ],
  HTMLAreaElement: [
    "alt",
    "coords",
    "shape",
    "target",
    "download",
    "ping",
    "rel",
    "referrerPolicy",
    "noHref",

    // Inherited from: HTMLHyperlinkElementUtils mixin
    "href",
    "protocol",
    "username",
    "password",
    "host",
    "hostname",
    "port",
    "pathname",
    "search",
    "hash"
  ],
  HTMLHeadingElement: ["align"],
  HTMLTextAreaElement: [

    "autocomplete",
    "autofocus",
    "cols",
    "dirName",
    "disabled",
    "inputMode",
    "maxLength",
    "minLength",
    "name",
    "placeholder",
    "readOnly",
    "required",
    "rows",
    "wrap",
    "defaultValue",
    "value"
  ],
  HTMLButtonElement: [

    "autofocus",
    "disabled",
    "formAction",
    "formEnctype",
    "formMethod",
    "formNoValidate",
    "formTarget",
    "name",
    "type",
    "value"
  ],
  HTMLUListElement: [
    "compact",
    "type"
  ],
  Node: [
    "nodeValue",
    "textContent",
    "normalize",
    "cloneNode",
    "insertBefore",
    "appendChild",
    "replaceChild",
    "removeChild"
  ],
  HTMLModElement: [
    "cite",
    "dateTime"
  ],
  HTMLScriptElement: [
    "src",
    "type",
    "noModule",
    "async",
    "defer",
    "crossOrigin",
    "text",
    "nonce",
    "integrity",
    "charset",
    "event",
    "htmlFor"
  ],
  HTMLPreElement: ["width"],
  HTMLEmbedElement: [
    "src",
    "type",
    "width",
    "height",
    "align",
    "name"
  ],
  HTMLVideoElement: [
    "width",
    "height",
    "poster",
    "playsInline"
  ],
  HTMLFrameElement: [
    "name",
    "scrolling",
    "src",
    "frameBorder",
    "longDesc",
    "noResize",
    "marginHeight",
    "marginWidth"
  ],
  DOMTokenList: [
    "add",
    "remove",
    "toggle",
    "replace",
    "value"
  ],
  HTMLSlotElement: ["name"],
  Document: [
    "createElement",
    "createElementNS",
    "importNode",
    "adoptNode",
    "title",
    "dir",
    "body",
    "open",
    "close",
    "write",
    "writeln",
    "designMode",
    "execCommand",
    "fgColor",
    "linkColor",
    "vlinkColor",
    "alinkColor",
    "bgColor",

    // Inherited from: ParentNode mixin
    "prepend",
    "append"
  ],
  DocumentType: [
    // Inherited from: ChildNode mixin
    "before",
    "after",
    "replaceWith",
    "remove"
  ],
  DocumentFragment: [
    // Inherited from: ParentNode mixin
    "prepend",
    "append"
  ],
  HTMLFieldSetElement: [
    "disabled",
    "name"
  ],
  HTMLOListElement: [
    "reversed",
    "start",
    "type",
    "compact"
  ],
  HTMLOptGroupElement: [
    "disabled",
    "label"
  ],
  HTMLOptionElement: [
    "disabled",
    "label",
    "defaultSelected",
    "value",
    "text"
  ],
  NamedNodeMap: [
    "setNamedItem",
    "setNamedItemNS",
    "removeNamedItem",
    "removeNamedItemNS"
  ],
  CustomElementRegistry: [
    "define",
    "upgrade"
  ],
  Attr: [
    "value",

    // Inherited from: Node
    "nodeValue",
    "textContent"
  ],
  CSSStyleDeclaration: [
    "cssText",
    "setProperty",
    "removeProperty",
    "cssFloat"
  ]
};

function wrapWithCEReactions(original) {
  // https://html.spec.whatwg.org/#cereactions
  return function CEReactions(...args) {
    CUSTOM_ELEMENT_REACTIONS_STACK.push([]);

    let ret;
    let exception;
    try {
      ret = original.call(this, ...args);
    } catch (error) {
      exception = error;
    }

    const queue = CUSTOM_ELEMENT_REACTIONS_STACK.pop();
    invokeCEReactions(queue);

    if (exception !== undefined) {
      throw exception;
    }

    return ret;
  };
}

function patchInterfaces(interfaces) {
  for (const [interfaceName, propertyNames] of Object.entries(CE_REACTIONS_INTERFACES)) {
    const interfaceProto = interfaces[interfaceName].prototype;

    for (const propertyName of propertyNames) {
      const descriptor = Object.getOwnPropertyDescriptor(interfaceProto, propertyName);

      // The descriptor is undefined if jsdom doesn't implement the API.
      if (descriptor !== undefined) {
        const { get, set, value } = descriptor;

        if (get !== undefined) {
          descriptor.get = wrapWithCEReactions(get);
        }
        if (set !== undefined) {
          descriptor.set = wrapWithCEReactions(set);
        }

        if (value !== undefined) {
          descriptor.value = wrapWithCEReactions(value);
        }

        Object.defineProperty(interfaceProto, propertyName, descriptor);
      }
    }
  }
}

module.exports = {
  patchInterfaces
};
