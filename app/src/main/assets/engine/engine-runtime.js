(function () {
  "use strict";

  const RUNTIME_KEY = "__CC_ENGINE_RUNTIME__";
  const PROTOCOL_VERSION = 1;
  const MAX_MESSAGE_BYTES = 4 * 1024 * 1024;
  const STORAGE_QUOTA_BYTES = 4 * 1024 * 1024;
  const MAX_STORAGE_KEYS = 4096;
  const MESSAGE_TIMEOUT_MS = 65000;
  const STORAGE_KEY = "cc.android.engine.storage.v1";
  const RUNTIME_ID = "chesscoach-android-engine";
  const OFFSCREEN_PATH = "offscreen/offscreen.html";
  const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
  const existing = window[RUNTIME_KEY];
  if (existing?.version === PROTOCOL_VERSION) return;

  function byteLength(value) {
    const text = String(value || "");
    if (typeof TextEncoder === "undefined") return text.length * 2;
    return new TextEncoder().encode(text).byteLength;
  }

  function createError(message, code) {
    const error = new Error(String(message || "Engine runtime error"));
    if (code) error.code = code;
    return error;
  }

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || (
      Object.prototype.hasOwnProperty.call(prototype, "constructor") &&
      typeof prototype.constructor === "function" &&
      prototype.constructor.name === "Object"
    );
  }

  function serializeJson(value, maxBytes, label) {
    let json;
    try { json = JSON.stringify(value); } catch (error) {
      throw createError(`${label || "Value"} is not JSON-serializable`, "INVALID_JSON");
    }
    if (typeof json !== "string") {
      throw createError(`${label || "Value"} is not JSON-serializable`, "INVALID_JSON");
    }
    if (byteLength(json) > maxBytes) {
      throw createError(`${label || "Value"} exceeds the allowed size`, "MESSAGE_TOO_LARGE");
    }
    return json;
  }

  function cloneJson(value, maxBytes = MAX_MESSAGE_BYTES, label = "Value") {
    if (value === undefined) return undefined;
    return JSON.parse(serializeJson(value, maxBytes, label));
  }

  function validateStorageKey(key) {
    if (
      typeof key !== "string" ||
      key.length === 0 ||
      key.length > 256 ||
      FORBIDDEN_KEYS.has(key) ||
      /[\0-\x1F\x7F]/.test(key)
    ) {
      throw createError("Invalid storage key", "INVALID_STORAGE_KEY");
    }
    return key;
  }

  function createPublicRecord(entries) {
    const result = {};
    for (const [key, value] of entries) {
      Object.defineProperty(result, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return result;
  }

  function sanitizeAssetPath(rawPath) {
    const raw = String(rawPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (raw.includes("?") || raw.includes("#") || raw.includes("\0")) {
      throw createError("Invalid asset path", "INVALID_ASSET_PATH");
    }
    const segments = [];
    for (const encodedSegment of raw.split("/")) {
      if (!encodedSegment || encodedSegment === ".") continue;
      let segment;
      try { segment = decodeURIComponent(encodedSegment); } catch (error) {
        throw createError("Invalid asset path encoding", "INVALID_ASSET_PATH");
      }
      if (
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\") ||
        !/^[a-z0-9._~@+-]+$/i.test(segment)
      ) {
        throw createError("Invalid asset path", "INVALID_ASSET_PATH");
      }
      segments.push(encodeURIComponent(segment).replace(/%40/gi, "@").replace(/%2B/gi, "+"));
    }
    return segments.join("/");
  }

  function getURL(path) {
    return `${location.origin}/__cc_assets/${sanitizeAssetPath(path)}`;
  }

  const virtualOffscreenUrl = getURL(OFFSCREEN_PATH);
  const enginePageUrl = String(location.href);
  let disposed = false;
  let suspended = false;
  let lifecycleEpoch = 0;
  let offscreenOpen = false;
  let offscreenController = null;
  let currentLastError;
  let storageState = Object.create(null);
  let storageAvailable = true;
  const messageListeners = new Map();
  const storageListeners = new Set();
  const activeDispatches = new Set();

  function copyStorageRecord(raw) {
    const result = Object.create(null);
    if (!isPlainObject(raw)) return result;
    const entries = Object.entries(raw);
    if (entries.length > MAX_STORAGE_KEYS) {
      throw createError("Storage contains too many keys", "STORAGE_QUOTA_EXCEEDED");
    }
    for (const [key, value] of entries) {
      validateStorageKey(key);
      result[key] = cloneJson(value, STORAGE_QUOTA_BYTES, `Storage value for ${key}`);
    }
    serializeJson(result, STORAGE_QUOTA_BYTES, "Engine storage");
    return result;
  }

  function loadStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      if (byteLength(raw) > STORAGE_QUOTA_BYTES) throw createError("Stored engine data exceeds quota", "STORAGE_QUOTA_EXCEEDED");
      storageState = copyStorageRecord(JSON.parse(raw));
    } catch (error) {
      console.warn("[ChessCoach Engine] Resetting invalid local storage", error);
      storageState = Object.create(null);
      try { localStorage.removeItem(STORAGE_KEY); } catch (storageError) { storageAvailable = false; }
    }
  }

  loadStorage();

  function scheduleTask(callback) {
    if (typeof queueMicrotask === "function") queueMicrotask(callback);
    else Promise.resolve().then(callback);
  }

  function invokeCallback(callback, value, error) {
    scheduleTask(() => {
      currentLastError = error
        ? Object.freeze({ message: String(error.message || error), code: error.code || undefined })
        : undefined;
      try { callback(value); } catch (callbackError) {
        console.error("[ChessCoach Engine] API callback failed", callbackError);
      } finally {
        currentLastError = undefined;
      }
    });
  }

  function callbackOrPromise(callback, operation) {
    if (typeof callback === "function") {
      scheduleTask(() => {
        try {
          operation(
            value => invokeCallback(callback, value, null),
            error => invokeCallback(callback, undefined, error)
          );
        } catch (error) {
          invokeCallback(callback, undefined, error);
        }
      });
      return undefined;
    }
    return new Promise((resolve, reject) => {
      scheduleTask(() => {
        try { operation(resolve, reject); } catch (error) { reject(error); }
      });
    });
  }

  function storageResult(keys) {
    if (keys === undefined || keys === null) {
      return createPublicRecord(Object.entries(storageState).map(([key, value]) => [key, cloneJson(value)]));
    }
    if (typeof keys === "string") {
      validateStorageKey(keys);
      return Object.prototype.hasOwnProperty.call(storageState, keys)
        ? createPublicRecord([[keys, cloneJson(storageState[keys])]])
        : {};
    }
    if (Array.isArray(keys)) {
      const result = [];
      for (const key of new Set(keys.map(validateStorageKey))) {
        if (Object.prototype.hasOwnProperty.call(storageState, key)) result.push([key, cloneJson(storageState[key])]);
      }
      return createPublicRecord(result);
    }
    if (isPlainObject(keys)) {
      return createPublicRecord(Object.entries(keys).map(([key, fallback]) => {
        validateStorageKey(key);
        return [key, Object.prototype.hasOwnProperty.call(storageState, key) ? cloneJson(storageState[key]) : cloneJson(fallback)];
      }));
    }
    throw createError("storage.local.get keys must be null, a string, an array, or an object", "INVALID_ARGUMENT");
  }

  function persistStorage(candidate) {
    if (!storageAvailable) throw createError("Engine localStorage is unavailable", "STORAGE_WRITE_FAILED");
    const keys = Object.keys(candidate);
    if (keys.length > MAX_STORAGE_KEYS) throw createError("Storage quota exceeded", "STORAGE_QUOTA_EXCEEDED");
    const json = serializeJson(candidate, STORAGE_QUOTA_BYTES, "Engine storage");
    try {
      localStorage.setItem(STORAGE_KEY, json);
    } catch (error) {
      const wrapped = createError(String(error?.message || error || "Storage write failed"), "STORAGE_QUOTA_EXCEEDED");
      throw wrapped;
    }
    storageState = candidate;
  }

  function emitStorageChanges(changes) {
    if (!Object.keys(changes).length) return;
    scheduleTask(() => {
      for (const listener of Array.from(storageListeners)) {
        try { listener(cloneJson(changes), "local"); } catch (error) {
          console.error("[ChessCoach Engine] storage.onChanged listener failed", error);
        }
      }
    });
  }

  const storageLocal = Object.freeze({
    QUOTA_BYTES: STORAGE_QUOTA_BYTES,
    get(keys, callback) {
      if (typeof keys === "function") {
        callback = keys;
        keys = null;
      }
      return callbackOrPromise(callback, resolve => resolve(storageResult(keys)));
    },
    set(items, callback) {
      return callbackOrPromise(callback, resolve => {
        if (!isPlainObject(items)) throw createError("storage.local.set requires an object", "INVALID_ARGUMENT");
        const candidate = copyStorageRecord(storageState);
        const changes = {};
        for (const [key, rawValue] of Object.entries(items)) {
          validateStorageKey(key);
          const value = cloneJson(rawValue, STORAGE_QUOTA_BYTES, `Storage value for ${key}`);
          const hadOld = Object.prototype.hasOwnProperty.call(candidate, key);
          const oldValue = hadOld ? candidate[key] : undefined;
          if (hadOld && serializeJson(oldValue, STORAGE_QUOTA_BYTES) === serializeJson(value, STORAGE_QUOTA_BYTES)) continue;
          candidate[key] = value;
          changes[key] = hadOld ? { oldValue: cloneJson(oldValue), newValue: cloneJson(value) } : { newValue: cloneJson(value) };
        }
        if (Object.keys(changes).length) {
          persistStorage(candidate);
          emitStorageChanges(changes);
        }
        resolve();
      });
    },
    remove(keys, callback) {
      return callbackOrPromise(callback, resolve => {
        const list = typeof keys === "string" ? [keys] : keys;
        if (!Array.isArray(list)) throw createError("storage.local.remove requires a string or array", "INVALID_ARGUMENT");
        const candidate = copyStorageRecord(storageState);
        const changes = {};
        for (const key of new Set(list.map(validateStorageKey))) {
          if (!Object.prototype.hasOwnProperty.call(candidate, key)) continue;
          changes[key] = { oldValue: cloneJson(candidate[key]) };
          delete candidate[key];
        }
        if (Object.keys(changes).length) {
          persistStorage(candidate);
          emitStorageChanges(changes);
        }
        resolve();
      });
    },
    clear(callback) {
      return callbackOrPromise(callback, resolve => {
        const changes = {};
        for (const [key, value] of Object.entries(storageState)) changes[key] = { oldValue: cloneJson(value) };
        if (Object.keys(changes).length) {
          persistStorage(Object.create(null));
          emitStorageChanges(changes);
        }
        resolve();
      });
    }
  });

  const storageOnChanged = Object.freeze({
    addListener(listener) {
      if (typeof listener !== "function") throw new TypeError("Listener must be a function");
      storageListeners.add(listener);
    },
    removeListener(listener) {
      storageListeners.delete(listener);
    },
    hasListener(listener) {
      return storageListeners.has(listener);
    },
    hasListeners() {
      return storageListeners.size > 0;
    }
  });

  function listenerContext() {
    const source = String(document.currentScript?.src || "");
    if (/\/offscreen\/offscreen\.js(?:$|[?#])/.test(source)) return "OFFSCREEN_DOCUMENT";
    if (/\/background\/background\.js(?:$|[?#])/.test(source)) return "BACKGROUND";
    return "OTHER";
  }

  const runtimeOnMessage = Object.freeze({
    addListener(listener) {
      if (typeof listener !== "function") throw new TypeError("Listener must be a function");
      messageListeners.set(listener, { context: listenerContext() });
    },
    removeListener(listener) {
      messageListeners.delete(listener);
    },
    hasListener(listener) {
      return messageListeners.has(listener);
    },
    hasListeners() {
      return messageListeners.size > 0;
    }
  });

  function routedListeners(message) {
    const target = message?.target;
    let context = "BACKGROUND";
    if (target === "offscreen-engine") {
      if (!offscreenOpen) return [];
      context = "OFFSCREEN_DOCUMENT";
    }
    else if (target === "background-engine" || target === undefined || target === null || target === "") context = "BACKGROUND";
    else if (typeof target === "string" && /engine$/i.test(target)) return [];
    return Array.from(messageListeners.entries()).filter(([, meta]) => meta.context === context);
  }

  function normalizeSender(rawSender) {
    const sender = isPlainObject(rawSender) ? rawSender : {};
    const result = {
      id: typeof sender.id === "string" ? sender.id.slice(0, 128) : RUNTIME_ID,
      url: typeof sender.url === "string" ? sender.url.slice(0, 4096) : enginePageUrl,
      origin: typeof sender.origin === "string" ? sender.origin.slice(0, 512) : location.origin,
      frameId: Number.isInteger(sender.frameId) ? sender.frameId : 0
    };
    if (typeof sender.documentId === "string") result.documentId = sender.documentId.slice(0, 128);
    if (Number.isInteger(sender.tabId)) result.tab = { id: sender.tabId };
    return result;
  }

  function dispatch(message, sender, options = {}) {
    if (disposed) return Promise.reject(createError("Engine runtime is disposed", "CONTEXT_INVALIDATED"));
    if (suspended) return Promise.reject(createError("Engine runtime is suspended", "ENGINE_SUSPENDED"));
    let safeMessage;
    try { safeMessage = cloneJson(message, MAX_MESSAGE_BYTES, "Runtime message"); } catch (error) { return Promise.reject(error); }
    const listeners = routedListeners(safeMessage);
    if (!listeners.length) return Promise.reject(createError("Could not establish connection. Receiving end does not exist.", "NO_RECEIVER"));
    const safeSender = normalizeSender(sender);
    const timeoutMs = Math.max(100, Math.min(MESSAGE_TIMEOUT_MS, Number(options.timeoutMs) || MESSAGE_TIMEOUT_MS));

    return new Promise((resolve, reject) => {
      let settled = false;
      let openChannels = 0;
      let firstAsyncError = null;
      let timer = null;
      const dispatchHandle = {
        reject(error) {
          if (settled) return;
          settled = true;
          if (timer !== null) clearTimeout(timer);
          activeDispatches.delete(dispatchHandle);
          reject(error);
        }
      };
      activeDispatches.add(dispatchHandle);

      const respond = value => {
        if (settled) return false;
        let safeValue;
        try { safeValue = cloneJson(value, MAX_MESSAGE_BYTES, "Runtime response"); } catch (error) {
          dispatchHandle.reject(error);
          return false;
        }
        settled = true;
        if (timer !== null) clearTimeout(timer);
        activeDispatches.delete(dispatchHandle);
        resolve(safeValue);
        return true;
      };

      for (const [listener] of listeners) {
        let channelOpen = true;
        let result;
        const sendResponse = value => channelOpen && respond(value);
        try {
          result = listener(cloneJson(safeMessage), cloneJson(safeSender), sendResponse);
        } catch (error) {
          channelOpen = false;
          firstAsyncError ||= error;
          continue;
        }
        if (result === true) {
          openChannels++;
          continue;
        }
        if (result && typeof result.then === "function") {
          openChannels++;
          Promise.resolve(result).then(
            value => respond(value),
            error => {
              channelOpen = false;
              openChannels--;
              firstAsyncError ||= error;
              if (!settled && openChannels === 0) dispatchHandle.reject(firstAsyncError);
            }
          );
          continue;
        }
        channelOpen = false;
      }

      if (settled) return;
      if (openChannels === 0) {
        activeDispatches.delete(dispatchHandle);
        settled = true;
        resolve(undefined);
        return;
      }
      timer = setTimeout(() => {
        dispatchHandle.reject(createError("The message port closed before a response was received.", "MESSAGE_TIMEOUT"));
      }, timeoutMs);
    });
  }

  function internalSender(message) {
    if (message?.target === "background-engine" && message?.type === "ENGINE_OFFSCREEN_IDLE") {
      return { id: RUNTIME_ID, url: virtualOffscreenUrl, origin: location.origin, frameId: 0 };
    }
    return { id: RUNTIME_ID, url: enginePageUrl, origin: location.origin, frameId: 0 };
  }

  function sendMessage(message, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = undefined;
    }
    if (options !== undefined && !isPlainObject(options)) {
      const error = createError("runtime.sendMessage options must be an object", "INVALID_ARGUMENT");
      if (typeof callback === "function") {
        invokeCallback(callback, undefined, error);
        return undefined;
      }
      return Promise.reject(error);
    }
    if (typeof callback === "function") {
      dispatch(message, internalSender(message)).then(
        value => invokeCallback(callback, value, null),
        error => invokeCallback(callback, undefined, error)
      );
      return undefined;
    }
    return dispatch(message, internalSender(message));
  }

  function getContexts(filter = {}) {
    if (!isPlainObject(filter)) return Promise.reject(createError("getContexts filter must be an object", "INVALID_ARGUMENT"));
    const types = Array.isArray(filter.contextTypes) ? filter.contextTypes : null;
    const urls = Array.isArray(filter.documentUrls) ? filter.documentUrls : null;
    const typeMatches = !types || types.includes("OFFSCREEN_DOCUMENT");
    const urlMatches = !urls || urls.includes(virtualOffscreenUrl);
    if (!typeMatches || !urlMatches || !offscreenOpen || disposed) return Promise.resolve([]);
    return Promise.resolve([{
      contextId: "cc-android-offscreen",
      contextType: "OFFSCREEN_DOCUMENT",
      documentId: "cc-android-offscreen",
      documentUrl: virtualOffscreenUrl,
      incognito: false
    }]);
  }

  const chromeRuntime = {};
  Object.defineProperties(chromeRuntime, {
    id: { value: RUNTIME_ID, enumerable: true },
    lastError: { enumerable: true, get: () => currentLastError },
    getURL: { value: getURL, enumerable: true },
    sendMessage: { value: sendMessage, enumerable: true },
    onMessage: { value: runtimeOnMessage, enumerable: true },
    getContexts: { value: getContexts, enumerable: true },
    ContextType: { value: Object.freeze({ OFFSCREEN_DOCUMENT: "OFFSCREEN_DOCUMENT" }), enumerable: true }
  });
  Object.freeze(chromeRuntime);

  const chromeApi = Object.freeze({
    runtime: chromeRuntime,
    storage: Object.freeze({ local: storageLocal, onChanged: storageOnChanged }),
    offscreen: Object.freeze({
      Reason: Object.freeze({ WORKERS: "WORKERS" }),
      createDocument(options) {
        if (disposed || suspended) return Promise.reject(createError("Engine runtime is unavailable", suspended ? "ENGINE_SUSPENDED" : "CONTEXT_INVALIDATED"));
        if (!isPlainObject(options) || options.url !== OFFSCREEN_PATH) {
          return Promise.reject(createError("Unsupported offscreen document", "INVALID_ASSET_PATH"));
        }
        offscreenOpen = true;
        return Promise.resolve();
      },
      closeDocument() {
        offscreenOpen = false;
        offscreenController?.close();
        return Promise.resolve();
      }
    })
  });

  function handleStorageEvent(event) {
    if (event.key !== STORAGE_KEY || event.storageArea !== localStorage) return;
    try {
      const next = event.newValue ? copyStorageRecord(JSON.parse(event.newValue)) : Object.create(null);
      const changes = {};
      for (const key of new Set([...Object.keys(storageState), ...Object.keys(next)])) {
        const hadOld = Object.prototype.hasOwnProperty.call(storageState, key);
        const hasNew = Object.prototype.hasOwnProperty.call(next, key);
        if (hadOld && hasNew && serializeJson(storageState[key], STORAGE_QUOTA_BYTES) === serializeJson(next[key], STORAGE_QUOTA_BYTES)) continue;
        changes[key] = {};
        if (hadOld) changes[key].oldValue = cloneJson(storageState[key]);
        if (hasNew) changes[key].newValue = cloneJson(next[key]);
      }
      storageState = next;
      emitStorageChanges(changes);
    } catch (error) {
      console.warn("[ChessCoach Engine] Ignoring invalid storage event", error);
    }
  }

  function importPackagedScripts() {
    for (const requestedUrl of arguments) {
      const url = new URL(String(requestedUrl), location.href);
      if (url.origin !== location.origin || url.href !== getURL("data/eco-book.js") || !globalThis.CHESSCOACH_ECO_BOOK) {
        throw createError("Synchronous importScripts is unavailable in the engine document", "IMPORT_NOT_AVAILABLE");
      }
    }
  }

  function suspendForApp() {
    if (disposed || suspended) return;
    suspended = true;
    lifecycleEpoch++;
    offscreenOpen = false;
    offscreenController?.suspend();
    const error = createError("Engine runtime was suspended", "ENGINE_SUSPENDED");
    for (const active of Array.from(activeDispatches)) active.reject(error);
  }

  function resumeForApp() {
    if (disposed) return;
    suspended = false;
    offscreenController?.resume();
  }

  function registerOffscreenController(controller) {
    if (offscreenController || !controller || listenerContext() !== "OFFSCREEN_DOCUMENT") {
      throw createError("Invalid offscreen lifecycle registration", "INVALID_ARGUMENT");
    }
    offscreenController = controller;
  }

  function cleanup() {
    if (disposed) return;
    suspendForApp();
    disposed = true;
    window.removeEventListener("storage", handleStorageEvent);
    messageListeners.clear();
    storageListeners.clear();
    const error = createError("Engine runtime was disposed", "CONTEXT_INVALIDATED");
    for (const active of Array.from(activeDispatches)) active.reject(error);
    activeDispatches.clear();
  }

  window.addEventListener("storage", handleStorageEvent);
  if (typeof globalThis.importScripts !== "function") {
    Object.defineProperty(globalThis, "importScripts", {
      value: importPackagedScripts,
      enumerable: false,
      configurable: false,
      writable: false
    });
  }
  Object.defineProperty(globalThis, "chrome", {
    value: chromeApi,
    enumerable: false,
    configurable: false,
    writable: false
  });

  const publicRuntime = {};
  Object.defineProperties(publicRuntime, {
    version: { value: PROTOCOL_VERSION, enumerable: true },
    chrome: { value: chromeApi, enumerable: true },
    virtualOffscreenUrl: { value: virtualOffscreenUrl, enumerable: true },
    dispatch: { value: dispatch, enumerable: false },
    suspendForApp: { value: suspendForApp, enumerable: false },
    resumeForApp: { value: resumeForApp, enumerable: false },
    refreshDeviceProfileForApp: { value: () => offscreenController?.refreshProfile(), enumerable: false },
    registerOffscreenController: { value: registerOffscreenController, enumerable: false },
    cleanup: { value: cleanup, enumerable: false },
    disposed: { enumerable: true, get: () => disposed },
    suspended: { enumerable: true, get: () => suspended },
    lifecycleEpoch: { enumerable: true, get: () => lifecycleEpoch },
    listenerCount: { enumerable: true, get: () => messageListeners.size }
  });
  Object.preventExtensions(publicRuntime);
  Object.defineProperty(window, RUNTIME_KEY, {
    value: publicRuntime,
    enumerable: false,
    configurable: false,
    writable: false
  });
})();
