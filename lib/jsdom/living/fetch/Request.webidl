typedef (Request or USVString) RequestInfo;

[Constructor(RequestInfo input, optional RequestInit init = {}),
 Exposed=(Window,Worker)]
interface Request {
  readonly attribute ByteString method;
  readonly attribute USVString url;
  [SameObject] readonly attribute Headers headers;

  readonly attribute RequestDestination destination;
  readonly attribute USVString referrer;
  readonly attribute ReferrerPolicy referrerPolicy;
  readonly attribute RequestMode mode;
  readonly attribute RequestCredentials credentials;
  readonly attribute RequestCache cache;
  readonly attribute RequestRedirect redirect;
  readonly attribute DOMString integrity;
  readonly attribute boolean keepalive;
  readonly attribute boolean isReloadNavigation;
  readonly attribute boolean isHistoryNavigation;
  readonly attribute AbortSignal signal;

  [NewObject] Request clone();
};
Request includes Body;

dictionary RequestInit {
  ByteString method;
  HeadersInit headers;
  BodyInit? body;
  USVString referrer;
  ReferrerPolicy referrerPolicy;
  RequestMode mode;
  RequestCredentials credentials;
  RequestCache cache;
  RequestRedirect redirect;
  DOMString integrity;
  boolean keepalive;
  AbortSignal? signal;
  any window; // can only be set to null
};

enum RequestDestination { "", "audio", "audioworklet", "document", "embed", "font", "image", "manifest", "object", "paintworklet", "report", "script", "sharedworker", "style",  "track", "video", "worker", "xslt" };
enum RequestMode { "navigate", "same-origin", "no-cors", "cors" };
enum RequestCredentials { "omit", "same-origin", "include" };
enum RequestCache { "default", "no-store", "reload", "no-cache", "force-cache", "only-if-cached" };
enum RequestRedirect { "follow", "error", "manual" };
