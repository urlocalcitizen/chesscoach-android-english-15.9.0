(function () {
  "use strict";

  const PROTOCOL_VERSION = 1;
  const PROTOCOL_SCOPE = "chesscoach.android";
  const HOST_KEY = "__CC_ENGINE_HOST__";
  const MAX_MESSAGE_BYTES = 4 * 1024 * 1024;
  const MAX_CONCURRENT_REQUESTS = 64;
  const BRIDGE_WAIT_MS = 5000;
  const runtime = window.__CC_ENGINE_RUNTIME__;
  const existingHost = window[HOST_KEY];
  if (existingHost?.isAlive?.()) return;
  try { existingHost?.cleanup?.(); } catch (error) {}
  if (!runtime || runtime.version !== PROTOCOL_VERSION || typeof runtime.dispatch !== "function") {
    console.error("[ChessCoach Engine] Runtime did not initialize");
    return;
  }

  let disposed = false;
  let bridge = null;
  let previousHandler = null;
  let bridgeWaitTimer = null;
  let bridgeWaitStarted = Date.now();
  let readySequence = 0;
  const activeRequestIds = new Set();

  function byteLength(value) {
    const text = String(value || "");
    if (typeof TextEncoder === "undefined") return text.length * 2;
    return new TextEncoder().encode(text).byteLength;
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

  function createError(message, code) {
    const error = new Error(String(message || "Engine host error"));
    if (code) error.code = code;
    return error;
  }

  function serializeJson(value, maxBytes, label) {
    let json;
    try { json = JSON.stringify(value); } catch (error) {
      throw createError(`${label || "Value"} is not JSON-serializable`, "INVALID_JSON");
    }
    if (typeof json !== "string") throw createError(`${label || "Value"} is not JSON-serializable`, "INVALID_JSON");
    if (byteLength(json) > maxBytes) throw createError(`${label || "Value"} exceeds the allowed size`, "MESSAGE_TOO_LARGE");
    return json;
  }

  function cloneJson(value, maxBytes = MAX_MESSAGE_BYTES, label = "Value") {
    if (value === undefined) return undefined;
    return JSON.parse(serializeJson(value, maxBytes, label));
  }

  function parseIncoming(raw) {
    const data = raw && typeof raw === "object" && Object.prototype.hasOwnProperty.call(raw, "data") ? raw.data : raw;
    if (typeof data === "string") {
      if (byteLength(data) > MAX_MESSAGE_BYTES) throw createError("Runtime request is too large", "MESSAGE_TOO_LARGE");
      return JSON.parse(data);
    }
    if (!isPlainObject(data)) throw createError("Invalid runtime request", "INVALID_MESSAGE");
    return cloneJson(data);
  }

  function getNativeBridge() {
    const candidate = window.CCEngineNative;
    return candidate && typeof candidate.postMessage === "function" ? candidate : null;
  }

  function postEnvelope(envelope) {
    const targetBridge = bridge || getNativeBridge();
    if (!targetBridge) throw createError("Engine native bridge is unavailable", "NATIVE_BRIDGE_UNAVAILABLE");
    targetBridge.postMessage(serializeJson(envelope, MAX_MESSAGE_BYTES, "Engine response"));
  }

  function baseEnvelope(type, id, channel, target, payload) {
    return {
      v: PROTOCOL_VERSION,
      scope: PROTOCOL_SCOPE,
      source: "engine",
      target,
      channel,
      type,
      id,
      payload
    };
  }

  function sendReady() {
    if (disposed || runtime.suspended) return;
    const ready = runtime.listenerCount >= 2;
    if (!ready) {
      console.error("[ChessCoach Engine] Background or offscreen listener did not initialize");
      return;
    }
    try {
      readySequence++;
      postEnvelope(baseEnvelope(
        "engine.ready",
        `engine-ready-${Date.now().toString(36)}-${readySequence.toString(36)}`,
        "engine",
        "REMOTE",
        {}
      ));
    } catch (error) {
      console.warn("[ChessCoach Engine] Could not announce readiness", error);
    }
  }

  function applyDeviceProfile(profile) {
    if (!isPlainObject(profile)) return;
    try {
      Object.defineProperty(window, "__CC_DEVICE_PROFILE__", {
        value: cloneJson(profile),
        configurable: true,
        enumerable: false,
        writable: false
      });
      window.dispatchEvent(new CustomEvent("cc-device-profile-ready", { detail: window.__CC_DEVICE_PROFILE__ }));
      runtime.refreshDeviceProfileForApp();
    } catch (error) {
      console.warn("[ChessCoach Engine] Could not apply device profile", error);
    }
  }

  function requestDeviceProfile() {
    try {
      postEnvelope(baseEnvelope(
        "device.profile.get",
        `device-profile-${Date.now().toString(36)}`,
        "device",
        "NATIVE",
        {}
      ));
    } catch (error) {
      console.warn("[ChessCoach Engine] Could not request device profile", error);
    }
  }

  function sanitizeSender(rawSender) {
    if (!isPlainObject(rawSender)) throw createError("Missing forwarded sender", "INVALID_SENDER");
    const urlText = String(rawSender.url || "");
    let url;
    try { url = new URL(urlText); } catch (error) { throw createError("Invalid forwarded sender URL", "INVALID_SENDER"); }
    const allowedHost = url.protocol === "https:" && (
      url.hostname === "lichess.org" || url.hostname === "www.chess.com"
    );
    if (!allowedHost) throw createError("Forwarded sender origin is not allowed", "INVALID_SENDER");
    const sender = {
      id: typeof rawSender.id === "string" ? rawSender.id.slice(0, 128) : "chesscoach-android",
      url: url.href.slice(0, 4096),
      origin: url.origin,
      frameId: Number.isInteger(rawSender.frameId) ? rawSender.frameId : 0
    };
    if (typeof rawSender.documentId === "string") sender.documentId = rawSender.documentId.slice(0, 128);
    if (Number.isInteger(rawSender.tabId)) sender.tabId = rawSender.tabId;
    return sender;
  }

  function validateRequest(envelope) {
    if (
      !isPlainObject(envelope) ||
      envelope.v !== PROTOCOL_VERSION ||
      envelope.scope !== PROTOCOL_SCOPE ||
      envelope.channel !== "runtime" ||
      (envelope.type !== "runtime.message" && envelope.type !== "runtime.request") ||
      envelope.target !== "ENGINE" ||
      (envelope.source !== "remote" && envelope.source !== "native")
    ) {
      throw createError("Unsupported engine envelope", "INVALID_ENVELOPE");
    }
    const id = String(envelope.id || "");
    if (!/^[a-z0-9._:-]{8,160}$/i.test(id)) throw createError("Invalid runtime request id", "INVALID_REQUEST_ID");
    if (!isPlainObject(envelope.payload) || !Object.prototype.hasOwnProperty.call(envelope.payload, "message")) {
      throw createError("Missing runtime request payload", "INVALID_MESSAGE");
    }
    const message = cloneJson(envelope.payload.message, MAX_MESSAGE_BYTES, "Runtime message");
    if (!isPlainObject(message)) throw createError("Runtime message must be an object", "INVALID_MESSAGE");
    return { id, message, sender: sanitizeSender(envelope.payload.sender) };
  }

  function sendError(id, error) {
    if (!id || disposed) return;
    const code = String(error?.code || "ENGINE_DISPATCH_FAILED").slice(0, 64);
    const message = String(error?.message || error || "Engine dispatch failed").slice(0, 1024);
    try {
      postEnvelope(baseEnvelope(
        "runtime.response",
        id,
        "runtime",
        "REMOTE",
        { ok: false, error: { code, message }, noReceiver: code === "NO_RECEIVER" }
      ));
    } catch (postError) {
      console.error("[ChessCoach Engine] Could not post error response", postError);
    }
  }

  function handleNativeMessage(raw) {
    if (disposed) return;
    let id = "";
    try {
      const envelope = parseIncoming(raw);
      if (envelope?.type === "device.profile.response") {
        applyDeviceProfile(envelope.payload?.profile);
        return;
      }
      if (envelope?.type !== "runtime.message" && envelope?.type !== "runtime.request") return;
      const request = validateRequest(envelope);
      id = request.id;
      if (activeRequestIds.has(id)) throw createError("Duplicate runtime request", "DUPLICATE_REQUEST");
      if (activeRequestIds.size >= MAX_CONCURRENT_REQUESTS) throw createError("Too many runtime requests", "TOO_MANY_REQUESTS");
      activeRequestIds.add(id);
      runtime.dispatch(request.message, request.sender, { timeoutMs: 65000 }).then(
        result => {
          activeRequestIds.delete(id);
          if (disposed) return;
          try {
            postEnvelope(baseEnvelope("runtime.response", id, "runtime", "REMOTE", { ok: true, result }));
          } catch (error) {
            sendError(id, error);
          }
        },
        error => {
          activeRequestIds.delete(id);
          sendError(id, error);
        }
      );
    } catch (error) {
      if (id) sendError(id, error);
      else console.warn("[ChessCoach Engine] Ignoring invalid forwarded request", error);
    }
  }

  function installBridge() {
    if (disposed || bridge) return;
    const candidate = getNativeBridge();
    if (!candidate) {
      if (Date.now() - bridgeWaitStarted < BRIDGE_WAIT_MS) {
        bridgeWaitTimer = setTimeout(installBridge, 50);
      } else {
        console.error("[ChessCoach Engine] Native bridge did not become available");
      }
      return;
    }
    bridge = candidate;
    previousHandler = bridge.onmessage;
    bridge.onmessage = handleNativeMessage;
    requestDeviceProfile();
    sendReady();
  }

  function suspendForApp() {
    if (!disposed) runtime.suspendForApp();
  }

  function refreshDeviceProfileForApp(profile) {
    if (disposed) return;
    if (isPlainObject(profile)) applyDeviceProfile(profile);
    else requestDeviceProfile();
  }

  function resumeForApp(profile) {
    if (disposed) return;
    refreshDeviceProfileForApp(profile);
    runtime.resumeForApp();
    sendReady();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "hidden") suspendForApp();
    else resumeForApp();
  }

  function cleanup() {
    if (disposed) return;
    disposed = true;
    if (bridgeWaitTimer !== null) clearTimeout(bridgeWaitTimer);
    bridgeWaitTimer = null;
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pageshow", handlePageShow);
    window.removeEventListener("pagehide", handlePageHide);
    if (bridge && bridge.onmessage === handleNativeMessage) bridge.onmessage = previousHandler || null;
    activeRequestIds.clear();
    runtime.cleanup();
    bridge = null;
    if (window[HOST_KEY] === hostHandle) {
      try { delete window[HOST_KEY]; } catch (error) {}
    }
    if (window.CCEngineHost === hostHandle) {
      try { delete window.CCEngineHost; } catch (error) {}
    }
  }

  function handlePageHide(event) {
    if (event.persisted) suspendForApp();
    else cleanup();
  }

  function handlePageShow(event) {
    if (event.persisted && !disposed) resumeForApp();
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pageshow", handlePageShow);
  window.addEventListener("pagehide", handlePageHide);
  const hostHandle = Object.freeze({
    isAlive: () => !disposed,
    cleanup,
    suspendForApp,
    resumeForApp,
    refreshDeviceProfileForApp,
    dispatchFromNative: handleNativeMessage
  });
  Object.defineProperty(window, HOST_KEY, {
    value: hostHandle,
    enumerable: false,
    configurable: true,
    writable: false
  });
  Object.defineProperty(window, "CCEngineHost", {
    value: hostHandle,
    enumerable: false,
    configurable: true,
    writable: false
  });
  installBridge();
})();
