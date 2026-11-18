(function () {
  const CONTENT_INSTANCE_KEY = Symbol.for("cc.chesscom.content.instance");
  const previousContentInstance = window[CONTENT_INSTANCE_KEY];
  try {
    if (previousContentInstance?.isAlive?.()) return;
    previousContentInstance?.shutdown?.();
  } catch (e) {}
  try { window.ChessFX?.revive?.(); } catch (e) {}
  try { window.CC?.revive?.(); } catch (e) {}
  try { window.ChessCoachEngine?.revive?.(); } catch (e) {}

  console.log("[ChessCoach REWORK v15.8.1 — Engine Core 2, Full NNUE & Position-ID] Started!");

  function isStrictBrilliantMove(moveObj) {
    if (!moveObj) return false;
    const evalNum = parseFloat(moveObj.evalPawns) || 0;
    return Boolean(
      moveObj.isMateInOne ||
      moveObj.isForcedMateInTwo ||
      (moveObj.promo === "n" && evalNum >= 1.5) ||
      (moveObj.isSacrifice &&
        evalNum >= 2.0 &&
        !moveObj.ignoredHangingPiece &&
        !moveObj.underDirectAttack)
    );
  }

  if (window.ChessFX) {
    window.ChessFX.isBrilliantMove = isStrictBrilliantMove;
  }

  const ALL_STYLE_NAMES = {
    mogging: "⚡ Mogging",
    tal: "✦ Tal",
    alphazero: "🧠 AlphaZero",
    morphy: "🎭 Morphy",
    hikaru: "🚀 Nakamura",
    kasparov: "▲ Kasparov",
    fischer: "◈ Fischer",
    carlsen: "❖ Carlsen",
    solid: "🛡 Karpov",
    botvinnik: "🏛 Botvinnik",
    balanced: "⚙ Stockfish"
  };

  const THEME_ACCENT_COLORS = {
    minimal: ["#38bdf8", "#818cf8"],
    cyberpunk: ["#00f5d4", "#00bbf9"],
    aurora: ["#00f5d4", "#f72585"],
    hologram: ["#c77dff", "#48cae4"],
    crimson: ["#ff2a85", "#ff758f"],
    gold: ["#ffbe0b", "#fb5607"],
    matrix: ["#38b000", "#ccff33"],
    titanium: ["#e0fbfc", "#98c1d9"],
    obsidian: ["#f8fafc", "#94a3b8"],
    nebula: ["#67e8f9", "#d946ef"],
    grandmaster: ["#f8d477", "#6ee7b7"]
  };
  const ARROW_STYLE_IDS = new Set([
    "sq_cyber_frame", "sq_Step_badges", "sq_hologram_tiles", "sq_minimal_dots",
    "curved_neon", "comet_trail", "cyber_chevron", "quantum_portal", "tube_3d", "plasma",
    "sniper_3d", "dna_wave", "chroma_rgb", "laser", "classic", "dotted"
  ]);
  const MATE_STYLE_IDS = new Set(["phonk_skull", "orbital_laser", "royal_exec", "rofl_classic"]);

  const FILES = "abcdefgh";
  const STORAGE_PREFIX = "chesscom.";
  const SETTINGS_KEYS = Object.freeze([
    "workMode", "activeTabId", "panelLeft", "panelTop", "panelMinimized", "panelHidden",
    "customBgDataUrl", "customBgDim", "customBgBlur",
    "liveTelemetryEnabled", "teleShowClocks", "teleShowEngine", "teleShowWdl", "teleShowThreats",
    "elo", "style", "showArrows", "showEvalBar", "showAverageMove", "showWorstMove", "turnMode", "forcedMyColor",
    "useStockfishWasm", "engineMaxMode", "trapRadarEnabled", "audioRadarEnabled", "heatmapAlwaysOn",
    "uiTheme", "arrowStyle", "arrowScale", "arrowOpacity",
    "phonkEditEnabled", "mateStyle", "roflMode", "safeAntiBanGuard", "welcomeBannerHidden",
    "autoMoveEnabled", "legitAutoTiming", "humanHesitationEnabled", "autoT1LimiterEnabled", "maxSafeT1Percent",
    "autoMoveDelayMs", "autoMoveJitterMs", "autoMoveTriggerRate",
    "useAverageMoveSometimes", "averageMoveFrequency", "protectCriticalMoves", "autoClickMethod",
    "chesscomVisualMaskV1"
  ]);
  const storageKey = key => `${STORAGE_PREFIX}${key}`;

  // on Chess.com boardтупны only safe aboutфor: "legit" (by default) and "all" (advanced legit)
  let workMode = "legit";
  let mobilePreferenceUnsubscribe = null;
  let mobilePreferenceLoad = 0;
  let activeTabId = "analyzer";
  let panelLeft = null;
  let panelTop = null;
  let panelMinimized = false;
  let panelHidden = false;

  // Custom background from aboutводни
  let customBgDataUrl = "";
  let customBgDim = 0.72;
  let customBgBlur = 4;

  // Live telemetry 24/7
  let liveTelemetryEnabled = true;
  let teleShowClocks = true;
  let teleShowEngine = true;
  let teleShowWdl = true;
  let teleShowThreats = true;
  let lastTelemetryData = {
    serverSource: "STEALTH READY",
    pingMs: 0,
    myWin: 50,
    draw: 30,
    enemyWin: 20,
    nearestThreatText: "Waiting for game start on Chess.com..."
  };

  // СТАТИСТИMAP FAIR PLAY ANTI-BANon (Ктроль T1% matches со Stockfish)
  let legitStats = {
    totalMyMoves: 0,
    top1Matches: 0,
    secondLineMatches: 0,
    windowBlursCount: 0,
    lastBestUciOnMyTurn: "",
    lastAvgUciOnMyTurn: ""
  };

  let currentElo = 2400;
  let currentStyle = "tal";
  let showArrows = true;
  let showEvalBar = true;
  let showAverageMove = true;
  let showWorstMove = false;
  let turnMode = "my";
  let forcedMyColor = "auto";

  let useStockfishWasm = true;
  let engineMaxMode = false;
  let trapRadarEnabled = true;
  let audioRadarEnabled = true;
  let heatmapAlwaysOn = false;
  let isAltPressed = false;

  // Settings Stealthго Legit-Automove for Chess.com
  let autoMoveEnabled = false;
  let legitAutoTiming = true;
  let humanHesitationEnabled = true; // Imitation forдчивос in слож positionх
  let autoT1LimiterEnabled = true;   // Auto-удержан T1% ни 68%
  let maxSafeT1Percent = 66;         // Lossог T1%, above кfromоthresholdо форсируется 2nd line
  let autoMoveDelayMs = 540;
  let autoMoveJitterMs = 260;
  let autoMoveTriggerRate = 85;
  let useAverageMoveSometimes = true;
  let averageMoveFrequency = 30;
  let protectCriticalMoves = true;
  let autoClickMethod = "bezier_click"; // "bezier_click" | "bezier_drag"

  let uiTheme = "cyberpunk";
  let arrowStyle = "curved_neon";
  let arrowScale = 1.0;
  let arrowOpacity = 0.88;
  let phonkEditEnabled = false;
  let mateStyle = "phonk_skull";
  let roflMode = true;
  let safeAntiBanGuard = false;
  let welcomeBannerHidden = false;

  const DEFAULT_VISUAL_MASK = Object.freeze({
    version: 1,
    enabled: false,
    myPresetId: "anonymous",
    opponentPresetId: "nakamura",
    style: "broadcast",
    maskDetails: true,
    maskPageTitle: true,
    blockProfileHover: true,
    autoRotateOpponent: false,
    my: { nickname: "HiddenKnight", elo: 2400, title: "GM", countryCode: "", avatarUrl: "" },
    opponent: { nickname: "Hikaru", elo: 2802, title: "GM", countryCode: "US", avatarUrl: "https://images.chesscomfiles.com/uploads/v1/user/15448422.88c010c1.200x200o.3c5619f5441e.png" }
  });
  let visualMask = normalizeVisualMask(DEFAULT_VISUAL_MASK);
  let privacyMaskManager = null;
  let privacyMaskFoundPlayers = 0;
  let privacySaveTimer = null;
  let uiAbortController = null;

  let castlingRights = { K: true, Q: true, k: true, q: true };
  let prevGridState = null;
  let prevBoardPartForHistory = "";
  let currentEpSquare = "-";
  let halfmoveClock = 0;
  let fullmoveNumber = 1;
  let lastPathname = location.pathname;
  let historyBoardElement = null;
  let lastObservedActualTurn = null;
  let lastRealEnemyMove = null;
  let lastOurExecutedMove = null;

  let committedBoardKey = "";
  let committedEnemyBoardKey = "";
  let analysisRequestId = 0;
  let activeEngineBoardKey = "";
  const analysisSessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  let positionId = 0;
  let positionAnalysisId = 0;
  let positionRequestId = 0;
  let currentPositionKey = "";
  let boardDirty = true;
  let analysisRetryCount = 0;
  let finalEngineRetryCount = 0;
  let pendingAnalysisRetry = null;
  let cachedMoves = {
    best: null,
    average: null,
    worst: null,
    safeNonRepeatingUcis: [],
    boardKey: "",
    pass: "",
    isDangerPosition: false,
    heatmap: [],
    timeAdvice: null,
    telemetry: null,
    syzygyActive: false
  };
  let currentRoast = null;

  let evalGraphHistory = [];
  let lastRecordedGraphBoardKey = "";
  let recentPositionHistory = [];
  let gameStartedFromInitial = false;

  let autoMoveTimer = null;
  let animRetryTimer = null;
  let isExecutingMove = false;
  let activeNativeMove = null;
  let nativeMoveFailureKey = "";
  let nativeMoveFailures = 0;
  let nativeMoveBlockedKey = "";
  let nativeMoveBlockedState = null;
  let moveCooldownUntil = 0;
  let currentTurnDecision = {
    boardKey: "",
    decided: false,
    skip: false,
    move: null,
    typeLabel: "",
    totalDelay: 0,
    attempts: 0
  };

  let sessionMoveHistory = [];
  let suspectEngineStreak = 0;
  let uciHistoryList = [];
  let gameResultRecorded = false;

  let shadowRoot = null;
  let extensionInvalidated = false;
  let contentInstanceHandle = null;
  let mainIntervalId = null;
  let neuralCanvasRafId = null;
  const mobileSession = window.__CC_ANDROID_GAME_SESSION__ || null;
  let unregisterMobileCore = null;
  let mobileAnalysisLease = null;
  let mobilePollTimer = null;
  let cycleWakeTimer = null;
  let engineRecoveryTimer = null;

  const StockfishWasmEngine = window.ChessCoachEngine.create({
    isEnabled: () => useStockfishWasm && !extensionInvalidated && isContextValid()
  });

  function isContextValid() {
    try {
      return Boolean(typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function handleAsyncStorageError(operation, error = null) {
    let runtimeError = error;
    if (!runtimeError) {
      try {
        runtimeError = chrome.runtime?.lastError || null;
      } catch (e) {
        runtimeError = e;
      }
    }
    if (!runtimeError) return false;
    const message = String(runtimeError.message || runtimeError);
    console.warn(`[ChessCoach] ${operation}: ${message}`);
    if (!isContextValid() || /extension context invalidated/i.test(message)) {
      shutdownOrphanedScript();
    } else {
      setAutoStatusText("Access error to onsettings Chrome", "#ffbe0b");
    }
    return true;
  }

  function handleEngineVisibilityChange(event) {
    if (mobileSession) return;
    cancelNativeMove("visibility");
    clearAnalysisRetry();
    if (event?.type === "visibilitychange" && !document.hidden) {
      committedBoardKey = "";
      committedEnemyBoardKey = "";
      activeEngineBoardKey = "";
      forceRecalculate();
      return;
    }
    analysisRequestId++;
    activeEngineBoardKey = "";
    resetTurnDecision();
    StockfishWasmEngine.cancel?.();
  }

  function shutdownOrphanedScript() {
    if (extensionInvalidated) return;
    extensionInvalidated = true;
    cancelNativeMove("shutdown");
    clearAnalysisRetry();
    if (unregisterMobileCore) { unregisterMobileCore(); unregisterMobileCore = null; }
    clearTimeout(mobilePollTimer);
    clearTimeout(cycleWakeTimer);
    clearTimeout(engineRecoveryTimer);
    try { StockfishWasmEngine.terminate(); } catch (e) {}
    if (mainIntervalId) { clearInterval(mainIntervalId); mainIntervalId = null; }
    if (neuralCanvasRafId) { cancelAnimationFrame(neuralCanvasRafId); neuralCanvasRafId = null; }
    if (autoMoveTimer) { clearTimeout(autoMoveTimer); autoMoveTimer = null; }
    if (animRetryTimer) { clearTimeout(animRetryTimer); animRetryTimer = null; }
    if (privacySaveTimer) { clearTimeout(privacySaveTimer); privacySaveTimer = null; }
    if (privacyMaskManager) { privacyMaskManager.destroy(); privacyMaskManager = null; }
    if (uiAbortController) { uiAbortController.abort(); uiAbortController = null; }
    try { chrome.storage?.onChanged?.removeListener(handleStorageChanges); } catch (e) {}
    try {
      if (typeof window.ChessFX?.shutdown === "function") window.ChessFX.shutdown(shadowRoot);
      else if (window.ChessFX && shadowRoot) window.ChessFX.stopPhonkEdit(shadowRoot);
    } catch (e) {}
    try {
      const destroyScripts = window.CC?.destroy || window.CC?.cleanup;
      if (typeof destroyScripts === "function") destroyScripts.call(window.CC);
    } catch (e) {}
    window.removeEventListener("scroll", syncVisualPosition, true);
    window.removeEventListener("resize", syncVisualPosition);
    document.removeEventListener?.("visibilitychange", handleEngineVisibilityChange);
    window.removeEventListener("pagehide", handleEngineVisibilityChange);
    window.removeEventListener("cc-mobile-lifecycle", handleMobileMoveLifecycle);
    try {
      if (domObserver) domObserver.disconnect();
      if (boardResizeObserver) boardResizeObserver.disconnect();
    } catch (e) {}
    if (shadowRoot?.host?.isConnected) shadowRoot.host.remove();
    shadowRoot = null;
    cachedChessComBoardElement = null;
    cachedChessComRoots = [];
    observedBoardNode = null;
    observedBoardRoots = [];
    window.__CHESSCOACH_BOARD_STATE__ = null;
    if (window[CONTENT_INSTANCE_KEY] === contentInstanceHandle) {
      try { delete window[CONTENT_INSTANCE_KEY]; } catch (e) {}
    }
  }

  contentInstanceHandle = Object.freeze({
    isAlive: () => !extensionInvalidated && isContextValid(),
    revive: () => mobileSession?.revive(),
    shutdown: () => shutdownOrphanedScript()
  });
  Object.defineProperty(window, CONTENT_INSTANCE_KEY, { value: contentInstanceHandle, configurable: true });

  function safeSendMessage(payload, callback) {
    if (extensionInvalidated || !isContextValid()) {
      shutdownOrphanedScript();
      return;
    }
    try {
      chrome.runtime.sendMessage(payload, (res) => {
        try {
          if (chrome.runtime.lastError) {
            if (callback) callback({ error: chrome.runtime.lastError.message, status: "error", meta: payload.meta || null });
            return;
          }
          if (callback) callback(res);
        } catch (err) {
          shutdownOrphanedScript();
        }
      });
    } catch (err) {
      if (callback) callback({ error: String(err?.message || err), status: "error", meta: payload.meta || null });
    }
  }

  function getShadow() {
    if (shadowRoot) {
      if (!shadowRoot.host.isConnected) document.documentElement.appendChild(shadowRoot.host);
      return shadowRoot;
    }
    // byл DOM-stealth: ниasих data-атрибутов or ID on хост-элемgradientе in освн дwindowgradientе Chess.com
    const host = document.createElement("div");
    host.style.cssText = "all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483646;";
    document.documentElement.appendChild(host);
    shadowRoot = host.attachShadow({ mode: "closed" });
    if (typeof window.__ChessCoachRegisterHudShadow === "function") {
      window.__ChessCoachRegisterHudShadow(shadowRoot);
    }

    if (isContextValid()) {
      const linkEl = document.createElement("link");
      linkEl.rel = "stylesheet";
      linkEl.href = chrome.runtime.getURL("content/content.css");
      shadowRoot.appendChild(linkEl);
    }
    return shadowRoot;
  }

  function $(id) {
    return getShadow().getElementById(id);
  }

  function saveSetting(obj, recalculate = false) {
    if (extensionInvalidated || !isContextValid()) return;
    const preferences = window.__CC_MOBILE_PREFERENCES__;
    if (preferences) {
      const write = preferences.update("chesscom", obj, { source: "core", recalculate });
      write.catch(error => handleAsyncStorageError("mobile preferences", error));
      return write;
    }
    if (window.__CC_ANDROID_RUNTIME__) return;
    try {
      if (chrome.storage && chrome.storage.local) {
        const scoped = Object.fromEntries(Object.entries(obj || {}).map(([key, value]) => [storageKey(key), value]));
        const maybePromise = chrome.storage.local.set(scoped, () => {
          handleAsyncStorageError("chrome.storage.local.set");
        });
        if (maybePromise?.catch) {
          maybePromise.catch(error => handleAsyncStorageError("chrome.storage.local.set", error));
        }
      }
    } catch (e) {
      handleAsyncStorageError("chrome.storage.local.set", e);
    }
  }

  function setSelectSafe(selectNode, val, fallback) {
    if (!selectNode) return;
    const exists = Array.from(selectNode.options).some((o) => o.value === val);
    selectNode.value = exists ? val : fallback;
  }

  function applyCustomBackgroundToPanel() {
    const bgLayer = $("cc-custom-bg-layer");
    const dimLayer = $("cc-custom-bg-dim");
    const neuralCanvas = $("cc-neural-canvas");
    if (!bgLayer || !dimLayer) return;

    if (customBgDataUrl && customBgDataUrl.startsWith("data:image/")) {
      bgLayer.style.display = "block";
      bgLayer.style.backgroundImage = `url("${customBgDataUrl}")`;
      bgLayer.style.filter = `blur(${customBgBlur}px)`;
      dimLayer.style.display = "block";
      dimLayer.style.background = `rgba(6, 9, 15, ${customBgDim})`;
      if (neuralCanvas) neuralCanvas.style.opacity = "0.28";
    } else {
      bgLayer.style.display = "none";
      bgLayer.style.backgroundImage = "none";
      dimLayer.style.display = "none";
      if (neuralCanvas) neuralCanvas.style.opacity = "0.65";
    }
  }

  function applyPersistentPanelGeometry() {
    const panel = $("chesscoach-panel");
    const workspace = $("chesscoach-workspace");
    const modeBar = $("cc-mode-switcher-bar");
    const toggleBtn = $("cc-toggle-btn");
    if (!panel) return;

    if (typeof panelLeft === "number" && typeof panelTop === "number") {
      const clampedX = Math.max(0, Math.min(window.innerWidth - 120, panelLeft));
      const clampedY = Math.max(0, Math.min(window.innerHeight - 60, panelTop));
      panel.style.left = `${clampedX}px`;
      panel.style.top = `${clampedY}px`;
      panel.style.right = "auto";
    }

    panel.classList.toggle("cc-minimized", Boolean(panelMinimized));
    if (workspace) workspace.style.display = panelMinimized ? "none" : "grid";
    if (modeBar) modeBar.style.display = panelMinimized ? "none" : "grid";
    if (toggleBtn) toggleBtn.textContent = panelMinimized ? "▢" : "—";
    panel.style.display = panelHidden ? "none" : "flex";
  }

  function getT1MatchPercent() {
    if (legitStats.totalMyMoves === 0) return 0;
    return Math.round((legitStats.top1Matches / legitStats.totalMyMoves) * 100);
  }

  function updateLegitAntiBanMeterUI() {
    const valEl = $("cc-antiban-t1-val");
    const fillEl = $("cc-antiban-t1-fill");
    const hintEl = $("cc-antiban-t1-hint");
    const blurEl = $("cc-antiban-blur-badge");
    if (!valEl || !fillEl || !hintEl) return;

    const total = legitStats.totalMyMoves;
    const t1Pct = getT1MatchPercent();
    fillEl.style.width = `${Math.min(100, t1Pct)}%`;

    if (blurEl) {
      blurEl.textContent = `Alt-Tabs: ${legitStats.windowBlursCount}`;
      blurEl.style.color = legitStats.windowBlursCount > 4 ? "#ffbe0b" : "#94a3b8";
    }

    if (total < 4) {
      valEl.textContent = `🟢 T1: ${t1Pct}% (${total} move.) • CALIBRATION`;
      valEl.style.color = "#00f5d4";
      fillEl.style.background = "#00f5d4";
      hintEl.textContent = `Withoutdangerous corridor T1 on Chess.com: until ${maxSafeT1Percent}%. Auto-limiter itself will mix game 2-й line.`;
    } else if (t1Pct <= maxSafeT1Percent) {
      valEl.textContent = `🟢 T1: ${t1Pct}% (${legitStats.top1Matches}/${total}) • 100% LEGIT`;
      valEl.style.color = "#38b000";
      fillEl.style.background = "#38b000";
      hintEl.textContent = `Idealonя human statistics! Madeо moves by 2-й lines: ${legitStats.secondLineMatches}.`;
    } else if (t1Pct <= 76) {
      valEl.textContent = `🟡 T1: ${t1Pct}% (${legitStats.top1Matches}/${total}) • ABOVE NORM`;
      valEl.style.color = "#ffbe0b";
      fillEl.style.background = "#ffbe0b";
      hintEl.textContent = `accuracy closefrom to detection! Auto-limiter will switch next сby move on 2-ю line (yellow arrow).`;
    } else {
      valEl.textContent = `🔴 T1: ${t1Pct}% (${legitStats.top1Matches}/${total}) • DANGEROUS T1!`;
      valEl.style.color = "#ff2a85";
      fillEl.style.background = "#ff2a85";
      hintEl.textContent = `⚠️ Too many moves by 1-й lines Stockfish! Urgently make 1–2 move by yellow arrow or manually.`;
    }
  }

  function applyWorkModePreset(mode, triggerSave = true) {
    if (window.__CC_MOBILE_PREFERENCES__) {
      if (!["all", "hvh", "legit"].includes(mode)) return;
      if (triggerSave) saveSetting({ workMode: mode });
      else { workMode = mode; updateUIValues(); }
      return;
    }
    if (mode === "hvh") {
      mode = "legit";
      setAutoStatusText("🛡️ on Chess.com mode Slaughter (HvH) fromenabled for 100% defense from on!", "#ffbe0b");
    }

    workMode = mode;
    const panel = $("chesscoach-panel");
    if (panel) {
      panel.setAttribute("data-work-mode", mode);
    }

    if (mode === "legit") {
      currentElo = 2500;
      currentStyle = "tal";
      useStockfishWasm = true;
      showAverageMove = true;
      showWorstMove = false;
      engineMaxMode = false;
      legitAutoTiming = true;
      humanHesitationEnabled = true;
      autoT1LimiterEnabled = true;
      protectCriticalMoves = true;
      useAverageMoveSometimes = true;
      averageMoveFrequency = 32;
      autoMoveDelayMs = 540;
      autoMoveJitterMs = 260;
      StockfishWasmEngine.initWorker();

      if (triggerSave) {
        saveSetting({
          workMode: "legit",
          elo: 2500,
          style: "tal",
          useStockfishWasm: true,
          showAverageMove: true,
          showWorstMove: false,
          engineMaxMode: false,
          legitAutoTiming: true,
          protectCriticalMoves: true,
          useAverageMoveSometimes: true,
          averageMoveFrequency: 32,
          autoMoveDelayMs: 540,
          autoMoveJitterMs: 260
        });
      }
      setAutoStatusText("🛡 CHESS.COM STEALTH LEGIT (BÉZIER + T1 LIMITER 66%)", "#38b000");
    } else {
      if (triggerSave) {
        saveSetting({ workMode: "all" });
      }
      setAutoStatusText("◈ EXTENDED LEGIT-MODE (ALL SETTINGS OPENЫ)", "#00f5d4");
    }

    updateUIValues();
    if (triggerSave) {
      forceRecalculate();
    }
  }

  function detectPlayerDisplayName() {
    const bottomUser = document.querySelector(
      ".board-layout-bottom .user-tagline-username, .board-layout-bottom [data-test-element='user-tagline-username'], .player-bottom .user-tagline-username"
    );
    if (visualMask.enabled) return visualMask.my.nickname;
    if (bottomUser && bottomUser.textContent) {
      const clean = bottomUser.textContent.trim();
      if (clean && clean.length >= 2 && clean.length <= 24) return clean;
    }
    return "Grandmaster";
  }

  function getDynamicGreetingText() {
    const hour = new Date().getHours();
    const user = detectPlayerDisplayName();
    if (hour >= 5 && hour < 12) return `☀️ Good morning, ${user}! Stealth-module Chess.com active`;
    if (hour >= 12 && hour < 18) return `🛡️ Hello, ${user}! Anti-ban defense Fair Play on 100%`;
    if (hour >= 18 && hour < 23) return `🌌 Good evening, ${user}! Legit domination on Chess.com`;
    return `🌙 Nightonя session, ${user}? Crityouе Without and T1-filter on guard account!`;
  }

  function initNeuralCanvasBackground(panel) {
    if (window.__CC_ANDROID_RUNTIME__) return;
    const canvas = $("cc-neural-canvas");
    if (!canvas || !panel) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let width = 600;
    let height = 560;
    const mouse = { x: -999, y: -999 };

    const updateSize = () => {
      width = panel.clientWidth || 600;
      height = panel.clientHeight || 560;
      canvas.width = width;
      canvas.height = height;
    };
    updateSize();

    panel.addEventListener("mousemove", (e) => {
      const rect = panel.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    panel.addEventListener("mouseleave", () => {
      mouse.x = -999;
      mouse.y = -999;
    });

    const particles = Array.from({ length: 20 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      r: Math.random() * 1.8 + 0.9
    }));

    let lastFrameAt = 0;
    const renderFrame = (timestamp = 0) => {
      if (extensionInvalidated) return;
      if (panel.classList.contains("cc-minimized") || panel.style.display === "none") {
        neuralCanvasRafId = requestAnimationFrame(renderFrame);
        return;
      }
      const performanceMode = window.ChessCoachEngine.getPerformanceMode?.() || "normal";
      if (performanceMode === "critical") {
        neuralCanvasRafId = requestAnimationFrame(renderFrame);
        return;
      }
      const frameInterval = performanceMode === "constrained" ? 80 : 42;
      if (timestamp - lastFrameAt < frameInterval) {
        neuralCanvasRafId = requestAnimationFrame(renderFrame);
        return;
      }
      lastFrameAt = timestamp;

      if (canvas.width !== panel.clientWidth || canvas.height !== panel.clientHeight) {
        updateSize();
      }

      ctx.clearRect(0, 0, width, height);
      const [c1, c2] = THEME_ACCENT_COLORS[uiTheme] || THEME_ACCENT_COLORS.cyberpunk;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const mdx = mouse.x - p.x;
        const mdy = mouse.y - p.y;
        const mDist = Math.hypot(mdx, mdy);
        if (mDist < 110 && mDist > 1) {
          p.x -= (mdx / mDist) * 0.35;
          p.y -= (mdy / mDist) * 0.35;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? c1 : c2;
        ctx.globalAlpha = 0.55;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 105) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = c1;
            ctx.globalAlpha = (1 - dist / 105) * 0.18;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      neuralCanvasRafId = requestAnimationFrame(renderFrame);
    };

    if (neuralCanvasRafId) cancelAnimationFrame(neuralCanvasRafId);
    neuralCanvasRafId = requestAnimationFrame(renderFrame);
  }

  function loadSettings(resolvedSettings = null, triggerRecalculate = true) {
    if (!isContextValid()) return;
    const preferences = window.__CC_MOBILE_PREFERENCES__;
    if (preferences && resolvedSettings === null) {
      const generation = ++mobilePreferenceLoad;
      mobilePreferenceUnsubscribe?.();
      mobilePreferenceUnsubscribe = null;
      return preferences.ready.then(() => {
        if (extensionInvalidated || generation !== mobilePreferenceLoad) return;
        loadSettings(preferences.get("chesscom"));
        mobilePreferenceUnsubscribe = preferences.subscribe("chesscom", (settings, meta) => {
          if (!extensionInvalidated) loadSettings(settings, meta.recalculate === true);
        });
      }).catch(error => {
        handleAsyncStorageError("mobile preferences restore", error);
        throw error;
      });
    }
    if (window.__CC_ANDROID_RUNTIME__ && !preferences) return;
    try {
      if (chrome.storage && chrome.storage.local) {
        const readSettings = preferences
          ? (_keys, callback) => callback(Object.fromEntries(Object.entries(resolvedSettings).map(([key, value]) => [storageKey(key), value])))
          : (keys, callback) => chrome.storage.local.get(keys, callback);
        readSettings(
          [...SETTINGS_KEYS, ...SETTINGS_KEYS.map(storageKey)],
          (res) => {
            const storageFailed = handleAsyncStorageError("chrome.storage.local.get");
            if (extensionInvalidated || !isContextValid()) return;
            if (storageFailed || !res) res = {};
            const rawSettings = res;
            const migratedSettings = {};
            res = {};
            for (const key of SETTINGS_KEYS) {
              const scopedName = storageKey(key);
              if (Object.hasOwn(rawSettings, scopedName)) {
                res[key] = rawSettings[scopedName];
              } else if (Object.hasOwn(rawSettings, key)) {
                res[key] = rawSettings[key];
                migratedSettings[key] = rawSettings[key];
              }
            }
            if (Object.keys(migratedSettings).length > 0) saveSetting(migratedSettings);
            workMode = preferences && ["all", "hvh", "legit"].includes(res.workMode) ? res.workMode : res.workMode === "all" ? "all" : "legit";
            if (res.activeTabId) activeTabId = res.activeTabId;
            if (typeof res.panelLeft === "number") panelLeft = res.panelLeft;
            if (typeof res.panelTop === "number") panelTop = res.panelTop;
            if (typeof res.panelMinimized === "boolean") panelMinimized = res.panelMinimized;
            if (typeof res.panelHidden === "boolean") panelHidden = res.panelHidden;

            if (typeof res.customBgDataUrl === "string") customBgDataUrl = res.customBgDataUrl;
            if (res.customBgDim !== undefined) customBgDim = Number(res.customBgDim);
            if (res.customBgBlur !== undefined) customBgBlur = Number(res.customBgBlur);

            if (typeof res.liveTelemetryEnabled === "boolean") liveTelemetryEnabled = res.liveTelemetryEnabled;
            if (typeof res.teleShowClocks === "boolean") teleShowClocks = res.teleShowClocks;
            if (typeof res.teleShowEngine === "boolean") teleShowEngine = res.teleShowEngine;
            if (typeof res.teleShowWdl === "boolean") teleShowWdl = res.teleShowWdl;
            if (typeof res.teleShowThreats === "boolean") teleShowThreats = res.teleShowThreats;

            const storedElo = Number(res.elo);
            if (Number.isFinite(storedElo)) currentElo = Math.max(400, Math.min(3000, Math.round(storedElo)));
            if (typeof res.style === "string" && Object.hasOwn(ALL_STYLE_NAMES, res.style)) currentStyle = res.style;
            if (typeof res.showArrows === "boolean") showArrows = res.showArrows;
            if (typeof res.showEvalBar === "boolean") showEvalBar = res.showEvalBar;
            if (typeof res.showAverageMove === "boolean") showAverageMove = res.showAverageMove;
            if (typeof res.showWorstMove === "boolean") showWorstMove = res.showWorstMove;
            if (["my", "auto", "w", "b"].includes(res.turnMode)) turnMode = res.turnMode;
            if (["auto", "w", "b"].includes(res.forcedMyColor)) forcedMyColor = res.forcedMyColor;
            if (typeof res.useStockfishWasm === "boolean") useStockfishWasm = res.useStockfishWasm;
            if (typeof res.engineMaxMode === "boolean") engineMaxMode = res.engineMaxMode;
            if (typeof res.trapRadarEnabled === "boolean") trapRadarEnabled = res.trapRadarEnabled;
            if (typeof res.audioRadarEnabled === "boolean") audioRadarEnabled = res.audioRadarEnabled;
            if (typeof res.heatmapAlwaysOn === "boolean") heatmapAlwaysOn = res.heatmapAlwaysOn;

            if (typeof res.uiTheme === "string" && THEME_ACCENT_COLORS[res.uiTheme]) uiTheme = res.uiTheme;
            if (res.arrowStyle) arrowStyle = res.arrowStyle;
            if (res.arrowScale) arrowScale = Number(res.arrowScale);
            if (res.arrowOpacity) arrowOpacity = Number(res.arrowOpacity);
            if (typeof res.phonkEditEnabled === "boolean") phonkEditEnabled = res.phonkEditEnabled;
            if (res.mateStyle) mateStyle = res.mateStyle;
            if (typeof res.roflMode === "boolean") roflMode = res.roflMode;
            if (typeof res.safeAntiBanGuard === "boolean") safeAntiBanGuard = res.safeAntiBanGuard;
            if (typeof res.welcomeBannerHidden === "boolean") welcomeBannerHidden = res.welcomeBannerHidden;

            if (typeof res.autoMoveEnabled === "boolean") autoMoveEnabled = res.autoMoveEnabled;
            if (typeof res.legitAutoTiming === "boolean") legitAutoTiming = res.legitAutoTiming;
            if (typeof res.humanHesitationEnabled === "boolean") humanHesitationEnabled = res.humanHesitationEnabled;
            if (typeof res.autoT1LimiterEnabled === "boolean") autoT1LimiterEnabled = res.autoT1LimiterEnabled;
            if (res.maxSafeT1Percent !== undefined) maxSafeT1Percent = Number(res.maxSafeT1Percent);
            if (res.autoMoveDelayMs !== undefined) autoMoveDelayMs = Math.max(220, Number(res.autoMoveDelayMs));
            if (res.autoMoveJitterMs !== undefined) autoMoveJitterMs = Number(res.autoMoveJitterMs);
            if (res.autoMoveTriggerRate !== undefined) autoMoveTriggerRate = Number(res.autoMoveTriggerRate);
            if (typeof res.useAverageMoveSometimes === "boolean") useAverageMoveSometimes = res.useAverageMoveSometimes;
            if (res.averageMoveFrequency !== undefined) averageMoveFrequency = Number(res.averageMoveFrequency);
            if (typeof res.protectCriticalMoves === "boolean") protectCriticalMoves = res.protectCriticalMoves;
            if (res.autoClickMethod === "bezier_click" || res.autoClickMethod === "bezier_drag") {
              autoClickMethod = res.autoClickMethod;
            }
            if (!preferences && engineMaxMode) {
              useStockfishWasm = true;
              currentElo = 3000;
              currentStyle = "balanced";
              showAverageMove = false;
              useAverageMoveSometimes = false;
              autoT1LimiterEnabled = false;
              humanHesitationEnabled = false;
              legitAutoTiming = false;
              autoMoveTriggerRate = 100;
            }
            visualMask = normalizeVisualMask(res.chesscomVisualMaskV1 || DEFAULT_VISUAL_MASK);
            ensurePrivacyMaskManager();
            privacyMaskManager?.update();

            ensurePanel();
            applyCustomBackgroundToPanel();
            applyPersistentPanelGeometry();
            switchTab(activeTabId, false);
            updateUIValues();
            if (triggerRecalculate) forceRecalculate();
          }
        );
      }
    } catch (e) {
      shutdownOrphanedScript();
    }
  }

  function updateLiveTelemetryUI() {
    const card = $("cc-live-telemetry-card");
    if (!card) return;
    card.style.display = liveTelemetryEnabled ? "flex" : "none";
    if (!liveTelemetryEnabled) return;
    const telemetry = lastTelemetryData || {};

    const mySecs = getMyRemainingSeconds();
    const enSecs = getEnemyRemainingSeconds();
    const clocksKnown = Number.isFinite(mySecs) && Number.isFinite(enSecs);
    const diffSecs = clocksKnown ? Math.round(mySecs - enSecs) : 0;
    const diffStr = clocksKnown ? (diffSecs > 0 ? `+${diffSecs}s` : `${diffSecs}s`) : "—";

    const boxClocks = $("cc-tele-box-clocks");
    if (boxClocks) {
      boxClocks.style.display = teleShowClocks ? "block" : "none";
      const valEl = $("cc-tele-clocks-val");
      if (valEl) {
        valEl.innerHTML = `<span style="color:var(--cc-positive);">${formatClockMMSS(mySecs)}</span> vs <span style="color:var(--cc-negative);">${formatClockMMSS(enSecs)}</span> <small style="color:var(--cc-warning);">(${diffStr})</small>`;
      }
    }

    const boxEngine = $("cc-tele-box-engine");
    if (boxEngine) {
      boxEngine.style.display = teleShowEngine ? "block" : "none";
      const valEl = $("cc-tele-engine-val");
      if (valEl) {
        const wasmBadge = useStockfishWasm ? "SF LOCAL" : "JS CORE";
        const source = telemetry.serverSource || "STEALTH";
        valEl.textContent = source.startsWith("SF LOCAL") ? source : `${wasmBadge} • ${source}`;
      }
    }

    const boxWdl = $("cc-tele-box-wdl");
    if (boxWdl) {
      boxWdl.style.display = teleShowWdl ? "block" : "none";
      const w = telemetry.myWin ?? 50;
      const d = telemetry.draw ?? 30;
      const l = telemetry.enemyWin ?? 20;
      const valEl = $("cc-tele-wdl-val");
      if (valEl) {
        valEl.innerHTML = `<span style="color:var(--cc-positive);">Win: ${w}%</span> • <span style="color:var(--cc-text-secondary);">Draw: ${d}%</span> • <span style="color:var(--cc-negative);">Loss: ${l}%</span>`;
      }
      if ($("cc-wdl-fill-w")) $("cc-wdl-fill-w").style.width = `${w}%`;
      if ($("cc-wdl-fill-d")) $("cc-wdl-fill-d").style.width = `${d}%`;
      if ($("cc-wdl-fill-l")) $("cc-wdl-fill-l").style.width = `${l}%`;
    }

    const boxThreats = $("cc-tele-box-threats");
    if (boxThreats) {
      boxThreats.style.display = teleShowThreats ? "block" : "none";
      const valEl = $("cc-tele-threats-val");
      if (valEl) {
        valEl.textContent = telemetry.nearestThreatText || "No threats detected";
      }
    }
  }

  function updateUIValues() {
    const panel = $("chesscoach-panel");
    if (!panel) return;

    panel.setAttribute("data-work-mode", workMode);
    getShadow().querySelectorAll(".cc-mode-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === workMode);
    });

    const allThemes = Object.keys(THEME_ACCENT_COLORS).map(name => `theme-${name}`);
    allThemes.forEach((cls) => panel.classList.remove(cls));
    panel.classList.add(`theme-${uiTheme}`);

    const welcomeCard = $("cc-welcome-card");
    if (welcomeCard) {
      welcomeCard.style.display = welcomeBannerHidden ? "none" : "block";
      const greetEl = $("cc-welcome-greeting");
      if (greetEl) greetEl.textContent = getDynamicGreetingText();
      const modeChip = $("cc-welcome-chip-mode");
      if (modeChip) {
        modeChip.textContent = workMode === "legit" ? "🛡 Profile: Stealth Legit" : "◈ Profile: Extended Legit";
      }
      const cpuChip = $("cc-welcome-chip-cpu");
      if (cpuChip) {
        cpuChip.textContent = `🎯 T1-Limiter: <= ${maxSafeT1Percent}%`;
      }
      const wasmChip = $("cc-welcome-chip-wasm");
      if (wasmChip) {
        wasmChip.textContent = useStockfishWasm ? "⚡ SF LOCAL + Without: ON" : "⚙ JS Core + Without: ON";
      }
    }

    if ($("cc-elo-slider")) $("cc-elo-slider").value = currentElo;
    if ($("cc-elo-val")) $("cc-elo-val").textContent = `${currentElo} ELO`;
    if ($("cc-elo-badge")) $("cc-elo-badge").textContent = `${currentElo} ELO`;
    const enginePower = $("cc-engine-power");
    if (enginePower && (!cachedMoves.engineMeta || !useStockfishWasm)) {
      const resources = StockfishWasmEngine.getResourceProfile?.() || { dualWorker: false, totalHashMb: 64 };
      enginePower.textContent = useStockfishWasm
        ? `${resources.fullNnue ? "SF FULL" : "SF"} ${resources.dualWorker ? 2 : 1}C · H${resources.totalHashMb}M`
        : "JS CORE";
    }

    const styleLabel = ALL_STYLE_NAMES[currentStyle] || "✦ Tal";
    const bestMv = cachedMoves.best;
    const isBrilliant = bestMv && isStrictBrilliantMove(bestMv);
    const isTrap = bestMv && bestMv.isTrap && bestMv.trapChance >= 75;
    const isSyzygy = bestMv && bestMv.fromSyzygy;

    if ($("cc-best-title")) {
      let badgesHtml = "";
      if (isSyzygy) badgesHtml += `<span class="cc-syzygy-badge">🔮 SYZYGY GOD</span>`;
      if (isBrilliant) badgesHtml += `<span class="cc-brilliant-badge">💎 BRILLIANT !!</span>`;
      if (isTrap) badgesHtml += `<span class="cc-trap-badge">🪤 TRAP (${bestMv.trapChance}%)</span>`;
      $("cc-best-title").innerHTML = `✦ BEST MOVE (1ST LINE) • ${styleLabel}${badgesHtml}`;
    }
    if ($("cc-active-style-stat")) {
      $("cc-active-style-stat").textContent = styleLabel.replace(/^[^\s]+\s/, "");
    }

    if ($("cc-avg-card")) {
      $("cc-avg-card").style.display = showAverageMove ? "block" : "none";
    }
    if ($("cc-worst-card")) {
      $("cc-worst-card").style.display = (showWorstMove && workMode === "all") ? "block" : "none";
    }
    if ($("cc-show-avg-chk")) $("cc-show-avg-chk").checked = showAverageMove;
    if ($("cc-show-worst-chk")) $("cc-show-worst-chk").checked = showWorstMove;

    if ($("cc-sf-wasm-chk")) $("cc-sf-wasm-chk").checked = useStockfishWasm;
    if ($("cc-engine-max-chk")) $("cc-engine-max-chk").checked = engineMaxMode;
    if ($("cc-trap-radar-chk")) $("cc-trap-radar-chk").checked = trapRadarEnabled;
    if ($("cc-audio-radar-chk")) $("cc-audio-radar-chk").checked = audioRadarEnabled;
    if ($("cc-heatmap-always-chk")) $("cc-heatmap-always-chk").checked = heatmapAlwaysOn;

    if ($("cc-live-telemetry-chk")) $("cc-live-telemetry-chk").checked = liveTelemetryEnabled;
    if ($("cc-tele-clocks-chk")) $("cc-tele-clocks-chk").checked = teleShowClocks;
    if ($("cc-tele-engine-chk")) $("cc-tele-engine-chk").checked = teleShowEngine;
    if ($("cc-tele-wdl-chk")) $("cc-tele-wdl-chk").checked = teleShowWdl;
    if ($("cc-tele-threats-chk")) $("cc-tele-threats-chk").checked = teleShowThreats;
    updateLiveTelemetryUI();
    updateLegitAntiBanMeterUI();

    if ($("cc-color-pill")) {
      const labels = { auto: "◈ AUTO", w: "⚪ WHITE", b: "⚫ BLACK" };
      $("cc-color-pill").textContent = labels[forcedMyColor] || "◈ AUTO";
    }

    const autoText = autoMoveEnabled ? "🛡 LEGIT AUTO: ON" : "🛡 LEGIT AUTO: OFF";
    if ($("cc-toggle-auto")) {
      $("cc-toggle-auto").textContent = autoText;
      $("cc-toggle-auto").style.borderColor = autoMoveEnabled ? "var(--cc-accent)" : "rgba(255,255,255,0.14)";
      $("cc-toggle-auto").style.color = autoMoveEnabled ? "var(--cc-accent)" : "#e2e8f0";
    }
    if ($("cc-auto-master-chk")) $("cc-auto-master-chk").checked = autoMoveEnabled;
    if ($("cc-legit-timing-chk")) $("cc-legit-timing-chk").checked = legitAutoTiming;
    if ($("cc-hesitation-chk")) $("cc-hesitation-chk").checked = humanHesitationEnabled;
    if ($("cc-t1-limiter-chk")) $("cc-t1-limiter-chk").checked = autoT1LimiterEnabled;
    if ($("cc-t1-limit-slider")) $("cc-t1-limit-slider").value = maxSafeT1Percent;
    if ($("cc-t1-limit-val")) $("cc-t1-limit-val").textContent = `not above ${maxSafeT1Percent}%`;

    if ($("cc-auto-delay-slider")) $("cc-auto-delay-slider").value = autoMoveDelayMs;
    if ($("cc-auto-delay-val")) $("cc-auto-delay-val").textContent = `${(autoMoveDelayMs / 1000).toFixed(2)} sec`;
    if ($("cc-auto-jitter-slider")) $("cc-auto-jitter-slider").value = autoMoveJitterMs;
    if ($("cc-auto-jitter-val")) $("cc-auto-jitter-val").textContent = `±${(autoMoveJitterMs / 1000).toFixed(2)} sec`;
    if ($("cc-auto-rate-slider")) $("cc-auto-rate-slider").value = autoMoveTriggerRate;
    if ($("cc-auto-rate-val")) $("cc-auto-rate-val").textContent = `${autoMoveTriggerRate}% moves`;

    if ($("cc-auto-avg-chk")) $("cc-auto-avg-chk").checked = useAverageMoveSometimes;
    if ($("cc-auto-avg-freq-slider")) $("cc-auto-avg-freq-slider").value = averageMoveFrequency;
    if ($("cc-auto-avg-freq-val")) $("cc-auto-avg-freq-val").textContent = `${averageMoveFrequency}%`;
    if ($("cc-auto-protect-chk")) $("cc-auto-protect-chk").checked = protectCriticalMoves;
    setSelectSafe($("cc-auto-method-select"), autoClickMethod, "bezier_click");
    setSelectSafe($("cc-turn-select"), turnMode, "my");

    setSelectSafe($("cc-vis-theme"), uiTheme, "cyberpunk");
    setSelectSafe($("cc-vis-arrow-style"), arrowStyle, "curved_neon");
    setSelectSafe($("cc-vis-mate-style"), mateStyle, "phonk_skull");
    if ($("cc-vis-scale")) $("cc-vis-scale").value = arrowScale;
    if ($("cc-vis-scale-val")) $("cc-vis-scale-val").textContent = `${arrowScale.toFixed(1)}x`;
    if ($("cc-vis-opacity")) $("cc-vis-opacity").value = arrowOpacity;
    if ($("cc-vis-opacity-val")) $("cc-vis-opacity-val").textContent = `${Math.round(arrowOpacity * 100)}%`;
    if ($("cc-vis-arrows-chk")) $("cc-vis-arrows-chk").checked = showArrows;
    if ($("cc-vis-eval-chk")) $("cc-vis-eval-chk").checked = showEvalBar;
    if ($("cc-vis-phonk-chk")) $("cc-vis-phonk-chk").checked = phonkEditEnabled;
    if ($("cc-rage-rofl-chk")) $("cc-rage-rofl-chk").checked = roflMode;
    if ($("cc-rage-antiban-chk")) $("cc-rage-antiban-chk").checked = safeAntiBanGuard;

    if ($("cc-bg-dim-slider")) $("cc-bg-dim-slider").value = customBgDim;
    if ($("cc-bg-dim-val")) $("cc-bg-dim-val").textContent = `${Math.round(customBgDim * 100)}%`;
    if ($("cc-bg-blur-slider")) $("cc-bg-blur-slider").value = customBgBlur;
    if ($("cc-bg-blur-val")) $("cc-bg-blur-val").textContent = `${customBgBlur}px`;

    if ($("cc-mask-enabled-chk")) $("cc-mask-enabled-chk").checked = visualMask.enabled;
    if ($("cc-mask-details-chk")) $("cc-mask-details-chk").checked = visualMask.maskDetails;
    if ($("cc-mask-title-chk")) $("cc-mask-title-chk").checked = visualMask.maskPageTitle;
    if ($("cc-mask-hover-chk")) $("cc-mask-hover-chk").checked = visualMask.blockProfileHover;
    if ($("cc-mask-rotate-chk")) $("cc-mask-rotate-chk").checked = visualMask.autoRotateOpponent;
    setSelectSafe($("cc-mask-style-select"), visualMask.style, "broadcast");
    setSelectSafe($("cc-mask-my-preset"), visualMask.myPresetId, "custom");
    setSelectSafe($("cc-mask-opponent-preset"), visualMask.opponentPresetId, "custom");
    setSelectSafe($("cc-mask-my-title"), visualMask.my.title, "");
    setSelectSafe($("cc-mask-opponent-title"), visualMask.opponent.title, "");
    if ($("cc-mask-my-name")) $("cc-mask-my-name").value = visualMask.my.nickname;
    if ($("cc-mask-opponent-name")) $("cc-mask-opponent-name").value = visualMask.opponent.nickname;
    if ($("cc-mask-my-elo")) $("cc-mask-my-elo").value = visualMask.my.elo;
    if ($("cc-mask-opponent-elo")) $("cc-mask-opponent-elo").value = visualMask.opponent.elo;
    const preview = $("cc-mask-preview");
    if (preview) preview.setAttribute("data-mask-style", visualMask.style);
    if ($("cc-mask-preview-my-name")) $("cc-mask-preview-my-name").textContent = `${visualMask.my.title ? `${visualMask.my.title} ` : ""}${visualMask.my.nickname}`;
    if ($("cc-mask-preview-my-elo")) $("cc-mask-preview-my-elo").textContent = `${visualMask.my.elo}`;
    if ($("cc-mask-preview-opponent-name")) $("cc-mask-preview-opponent-name").textContent = `${visualMask.opponent.title ? `${visualMask.opponent.title} ` : ""}${visualMask.opponent.nickname}`;
    if ($("cc-mask-preview-opponent-elo")) $("cc-mask-preview-opponent-elo").textContent = `${visualMask.opponent.elo}`;
    const privacyApi = window.ChessCoachPrivacyMask;
    if ($("cc-mask-preview-my-avatar")) $("cc-mask-preview-my-avatar").src = visualMask.my.avatarUrl || privacyApi?.makeGeneratedAvatar(visualMask.my.nickname) || "";
    if ($("cc-mask-preview-opponent-avatar")) $("cc-mask-preview-opponent-avatar").src = visualMask.opponent.avatarUrl || privacyApi?.makeGeneratedAvatar(visualMask.opponent.nickname) || "";
    if ($("cc-mask-preview-my-flag")) $("cc-mask-preview-my-flag").textContent = privacyApi?.countryCodeToEmoji(visualMask.my.countryCode) || "♟";
    if ($("cc-mask-preview-opponent-flag")) $("cc-mask-preview-opponent-flag").textContent = privacyApi?.countryCodeToEmoji(visualMask.opponent.countryCode) || "♟";
    updatePrivacyMaskStatus();

    getShadow().querySelectorAll(".cc-style-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.style === currentStyle);
    });
  }

  function getMobileAnalysisConfig() {
    const effective = mobileSession?.effective();
    return JSON.stringify([currentElo, currentStyle, useStockfishWasm, engineMaxMode, turnMode, forcedMyColor,
      showAverageMove, showWorstMove, useAverageMoveSometimes, autoT1LimiterEnabled, trapRadarEnabled, workMode,
      Boolean(effective?.lowTier)]);
  }

  function finishCurrentAnalysis(requestId, phase = "complete") {
    if (requestId !== analysisRequestId) return;
    activeEngineBoardKey = "";
    if (mobileAnalysisLease) mobileSession?.finishAnalysis(mobileAnalysisLease, phase);
  }

  function scheduleEngineRecovery(state) {
    if (!mobileSession || engineRecoveryTimer || document.hidden || !useStockfishWasm) return;
    const configKey = getMobileAnalysisConfig();
    engineRecoveryTimer = setTimeout(async () => {
      engineRecoveryTimer = null;
      if (extensionInvalidated || document.hidden || currentPositionKey !== state.positionKey || getMobileAnalysisConfig() !== configKey) return;
      const ready = await StockfishWasmEngine.initWorker();
      if (extensionInvalidated || document.hidden || currentPositionKey !== state.positionKey || getMobileAnalysisConfig() !== configKey) return;
      if (!ready) { scheduleEngineRecovery(state); return; }
      mobileSession.retryAnalysis();
      analysisRetryCount = finalEngineRetryCount = 0;
      committedBoardKey = "";
      runCycle(false);
    }, 20000);
  }

  function suspendMobileCore(reason, releaseSearch) {
    resetTurnDecision();
    cancelNativeMove(reason);
    clearTimeout(cycleWakeTimer);
    clearTimeout(mobilePollTimer);
    clearTimeout(engineRecoveryTimer);
    engineRecoveryTimer = null;
    cycleWakeTimer = mobilePollTimer = null;
    if (releaseSearch) {
      clearAnalysisRetry();
      committedBoardKey = committedEnemyBoardKey = "";
      StockfishWasmEngine.terminate();
    }
    if (reason !== "settings") hideArrows();
    try { window.ChessFX?.stopPhonkEdit?.(shadowRoot); } catch (e) {}
  }

  let lastStatusString = "";
  function setAutoStatusText(text, color = "#00f5d4") {
    if (text === lastStatusString) return;
    lastStatusString = text;
    const el = $("cc-auto-live-status");
    if (el) {
      el.textContent = text;
      el.style.color = color;
    }
  }

  function setMoveExecutionState(executing, reason = "") {
    isExecutingMove = Boolean(executing);
    window.dispatchEvent(new CustomEvent("cc-core-state", {
      detail: { source: "chesscoach-core", platform: "chesscom", executing: isExecutingMove, allowOverlayPassthrough: isExecutingMove, reason }
    }));
  }

  function cancelNativeMove(reason) {
    if (!activeNativeMove) return;
    const action = activeNativeMove;
    action.cancelReason = reason;
    if (action.gestureSent) {
      nativeMoveBlockedKey = action.failureKey;
      nativeMoveBlockedState = action.inputState;
    }
    action.controller.abort();
  }

  function isNativeAutoBlocked(state) {
    const blocked = nativeMoveBlockedState;
    if (!blocked) return false;
    const changedGame = blocked.url !== location.href || blocked.board !== state.boardElement || blocked.myColor !== state.myColor;
    const realReply = blocked.lastEnemy !== lastRealEnemyMove || (blocked.sawOpponent && state.actualTurn === state.myColor && state.positionKey !== blocked.positionKey);
    if (changedGame || realReply) {
      nativeMoveBlockedState = null;
      nativeMoveBlockedKey = "";
      return false;
    }
    if (state.actualTurn !== state.myColor) blocked.sawOpponent = true;
    return true;
  }

  function handleMobileMoveLifecycle(event) {
    if (mobileSession) return;
    const detail = event?.detail;
    if (detail?.cancelPendingMoves === true || detail?.state === "settings") {
      resetTurnDecision();
      cancelNativeMove("mobile-pause");
      if (autoMoveEnabled) setAutoStatusText(detail?.state === "settings" ? "Automove paused: settings open" : "Automove suspended", "#ffbe0b");
    } else if (detail?.state === "active") {
      scheduleAutoMoveIfNeeded();
    }
  }

  function clearAnalysisRetry() {
    if (pendingAnalysisRetry) clearTimeout(pendingAnalysisRetry.timer);
    pendingAnalysisRetry = null;
  }

  function scheduleAnalysisRetry(state, delayMs) {
    clearAnalysisRetry();
    const retry = { positionId: state.positionId, positionKey: state.positionKey, url: location.href, notBefore: Date.now() + delayMs, timer: null };
    pendingAnalysisRetry = retry;
    committedBoardKey = state.boardKey;
    retry.timer = setTimeout(() => {
      if (pendingAnalysisRetry !== retry) return;
      pendingAnalysisRetry = null;
      if (extensionInvalidated || document.hidden || location.href !== retry.url ||
          positionId !== retry.positionId || currentPositionKey !== retry.positionKey) return;
      // Unlock immediately before the retry, never while the polling interval is still active.
      committedBoardKey = "";
      mobileSession?.retryAnalysis();
      runCycle(false);
    }, delayMs);
  }

  function resetTurnDecision() {
    clearTimeout(autoMoveTimer);
    autoMoveTimer = null;
    currentTurnDecision = {
      boardKey: "",
      decided: false,
      skip: false,
      move: null,
      typeLabel: "",
      totalDelay: 0,
      attempts: 0
    };
  }

  function clearPositionPresentation(label = "SYNCING POSITION...") {
    if (autoMoveTimer) { clearTimeout(autoMoveTimer); autoMoveTimer = null; }
    cachedMoves = { best: null, average: null, worst: null, heatmap: [], boardKey: "", positionId: -1, qualityRank: -1 };
    committedBoardKey = "";
    committedEnemyBoardKey = "";
    activeEngineBoardKey = "";
    resetTurnDecision();
    hideArrows();
    renderEvalBar(null, 0);
    const activeBox = $("cc-my-turn-active");
    if (activeBox) activeBox.style.display = "flex";
    if ($("cc-best-desc")) $("cc-best-desc").textContent = label;
    if ($("cc-best-eval")) $("cc-best-eval").textContent = "--";
    if ($("cc-best-pv")) $("cc-best-pv").textContent = "Waiting for stable board";
    if ($("cc-avg-box")) $("cc-avg-box").style.display = "none";
    if ($("cc-worst-box")) $("cc-worst-box").style.display = "none";
    for (const id of ["cc-mate-banner", "cc-time-sniper-banner", "cc-roast-box"]) {
      const node = $(id); if (node) node.style.display = "none";
    }
    if ($("cc-opening-name")) $("cc-opening-name").textContent = "◈ UPDATING POSITION";
    if ($("cc-opening-plan")) $("cc-opening-plan").textContent = "Waiting for new analysis";
    if ($("cc-tele-threats-val")) $("cc-tele-threats-val").textContent = "Syncing position...";
    lastTelemetryData = null;
    updateEvalMoodAndEngineBadge(null, null);
  }

  function markBoardDirty(reason = "DOM") {
    if (boardDirty && reason !== "BOARD_REPLACED") return;
    boardDirty = true;
    hideArrows();
    // Piece styling alone must not cancel or restart canonical-position analysis.
    if (reason !== "BOARD_REPLACED" && reason !== "NO_BOARD") return;
    mobileSession?.invalidate(reason);
    clearAnalysisRetry();
    positionAnalysisId++;
    analysisRequestId++;
    StockfishWasmEngine.cancel?.();
    clearPositionPresentation("SYNCING POSITION...");
  }

  function adoptPositionState(state) {
    if (!state?.positionKey) return null;
    const restoreArrows = boardDirty && state.positionKey === currentPositionKey && cachedMoves.boardKey === state.boardKey;
    if (state.positionKey !== currentPositionKey) {
      clearAnalysisRetry();
      if (currentPositionKey) {
        analysisRequestId++;
        StockfishWasmEngine.cancel?.();
        clearPositionPresentation("NEW POSITION • ANALYSIS...");
      }
      currentPositionKey = state.positionKey;
      positionId++;
      positionAnalysisId++;
      analysisRetryCount = 0;
      finalEngineRetryCount = 0;
    }
    boardDirty = false;
    state.sessionId = analysisSessionId;
    state.positionId = positionId;
    state.positionKey = currentPositionKey;
    if (window.__CHESSCOACH_BOARD_STATE__) {
      window.__CHESSCOACH_BOARD_STATE__.positionId = positionId;
      window.__CHESSCOACH_BOARD_STATE__.positionKey = currentPositionKey;
    }
    if (restoreArrows) renderArrowsOverlay(state, cachedMoves);
    return state;
  }

  function createAnalysisMeta(state, pass, analysisId) {
    return {
      sessionId: analysisSessionId,
      positionId: state.positionId,
      analysisId,
      requestId: ++positionRequestId,
      pass,
      positionKey: state.positionKey,
      analysisKey: state.boardKey,
      elo: currentElo,
      engineMaxMode,
      ...(mobileSession ? { mobileEpoch: mobileSession.epoch, configKey: getMobileAnalysisConfig() } : {})
    };
  }

  function isCurrentAnalysisMeta(meta) {
    if (mobileSession && (!mobileSession.isReady || meta?.mobileEpoch !== mobileSession.epoch)) return false;
    if (boardDirty && meta?.sessionId === analysisSessionId && meta.positionId === positionId && meta.analysisId === positionAnalysisId) {
      const fresh = captureBoardState(true);
      if (!fresh || fresh.animating) {
        committedBoardKey = "";
        activeEngineBoardKey = "";
        mobileSession?.retryAnalysis();
        return false;
      }
      adoptPositionState(fresh);
    }
    return Boolean(meta && !boardDirty && meta.sessionId === analysisSessionId && meta.positionId === positionId && meta.analysisId === positionAnalysisId && meta.positionKey === currentPositionKey);
  }

  function isCachedAnalysisCurrent(state = null) {
    const hasVisual = Boolean(cachedMoves?.best || cachedMoves?.heatmap?.length);
    if (!currentPositionKey) return Boolean(hasVisual && (!state || !cachedMoves.boardKey || cachedMoves.boardKey === state.boardKey));
    return Boolean(!boardDirty && hasVisual && cachedMoves.positionId === positionId && (!state || state.positionKey === currentPositionKey));
  }

  function forceRecalculate() {
    if (mobileSession?.hasAnalysis(currentPositionKey, getMobileAnalysisConfig()) && mobileSession.snapshot().analysis !== "failed") {
      scheduleAutoMoveIfNeeded();
      return;
    }
    if (mobileSession?.snapshot().analysis === "failed") mobileSession.retryAnalysis();
    cancelNativeMove("recalculate");
    clearAnalysisRetry();
    committedBoardKey = "";
    committedEnemyBoardKey = "";
    finalEngineRetryCount = 0;
    positionAnalysisId++;
    resetTurnDecision();
    runCycle(true);
  }

  function switchTab(tabId, saveToStorage = true) {
    const buttons = [...getShadow().querySelectorAll(".cc-tab-btn")];
    const panes = [...getShadow().querySelectorAll(".cc-tab-pane")];
    const isValid = buttons.some(button => button.dataset.tab === tabId) && panes.some(pane => pane.id === `cc-pane-${tabId}`);
    const scriptsPendingInjection = tabId === "scripts" && !isValid;
    const safeTabId = isValid ? tabId : "analyzer";
    activeTabId = scriptsPendingInjection ? "scripts" : safeTabId;
    buttons.forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === safeTabId);
    });
    panes.forEach((p) => {
      p.classList.toggle("active", p.id === `cc-pane-${safeTabId}`);
    });
    if (saveToStorage || (!isValid && !scriptsPendingInjection)) {
      saveSetting({ activeTabId: safeTabId });
    }
    if (safeTabId === "analyzer") {
      renderLiveEvalGraph();
    }
  }

  function buildCurrentConfigPayload(configName = "ChessCom_Legit", includeBg = true) {
    return {
      signature: "CHESSCOACH_CONFIG_V15",
      version: "15.8.0",
      platform: "chess.com",
      name: configName,
      exportedAt: new Date().toISOString(),
      settings: {
        workMode,
        elo: currentElo,
        style: currentStyle,
        showArrows,
        showEvalBar,
        showAverageMove,
        showWorstMove,
        turnMode,
        forcedMyColor,
        useStockfishWasm,
        engineMaxMode,
        trapRadarEnabled,
        audioRadarEnabled,
        heatmapAlwaysOn,
        liveTelemetryEnabled,
        teleShowClocks,
        teleShowEngine,
        teleShowWdl,
        teleShowThreats,
        autoMoveEnabled,
        legitAutoTiming,
        humanHesitationEnabled,
        autoT1LimiterEnabled,
        maxSafeT1Percent,
        autoMoveDelayMs,
        autoMoveJitterMs,
        autoMoveTriggerRate,
        useAverageMoveSometimes,
        averageMoveFrequency,
        protectCriticalMoves,
        autoClickMethod,
        uiTheme,
        arrowStyle,
        arrowScale,
        arrowOpacity,
        phonkEditEnabled,
        mateStyle,
        roflMode,
        safeAntiBanGuard,
        visualMask,
        customBgDataUrl: includeBg ? customBgDataUrl : "",
        customBgDim,
        customBgBlur
      }
    };
  }

  function applyImportedChessConfig(rawObj) {
    if (!rawObj || typeof rawObj !== "object") return false;
    const s = (rawObj.signature === "CHESSCOACH_CONFIG_V15" && rawObj.settings) ? rawObj.settings : rawObj;
    if (!s || typeof s !== "object") return false;
    const knownKeys = [
      "workMode", "elo", "style", "showArrows", "showEvalBar", "showAverageMove", "showWorstMove",
      "turnMode", "forcedMyColor", "useStockfishWasm", "engineMaxMode", "uiTheme", "arrowStyle", "visualMask",
      "autoMoveEnabled", "customBgDataUrl"
    ];
    if (!knownKeys.some(key => Object.prototype.hasOwnProperty.call(s, key))) return false;

    if (s.workMode === "legit" || s.workMode === "all") workMode = s.workMode;
    if (s.elo !== undefined) currentElo = Math.max(400, Math.min(3000, Number(s.elo) || 2400));
    if (typeof s.style === "string" && ALL_STYLE_NAMES[s.style]) currentStyle = s.style;

    if (typeof s.showArrows === "boolean") showArrows = s.showArrows;
    if (typeof s.showEvalBar === "boolean") showEvalBar = s.showEvalBar;
    if (typeof s.showAverageMove === "boolean") showAverageMove = s.showAverageMove;
    if (typeof s.showWorstMove === "boolean") showWorstMove = s.showWorstMove;
    if (["my", "auto", "w", "b"].includes(s.turnMode)) turnMode = s.turnMode;
    if (["auto", "w", "b"].includes(s.forcedMyColor)) forcedMyColor = s.forcedMyColor;

    if (typeof s.useStockfishWasm === "boolean") useStockfishWasm = s.useStockfishWasm;
    if (typeof s.engineMaxMode === "boolean") engineMaxMode = s.engineMaxMode;
    if (typeof s.trapRadarEnabled === "boolean") trapRadarEnabled = s.trapRadarEnabled;
    if (typeof s.audioRadarEnabled === "boolean") audioRadarEnabled = s.audioRadarEnabled;
    if (typeof s.heatmapAlwaysOn === "boolean") heatmapAlwaysOn = s.heatmapAlwaysOn;

    if (typeof s.liveTelemetryEnabled === "boolean") liveTelemetryEnabled = s.liveTelemetryEnabled;
    if (typeof s.teleShowClocks === "boolean") teleShowClocks = s.teleShowClocks;
    if (typeof s.teleShowEngine === "boolean") teleShowEngine = s.teleShowEngine;
    if (typeof s.teleShowWdl === "boolean") teleShowWdl = s.teleShowWdl;
    if (typeof s.teleShowThreats === "boolean") teleShowThreats = s.teleShowThreats;

    if (typeof s.autoMoveEnabled === "boolean") autoMoveEnabled = s.autoMoveEnabled;
    if (typeof s.legitAutoTiming === "boolean") legitAutoTiming = s.legitAutoTiming;
    if (typeof s.humanHesitationEnabled === "boolean") humanHesitationEnabled = s.humanHesitationEnabled;
    if (typeof s.autoT1LimiterEnabled === "boolean") autoT1LimiterEnabled = s.autoT1LimiterEnabled;
    if (s.maxSafeT1Percent !== undefined) maxSafeT1Percent = Math.max(50, Math.min(80, Number(s.maxSafeT1Percent) || 66));
    if (s.autoMoveDelayMs !== undefined) autoMoveDelayMs = Math.max(220, Math.min(2500, Number(s.autoMoveDelayMs) || 540));
    if (s.autoMoveJitterMs !== undefined) autoMoveJitterMs = Math.max(60, Math.min(1000, Number(s.autoMoveJitterMs) || 260));
    if (s.autoMoveTriggerRate !== undefined) autoMoveTriggerRate = Math.max(20, Math.min(100, Number(s.autoMoveTriggerRate) || 85));
    if (typeof s.useAverageMoveSometimes === "boolean") useAverageMoveSometimes = s.useAverageMoveSometimes;
    if (s.averageMoveFrequency !== undefined) averageMoveFrequency = Math.max(10, Math.min(75, Number(s.averageMoveFrequency) || 30));
    if (typeof s.protectCriticalMoves === "boolean") protectCriticalMoves = s.protectCriticalMoves;
    if (s.autoClickMethod === "bezier_click" || s.autoClickMethod === "bezier_drag") {
      autoClickMethod = s.autoClickMethod;
    }

    if (typeof s.uiTheme === "string" && THEME_ACCENT_COLORS[s.uiTheme]) uiTheme = s.uiTheme;
    if (ARROW_STYLE_IDS.has(s.arrowStyle)) arrowStyle = s.arrowStyle;
    if (s.arrowScale !== undefined) arrowScale = Math.max(0.6, Math.min(1.6, Number(s.arrowScale) || 1));
    if (s.arrowOpacity !== undefined) arrowOpacity = Math.max(0.3, Math.min(1, Number(s.arrowOpacity) || 0.88));
    if (typeof s.phonkEditEnabled === "boolean") phonkEditEnabled = s.phonkEditEnabled;
    if (MATE_STYLE_IDS.has(s.mateStyle)) mateStyle = s.mateStyle;
    if (typeof s.roflMode === "boolean") roflMode = s.roflMode;
    if (typeof s.safeAntiBanGuard === "boolean") safeAntiBanGuard = s.safeAntiBanGuard;

    if (typeof s.customBgDataUrl === "string" && (s.customBgDataUrl === "" || s.customBgDataUrl.startsWith("data:image/"))) {
      customBgDataUrl = s.customBgDataUrl;
    }
    if (s.customBgDim !== undefined) customBgDim = Math.max(0.2, Math.min(0.92, Number(s.customBgDim) || 0.72));
    if (s.customBgBlur !== undefined) customBgBlur = Math.max(0, Math.min(16, Number(s.customBgBlur) || 0));
    if (s.visualMask && typeof s.visualMask === "object") visualMask = normalizeVisualMask(s.visualMask);

    if (useStockfishWasm) {
      StockfishWasmEngine.initWorker();
    }

    saveSetting({
      workMode,
      elo: currentElo,
      style: currentStyle,
      showArrows,
      showEvalBar,
      showAverageMove,
      showWorstMove,
      turnMode,
      forcedMyColor,
      useStockfishWasm,
      engineMaxMode,
      trapRadarEnabled,
      audioRadarEnabled,
      heatmapAlwaysOn,
      liveTelemetryEnabled,
      teleShowClocks,
      teleShowEngine,
      teleShowWdl,
      teleShowThreats,
      autoMoveEnabled,
      legitAutoTiming,
      humanHesitationEnabled,
      autoT1LimiterEnabled,
      maxSafeT1Percent,
      autoMoveDelayMs,
      autoMoveJitterMs,
      autoMoveTriggerRate,
      useAverageMoveSometimes,
      averageMoveFrequency,
      protectCriticalMoves,
      autoClickMethod,
      uiTheme,
      arrowStyle,
      arrowScale,
      arrowOpacity,
      phonkEditEnabled,
      mateStyle,
      roflMode,
      safeAntiBanGuard,
      chesscomVisualMaskV1: visualMask,
      customBgDataUrl,
      customBgDim,
      customBgBlur
    });

    applyCustomBackgroundToPanel();
    ensurePrivacyMaskManager();
    privacyMaskManager?.update();
    updateUIValues();
    forceRecalculate();
    return true;
  }

  function ensurePanel() {
    if ($("chesscoach-panel")) return;

    const panel = document.createElement("div");
    panel.id = "chesscoach-panel";
    panel.setAttribute("data-work-mode", workMode);
    panel.innerHTML = `
      <div id="cc-custom-bg-layer"></div>
      <div id="cc-custom-bg-dim"></div>
      <canvas id="cc-neural-canvas"></canvas>

      <div id="chesscoach-header">
        <div class="cc-brand">
          <span class="cc-brand-dot"></span>
          <span>CHESSCOACH // CHESS.COM STEALTH</span>
          <span class="cc-badge" id="cc-elo-badge">${currentElo} ELO</span>
          <span class="cc-engine-power" id="cc-engine-power">JS CORE</span>
          <span class="cc-deep-status" id="cc-deep-status">⚡ DEEP SEARCH...</span>
        </div>
        <div class="cc-header-controls">
          <button class="cc-pill-btn" id="cc-color-pill" title="Quick switch of your color">◈ AUTO</button>
          <button class="cc-pill-btn" id="cc-toggle-btn" title="Collapse/Expand (or INSERT key)">—</button>
        </div>
      </div>

      <div id="cc-project-strip" role="note" aria-label="Official free project">
        <span class="cc-free-badge">FREE</span>
        <a href="https://t.me/chesscoach_dev" target="_blank" rel="noopener noreferrer" title="Официаль channel ChessCoach">@chesscoach_dev</a>
        <button type="button" id="cc-project-open" class="cc-project-button">About the project</button>
      </div>

      <!-- ПЕРЕКЛЮЧАТЕЛЬ MODES CHESS.COM -->
      <div id="cc-mode-switcher-bar">
        <button class="cc-mode-btn" data-mode="hvh" style="opacity:0.35;" title="Mode HvH (Slaughter) blocked on Chess.com for 100% defense from on">
          🔒 HvH (BLOCK)
        </button>
        <button class="cc-mode-btn" data-mode="all" title="Extended Legit: fromopens all fine settings">
          ◈ ALL LEGIT-OPTIONS
        </button>
        <button class="cc-mode-btn active" data-mode="legit" title="Maximum stealth: curvesyouе Without, auto-limiter T1% and youе pauses">
          🛡 STEALTH LEGIT
        </button>
      </div>

      <div id="chesscoach-workspace">
        <div class="cc-sidebar">
          <div class="cc-nav-list">
            <button class="cc-tab-btn active" data-tab="analyzer">
              <span class="cc-tab-icon">◈</span> ANALYSIS
            </button>
            <button class="cc-tab-btn" data-tab="automove">
              <span class="cc-tab-icon">🛡</span> LEGIT AUTO
            </button>
            <button class="cc-tab-btn" data-tab="rage">
              <span class="cc-tab-icon">⚡</span> ENGINE
            </button>
            <button class="cc-tab-btn" data-tab="visuals">
              <span class="cc-tab-icon">✦</span> VISUAL
            </button>
            <button class="cc-tab-btn" data-tab="privacy">
              <span class="cc-tab-icon">◉</span> RECORDING
            </button>
            <button class="cc-tab-btn" data-tab="misc">
              <span class="cc-tab-icon">❖</span> BASE / CFG
            </button>
          </div>

          <div class="cc-sidebar-footer">
            <div class="cc-mini-stat">
              <span>PLATFORM</span>
              <strong style="color:#38b000;">CHESS.COM</strong>
            </div>
            <div class="cc-mini-stat">
              <span>STYLE</span>
              <strong id="cc-active-style-stat">Tal</strong>
            </div>
            <div class="cc-mini-stat">
              <span>MOVE MANUALLY</span>
              <strong style="color:#00f5d4;">[KEY. X]</strong>
            </div>
            <div class="cc-mini-stat" style="opacity:0.75;">
              <span>BOARD MAP</span>
              <strong style="color:#c77dff;">[ALT]</strong>
            </div>
          </div>
        </div>

        <div class="cc-main-view">
          <div class="cc-tab-pane active" id="cc-pane-analyzer">
            <div id="cc-welcome-card">
              <div class="cc-welcome-top">
                <div class="cc-welcome-greeting" id="cc-welcome-greeting">🛡️ Hello, Grandmaster! Stealth-module Chess.com active</div>
                <button class="cc-welcome-close" id="cc-welcome-close-btn" title="Hide welcome">✕</button>
              </div>
              <div class="cc-welcome-sub">
                Anticheat-defense: <strong>Crityouе Without</strong>, <strong>Gaussian variance</strong> and <strong>Auto-limiter T1%</strong>. onpress key <strong>[X]</strong> for single legit-move!
              </div>
              <div class="cc-welcome-chips">
                <span class="cc-welcome-chip" id="cc-welcome-chip-mode">🛡 Profile: Stealth Legit</span>
                <span class="cc-welcome-chip" id="cc-welcome-chip-cpu">🎯 T1-Limiter: <= 66%</span>
                <span class="cc-welcome-chip" id="cc-welcome-chip-wasm">⚡ SF LOCAL + Without: ON</span>
              </div>
            </div>

            <!-- RADAR FAIR PLAY T1% И ANTI-BANН МЕТРИMAP -->
            <div class="cc-glass-card" style="border-left: 3.5px solid #38b000; padding: 8px 11px;">
              <div class="cc-section-title" style="margin-bottom:4px;">
                <span>🛡️ RADAR ANTICHEATА (FAIR PLAY T1% MATCH GUARD)</span>
                <span id="cc-antiban-blur-badge" style="font-size:9.5px; color:#94a3b8; font-family:monospace;">Alt-Tabs: 0</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <strong id="cc-antiban-t1-val" style="color:#00f5d4; font-family:monospace; font-size:11px;">🟢 T1: 0% • CALIBRATION</strong>
                <span style="font-size:9.5px; color:#cbd5e1;">Norm GM: 52%–68%</span>
              </div>
              <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden; margin-bottom:5px;">
                <div id="cc-antiban-t1-fill" style="width:0%; height:100%; background:#00f5d4; transition:width 0.3s ease;"></div>
              </div>
              <div id="cc-antiban-t1-hint" style="font-size:10px; color:#cbd5e1; line-height:1.3;">
                Auto-limiter T1% active: if accuracy by 1-й lines youexceeds bythreshold, software youtakes safe 2-ю line.
              </div>
            </div>

            <!-- ЖИВОЕ byЛОЖЕНИЕ GAME 24/7 -->
            <div id="cc-live-telemetry-card">
              <div class="cc-tele-header">
                <span>📡 CURRENT GAME STATE (LIVE 24/7)</span>
                <button class="cc-tele-gear-btn" id="cc-tele-gear-btn" title="Configure displayed fields">⚙️ fields</button>
              </div>
              <div id="cc-tele-settings-drawer">
                <label class="cc-tele-chk-label"><input type="checkbox" id="cc-tele-clocks-chk" checked> ⏱️ Player clocks</label>
                <label class="cc-tele-chk-label"><input type="checkbox" id="cc-tele-engine-chk" checked> 🛰️ Status and server</label>
                <label class="cc-tele-chk-label"><input type="checkbox" id="cc-tele-wdl-chk" checked> 📊 Win chances %</label>
                <label class="cc-tele-chk-label"><input type="checkbox" id="cc-tele-threats-chk" checked> 🪤 Traps and mates</label>
              </div>
              <div class="cc-tele-grid">
                <div class="cc-tele-box" id="cc-tele-box-clocks">
                  <div class="cc-tele-box-title">⏱️ CLOCKS (US vs ENEMY)</div>
                  <div class="cc-tele-box-val" id="cc-tele-clocks-val">--:-- vs --:--</div>
                </div>
                <div class="cc-tele-box" id="cc-tele-box-engine">
                  <div class="cc-tele-box-title">🛰️ ENGINE / STEALTH</div>
                  <div class="cc-tele-box-val" id="cc-tele-engine-val" style="color:#c77dff;">SF LOCAL • CHESS.COM</div>
                </div>
                <div class="cc-tele-box" id="cc-tele-box-wdl" style="grid-column: span 2;">
                  <div class="cc-tele-box-title" style="display:flex; justify-content:space-between;">
                    <span>📊 WIN CHANCES (WDL FORECAST)</span>
                    <span id="cc-tele-wdl-val">Win: 50% • Draw: 30% • Loss: 20%</span>
                  </div>
                  <div class="cc-wdl-bar">
                    <div class="cc-wdl-w" id="cc-wdl-fill-w" style="width:50%;"></div>
                    <div class="cc-wdl-d" id="cc-wdl-fill-d" style="width:30%;"></div>
                    <div class="cc-wdl-l" id="cc-wdl-fill-l" style="width:20%;"></div>
                  </div>
                </div>
                <div class="cc-tele-box" id="cc-tele-box-threats" style="grid-column: span 2;">
                  <div class="cc-tele-box-title">🪤 NEAREST CALCULATED TRAPS, THREATS AND MATES</div>
                  <div class="cc-tele-box-val" id="cc-tele-threats-val" style="color:#ffbe0b; font-family:inherit;">Waiting move...</div>
                </div>
              </div>
            </div>

            <div id="cc-peer-detector-banner" style="display:none; background:linear-gradient(135deg, rgba(255,190,11,0.20), rgba(255,42,133,0.20)); border:1.5px solid #ffbe0b; border-radius:12px; padding:8px 12px; color:#fff;">
              <div id="cc-peer-detector-title" style="font-size:11px; font-weight:900; color:#ffbe0b; display:flex; justify-content:space-between; align-items:center;">
                <span>🕵️ CHEAT-RADAR: bySUSPICION on SOFTWARE У OPPONENT!</span>
                <span style="background:rgba(0,0,0,0.45); padding:1px 6px; border-radius:4px; font-family:monospace;">⚠️ BOT?</span>
              </div>
              <div id="cc-peer-detector-text" style="font-size:11px; color:#f1f5f9; margin-top:2px; font-weight:600; line-height:1.35;">
                Opponent plays by 1-й lines without errors.
              </div>
            </div>

            <div id="cc-enemy-turn-standby">
              <div class="cc-standby-icon">⏳</div>
              <div class="cc-standby-title" id="cc-standby-title">Opponent move...</div>
              <div class="cc-standby-sub" id="cc-standby-sub">
                Blind premoves disabled for 100% legitness on Chess.com. Telemetry watches for threat!
              </div>
            </div>

            <div id="cc-my-turn-active" style="display:flex; flex-direction:column; gap:7px; flex:1;">
              <div id="cc-mate-banner">
                <div class="cc-mate-title">
                  <span id="cc-mate-banner-title">👑💀 MATE on BOARD!</span>
                  <span style="font-size:16px;">😱😂</span>
                </div>
                <div class="cc-mate-sub" id="cc-mate-banner-text">
                  Opponent blundered forced mate!
                </div>
              </div>

              <div class="cc-glass-card" id="cc-opening-card" style="border-left: 3.5px solid var(--cc-accent);">
                <div class="cc-section-title">
                  <span id="cc-opening-name">◈ READY К GAME on CHESS.COM</span>
                  <span id="cc-turn-indicator" style="color:#94a3b8;">WAITING</span>
                </div>
                <div id="cc-opening-plan" style="font-size:11px; color:#cbd5e1; line-height:1.36;">
                  Open any game or бfrom-mateч on Chess.com for instant stealth-analysis.
                </div>
              </div>

              <div id="cc-eval-graph-card">
                <div class="cc-graph-header">
                  <span>📈 LIVE ADVANTAGE CHART</span>
                  <span class="cc-graph-meta"><span id="cc-eval-mood-label">EQUAL</span><span id="cc-eval-graph-label">0.00</span></span>
                </div>
                <canvas id="cc-eval-graph-canvas" width="410" height="42"></canvas>
              </div>

              <div id="cc-time-sniper-banner">
                <div class="cc-time-sniper-top">
                  <span id="cc-time-sniper-badge">⏱️ SNIPER TIME CONTROL</span>
                  <span id="cc-time-sniper-clocks" style="font-family:monospace; color:#ffbe0b;">--:-- vs --:--</span>
                </div>
                <div id="cc-time-sniper-text">Tempo control active.</div>
              </div>

              <div class="cc-roast-banner" id="cc-roast-box">
                <div class="cc-roast-title">
                  <span id="cc-roast-badge">⚡ RADAR ERRORS OPPONENT</span>
                  <span>💀</span>
                </div>
                <div id="cc-roast-text">Waiting for opponent move...</div>
              </div>

              <div class="cc-move-card" id="cc-best-card" style="border-left-color:#00f5d4;">
                <div class="cc-move-header">
                  <span style="color:#00f5d4" id="cc-best-title">✦ BEST MOVE (1ST LINE)</span>
                  <span class="cc-eval" id="cc-best-eval">--</span>
                </div>
                <div id="cc-best-desc">Position analysis...</div>
                <div id="cc-best-pv" style="margin-top:3px; font-size:10px; color:var(--cc-accent); font-family:monospace; opacity:0.92;"></div>
              </div>

              <div class="cc-move-card" id="cc-avg-card" style="border-left-color:#ffbe0b;">
                <div class="cc-move-header">
                  <span style="color:#ffbe0b">❖ AVERAGE MOVE (2-Я LINE • MIXING T1%)</span>
                  <span class="cc-eval" id="cc-avg-eval">--</span>
                </div>
                <div id="cc-avg-desc">Analysis safely human altonyou...</div>
              </div>

              <div class="cc-move-card cc-hide-in-legit" id="cc-worst-card" style="border-left-color:#ff2a85;">
                <div class="cc-move-header">
                  <span style="color:#ff2a85">✖ WORST MOVE (BLUNDER)</span>
                  <span class="cc-eval" id="cc-worst-eval">--</span>
                </div>
                <div id="cc-worst-desc">Checking threats...</div>
              </div>
            </div>

            <div class="cc-actions-bar">
              <button class="cc-btn cc-btn-primary" id="cc-play-once" title="or press key [X] on keyboard">⚡ MOVE by BÉZIER [X]</button>
              <button class="cc-btn" id="cc-toggle-auto">🛡 LEGIT AUTO: OFF</button>
            </div>
          </div>

          <div class="cc-tab-pane" id="cc-pane-automove">
            <div class="cc-auto-status-box">
              <span>Status Stealth-Automove:</span>
              <strong id="cc-auto-live-status" style="color:#00f5d4;">Ready (Crityouе Without)</strong>
            </div>

            <div class="cc-glass-card" style="border-left: 3.5px solid #38b000; background: linear-gradient(135deg, rgba(56,176,0,0.16), rgba(0,245,212,0.08));">
              <div class="cc-section-title" style="color:#70e000;">
                <span>🛡️ SYStheme ANTI-BANon CHESS.COM (FAIR PLAY BYPASS)</span>
              </div>
              <div class="cc-Switch-row" style="padding-top:0;">
                <div>
                  <span style="font-weight:800; color:#fff;">🎯 Auto-limiter matches T1% (Anti-Detect)</span>
                  <div style="font-size:10px; color:#cbd5e1;">If your T1% exceeds the norm, the bot itself picks a safe 2nd line</div>
                </div>
                <input type="checkbox" id="cc-t1-limiter-chk" checked>
              </div>
              <div class="cc-control-row" style="margin-top:5px;">
                <span>Maximum allowed T1% in game:</span>
                <strong id="cc-t1-limit-val" style="color:#70e000;">not above 66%</strong>
              </div>
              <input type="range" class="cc-slider" id="cc-t1-limit-slider" min="50" max="80" step="2" value="66" style="accent-color:#38b000;">

              <div class="cc-Switch-row" style="margin-top:4px;">
                <div>
                  <span style="font-weight:800; color:#fff;">🧠 Imitation of thinking in complex tactics</span>
                  <div style="font-size:10px; color:#cbd5e1;">Adds a live calculation pause (1.5–3.2s) before hard moves</div>
                </div>
                <input type="checkbox" id="cc-hesitation-chk" checked>
              </div>

              <div class="cc-Switch-row">
                <div>
                  <span style="font-weight:800; color:#fff;">⏱️ Adaptive timing by clock (10+0 / 3+0 / 1+0)</span>
                  <div style="font-size:10px; color:#cbd5e1;">Smoothing human rhythm + fast random interrupts</div>
                </div>
                <input type="checkbox" id="cc-legit-timing-chk" checked>
              </div>
            </div>

            <div class="cc-glass-card">
              <div class="cc-Switch-row" style="padding-top:0;">
                <span style="font-weight:800; color:#fff;">🤖 Enable soft Legit-Automove</span>
                <input type="checkbox" id="cc-auto-master-chk">
              </div>

              <div class="cc-control-row" style="margin-top:5px;">
                <span>Base delay (if disabled. auto-timing):</span>
                <strong id="cc-auto-delay-val" style="color:var(--cc-accent);">0.54 sec</strong>
              </div>
              <input type="range" class="cc-slider" id="cc-auto-delay-slider" min="220" max="2500" step="20" value="540">

              <div class="cc-control-row" style="margin-top:5px;">
                <span>Hand-time variance (Humanizer):</span>
                <strong id="cc-auto-jitter-val" style="color:var(--cc-accent);">±0.26 sec</strong>
              </div>
              <input type="range" class="cc-slider" id="cc-auto-jitter-slider" min="60" max="1000" step="20" value="260">

              <div class="cc-control-row" style="margin-top:5px;">
                <span>Trigger frequency (remaining moves — itself):</span>
                <strong id="cc-auto-rate-val" style="color:var(--cc-accent);">85% moves</strong>
              </div>
              <input type="range" class="cc-slider" id="cc-auto-rate-slider" min="20" max="100" step="5" value="85">
            </div>

            <div class="cc-glass-card" style="border-left: 3.5px solid #ffbe0b;">
              <div class="cc-Switch-row" style="padding-top:0;">
                <span>🎭 Mix in Average move (2nd line)</span>
                <input type="checkbox" id="cc-auto-avg-chk" checked>
              </div>

              <div class="cc-control-row" style="margin-top:5px;">
                <span>Base chance of 2nd lines:</span>
                <strong id="cc-auto-avg-freq-val" style="color:#ffbe0b;">30%</strong>
              </div>
              <input type="range" class="cc-slider" id="cc-auto-avg-freq-slider" min="10" max="75" step="5" value="30" style="accent-color:#ffbe0b;">

              <div class="cc-Switch-row" style="margin-top:4px;">
                <span>Insurance: only 1st line on Mate and saving pieces</span>
                <input type="checkbox" id="cc-auto-protect-chk" checked>
              </div>

              <div class="cc-control-row" style="margin-top:5px; margin-bottom:0;">
                <span>Mouse biometrics:</span>
                <select class="cc-select" id="cc-auto-method-select" style="width:225px;">
                  <option value="bezier_click" selected>🎯 Arc Bézier + 2-Click (Gaussian)</option>
                  <option value="bezier_drag">🖐 Arc Bézier + Drag</option>
                </select>
              </div>
            </div>

            <div class="cc-actions-bar">
              <button class="cc-btn cc-btn-primary" id="cc-auto-test-best">⚡ Move 1-й line</button>
              <button class="cc-btn" id="cc-auto-test-avg" style="border-color:#ffbe0b; color:#ffbe0b;">❖ Move 2-й line</button>
            </div>
          </div>

          <div class="cc-tab-pane" id="cc-pane-rage">
            <div class="cc-glass-card">
              <div class="cc-control-row">
                <span style="font-weight:800;">TARGET GAME LEVEL (400 – 3000 ELO)</span>
                <strong id="cc-elo-val" style="color:var(--cc-accent);">${currentElo} ELO</strong>
              </div>
              <input type="range" class="cc-slider" id="cc-elo-slider" min="400" max="3000" step="100" value="${currentElo}">
            </div>

            <div class="cc-glass-card" style="border-left: 3.5px solid #c77dff;">
              <div class="cc-section-title" style="color:#c77dff;">
                <span>🧠 HYBRID STOCKFISH 19 LOCAL + TELEMETRY 24/7</span>
              </div>
              <div class="cc-Switch-row" style="padding-top:0;">
                <span>🧠 Background WebWorker Stockfish 19 Local</span>
                <input type="checkbox" id="cc-sf-wasm-chk" checked>
              </div>
              <div class="cc-Switch-row">
                <span>♚ ENGINE MAX: primary SF without T1/average/humanization</span>
                <input type="checkbox" id="cc-engine-max-chk">
              </div>
              <div class="cc-Switch-row">
                <span>📡 Live game 24/7 (Clocks, WDL%, Threats)</span>
                <input type="checkbox" id="cc-live-telemetry-chk" checked>
              </div>
              <div class="cc-Switch-row">
                <span>🪤 Radar traps (highlight tricky moves)</span>
                <input type="checkbox" id="cc-trap-radar-chk" checked>
              </div>
              <div class="cc-Switch-row">
                <span>🔊 Tactical audio radar (ping enemy blunders and mate)</span>
                <input type="checkbox" id="cc-audio-radar-chk" checked>
              </div>
            </div>

            <div class="cc-glass-card" style="border-left: 3.5px solid #00f5d4;">
              <div class="cc-section-title">
                <span>🚀 LINES ANALYSISА</span>
              </div>
              <div class="cc-Switch-row" style="padding-top:0;">
                <span>❖ Show and count Average move (2nd line)</span>
                <input type="checkbox" id="cc-show-avg-chk" checked>
              </div>
              <div class="cc-Switch-row cc-hide-in-legit">
                <span>✖ Show and count Worst move (Anti-blunder)</span>
                <input type="checkbox" id="cc-show-worst-chk">
              </div>
            </div>

            <div class="cc-glass-card">
              <div class="cc-section-title"><span>⚡ CHOOSE PLAY STYLE (11 LEGENDS)</span></div>
              <div class="cc-style-grid">
                <button class="cc-style-btn" data-style="mogging"><span>⚡ Mogging</span><small>DOMINATION</small></button>
                <button class="cc-style-btn active" data-style="tal"><span>✦ Mikhail Tal</span><small>SACRIFICES</small></button>
                <button class="cc-style-btn" data-style="alphazero"><span>🧠 AlphaZero</span><small>NEURAL NET</small></button>
                <button class="cc-style-btn" data-style="morphy"><span>🎭 byл Morphy</span><small>TEMPO GENIUS</small></button>
                <button class="cc-style-btn" data-style="hikaru"><span>🚀 Nakamura</span><small>BLITZ KING</small></button>
                <button class="cc-style-btn" data-style="kasparov"><span>▲ Kasparov</span><small>ATTACK</small></button>
                <button class="cc-style-btn" data-style="fischer"><span>◈ Fischer</span><small>ACCURACY</small></button>
                <button class="cc-style-btn" data-style="carlsen"><span>❖ Carlsen</span><small>TECHNIQUE</small></button>
                <button class="cc-style-btn" data-style="solid"><span>🛡 Karpov</span><small>SQUEEZE</small></button>
                <button class="cc-style-btn" data-style="botvinnik"><span>🏛 Botvinnik</span><small>PATRIARCH</small></button>
                <button class="cc-style-btn" data-style="balanced" style="grid-column: span 2;">
                  <span>⚙ Stockfish Cloud + Syzygy</span><small>MAXIMUM</small>
                </button>
              </div>
            </div>

            <div class="cc-glass-card">
              <div class="cc-section-title"><span>⚙ WORK MODE</span></div>
              <div class="cc-control-row" style="margin-bottom:6px;">
                <span>When to count:</span>
                <select class="cc-select" id="cc-turn-select" style="width:200px;">
                  <option value="my" selected>only in my move</option>
                  <option value="auto">Always (and for opponent)</option>
                  <option value="w">Always for White</option>
                  <option value="b">Always for Black</option>
                </select>
              </div>
              <div class="cc-Switch-row">
                <span>⚡ Radar of opponent blunders and mate special effects</span>
                <input type="checkbox" id="cc-rage-rofl-chk" checked>
              </div>
              <div class="cc-Switch-row">
                <span>🛡 Disable Automove in rated games (only hints)</span>
                <input type="checkbox" id="cc-rage-antiban-chk">
              </div>
            </div>
          </div>

          <div class="cc-tab-pane" id="cc-pane-visuals">
            <div class="cc-glass-card" style="border-left: 3.5px solid #c77dff;">
              <div class="cc-section-title" style="color:#c77dff;">
                <span>🖼️ OWN PHOTO on BACKGROUND MENU (CHOICE from FILE PICKER)</span>
              </div>
              <div class="cc-actions-bar" style="margin-bottom:7px;">
                <button class="cc-btn cc-btn-primary" id="cc-upload-bg-btn">📂 CHOOSE PHOTO...</button>
                <button class="cc-btn cc-btn-danger" id="cc-clear-bg-btn">🗑 RESET BACKGROUND</button>
              </div>
              <input type="file" id="cc-bg-file-input" accept="image/*" style="display:none;" />
              <div class="cc-control-row">
                <span>Dimming фfromо:</span>
                <strong id="cc-bg-dim-val" style="color:#c77dff;">72%</strong>
              </div>
              <input type="range" class="cc-slider" id="cc-bg-dim-slider" min="0.2" max="0.92" step="0.04" value="0.72" style="accent-color:#c77dff;">
              <div class="cc-control-row" style="margin-top:5px;">
                <span>Blur backgroundа (Glass Blur):</span>
                <strong id="cc-bg-blur-val" style="color:#c77dff;">4px</strong>
              </div>
              <input type="range" class="cc-slider" id="cc-bg-blur-slider" min="0" max="16" step="1" value="4" style="accent-color:#c77dff;">
            </div>

            <div class="cc-glass-card">
              <div class="cc-section-title"><span>✦ theme MENU (11 STYLES VISION GLASS)</span></div>
              <select class="cc-select" id="cc-vis-theme">
                <option value="cyberpunk">🌌 Liquid Cyan Wave (notneon waveon)</option>
                <option value="minimal">⚪ Pure Minimal (Clean minimalfromм)</option>
                <option value="aurora">🌌 Aurora 3D Glass (Northern lights)</option>
                <option value="hologram">🔮 Hologram Violet (Hologram)</option>
                <option value="crimson">🔥 Crimson Rose (Aggressive ruby)</option>
                <option value="gold">👑 Royal Gold (Coreroyal goldfromо)</option>
                <option value="matrix">🧪 Matrix Toxic (Cyber-Matrix)</option>
                <option value="titanium">❄️ Vision Pro Titanium (Mate titanium)</option>
                <option value="obsidian">🌑 Obsidian Stealth (Dark obsidian)</option>
                <option value="nebula">🌠 Nebula Director (Cosmic studio)</option>
                <option value="grandmaster">♛ Grandmaster Club (Emerald and gold)</option>
              </select>
            </div>

            <div class="cc-glass-card" style="border-left: 3.5px solid var(--cc-accent);">
              <div class="cc-section-title"><span>◈ POINTER TYPE MOVES (16 VARIATIONS: SQUARES И ARROWS)</span></div>
              <select class="cc-select" id="cc-vis-arrow-style" style="margin-bottom:7px;">
                <optgroup label="🔲 WITHOUT ARROWS (HIGHLIGHT SQUARES MOVES)">
                  <option value="sq_cyber_frame">🔲 neon frames squares (FROM ➔ TO)</option>
                  <option value="sq_Step_badges">🎯 Tactical labels [1: START] ➔ [2: TARGET]</option>
                  <option value="sq_hologram_tiles">💠 Holographic fill of squares + on target</option>
                  <option value="sq_minimal_dots">⚫ Stealth-dots Pro (Without arrows)</option>
                </optgroup>
                <optgroup label="🏹 VECTOR AND 3D ARROWS (12 STYLES)">
                  <option value="curved_neon">🌈 Smooth neon arc with flow</option>
                  <option value="comet_trail">☄️ Fire comet with gradient tail</option>
                  <option value="cyber_chevron">⏩ Tactical chevron conveyor (>>>)</option>
                  <option value="quantum_portal">🌀 Quantum teleport (Loss on squarn squareх)</option>
                  <option value="tube_3d">🧊 3D Volume tube with drop shadow</option>
                  <option value="plasma">⚡ Plasmaonя lightning-zigzag</option>
                  <option value="sniper_3d">🎯 3D Сonhypers radar-ontarget</option>
                  <option value="dna_wave">🧬 Doubleonя cyber-waveon DNA</option>
                  <option value="chroma_rgb">🌈 Chroma RGB Iridescence</option>
                  <option value="laser">⚡ Straightmy cyber-laser</option>
                  <option value="classic">♟️ Classical straight</option>
                  <option value="dotted">✨ Tactical dotted</option>
                </optgroup>
              </select>

              <div class="cc-control-row" style="margin-bottom:6px;">
                <span>Style «mate in 1 move»:</span>
                <select class="cc-select" id="cc-vis-mate-style" style="width:225px;">
                  <option value="phonk_skull">💀 Phonk Skull Mogging</option>
                  <option value="orbital_laser">🛸 Orbital Cyber-Laser</option>
                  <option value="royal_exec">👑 Royal onspeech</option>
                  <option value="rofl_classic">😂 Classical Rofl</option>
                </select>
              </div>

              <div class="cc-control-row">
                <span>Scale arrows and frameswindow:</span>
                <strong id="cc-vis-scale-val" style="color:var(--cc-accent);">1.0x</strong>
              </div>
              <input type="range" class="cc-slider" id="cc-vis-scale" min="0.6" max="1.6" step="0.1" value="1.0">

              <div class="cc-control-row" style="margin-top:5px;">
                <span>Brightness / Transparency:</span>
                <strong id="cc-vis-opacity-val" style="color:var(--cc-accent);">88%</strong>
              </div>
              <input type="range" class="cc-slider" id="cc-vis-opacity" min="0.3" max="1.0" step="0.05" value="0.88">
            </div>

            <div class="cc-glass-card" style="border-left: 3.5px solid #ff2a85;">
              <div class="cc-section-title" style="color:#ff4d94;">
                <span>🔥 HEATS MAPRTА CONTROL И SPECIAL EFFECTS</span>
              </div>
              <div class="cc-Switch-row" style="padding-top:0;">
                <span>🗺️ bypermanentonя heat board board (Иon — squeeze [Alt])</span>
                <input type="checkbox" id="cc-heatmap-always-chk">
              </div>
              <div class="cc-Switch-row">
                <span>🔥 Edit Brilliant Moveу (15 sec Phonk)</span>
                <input type="checkbox" id="cc-vis-phonk-chk">
              </div>
              <div class="cc-Switch-row">
                <span>Show hints on board</span>
                <input type="checkbox" id="cc-vis-arrows-chk" checked>
              </div>
              <div class="cc-Switch-row">
                <span>Бwindow  eval (Eval Bar)</span>
                <input type="checkbox" id="cc-vis-eval-chk" checked>
              </div>
              <button class="cc-btn cc-btn-primary" id="cc-test-phonk-btn" style="width:100%; margin-top:6px;">
                🔥 TEST BACKGROUNDК-EDIT (15 SEC)
              </button>
            </div>
          </div>

          <div class="cc-tab-pane" id="cc-pane-privacy">
            <div class="cc-mask-hero">
              <div>
                <strong>◉ STREAMER MASK // MODE ПИСИ</strong>
                <span>Реаль yesн remain in Chess.com and only вfromvisual сются on screenе.</span>
              </div>
              <span id="cc-mask-status">DISABLEDА</span>
            </div>

            <div class="cc-glass-card" style="border-left:3.5px solid #67e8f9;">
              <div class="cc-Switch-row" style="padding-top:0;">
                <div>
                  <span style="font-weight:900;color:#fff;">Enable маскировку for forписи</span>
                  <div style="font-size:9.5px;color:#94a3b8;">Ctrl + Shift + M — мгвене enabled/disabled</div>
                </div>
                <input type="checkbox" id="cc-mask-enabled-chk">
              </div>
              <div class="cc-control-row" style="margin-top:6px;">
                <span>Style ртrandomк:</span>
                <select class="cc-select" id="cc-mask-style-select" style="width:220px;">
                  <option value="broadcast">🌌 Broadcast Neon</option>
                  <option value="royal">♛ Royal Grandmaster</option>
                  <option value="chesscom">♟ Chess.com Original</option>
                </select>
              </div>
            </div>

            <div class="cc-mask-preview" id="cc-mask-preview" data-mask-style="broadcast">
              <div class="cc-mask-preview-label">ПРЕДПРОСМfromР ТРСЛЯЦИИ</div>
              <div class="cc-mask-preview-player opponent">
                <img class="cc-mask-preview-avatar" id="cc-mask-preview-opponent-avatar" alt="">
                <div class="cc-mask-preview-identity"><span id="cc-mask-preview-opponent-name">GM Hikaru</span><small id="cc-mask-preview-opponent-flag">🇺🇸</small><strong id="cc-mask-preview-opponent-elo">2802</strong></div>
              </div>
              <div class="cc-mask-preview-vs">VS</div>
              <div class="cc-mask-preview-player my">
                <img class="cc-mask-preview-avatar" id="cc-mask-preview-my-avatar" alt="">
                <div class="cc-mask-preview-identity"><span id="cc-mask-preview-my-name">GM HiddenKnight</span><small id="cc-mask-preview-my-flag">♟</small><strong id="cc-mask-preview-my-elo">2400</strong></div>
              </div>
            </div>

            <div class="cc-mask-editor-grid">
              <div class="cc-glass-card cc-mask-editor-card">
                <div class="cc-section-title"><span>ВАШ PROFILE / AUTOОПРЕДЕЛЕНИЕ</span></div>
                <select class="cc-select" id="cc-mask-my-preset">${getPrivacyProfileOptions()}</select>
                <label class="cc-mask-field">Ник<input class="cc-text-input" id="cc-mask-my-name" maxlength="32" value="HiddenKnight"></label>
                <div class="cc-mask-field-row">
                  <label class="cc-mask-field">ELO<input class="cc-text-input" type="number" id="cc-mask-my-elo" min="0" max="9999" value="2400"></label>
                  <label class="cc-mask-field">Титул<select class="cc-select" id="cc-mask-my-title"><option value="">—</option><option value="GM">GM</option><option value="IM">IM</option><option value="FM">FM</option><option value="CM">CM</option><option value="WGM">WGM</option></select></label>
                </div>
              </div>

              <div class="cc-glass-card cc-mask-editor-card">
                <div class="cc-section-title"><span>PROFILE OPPONENT</span></div>
                <select class="cc-select" id="cc-mask-opponent-preset">${getPrivacyProfileOptions()}</select>
                <label class="cc-mask-field">Ник<input class="cc-text-input" id="cc-mask-opponent-name" maxlength="32" value="GMHikaru"></label>
                <div class="cc-mask-field-row">
                  <label class="cc-mask-field">ELO<input class="cc-text-input" type="number" id="cc-mask-opponent-elo" min="0" max="9999" value="2802"></label>
                  <label class="cc-mask-field">Титул<select class="cc-select" id="cc-mask-opponent-title"><option value="">—</option><option value="GM">GM</option><option value="IM">IM</option><option value="FM">FM</option><option value="CM">CM</option><option value="WGM">WGM</option></select></label>
                </div>
              </div>
            </div>

            <div class="cc-glass-card">
              <div class="cc-Switch-row" style="padding-top:0;"><span>Underмеь аватар, флаг and с flair</span><input type="checkbox" id="cc-mask-details-chk" checked></div>
              <div class="cc-Switch-row"><span>Маскирова forголовwindow tabs браузера</span><input type="checkbox" id="cc-mask-title-chk" checked></div>
              <div class="cc-Switch-row"><span>Block hover-рdots реаль aboutфилей</span><input type="checkbox" id="cc-mask-hover-chk" checked></div>
              <div class="cc-Switch-row"><span>Но's слуй GM-opponent on вой game</span><input type="checkbox" id="cc-mask-rotate-chk"></div>
            </div>

            <div class="cc-actions-bar cc-mask-actions">
              <button class="cc-btn" id="cc-mask-random-btn">🎲 СЛУЧАЙНЫЙ GM</button>
              <button class="cc-btn" id="cc-mask-swap-btn">⇄ byМЕНЯТЬ МЕСТАМИ</button>
              <button class="cc-btn cc-btn-primary" id="cc-mask-reveal-btn" style="grid-column:span 2;">👁 УДЕРЖИВАТЬ: SHOW ОРИГИonЛ</button>
            </div>
          </div>

          <div class="cc-tab-pane" id="cc-pane-misc">
            <!-- SYStheme CONFIGS (.CHESS) -->
            <div class="cc-glass-card" style="border-left: 3.5px solid #00f5d4; background: linear-gradient(135deg, rgba(0, 245, 212, 0.12), rgba(199, 125, 255, 0.08));">
              <div class="cc-section-title">
                <span>⚙️ SYStheme CONFIGS (.CHESS)</span>
                <span id="cc-cfg-status-badge" style="color:#00f5d4; font-size:9.5px;">READY</span>
              </div>
              <div style="font-size:10.5px; color:#cbd5e1; margin-bottom:7px; line-height:1.35;">
                Save your Legit-settings and обои in file <strong>.chess</strong> or load other configи:
              </div>
              <div class="cc-control-row" style="margin-bottom:6px;">
                <span>onз configа:</span>
                <input type="text" id="cc-cfg-name-input" placeholder="ononmeasure: ChessCom_Stealth" value="ChessCom_Stealth"
                       style="width:190px; background:rgba(10,13,20,0.95); color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:7px; padding:4px 8px; font-size:11px; font-weight:700; outline:none;" />
              </div>
              <div class="cc-Switch-row" style="padding:3px 0 7px 0; border:none;">
                <span style="font-size:10.5px; color:#e2e8f0;">🖼️ Embed current фfromо backgroundа in file .chess</span>
                <input type="checkbox" id="cc-cfg-include-bg-chk" checked>
              </div>
              <div class="cc-actions-bar">
                <button class="cc-btn cc-btn-primary" id="cc-export-cfg-btn">💾 DOWNLOAD .CHESS</button>
                <button class="cc-btn" id="cc-import-cfg-btn" style="border-color:#c77dff; color:#c77dff;">📂 LOAD .CHESS</button>
              </div>
              <input type="file" id="cc-import-cfg-input" style="display:none;" />
            </div>

            <div class="cc-glass-card">
              <div class="cc-section-title"><span>❖ MANUAL TRAINING БfromА</span></div>
              <div class="cc-actions-bar">
                <button class="cc-btn" id="cc-train-good">👍 PIN MOVE</button>
                <button class="cc-btn cc-btn-danger" id="cc-train-bad">👎 BAN MOVE</button>
              </div>
            </div>

            <div class="cc-glass-card">
              <div class="cc-section-title"><span>◈ BASE SELF-LEARNING (EXPERIENCE DB)</span></div>
              <div id="cc-misc-db-summary" style="font-size:11.5px; color:#e2e8f0; margin-bottom:8px;">
                Positions learned in memory: 0
              </div>
              <div class="cc-actions-bar" style="margin-bottom:7px;">
                <button class="cc-btn" id="cc-export-db">📥 EXPORTbyRT (.JSON)</button>
                <button class="cc-btn" id="cc-import-db">📤 IMPORTbyRT (.JSON)</button>
              </div>
              <input type="file" id="cc-import-file-input" accept=".json" style="display:none;" />
              <button class="cc-btn cc-btn-danger" id="cc-clear-db" style="width:100%;">
                🗑 byFULLY CLEAR MEMORY
              </button>
            </div>

            <div class="cc-glass-card">
              <div class="cc-section-title"><span>👋 WELCOME SCREEN AND RESET POSITION WINDOW</span></div>
              <div class="cc-actions-bar">
                <button class="cc-btn" id="cc-restore-welcome-btn">
                  ✨ Show onbranchwelcome
                </button>
                <button class="cc-btn" id="cc-reset-pos-btn">
                  📍 Reset byposition menu
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    getShadow().appendChild(panel);
    initNeuralCanvasBackground(panel);
    applyCustomBackgroundToPanel();
    applyPersistentPanelGeometry();
    updateUIValues();
    if (uiAbortController) uiAbortController.abort();
    uiAbortController = new AbortController();
    const uiSignal = uiAbortController.signal;
    $("cc-project-open").addEventListener("click", () => {
      window.__CC_ANDROID_RUNTIME__.nativeRequest("project.open").catch(() => {
        setAutoStatusText("not yet open page projectа. Aboutв onextension.", "#ffbe0b");
      });
    });
    const header = $("chesscoach-header");
    let dragging = false, ox = 0, oy = 0;
    header.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "BUTTON") return;
      dragging = true;
      ox = e.clientX - panel.offsetLeft;
      oy = e.clientY - panel.offsetTop;
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const nx = Math.max(0, Math.min(window.innerWidth - 120, e.clientX - ox));
      const ny = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - oy));
      panel.style.left = `${nx}px`;
      panel.style.top = `${ny}px`;
      panel.style.right = "auto";
      panelLeft = nx;
      panelTop = ny;
    }, { signal: uiSignal });
    window.addEventListener("mouseup", () => {
      if (dragging) {
        dragging = false;
        saveSetting({ panelLeft, panelTop });
      }
    }, { signal: uiSignal });

    getShadow().querySelectorAll(".cc-mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyWorkModePreset(btn.dataset.mode, true);
      });
    });

    getShadow().querySelectorAll(".cc-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab, true));
    });

    $("cc-toggle-btn").addEventListener("click", () => {
      panelMinimized = !panelMinimized;
      saveSetting({ panelMinimized });
      applyPersistentPanelGeometry();
    });

    window.addEventListener("keydown", (e) => {
      if (extensionInvalidated) return;
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Insert") {
        panelHidden = !panelHidden;
        saveSetting({ panelHidden });
        applyPersistentPanelGeometry();
      }
      if (e.key === "Alt" && !isAltPressed) {
        isAltPressed = true;
        const st = captureBoardState(true);
        if (st && !st.animating) renderArrowsOverlay(st, cachedMoves);
      }
      // Hot key [X] / [Ч] for single legit-move by curvesвой Without
      if ((e.key === "x" || e.key === "X" || e.key === "ч" || e.key === "Ч") && !isExecutingMove) {
        const st = captureBoardState(true);
        if (st && !st.animating && cachedMoves.best) {
          const picked = chooseAutoMoveOnce(cachedMoves) || { move: cachedMoves.best, typeLabel: "1ST LINE" };
          setAutoStatusText(`🎯 Move by [X]: ${picked.move.from}→${picked.move.to} (${picked.typeLabel})`, "#00f5d4");
          executeMoveOnBoard(picked.move, st, true);
        }
      }
    }, { signal: uiSignal });

    window.addEventListener("keyup", (e) => {
      if (e.key === "Alt" && isAltPressed) {
        isAltPressed = false;
        const st = captureBoardState(true);
        if (st && !st.animating) renderArrowsOverlay(st, cachedMoves);
      }
    }, { signal: uiSignal });

    window.addEventListener("blur", () => {
      if (uciHistoryList.length > 0 && !gameResultRecorded) {
        legitStats.windowBlursCount++;
        updateLegitAntiBanMeterUI();
      }
      if (isAltPressed) {
        isAltPressed = false;
        const st = captureBoardState(true);
        if (st && !st.animating) renderArrowsOverlay(st, cachedMoves);
      }
    }, { signal: uiSignal });

    // Управлен squares Живой phoneметрии 24/7
    $("cc-tele-gear-btn").addEventListener("click", () => {
      const drawer = $("cc-tele-settings-drawer");
      if (drawer) {
        drawer.style.display = drawer.style.display === "grid" ? "none" : "grid";
      }
    });

    $("cc-live-telemetry-chk").addEventListener("change", (e) => {
      liveTelemetryEnabled = e.target.checked;
      saveSetting({ liveTelemetryEnabled });
      updateLiveTelemetryUI();
    });
    $("cc-tele-clocks-chk").addEventListener("change", (e) => {
      teleShowClocks = e.target.checked;
      saveSetting({ teleShowClocks });
      updateLiveTelemetryUI();
    });
    $("cc-tele-engine-chk").addEventListener("change", (e) => {
      teleShowEngine = e.target.checked;
      saveSetting({ teleShowEngine });
      updateLiveTelemetryUI();
    });
    $("cc-tele-wdl-chk").addEventListener("change", (e) => {
      teleShowWdl = e.target.checked;
      saveSetting({ teleShowWdl });
      updateLiveTelemetryUI();
    });
    $("cc-tele-threats-chk").addEventListener("change", (e) => {
      teleShowThreats = e.target.checked;
      saveSetting({ teleShowThreats });
      updateLiveTelemetryUI();
    });

    // Loading стго backgroundа from Aboutводни со сжатм through Canvas
    $("cc-upload-bg-btn").addEventListener("click", () => {
      const inp = $("cc-bg-file-input");
      if (inp) inp.click();
    });

    $("cc-bg-file-input").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const maxW = 900;
          const maxH = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          const cnv = document.createElement("canvas");
          cnv.width = w;
          cnv.height = h;
          const ctx = cnv.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          customBgDataUrl = cnv.toDataURL("image/jpeg", 0.82);
          saveSetting({ customBgDataUrl });
          applyCustomBackgroundToPanel();
        };
        img.src = String(ev.target.result || "");
      };
      reader.readAsDataURL(file);
    });

    $("cc-clear-bg-btn").addEventListener("click", () => {
      customBgDataUrl = "";
      saveSetting({ customBgDataUrl: "" });
      applyCustomBackgroundToPanel();
    });

    $("cc-bg-dim-slider").addEventListener("input", (e) => {
      customBgDim = Number(e.target.value);
      updateUIValues();
      applyCustomBackgroundToPanel();
      saveSetting({ customBgDim });
    });

    $("cc-bg-blur-slider").addEventListener("input", (e) => {
      customBgBlur = Number(e.target.value);
      updateUIValues();
      applyCustomBackgroundToPanel();
      saveSetting({ customBgBlur });
    });

    $("cc-welcome-close-btn").addEventListener("click", () => {
      welcomeBannerHidden = true;
      saveSetting({ welcomeBannerHidden: true });
      updateUIValues();
    });

    $("cc-restore-welcome-btn").addEventListener("click", () => {
      welcomeBannerHidden = false;
      saveSetting({ welcomeBannerHidden: false });
      updateUIValues();
      switchTab("analyzer", true);
    });

    $("cc-reset-pos-btn").addEventListener("click", () => {
      panelLeft = null;
      panelTop = null;
      panelMinimized = false;
      panelHidden = false;
      panel.style.left = "auto";
      panel.style.top = "38px";
      panel.style.right = "18px";
      saveSetting({ panelLeft: null, panelTop: null, panelMinimized: false, panelHidden: false });
      applyPersistentPanelGeometry();
    });

    $("cc-color-pill").addEventListener("click", () => {
      if (forcedMyColor === "auto") forcedMyColor = "w";
      else if (forcedMyColor === "w") forcedMyColor = "b";
      else forcedMyColor = "auto";
      saveSetting({ forcedMyColor });
      updateUIValues();
      forceRecalculate();
    });

    const toggleAutoMoveMaster = (newState) => {
      if (window.__CC_MOBILE_PREFERENCES__) {
        if (newState) { nativeMoveFailureKey = ""; nativeMoveFailures = 0; }
        else cancelNativeMove("automation-disabled");
        resetTurnDecision();
        saveSetting({ autoMoveEnabled: newState }, newState);
        setAutoStatusText(newState ? "Automove enabled" : "Automove disabled", newState ? "#38b000" : "#94a3b8");
        return;
      }
      autoMoveEnabled = newState;
      if (newState) { nativeMoveFailureKey = ""; nativeMoveFailures = 0; }
      if (!newState) cancelNativeMove("automation-disabled");
      saveSetting({ autoMoveEnabled });
      updateUIValues();
      resetTurnDecision();
      if (autoMoveEnabled) {
        setAutoStatusText("🛡 Stealth-Automove enabled (Crityouе Without + T1 Фильтр)", "#38b000");
        forceRecalculate();
      } else {
        setAutoStatusText("Automove disabled (Доступен move by клавише [X])", "#94a3b8");
      }
    };

    $("cc-toggle-auto").addEventListener("click", () => toggleAutoMoveMaster(!autoMoveEnabled));
    $("cc-auto-master-chk").addEventListener("change", (e) => toggleAutoMoveMaster(e.target.checked));

    $("cc-legit-timing-chk").addEventListener("change", (e) => {
      legitAutoTiming = e.target.checked;
      saveSetting({ legitAutoTiming });
      updateUIValues();
    });

    $("cc-hesitation-chk").addEventListener("change", (e) => {
      humanHesitationEnabled = e.target.checked;
      saveSetting({ humanHesitationEnabled });
      updateUIValues();
    });

    $("cc-t1-limiter-chk").addEventListener("change", (e) => {
      autoT1LimiterEnabled = e.target.checked;
      saveSetting({ autoT1LimiterEnabled });
      updateUIValues();
    });

    $("cc-t1-limit-slider").addEventListener("input", (e) => {
      maxSafeT1Percent = Number(e.target.value);
      updateUIValues();
      saveSetting({ maxSafeT1Percent });
    });

    $("cc-auto-delay-slider").addEventListener("input", (e) => {
      autoMoveDelayMs = Number(e.target.value);
      updateUIValues();
      saveSetting({ autoMoveDelayMs });
    });

    $("cc-auto-jitter-slider").addEventListener("input", (e) => {
      autoMoveJitterMs = Number(e.target.value);
      updateUIValues();
      saveSetting({ autoMoveJitterMs });
    });

    $("cc-auto-rate-slider").addEventListener("input", (e) => {
      autoMoveTriggerRate = Number(e.target.value);
      updateUIValues();
      saveSetting({ autoMoveTriggerRate });
    });

    $("cc-auto-avg-chk").addEventListener("change", (e) => {
      useAverageMoveSometimes = e.target.checked;
      saveSetting({ useAverageMoveSometimes });
      forceRecalculate();
    });

    $("cc-auto-avg-freq-slider").addEventListener("input", (e) => {
      averageMoveFrequency = Number(e.target.value);
      updateUIValues();
      saveSetting({ averageMoveFrequency });
    });

    $("cc-auto-protect-chk").addEventListener("change", (e) => {
      protectCriticalMoves = e.target.checked;
      saveSetting({ protectCriticalMoves });
    });

    $("cc-auto-method-select").addEventListener("change", (e) => {
      autoClickMethod = e.target.value;
      saveSetting({ autoClickMethod });
    });

    $("cc-sf-wasm-chk").addEventListener("change", (e) => {
      if (window.__CC_MOBILE_PREFERENCES__) {
        if (e.target.checked) StockfishWasmEngine.initWorker(); else StockfishWasmEngine.terminate();
        saveSetting({ useStockfishWasm: e.target.checked }, true);
        return;
      }
      useStockfishWasm = e.target.checked;
      if (useStockfishWasm) StockfishWasmEngine.initWorker();
      else StockfishWasmEngine.terminate();
      saveSetting({ useStockfishWasm });
      updateUIValues();
      forceRecalculate();
    });
    $("cc-engine-max-chk").addEventListener("change", (e) => {
      if (window.__CC_MOBILE_PREFERENCES__) {
        saveSetting({ engineMaxMode: e.target.checked }, true);
        setAutoStatusText(e.target.checked ? "ENGINE MAX enabled" : "ENGINE MAX disabled", "#64cdb9");
        return;
      }
      engineMaxMode = e.target.checked;
      if (engineMaxMode) {
        currentElo = 3000;
        currentStyle = "balanced";
        useStockfishWasm = true;
        showAverageMove = false;
        useAverageMoveSometimes = false;
        autoT1LimiterEnabled = false;
        humanHesitationEnabled = false;
        legitAutoTiming = false;
        autoMoveTriggerRate = 100;
        StockfishWasmEngine.initWorker();
      }
      saveSetting({ engineMaxMode, elo: currentElo, style: currentStyle, useStockfishWasm, showAverageMove, useAverageMoveSometimes, autoT1LimiterEnabled, humanHesitationEnabled, legitAutoTiming, autoMoveTriggerRate });
      setAutoStatusText(engineMaxMode ? "♚ ENGINE MAX: WAITING PRIMARY STOCKFISH" : "ENGINE MAX DISABLED", engineMaxMode ? "#64cdb9" : "#94a3b8");
      updateUIValues();
      forceRecalculate();
    });

    $("cc-trap-radar-chk").addEventListener("change", (e) => {
      trapRadarEnabled = e.target.checked;
      saveSetting({ trapRadarEnabled });
      updateUIValues();
      forceRecalculate();
    });

    $("cc-audio-radar-chk").addEventListener("change", (e) => {
      audioRadarEnabled = e.target.checked;
      saveSetting({ audioRadarEnabled });
      if (audioRadarEnabled && window.ChessFX) {
        window.ChessFX.playTacticalAudioPing("trap", "");
      }
    });

    $("cc-heatmap-always-chk").addEventListener("change", (e) => {
      heatmapAlwaysOn = e.target.checked;
      saveSetting({ heatmapAlwaysOn });
      const st = captureBoardState(true);
      if (st && !st.animating) renderArrowsOverlay(st, cachedMoves);
    });

    $("cc-show-avg-chk").addEventListener("change", (e) => {
      showAverageMove = e.target.checked;
      saveSetting({ showAverageMove });
      updateUIValues();
      forceRecalculate();
    });

    $("cc-show-worst-chk").addEventListener("change", (e) => {
      showWorstMove = e.target.checked;
      saveSetting({ showWorstMove });
      updateUIValues();
      forceRecalculate();
    });

    $("cc-play-once").addEventListener("click", () => {
      const state = captureBoardState(true);
      if (state && !state.animating && isCachedAnalysisCurrent(state)) {
        const picked = chooseAutoMoveOnce(cachedMoves) || { move: cachedMoves.best, typeLabel: "1ST LINE" };
        setAutoStatusText(`🎯 Webyplay move: ${picked.move.from}→${picked.move.to} [${picked.typeLabel}]`, "#00f5d4");
        executeMoveOnBoard(picked.move, state, true);
      }
    });

    $("cc-auto-test-best").addEventListener("click", () => {
      if (engineMaxMode && !cachedMoves.engineMeta && !cachedMoves.best?.fromSyzygy) {
        setAutoStatusText("♚ ENGINE MAX: wait for primary Stockfish to finish", "#d9ad58");
        return;
      }
      const state = captureBoardState(true);
      if (state && !state.animating && isCachedAnalysisCurrent(state)) {
        setAutoStatusText(`Best move: ${cachedMoves.best.from}→${cachedMoves.best.to}`, "#00f5d4");
        executeMoveOnBoard(cachedMoves.best, state, true);
      }
    });

    $("cc-auto-test-avg").addEventListener("click", () => {
      if (usesStrictBestMovePolicy()) return;
      const state = captureBoardState(true);
      const move = cachedMoves.average;
      if (!move || move.uci === cachedMoves.best?.uci) {
        setAutoStatusText("Separate average line unavailable: wait for analysis or choose best move.", "#ffbe0b");
        return;
      }
      if (state && !state.animating && move && isCachedAnalysisCurrent(state)) {
        setAutoStatusText(`Average move (2nd line): ${move.from}→${move.to}`, "#ffbe0b");
        executeMoveOnBoard(move, state, true);
      }
    });

    const slider = $("cc-elo-slider");
    slider.addEventListener("input", (e) => {
      currentElo = Number(e.target.value);
      updateUIValues();
    });
    slider.addEventListener("change", (e) => {
      currentElo = Number(e.target.value);
      saveSetting({ elo: currentElo });
      forceRecalculate();
    });

    getShadow().querySelectorAll(".cc-style-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentStyle = btn.dataset.style;
        saveSetting({ style: currentStyle });
        updateUIValues();
        forceRecalculate();
      });
    });

    $("cc-turn-select").addEventListener("change", (e) => {
      turnMode = e.target.value;
      saveSetting({ turnMode });
      forceRecalculate();
    });

    $("cc-rage-rofl-chk").addEventListener("change", (e) => {
      roflMode = e.target.checked;
      saveSetting({ roflMode });
      forceRecalculate();
    });

    $("cc-rage-antiban-chk").addEventListener("change", (e) => {
      safeAntiBanGuard = e.target.checked;
      saveSetting({ safeAntiBanGuard });
    });

    $("cc-vis-theme").addEventListener("change", (e) => {
      uiTheme = e.target.value;
      saveSetting({ uiTheme });
      updateUIValues();
    });

    $("cc-vis-arrow-style").addEventListener("change", (e) => {
      arrowStyle = e.target.value;
      saveSetting({ arrowStyle });
      updateUIValues();
      const st = captureBoardState(true);
      if (st && !st.animating) renderArrowsOverlay(st, cachedMoves);
    });

    $("cc-vis-mate-style").addEventListener("change", (e) => {
      mateStyle = e.target.value;
      saveSetting({ mateStyle });
      const st = captureBoardState(true);
      if (st && !st.animating) renderArrowsOverlay(st, cachedMoves);
    });

    $("cc-vis-scale").addEventListener("input", (e) => {
      arrowScale = Number(e.target.value);
      updateUIValues();
      const st = captureBoardState(true);
      if (st && !st.animating) renderArrowsOverlay(st, cachedMoves);
      saveSetting({ arrowScale });
    });

    $("cc-vis-opacity").addEventListener("input", (e) => {
      arrowOpacity = Number(e.target.value);
      updateUIValues();
      const st = captureBoardState(true);
      if (st && !st.animating) renderArrowsOverlay(st, cachedMoves);
      saveSetting({ arrowOpacity });
    });

    $("cc-vis-phonk-chk").addEventListener("change", (e) => {
      phonkEditEnabled = e.target.checked;
      saveSetting({ phonkEditEnabled });
      if (!phonkEditEnabled && window.ChessFX) {
        window.ChessFX.stopPhonkEdit(getShadow());
      }
    });

    $("cc-test-phonk-btn").addEventListener("click", () => {
      if (window.ChessFX) {
        const testMove = (cachedMoves && cachedMoves.best) ? cachedMoves.best : { from: "g5", to: "f7" };
        window.ChessFX.triggerBrilliantPhonkEdit(getShadow(), testMove, captureBoardState(true), 15000, true);
      }
    });

    $("cc-vis-arrows-chk").addEventListener("change", (e) => {
      showArrows = e.target.checked;
      saveSetting({ showArrows });
      const st = captureBoardState(true);
      if (st && !st.animating) renderArrowsOverlay(st, cachedMoves);
    });

    $("cc-vis-eval-chk").addEventListener("change", (e) => {
      showEvalBar = e.target.checked;
      saveSetting({ showEvalBar });
      const st = captureBoardState(true);
      if (st && !st.animating) renderEvalBar(st, cachedMoves.best?.whitePerspectiveEval ?? 0);
    });

    $("cc-mask-enabled-chk").addEventListener("change", (e) => {
      visualMask = normalizeVisualMask({ ...visualMask, enabled: e.target.checked });
      persistVisualMask();
    });
    $("cc-mask-style-select").addEventListener("change", (e) => {
      visualMask = normalizeVisualMask({ ...visualMask, style: e.target.value });
      persistVisualMask();
    });
    $("cc-mask-details-chk").addEventListener("change", (e) => {
      visualMask = normalizeVisualMask({ ...visualMask, maskDetails: e.target.checked });
      persistVisualMask();
    });
    $("cc-mask-title-chk").addEventListener("change", (e) => {
      visualMask = normalizeVisualMask({ ...visualMask, maskPageTitle: e.target.checked });
      persistVisualMask();
    });
    $("cc-mask-hover-chk").addEventListener("change", (e) => {
      visualMask = normalizeVisualMask({ ...visualMask, blockProfileHover: e.target.checked });
      persistVisualMask();
    });
    $("cc-mask-rotate-chk").addEventListener("change", (e) => {
      visualMask = normalizeVisualMask({ ...visualMask, autoRotateOpponent: e.target.checked });
      persistVisualMask();
    });
    $("cc-mask-my-preset").addEventListener("change", (e) => applyPrivacyPreset("my", e.target.value));
    $("cc-mask-opponent-preset").addEventListener("change", (e) => applyPrivacyPreset("opponent", e.target.value));

    const bindMaskIdentityField = (role, id, field, eventName = "input") => {
      $(id).addEventListener(eventName, (e) => {
        visualMask = normalizeVisualMask({
          ...visualMask,
          [`${role}PresetId`]: "custom",
          [role]: { ...visualMask[role], [field]: e.target.value }
        });
        previewVisualMaskAndSave();
      });
    };
    bindMaskIdentityField("my", "cc-mask-my-name", "nickname");
    bindMaskIdentityField("my", "cc-mask-my-elo", "elo");
    bindMaskIdentityField("my", "cc-mask-my-title", "title", "change");
    bindMaskIdentityField("opponent", "cc-mask-opponent-name", "nickname");
    bindMaskIdentityField("opponent", "cc-mask-opponent-elo", "elo");
    bindMaskIdentityField("opponent", "cc-mask-opponent-title", "title", "change");

    $("cc-mask-random-btn").addEventListener("click", randomizePrivacyOpponent);
    $("cc-mask-swap-btn").addEventListener("click", () => {
      visualMask = normalizeVisualMask({
        ...visualMask,
        myPresetId: visualMask.opponentPresetId,
        opponentPresetId: visualMask.myPresetId,
        my: visualMask.opponent,
        opponent: visualMask.my
      });
      persistVisualMask();
    });

    const revealButton = $("cc-mask-reveal-btn");
    const setReveal = (revealed) => {
      privacyMaskManager?.setRevealed(revealed);
      revealButton.textContent = revealed ? "👁 ОРИГИonЛ byMAPЗ" : "👁 УДЕРЖИВАТЬ: SHOW ОРИГИonЛ";
      if (!revealed) updatePrivacyMaskStatus();
    };
    revealButton.addEventListener("pointerdown", (e) => { e.preventDefault(); setReveal(true); });
    revealButton.addEventListener("pointerup", () => setReveal(false));
    revealButton.addEventListener("pointercancel", () => setReveal(false));
    revealButton.addEventListener("pointerleave", () => setReveal(false));

    $("cc-train-good").addEventListener("click", () => {
      if (!cachedMoves.best || !cachedMoves.boardKey) return;
      safeSendMessage(
        { type: "TRAIN_MOVE_MANUAL", fenKey: cachedMoves.boardKey, uci: cachedMoves.best.uci, delta: 95 },
        (res) => {
          const btn = $("cc-train-good");
          btn.textContent = "✦ PINNED!";
          setTimeout(() => { btn.textContent = "👍 PIN MOVE"; }, 800);
          if (res && res.positionsCount !== undefined) {
            $("cc-misc-db-summary").textContent = `Positions learned in memory: ${res.positionsCount}`;
          }
          forceRecalculate();
        }
      );
    });

    $("cc-train-bad").addEventListener("click", () => {
      if (!cachedMoves.best || !cachedMoves.boardKey) return;
      safeSendMessage(
        { type: "TRAIN_MOVE_MANUAL", fenKey: cachedMoves.boardKey, uci: cachedMoves.best.uci, delta: -210 },
        (res) => {
          const btn = $("cc-train-bad");
          btn.textContent = "✖ BANNED!";
          setTimeout(() => { btn.textContent = "👎 BAN MOVE"; }, 800);
          if (res && res.positionsCount !== undefined) {
            $("cc-misc-db-summary").textContent = `Positions learned in memory: ${res.positionsCount}`;
          }
          forceRecalculate();
        }
      );
    });

    $("cc-export-db").addEventListener("click", () => {
      safeSendMessage({ type: "GET_MEMORY_STATS" }, (res) => {
        const blob = new Blob([JSON.stringify(res?.experienceDB || {}, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chesscoach-db-${Date.now()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    });

    $("cc-import-db").addEventListener("click", () => {
      const inp = $("cc-import-file-input");
      if (inp) inp.click();
    });

    $("cc-import-file-input").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result || "{}"));
          safeSendMessage({ type: "IMPORT_MEMORY", data: parsed }, (res) => {
            if (res && res.positionsCount !== undefined) {
              $("cc-misc-db-summary").textContent = `Positions learned in memory: ${res.positionsCount}`;
            }
          });
        } catch (err) {}
      };
      reader.readAsText(file);
    });

    $("cc-clear-db").addEventListener("click", () => {
      safeSendMessage({ type: "CLEAR_MEMORY" }, () => {
        $("cc-misc-db-summary").textContent = "Positions learned in memory: 0";
      });
    });

    // EXPORTbyRT И IMPORTbyRT CONFIGS (.CHESS)
    $("cc-export-cfg-btn").addEventListener("click", () => {
      const rawName = ($("cc-cfg-name-input")?.value || "ChessCom_Stealth").trim();
      const safeFileName = rawName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, "_") || "ChessCom_Cfg";
      const includeBg = Boolean($("cc-cfg-include-bg-chk")?.checked);

      const payload = buildCurrentConfigPayload(rawName, includeBg);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeFileName}.chess`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      const badge = $("cc-cfg-status-badge");
      if (badge) {
        badge.textContent = `💾 EXPORTED: ${safeFileName}.chess`;
        badge.style.color = "#00f5d4";
      }
    });

    $("cc-import-cfg-btn").addEventListener("click", () => {
      const inp = $("cc-import-cfg-input");
      if (inp) {
        inp.value = "";
        inp.click();
      }
    });

    $("cc-import-cfg-input").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result || "{}"));
          const ok = applyImportedChessConfig(parsed);
          const badge = $("cc-cfg-status-badge");
          if (ok) {
            const cfgTitle = parsed.name || file.name.replace(/\.chess$/i, "");
            if ($("cc-cfg-name-input")) $("cc-cfg-name-input").value = cfgTitle;
            if (badge) {
              badge.textContent = `✅ ACTIVE: ${cfgTitle}`;
              badge.style.color = "#38b000";
            }
            setAutoStatusText(`⚙️ Loaded config: ${cfgTitle}`, "#00f5d4");
          } else if (badge) {
            badge.textContent = "❌ ERROR FILEА .CHESS";
            badge.style.color = "#ff2a85";
          }
        } catch (err) {
          const badge = $("cc-cfg-status-badge");
          if (badge) {
            badge.textContent = "❌ CORRUPTED FILE";
            badge.style.color = "#ff2a85";
          }
        }
      };
      reader.readAsText(file);
    });
  }

  function getAutoMoveGuardReason() {
    const path = location.pathname.toLowerCase();
    if (/(?:^|\/)(?:computer|bots?|analysis|puzzles?|lessons?|solo(?:-chess)?|practice|drills?|classroom)(?:\/|$)/.test(path)) return "";
    const isVisible = node => {
      if (!node?.isConnected) return false;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    for (const badge of document.querySelectorAll(".board-layout-top .user-chess-title, .player-top .user-chess-title, [data-cy='opponent-bot']")) {
      if (isVisible(badge) && (badge.matches("[data-cy='opponent-bot']") || /\bBOT\b/i.test(badge.textContent || ""))) return "";
    }
    const board = findChessComBoardElement();
    const boardContext = new Set();
    for (let node = board; node; node = node.parentElement || node.getRootNode?.()?.host) boardContext.add(node);
    const metadata = [...boardContext, ...document.querySelectorAll(
      ".game-info, .game-info-component, .game-details, .game-details-component, .game-type, .live-game-info, " +
      "[data-cy='game-info'], [data-cy='game-details'], [data-cy='game-type'], [data-cy='game-rated'], [data-cy='game-rating-type']"
    )].filter(isVisible);
    let rated = false;
    let casual = false;
    for (const node of metadata) {
      for (const attribute of ["data-rated", "data-is-rated", "data-game-rated", "rated"]) {
        const value = String(node.getAttribute(attribute) || "").trim().toLowerCase();
        if (["true", "1", "rated"].includes(value)) rated = true;
        if (["false", "0", "unrated", "casual"].includes(value)) casual = true;
      }
      if (boardContext.has(node)) continue;
      const text = `${node.textContent || ""} ${node.getAttribute("aria-label") || ""}`.toLowerCase();
      if (/\b(?:unrated|casual|friendly)\b|without рейнга|notрейнгов|товарищеск/.test(text)) casual = true;
      if (/\brated\b|(?:^|\s)рейнгов(?:ая||ое)(?:\s|$|[.,:])/.test(text)) rated = true;
    }
    if (rated) return "Automove blocked: rated game against human. Move manually.";
    if (casual) return "";
    return "Automove suspended: рейнго's status game not confirmed. зрешены only explicitly notрейнгоyouе, уб game and бfromы.";
  }

  function parseChessComClock(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const raw = (el.innerText || el.textContent || "").trim().replace(/\s+/g, "");
      if (!raw) continue;
      const parts = raw.split(":");
      if (parts.length === 2) {
        const mins = parseInt(parts[0], 10) || 0;
        const secs = parseFloat(parts[1]) || 0;
        return mins * 60 + secs;
      }
      if (parts.length === 3) {
        const hrs = parseInt(parts[0], 10) || 0;
        const mins = parseInt(parts[1], 10) || 0;
        const secs = parseFloat(parts[2]) || 0;
        return hrs * 3600 + mins * 60 + secs;
      }
    }
    return Number.POSITIVE_INFINITY;
  }

  function getMyRemainingSeconds() {
    return parseChessComClock([
      ".board-layout-bottom .clock-time-monospace",
      ".clock-bottom .clock-time-monospace",
      ".player-bottom .clock-time-monospace",
      "[data-cy='clock-bottom'] .clock-time-monospace"
    ]);
  }

  function getEnemyRemainingSeconds() {
    return parseChessComClock([
      ".board-layout-top .clock-time-monospace",
      ".clock-top .clock-time-monospace",
      ".player-top .clock-time-monospace",
      "[data-cy='clock-top'] .clock-time-monospace"
    ]);
  }

  function formatClockMMSS(sec) {
    if (!Number.isFinite(sec)) return "--:--";
    const s = Math.max(0, sec);
    if (s >= 3600) {
      const hours = Math.floor(s / 3600);
      const mins = Math.floor((s % 3600) / 60);
      const secs = Math.floor(s % 60);
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    const mins = Math.floor(s / 60);
    const rem = s - mins * 60;
    if (mins === 0 && rem < 10) {
      return `0:${rem.toFixed(1).padStart(4, "0")}`;
    }
    return `${mins}:${Math.floor(rem).toString().padStart(2, "0")}`;
  }

  function updateTimeSniperBanner(res) {
    const banner = $("cc-time-sniper-banner");
    if (!banner) return;

    const mySecs = getMyRemainingSeconds();
    const enemySecs = getEnemyRemainingSeconds();
    const clocksEl = $("cc-time-sniper-clocks");
    if (clocksEl) {
      clocksEl.textContent = `US ${formatClockMMSS(mySecs)} ⚡ ENEMY ${formatClockMMSS(enemySecs)}`;
    }

    const advice = res?.timeAdvice;
    if (advice) {
      banner.style.display = "block";
      banner.style.borderColor = advice.mode === "zeitnot_attack" ? "#ffbe0b" : (advice.mode === "my_panic" ? "#ff2a85" : "rgba(0, 245, 212, 0.38)");
      if ($("cc-time-sniper-badge")) $("cc-time-sniper-badge").textContent = advice.badge;
      if ($("cc-time-sniper-text")) $("cc-time-sniper-text").textContent = advice.text;
    } else if (enemySecs < 600 || mySecs < 600) {
      banner.style.display = "block";
      banner.style.borderColor = "rgba(0, 245, 212, 0.25)";
      if ($("cc-time-sniper-badge")) $("cc-time-sniper-badge").textContent = "⏱️ LEGIT ТАЙМ-КОНТРОЛЬ CHESS.COM";
      if ($("cc-time-sniper-text")) {
        $("cc-time-sniper-text").textContent =
          enemySecs < 20
            ? "У opponent цейтнfrom — обостряйте game!"
            : "Ритм moves аyesпрован under yourи clock for обmove гистогframesмы Fair Play.";
      }
    } else {
      banner.style.display = "none";
    }
  }

  function updateEvalMoodAndEngineBadge(state, res) {
    const panel = $("chesscoach-panel");
    const moodLabel = $("cc-eval-mood-label");
    const powerBadge = $("cc-engine-power");
    if (!state || !res?.best) {
      if (panel) panel.dataset.evalMood = "neutral";
      if (moodLabel) moodLabel.textContent = "WAITING";
      if (powerBadge) {
        powerBadge.textContent = "ENGINE IDLE";
        delete powerBadge.dataset.consensus;
      }
      return;
    }

    let whiteEval = Number(res.best.whitePerspectiveEval);
    if (!Number.isFinite(whiteEval)) {
      const sideEval = Number.parseFloat(res.best.evalPawns);
      whiteEval = Number.isFinite(sideEval) ? (state.sideToAnalyze === "w" ? sideEval : -sideEval) : 0;
    }
    const myEval = state.myColor === "w" ? whiteEval : -whiteEval;
    const mood = res.isDangerPosition || myEval <= -2.5
      ? "critical"
      : myEval >= 0.75 ? "ahead" : myEval <= -0.75 ? "behind" : "neutral";
    if (panel) panel.dataset.evalMood = mood;
    if (moodLabel) {
      moodLabel.textContent = mood === "critical" ? "CRITICAL" : mood === "ahead" ? "ADVANTAGE" : mood === "behind" ? "byД YESPRESSUREМ" : "EQUAL";
    }

    if (powerBadge) {
      const meta = res.engineMeta;
      if (meta) {
        powerBadge.textContent = `${meta.fullNnue ? "SF FULL" : "SF"} ${meta.workers || 1}C · H${meta.hashMb || "?"}M · D${meta.depth || "?"}`;
        powerBadge.title = `${meta.consensus || "primary"} · seldepth ${meta.selDepth || meta.depth || "?"} · NPS ${meta.nps ? Math.round(meta.nps / 1000) + "k" : "—"}`;
        powerBadge.dataset.consensus = meta.consensus || "primary-only";
      } else if (res.best.fromCloud) {
        powerBadge.textContent = `CLOUD · D${res.best.cloudDepth || "?"}`;
        delete powerBadge.dataset.consensus;
      } else {
        powerBadge.textContent = "JS CORE";
        delete powerBadge.dataset.consensus;
      }
    }
  }

  function recordEvalPoint(boardKey, whiteEvalPawns, dropPawns = 0) {
    if (!boardKey) return;
    const parsedEval = Number.parseFloat(whiteEvalPawns);
    const parsedDrop = Number.parseFloat(dropPawns);
    const numEval = Math.max(-10, Math.min(10, Number.isFinite(parsedEval) ? parsedEval : 0));
    const numDrop = Number.isFinite(parsedDrop) ? parsedDrop : 0;

    if (boardKey === lastRecordedGraphBoardKey && evalGraphHistory.length > 0) {
      evalGraphHistory[evalGraphHistory.length - 1] = {
        boardKey,
        evalVal: numEval,
        isBlunder: numDrop >= 1.5,
        drop: numDrop
      };
      renderLiveEvalGraph();
      return;
    }
    lastRecordedGraphBoardKey = boardKey;

    evalGraphHistory.push({
      boardKey,
      evalVal: numEval,
      isBlunder: numDrop >= 1.5,
      drop: numDrop
    });

    if (evalGraphHistory.length > 60) {
      evalGraphHistory.shift();
    }
    renderLiveEvalGraph();
  }

  function renderLiveEvalGraph() {
    const canvas = $("cc-eval-graph-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width || 410;
    const h = canvas.height || 42;
    ctx.clearRect(0, 0, w, h);

    const midY = h / 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (evalGraphHistory.length === 0) {
      const emptyLabel = $("cc-eval-graph-label");
      if (emptyLabel) {
        emptyLabel.textContent = "0.00";
        delete emptyLabel.dataset.tone;
      }
      return;
    }

    const lastPt = evalGraphHistory[evalGraphHistory.length - 1];
    const lbl = $("cc-eval-graph-label");
    if (lbl && lastPt) {
      const sign = lastPt.evalVal > 0 ? "+" : "";
      lbl.textContent = `${sign}${lastPt.evalVal.toFixed(2)}`;
      lbl.dataset.tone = lastPt.evalVal >= 0 ? "positive" : "negative";
    }

    const [accent1, accent2] = THEME_ACCENT_COLORS[uiTheme] || THEME_ACCENT_COLORS.cyberpunk;
    const pts = evalGraphHistory.map((item, idx) => {
      const x = evalGraphHistory.length === 1
        ? w / 2
        : 6 + (idx / (evalGraphHistory.length - 1)) * (w - 12);
      const y = midY - (item.evalVal / 10) * (midY - 5);
      return { x, y, isBlunder: item.isBlunder, evalVal: item.evalVal };
    });

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(0, 245, 212, 0.32)");
    grad.addColorStop(0.5, "rgba(0, 187, 249, 0.04)");
    grad.addColorStop(1, "rgba(255, 42, 133, 0.30)");

    ctx.beginPath();
    ctx.moveTo(pts[0].x, midY);
    for (let i = 0; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.lineTo(pts[pts.length - 1].x, midY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = accent1;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = accent1;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.isBlunder) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.6, 0, Math.PI * 2);
        ctx.fillStyle = "#ff2a85";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (i === pts.length - 1) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = accent2;
        ctx.fill();
      }
    }
  }

  function hasMyPieceOnSquare(grid, myColor, sq) {
    if (!grid || !sq || sq.length < 2) return false;
    const c = FILES.indexOf(sq[0]);
    const r = 8 - parseInt(sq[1], 10);
    if (r < 0 || r > 7 || c < 0 || c > 7) return false;
    const p = grid[r][c];
    if (!p) return false;
    return myColor === "w" ? p === p.toUpperCase() : p === p.toLowerCase();
  }

  function usesStrictBestMovePolicy() {
    return engineMaxMode || currentElo >= 2000;
  }

  function getStructuredMoveScore(move) {
    if (!move) return null;
    const rawMate = move.mateIn;
    const mateIn = rawMate === null || rawMate === undefined ? NaN : Number(rawMate);
    if (move.isMate && Number.isFinite(mateIn) && mateIn !== 0) {
      return { type: "mate", mateIn };
    }
    if (move.isMateInOne) return { type: "mate", mateIn: 1 };
    if (move.isForcedMateInTwo) return { type: "mate", mateIn: 2 };
    if (move.blundersMate) return { type: "mate", mateIn: -1 };

    for (const key of ["scoreCp", "pureSearchScore", "trueScore"]) {
      if (move[key] === null || move[key] === undefined) continue;
      const value = Number(move[key]);
      if (Number.isFinite(value)) return { type: "cp", scoreCp: value };
    }
    return null;
  }

  function structuredScoreValue(score) {
    if (!score) return null;
    if (score.type === "mate") {
      const distance = Math.min(999, Math.abs(score.mateIn)) * 100;
      return score.mateIn > 0 ? 1000000 - distance : -1000000 + distance;
    }
    return Number.isFinite(score.scoreCp) ? score.scoreCp : null;
  }

  function isNegativeMateMove(move) {
    const score = getStructuredMoveScore(move);
    return Boolean(score?.type === "mate" && score.mateIn < 0);
  }

  function isFinalAutoAnalysis(res) {
    if (res?.best?.fromSyzygy || res?.syzygyActive) return true;
    if (usesStrictBestMovePolicy()) return Boolean(res?.analysisFinalized && res?.engineMeta);
    return Boolean(res?.analysisFinalized);
  }

  /**
   * УМНЫЙ CHOICE LEGITНОГО MOVES С ФИЛЬТРОМ ANTI-BANon T1%:
   * If текущ aboutцgradient matches with 1-й line Stockfish youexceeds bythreshold (ononmeasure, 66%),
   * а 2nd line safelyon and not loses больше 0.45 pawns — youpicksся 2nd line.
   */
  function chooseAutoMoveOnce(res) {
    if (!res || !res.best) return null;
    if (engineMaxMode) return { move: res.best, typeLabel: "♚ ENGINE MAX / PRIMARY SF", choiceKind: "engine-max" };
    if (currentElo >= 2000) {
      const typeLabel = res.best.fromSyzygy ? "🔮 SYZYGY" : "♚ PRIMARY STOCKFISH";
      return { move: res.best, typeLabel, choiceKind: "best" };
    }

    if (protectCriticalMoves || res.isDangerPosition) {
      if (
        res.isDangerPosition ||
        res.best.isMateInOne ||
        res.best.isForcedMateInTwo ||
        res.best.isCheckmate ||
        res.best.fromSyzygy ||
        res.best.savedHangingPiece ||
        res.hangingSquare
      ) {
        const label = res.isDangerPosition
          ? "🛡 DEFENSE KING"
          : (res.best.fromSyzygy ? "🔮 SYZYGY" : "1ST LINE (CRIT.)");
        return { move: res.best, typeLabel: label, choiceKind: "best" };
      }
    }

    const avgIsSafe = Boolean(
      res.average &&
      res.average.uci !== res.best.uci &&
      !res.average.blundersMate &&
      !res.average.causesStalemate &&
      !res.average.isRepetitionDrawRisk &&
      !isNegativeMateMove(res.average) &&
      !res.average.underDirectAttack &&
      !res.average.ignoredHangingPiece &&
      !res.average.ruinedCastling
    );

    if (avgIsSafe) {
      const bestEval = structuredScoreValue(getStructuredMoveScore(res.best));
      const avgEval = structuredScoreValue(getStructuredMoveScore(res.average));
      if (!Number.isFinite(bestEval) || !Number.isFinite(avgEval)) {
        return { move: res.best, typeLabel: "✦ 1ST LINE", choiceKind: "best" };
      }
      const evalDiff = Math.abs(bestEval - avgEval);

      // 1. onнудлье снин T1% on aboveнии safelyго bythresholdа Chess.com
      if (
        autoT1LimiterEnabled &&
        legitStats.totalMyMoves >= 4 &&
        getT1MatchPercent() > maxSafeT1Percent &&
        bestEval >= avgEval &&
        evalDiff <= 48
      ) {
        return { move: res.average, typeLabel: `🛡 T1-LIMITER (2-Я LINE)`, choiceKind: "average" };
      }

      // 2. Естеwelcomeене вероятсте underмеши 2-й lines
      if (useAverageMoveSometimes && bestEval >= avgEval && evalDiff <= 38) {
        if (Math.random() * 100 < averageMoveFrequency) {
          return { move: res.average, typeLabel: "❖ 2-Я LINE (HUMAN)", choiceKind: "average" };
        }
      }
    }

    return { move: res.best, typeLabel: "✦ 1ST LINE", choiceKind: "best" };
  }

  /**
   * ГЕНЕРАТОР ЧЕЛSЕЧЕСКИХ TIMINGS ДЛЯ CHESS.COM (ANTI-FLAT HISTOGRAM):
   * Useклюет плоскую гистогframesму time: randomlook captures делаются быстрее,
   * а слож такск position in ттельшпиле byлуют естеwelcomeенную pause sizeмышления.
   */
  function computeLegitHumanDelayMs(moveObj, mySecs, isDanger) {
    const isRecapture = Boolean(
      moveObj &&
      moveObj.captured &&
      lastRealEnemyMove &&
      moveObj.to === lastRealEnemyMove.to
    );
    const isBook = Boolean(moveObj && (moveObj.bookName || uciHistoryList.length <= 6));
    const isTactical = Boolean(
      isDanger ||
      (moveObj && (moveObj.isSacrifice || moveObj.isFork || moveObj.isPin || moveObj.isTrap || moveObj.complexityBranches >= 24))
    );

    let minMs = 380;
    let maxMs = 950;

    if (mySecs > 180) {
      // Rapid (10+0 / 5+0)
      minMs = isRecapture ? 380 : (isBook ? 480 : (isTactical ? 1150 : 680));
      maxMs = isRecapture ? 760 : (isBook ? 980 : (isTactical ? 2450 : 1580));
    } else if (mySecs > 45) {
      // Blitz (3+0 / 3+2)
      minMs = isRecapture ? 270 : (isBook ? 340 : (isTactical ? 680 : 440));
      maxMs = isRecapture ? 540 : (isBook ? 680 : (isTactical ? 1480 : 960));
    } else if (mySecs > 15) {
      // Bullet / мал оста time
      minMs = isRecapture ? 180 : 230;
      maxMs = isRecapture ? 350 : (isTactical ? 580 : 460);
    } else {
      // Цейтнfrom (< 15 sec)
      minMs = 130;
      maxMs = 260;
    }

    const r1 = Math.random();
    const r2 = Math.random();
    let baseDelay = Math.round(minMs + (r1 * 0.6 + r2 * 0.4) * (maxMs - minMs));

    // Симуляция глубо forдчивос human in noривиаль positionх
    if (humanHesitationEnabled && !isRecapture && !isBook && mySecs > 35 && isTactical && Math.random() < 0.38) {
      baseDelay += Math.round(650 + Math.random() * 1100);
    }

    return baseDelay;
  }

  function scheduleAutoMoveIfNeeded() {
    if (!autoMoveEnabled || extensionInvalidated || document.hidden) return;
    if (mobileSession && !mobileSession.effective().autoMoveEnabled) return;
    if (window.__CC_ANDROID_SETTINGS_OPEN__ === true) {
      setAutoStatusText("Automove paused: settings open", "#ffbe0b");
      return;
    }
    if (isExecutingMove || Date.now() < moveCooldownUntil) return;
    if (autoMoveTimer) return;

    const state = captureBoardState(false);
    if (!state || state.animating || state.actualTurn !== state.myColor) return;
    const guardReason = safeAntiBanGuard ? getAutoMoveGuardReason() : "";
    if (guardReason) {
      setAutoStatusText(guardReason, "#ffbe0b");
      return;
    }
    if (boardDirty || state.positionKey !== currentPositionKey || !isCachedAnalysisCurrent(state) || cachedMoves.boardKey !== state.boardKey) return;
    if (cachedMoves.analysisIncomplete && !cachedMoves.engineMeta && !cachedMoves.syzygyActive && !cachedMoves.best?.fromSyzygy) {
      setAutoStatusText("Automove paused: waiting for finished Stockfish analysis.", "#ffbe0b");
      return;
    }
    if (usesStrictBestMovePolicy() && !isFinalAutoAnalysis(cachedMoves)) {
      setAutoStatusText(
        engineMaxMode ? "♚ ENGINE MAX: WAITING FOR PRIMARY STOCKFISH..." : "♚ ELO 2000+: WAITING FOR FINAL STOCKFISH / SYZYGY...",
        "#64cdb9"
      );
      return;
    }

    if (currentTurnDecision.boardKey !== state.boardKey || !currentTurnDecision.decided) {
      const triggerRoll = Math.random() * 100;
      if (!usesStrictBestMovePolicy() && autoMoveTriggerRate < 100 && triggerRoll > autoMoveTriggerRate) {
        currentTurnDecision = {
          boardKey: state.boardKey,
          decided: true,
          skip: true,
          move: null,
          typeLabel: "SKIP (MANUAL)",
          totalDelay: 0,
          attempts: 0
        };
        setAutoStatusText(`🖐 Pause automove (${autoMoveTriggerRate}%) — move manually or press [X]`, "#ffbe0b");
        return;
      }

      const picked = chooseAutoMoveOnce(cachedMoves);
      if (!picked || !picked.move) return;

      const mySecs = getMyRemainingSeconds();
      let totalDelay = 540;
      if (engineMaxMode) {
        totalDelay = 130 + Math.floor(Math.random() * 46);
      } else if (legitAutoTiming) {
        totalDelay = computeLegitHumanDelayMs(picked.move, mySecs, cachedMoves.isDangerPosition);
      } else {
        const jitter = autoMoveJitterMs > 0 ? Math.round((Math.random() * 2 - 1) * autoMoveJitterMs) : 0;
        totalDelay = Math.max(200, autoMoveDelayMs + jitter);
      }

      currentTurnDecision = {
        boardKey: state.boardKey,
        sessionId: analysisSessionId,
        positionId,
        decided: true,
        skip: false,
        move: picked.move,
        typeLabel: `${picked.typeLabel} • ${(totalDelay / 1000).toFixed(2)}с`,
        choiceKind: picked.choiceKind || "policy",
        totalDelay,
        attempts: 0
      };
    }

    if (currentTurnDecision.skip) return;
    if (currentTurnDecision.attempts >= 3) {
      setAutoStatusText("Waiting for manual move (or press [X])", "#ffbe0b");
      return;
    }

    const mv = currentTurnDecision.move;
    const delayToWait = currentTurnDecision.attempts === 0 ? currentTurnDecision.totalDelay : 340;

    setAutoStatusText(
      `🛡 Thinking: ${mv.from}→${mv.to} [${currentTurnDecision.typeLabel}]`,
      cachedMoves.isDangerPosition ? "#ffbe0b" : "#00f5d4"
    );

    const expectedBoardKey = state.boardKey;
    const expectedPositionId = positionId;

    autoMoveTimer = setTimeout(() => {
      autoMoveTimer = null;
      if (!autoMoveEnabled || extensionInvalidated || document.hidden || window.__CC_ANDROID_SETTINGS_OPEN__ === true || boardDirty || expectedPositionId !== positionId) return;

      const fresh = captureBoardState(false);
      if (!fresh || fresh.animating) {
        scheduleAutoMoveIfNeeded();
        return;
      }
      if (fresh.actualTurn !== fresh.myColor || fresh.boardKey !== expectedBoardKey || fresh.positionKey !== currentPositionKey) {
        return;
      }
      if (cachedMoves.analysisIncomplete && !cachedMoves.engineMeta && !cachedMoves.syzygyActive && !cachedMoves.best?.fromSyzygy) return;

      currentTurnDecision.attempts++;
      const moveNow = currentTurnDecision.move || cachedMoves.best;
      if (!moveNow) return;

      executeMoveOnBoard(moveNow, fresh, false);
    }, delayToWait);
  }

  let cachedChessComBoardElement = null;
  let cachedChessComRoots = [];
  const CHESSCOM_BOARD_SELECTOR = "wc-chess-board, chess-board, #board-single, #board-play-computer, #board-vs-personalities, .board-layout-chessboard .board, .board";

  function getChessComBoardRoots(boardEl) {
    if (boardEl === cachedChessComBoardElement && cachedChessComRoots.length &&
        cachedChessComRoots.every(root => !root.host || root.host.isConnected)) {
      return cachedChessComRoots;
    }
    const roots = [boardEl];
    // querySelector and MutationObserver do not cross web-component shadow boundaries.
    for (let i = 0; i < roots.length; i++) {
      for (const node of [roots[i], ...roots[i].querySelectorAll("*")]) {
        if (node.shadowRoot && !roots.includes(node.shadowRoot)) roots.push(node.shadowRoot);
        if (node.tagName === "SLOT") {
          for (const assigned of node.assignedElements({ flatten: true })) {
            if (!roots.includes(assigned)) roots.push(assigned);
          }
        }
      }
    }
    if (boardEl === cachedChessComBoardElement) cachedChessComRoots = roots;
    return roots;
  }

  function normalizeVisualMask(raw) {
    const api = window.ChessCoachPrivacyMask;
    const source = raw && typeof raw === "object" ? raw : {};
    const base = DEFAULT_VISUAL_MASK || source;
    const normalized = api?.normalizeConfig ? api.normalizeConfig({
      enabled: typeof source.enabled === "boolean" ? source.enabled : base.enabled,
      style: source.style || base.style,
      maskDetails: typeof source.maskDetails === "boolean" ? source.maskDetails : base.maskDetails,
      maskPageTitle: typeof source.maskPageTitle === "boolean" ? source.maskPageTitle : base.maskPageTitle,
      blockProfileHover: typeof source.blockProfileHover === "boolean" ? source.blockProfileHover : base.blockProfileHover,
      my: source.my || base.my,
      opponent: source.opponent || base.opponent
    }) : {
      enabled: Boolean(source.enabled),
      style: source.style === "royal" ? "royal" : "broadcast",
      maskDetails: source.maskDetails !== false,
      maskPageTitle: source.maskPageTitle !== false,
      blockProfileHover: source.blockProfileHover !== false,
      my: { ...(source.my || base.my) },
      opponent: { ...(source.opponent || base.opponent) }
    };
    const profileIds = new Set((api?.profiles || []).map(profile => profile.id));
    const validPreset = (value, fallback) => profileIds.size === 0 || profileIds.has(value) ? value : fallback;
    const myPresetId = validPreset(source.myPresetId || base.myPresetId, "custom");
    const opponentPresetId = validPreset(source.opponentPresetId || base.opponentPresetId, "custom");
    const fillPresetAssets = (identity, presetId) => {
      const profile = api?.getProfile?.(presetId);
      if (!profile || profile.id === "custom") return identity;
      return {
        ...identity,
        countryCode: identity.countryCode || profile.countryCode || "",
        avatarUrl: profile.avatarUrl || identity.avatarUrl || ""
      };
    };
    return {
      version: 1,
      ...normalized,
      my: fillPresetAssets(normalized.my, myPresetId),
      opponent: fillPresetAssets(normalized.opponent, opponentPresetId),
      myPresetId,
      opponentPresetId,
      autoRotateOpponent: Boolean(source.autoRotateOpponent)
    };
  }

  function getPrivacyProfileOptions() {
    const profiles = window.ChessCoachPrivacyMask?.profiles || [
      { id: "custom", label: "Custom profile" },
      { id: "anonymous", label: "Anonymous streamer" }
    ];
    return profiles.map(profile => `<option value="${profile.id}">${profile.label}</option>`).join("");
  }

  function updatePrivacyMaskStatus() {
    const badge = $("cc-mask-status");
    if (badge) {
      badge.textContent = visualMask.enabled
        ? (privacyMaskFoundPlayers === 2 ? "ACTIVE • 2/2 CARDS" : `SEARCHING CARDS • ${privacyMaskFoundPlayers}/2`)
        : "DISABLEDА";
      badge.style.color = visualMask.enabled && privacyMaskFoundPlayers === 2 ? "#6ee7b7" : (visualMask.enabled ? "#f8d477" : "#94a3b8");
    }
  }

  function ensurePrivacyMaskManager() {
    if (privacyMaskManager || !window.ChessCoachPrivacyMask) return;
    privacyMaskManager = window.ChessCoachPrivacyMask.create({
      getConfig: () => visualMask,
      getBoardElement: () => findChessComBoardElement(),
      onToggle: enabled => {
        visualMask = normalizeVisualMask({ ...visualMask, enabled });
        saveSetting({ chesscomVisualMaskV1: visualMask });
        privacyMaskManager?.update();
        updateUIValues();
      },
      onStatus: status => {
        privacyMaskFoundPlayers = status.foundPlayers;
        updatePrivacyMaskStatus();
      }
    });
  }

  function persistVisualMask() {
    visualMask = normalizeVisualMask(visualMask);
    saveSetting({ chesscomVisualMaskV1: visualMask });
    ensurePrivacyMaskManager();
    privacyMaskManager?.update();
    updateUIValues();
  }

  function previewVisualMaskAndSave() {
    visualMask = normalizeVisualMask(visualMask);
    ensurePrivacyMaskManager();
    privacyMaskManager?.update();
    updateUIValues();
    clearTimeout(privacySaveTimer);
    privacySaveTimer = setTimeout(() => {
      privacySaveTimer = null;
      saveSetting({ chesscomVisualMaskV1: visualMask });
    }, 180);
  }

  function applyPrivacyPreset(role, presetId) {
    const profile = window.ChessCoachPrivacyMask?.getProfile(presetId);
    visualMask = normalizeVisualMask({
      ...visualMask,
      [`${role}PresetId`]: presetId,
      [role]: profile && profile.id !== "custom"
        ? { nickname: profile.nickname, elo: profile.elo, title: profile.title, countryCode: profile.countryCode || "", avatarUrl: profile.avatarUrl || "" }
        : visualMask[role]
    });
    persistVisualMask();
  }

  function randomizePrivacyOpponent() {
    const profile = window.ChessCoachPrivacyMask?.randomProfile([visualMask.myPresetId, visualMask.opponentPresetId]);
    if (!profile) return;
    visualMask = normalizeVisualMask({
      ...visualMask,
      opponentPresetId: profile.id,
      opponent: { nickname: profile.nickname, elo: profile.elo, title: profile.title, countryCode: profile.countryCode || "", avatarUrl: profile.avatarUrl || "" }
    });
    persistVisualMask();
  }

  function handleStorageChanges(changes, areaName) {
    if (areaName !== "local") return;
    const activeTabChange = changes[storageKey("activeTabId")];
    const maskChange = changes[storageKey("chesscomVisualMaskV1")];
    if (typeof activeTabChange?.newValue === "string") activeTabId = activeTabChange.newValue;
    if (!maskChange) return;
    visualMask = normalizeVisualMask(maskChange.newValue || DEFAULT_VISUAL_MASK);
    ensurePrivacyMaskManager();
    privacyMaskManager?.update();
    updateUIValues();
  }

  function queryChessComBoard(boardEl, selector) {
    return Array.from(new Set(getChessComBoardRoots(boardEl).flatMap((root, i) => [
      ...(i > 0 && root.matches?.(selector) ? [root] : []),
      ...root.querySelectorAll(selector)
    ])));
  }

  function isElementVisibleInViewport(node, minWidth = 1, minHeight = 1) {
    if (!node?.isConnected || node.ownerDocument !== document) return false;
    const rect = node.getBoundingClientRect();
    if (rect.width < minWidth || rect.height < minHeight ||
        rect.right <= 0 || rect.bottom <= 0 || rect.left >= window.innerWidth || rect.top >= window.innerHeight) {
      return false;
    }

    for (let current = node; current; current = current.parentElement || current.getRootNode?.()?.host || null) {
      if (current.nodeType !== Node.ELEMENT_NODE) continue;
      const style = getComputedStyle(current);
      const opacity = Number.parseFloat(style.opacity);
      if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" ||
          style.contentVisibility === "hidden" || (Number.isFinite(opacity) && opacity <= 0.01) ||
          current.hidden || current.inert || current.getAttribute("aria-hidden") === "true") {
        return false;
      }
    }

    if (typeof node.checkVisibility === "function") {
      try {
        if (!node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
      } catch (e) {}
    }
    return true;
  }

  function isUsableChessComBoard(node) {
    if (!isElementVisibleInViewport(node, 120, 120)) return false;
    return queryChessComBoard(node, ".piece").some(piece => {
      const cls = piece.getAttribute("class") || "";
      return /\b[wb][pnbrqk]\b/i.test(cls) && /\bsquare-[1-8][1-8]\b/.test(cls);
    });
  }

  function findChessComBoardElement() {
    if (isUsableChessComBoard(cachedChessComBoardElement)) {
      return cachedChessComBoardElement;
    }
    cachedChessComBoardElement = null;
    cachedChessComRoots = [];
    const candidates = new Set(document.querySelectorAll(CHESSCOM_BOARD_SELECTOR));
    if (!candidates.size) {
      for (const node of queryChessComBoard(document, CHESSCOM_BOARD_SELECTOR)) candidates.add(node);
    }
    for (const node of candidates) {
      for (const inner of queryChessComBoard(node, CHESSCOM_BOARD_SELECTOR)) candidates.add(inner);
    }
    const visibleBoards = [];
    for (const node of candidates) {
      if (!isUsableChessComBoard(node)) continue;
      visibleBoards.push(node);
    }

    let bestBoard = null;
    let maxArea = 0;

    for (const node of visibleBoards) {
      // Prefer the actual inner playing surface over a larger component/container.
      if (queryChessComBoard(node, CHESSCOM_BOARD_SELECTOR).some(inner => visibleBoards.includes(inner))) continue;
      const rect = node.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area >= maxArea) {
        maxArea = area;
        bestBoard = node;
      }
    }
    cachedChessComBoardElement = bestBoard;
    cachedChessComRoots = [];
    return bestBoard;
  }

  async function executeAndroidMoveOnBoard(moveObj, state, manualClick, promoPiece) {
    if (isExecutingMove || document.hidden || extensionInvalidated || (!manualClick && window.__CC_ANDROID_SETTINGS_OPEN__ === true)) return;
    const runtime = window.__CC_ANDROID_RUNTIME__;
    if (!mobileSession?.isReady) { setAutoStatusText("Input snapshot is not ready", "#ffbe0b"); return; }
    const failureKey = `${location.href}|${state.positionId}|${state.positionKey}`;
    if (!manualClick && (isNativeAutoBlocked(state) || nativeMoveBlockedKey === failureKey)) return;
    if (nativeMoveFailureKey !== failureKey) { nativeMoveFailureKey = failureKey; nativeMoveFailures = 0; }
    if (!manualClick && nativeMoveFailures >= 3) {
      setAutoStatusText("Native input not confirmed after 3 attempts. Move manually.", "#ffbe0b");
      return;
    }
    const attempt = ++nativeMoveFailures;
    const action = { controller: new AbortController(), failureKey, attempt,
      inputState: { url: location.href, board: state.boardElement, positionKey: state.positionKey,
        myColor: state.myColor, lastEnemy: lastRealEnemyMove, sawOpponent: false } };
    activeNativeMove = action;
    const pageUrl = location.href;
    const previousMove = lastOurExecutedMove;
    let boardEl = null;
    let layoutFrame = null;
    let completed = false;
    const fromCol = FILES.indexOf(moveObj.from[0]);
    const fromRow = 8 - Number(moveObj.from[1]);
    const toCol = FILES.indexOf(moveObj.to[0]);
    const toRow = 8 - Number(moveObj.to[1]);
    const movingPiece = state.grid[fromRow]?.[fromCol];
    const expectedPiece = promoPiece ? (state.myColor === "w" ? promoPiece.toUpperCase() : promoPiece) : movingPiece;
    const wait = ms => new Promise((resolve, reject) => {
      const signal = action.controller.signal;
      if (signal.aborted) { reject(new Error("Input cancelled")); return; }
      const onAbort = () => { clearTimeout(timer); reject(new Error("Input cancelled")); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, ms);
      signal.addEventListener("abort", onAbort, { once: true });
    });
    const requireVisibleContext = () => {
      if (activeNativeMove !== action || action.controller.signal.aborted || extensionInvalidated || document.hidden ||
           location.href !== pageUrl || !boardEl?.isConnected || runtime.disposed || (!manualClick && !mobileSession.effective().autoMoveEnabled)) throw new Error("Move context changed");
      if (!manualClick && window.__CC_ANDROID_SETTINGS_OPEN__ === true) throw new Error("Automove paused: settings open");
      if (findChessComBoardElement() !== boardEl) throw new Error("Board was replaced");
      const guardReason = !manualClick && safeAntiBanGuard ? getAutoMoveGuardReason() : "";
      if (guardReason) throw new Error(guardReason);
    };
    const requireCurrentPosition = () => {
      requireVisibleContext();
      // Selection animations are not a move; compare the canonical board before another tap.
      const fresh = captureBoardState(true);
      if (!fresh || fresh.animating || fresh.boardElement !== boardEl || fresh.positionKey !== state.positionKey ||
          fresh.boardKey !== state.boardKey || fresh.actualTurn !== fresh.myColor || fresh.myColor !== state.myColor ||
          fresh.isBlackOrientation !== state.isBlackOrientation || !hasMyPieceOnSquare(fresh.grid, state.myColor, moveObj.from)) {
        throw new Error("Position or queue move changed");
      }
    };
    const pointFor = square => {
      const rect = boardEl.getBoundingClientRect();
      if (rect.width < 50 || rect.height < 50) throw new Error("Board unavailable");
      const file = FILES.indexOf(square[0]);
      const rank = Number(square[1]) - 1;
      const col = state.isBlackOrientation ? 7 - file : file;
      const row = state.isBlackOrientation ? rank : 7 - rank;
      return { x: rect.left + (col + 0.5) * rect.width / 8, y: rect.top + (row + 0.5) * rect.height / 8 };
    };
    const sendGesture = async (actionType, points, target = boardEl) => {
      requireVisibleContext();
      const targetId = mobileSession.registerTarget(target);
      const snapshot = runtime.captureInputSnapshot({ points, targetId });
      if (!snapshot || !snapshot.hit || snapshot.animating) throw new Error("Input target is obscured or moving");
      action.gestureSent = true;
      const result = await runtime.nativeRequest("input.gesture", {
        action: actionType, points, durationMs: actionType === "tap" ? 80 : 180, targetId, snapshot
      }, { signal: action.controller.signal });
      if (result?.ok !== true || result?.dispatched !== true) throw new Error("Android did not confirm touch send");
    };
    const moveConfirmed = fresh => Boolean(fresh && fresh.boardElement === boardEl && fresh.boardKey !== state.boardKey &&
      fresh.grid?.[fromRow]?.[fromCol] !== movingPiece && fresh.grid?.[toRow]?.[toCol] === expectedPiece);
    setMoveExecutionState(true, "move-start");
    setAutoStatusText(`Native input: ${moveObj.from} -> ${moveObj.to}...`, "#00f5d4");
    try {
      const layout = new Promise(resolve => {
        layoutFrame = requestAnimationFrame(() => { layoutFrame = requestAnimationFrame(resolve); });
      });
      await Promise.race([layout, wait(400).then(() => { throw new Error("Menu did not free the board in time"); })]);
      boardEl = findChessComBoardElement();
      if (state.boardElement && state.boardElement !== boardEl) throw new Error("Board was replaced");
      requireCurrentPosition();
      const p1 = pointFor(moveObj.from);
      const p2 = pointFor(moveObj.to);
      if (autoClickMethod === "bezier_drag" || attempt > 1) {
        await sendGesture("drag", [p1, { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, p2]);
      } else {
        await sendGesture("tap", [p1]);
        requireCurrentPosition();
        await sendGesture("tap", [pointFor(moveObj.to)]);
      }
      if (promoPiece) {
        const chooserDeadline = Date.now() + 900;
        while (Date.now() < chooserDeadline) {
          requireVisibleContext();
          const fresh = captureBoardState(true);
          if (moveConfirmed(fresh)) break;
          if (fresh && fresh.boardKey !== state.boardKey &&
              !(fresh.grid?.[fromRow]?.[fromCol] !== movingPiece && fresh.grid?.[toRow]?.[toCol] === movingPiece)) {
            throw new Error("Position changed until promotion choice");
          }
          const color = state.myColor === "b" ? "b" : "w";
          const selector = `.promotion-window .promotion-piece.${color}${promoPiece}, .promotion-menu [data-piece='${color}${promoPiece}'], .promotion-piece.${color}${promoPiece}`;
          const root = boardEl.getRootNode();
          const node = queryChessComBoard(root.host ? root : boardEl, selector)[0] || document.querySelector(selector);
          const rect = node?.getBoundingClientRect();
          if (rect?.width > 0 && rect.height > 0) {
            await sendGesture("tap", [{ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }], node);
            break;
          }
          await wait(60);
        }
      }
      const deadline = Date.now() + 1500;
      while (Date.now() < deadline) {
        requireVisibleContext();
        const fresh = captureBoardState(true);
        if (moveConfirmed(fresh) && !queryChessComBoard(boardEl, ".piece.dragging, .piece.animating").length) {
          completed = true;
          break;
        }
        await wait(75);
      }
      if (!completed) throw new Error(promoPiece ? "promotion not confirmed on board" : "Touches sent, but move not confirmed on the board");
      lastOurExecutedMove = moveObj;
      setAutoStatusText(`Move confirmed: ${moveObj.from} -> ${moveObj.to}`, "#38b000");
    } catch (error) {
      if (activeNativeMove === action) {
        if (action.gestureSent) {
          nativeMoveBlockedKey = failureKey;
          nativeMoveBlockedState = action.inputState;
        }
        mobileSession.reportError(error);
        lastOurExecutedMove = previousMove;
        setAutoStatusText(`Native input: ${error.message || "error"}${error.code ? ` [${error.code}]` : ""}`, "#ffbe0b");
      }
    } finally {
      if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);
      action.controller.abort();
      if (activeNativeMove === action) {
        activeNativeMove = null;
        if (completed) { nativeMoveBlockedKey = ""; nativeMoveBlockedState = null; }
        moveCooldownUntil = Date.now() + (completed ? 180 : 350);
        setMoveExecutionState(false, completed ? "confirmed" : action.cancelReason || "failed");
        triggerDebouncedCycle();
      }
    }
  }

  function executeMoveOnBoard(moveObj, state, manualClick = false) {
    if (!moveObj || !/^[a-h][1-8]$/.test(moveObj.from || "") || !/^[a-h][1-8]$/.test(moveObj.to || "") || moveObj.from === moveObj.to || !state || !state.grid) return;
    if (boardDirty || state.positionId !== positionId || state.positionKey !== currentPositionKey) return;

    const guardReason = !manualClick && safeAntiBanGuard ? getAutoMoveGuardReason() : "";
    if (guardReason) {
      setAutoStatusText(guardReason, "#ffbe0b");
      return;
    }

    const fromSq = moveObj.from;
    const toSq = moveObj.to;

    if (!hasMyPieceOnSquare(state.grid, state.myColor, fromSq)) {
      return;
    }

    const movingPiece = state.grid[8 - Number(fromSq[1])]?.[FILES.indexOf(fromSq[0])]?.toLowerCase();
    const isPromotion = movingPiece === "p" && (toSq[1] === "8" || toSq[1] === "1");
    const promoPiece = isPromotion ? String(moveObj.promo || moveObj.uci?.[4] || "q").toLowerCase() : null;
    if (isPromotion && !["q", "r", "b", "n"].includes(promoPiece)) {
      setAutoStatusText("Automove cancelled: unknown promotion piece.", "#ffbe0b");
      return;
    }
    if (window.__CC_ANDROID_RUNTIME__) {
      const uci = `${fromSq}${toSq}${promoPiece || ""}`;
      if (state.actualTurn !== state.myColor ||
          (Array.isArray(cachedMoves.legalUcis) && cachedMoves.legalUcis.length && !cachedMoves.legalUcis.includes(uci))) {
        setAutoStatusText("Move cancelled: move queue or legal moves list changed.", "#ffbe0b");
        return;
      }
      executeAndroidMoveOnBoard(moveObj, state, manualClick, promoPiece);
      return;
    }

    const boardEl = findChessComBoardElement();
    if (!boardEl || (state.boardElement && state.boardElement !== boardEl)) return;

    const r = boardEl.getBoundingClientRect();
    if (r.width < 50) return;

    lastOurExecutedMove = moveObj;
    setMoveExecutionState(true, "move-start");
    moveCooldownUntil = Date.now() + 450;

    const cellW = r.width / 8;
    const cellH = r.height / 8;
    const isBlack = state.isBlackOrientation;

    // Normлье limitен вwindowруг centerа squareки (±22% from ширины squares)
    const gaussianShift = () => ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 0.44;

    const sqToHumanPoint = (sq) => {
      const file = FILES.indexOf(sq[0]);
      const rank = parseInt(sq[1], 10) - 1;
      const col = isBlack ? 7 - file : file;
      const row = isBlack ? rank : 7 - rank;
      return {
        col,
        row,
        x: Math.round(r.left + (col + 0.5 + gaussianShift()) * cellW),
        y: Math.round(r.top + (row + 0.5 + gaussianShift()) * cellH)
      };
    };

    const p1 = sqToHumanPoint(fromSq);
    const p2 = sqToHumanPoint(toSq);

    performBezierStealthMove(boardEl, p1, p2, promoPiece, state.myColor, toSq, state.boardKey, (completed = true) => {
      setMoveExecutionState(false, completed ? "dispatched" : "failed");
      if (!completed) {
        lastOurExecutedMove = null;
        committedBoardKey = "";
        boardDirty = true;
        moveCooldownUntil = Date.now() + 180;
        setAutoStatusText(
          promoPiece ? `Automove cancelled: promotion ${promoPiece.toUpperCase()} not confirmed` : "Automove cancelled: position changed",
          "#d9ad58"
        );
        triggerDebouncedCycle();
        return;
      }
      setAutoStatusText(`✅ Made legit-move: ${fromSq} → ${toSq}`, "#38b000");
      triggerDebouncedCycle();
    });
  }

  function performBezierStealthMove(boardEl, p1, p2, promoPiece, myColor, toSquare, expectedBoardKey, onDone) {
    const actionPositionId = positionId;
    let finished = false;
    const finish = (success) => {
      if (finished) return;
      finished = true;
      if (onDone) onDone(Boolean(success));
    };
    const actionStillCurrent = () => !extensionInvalidated && boardEl.isConnected && positionId === actionPositionId;
    const firePointerAndMouse = (type, x, y, buttons) => {
      if (!actionStillCurrent()) return;
      let target = document.elementFromPoint(x, y) || boardEl;
      while (target.shadowRoot?.elementFromPoint) {
        const inner = target.shadowRoot.elementFromPoint(x, y);
        if (!inner || inner === target) break;
        target = inner;
      }
      const evInit = {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        clientX: x,
        clientY: y,
        screenX: x,
        screenY: y + 70,
        button: 0,
        buttons,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true
      };
      const pointerType = type
        .replace("mousedown", "pointerdown")
        .replace("mousemove", "pointermove")
        .replace("mouseup", "pointerup");
      try {
        target.dispatchEvent(new PointerEvent(pointerType, evInit));
      } catch (e) {}
      target.dispatchEvent(new MouseEvent(type, evInit));
    };

    // ст time двиния mouse between square by Заку Фиттса
    const distCells = Math.hypot(p2.col - p1.col, p2.row - p1.row);
    const travelMs = Math.round(135 + distCells * 42 + Math.random() * 85);
    const hold1Ms = Math.round(68 + Math.random() * 58);
    const hold2Ms = Math.round(72 + Math.random() * 64);

    // Ктрольonя точ for дуги Without (естеwelcomeен fromгиб кис hand)
    const midX = (p1.x + p2.x) / 2 + (Math.random() - 0.5) * 48;
    const midY = (p1.y + p2.y) / 2 + (Math.random() - 0.5) * 48;

    const animateBezierCurve = (stepsCount, durationMs, buttonsDuringMove, onCurveFinished) => {
      let step = 1;
      const stepInterval = Math.max(14, Math.round(durationMs / stepsCount));
      const stepTimer = setInterval(() => {
        if (!actionStillCurrent()) {
          clearInterval(stepTimer);
          finish(false);
          return;
        }
        const t = step / stepsCount;
        const inv = 1 - t;
        const bx = Math.round(inv * inv * p1.x + 2 * inv * t * midX + t * t * p2.x + (Math.random() - 0.5) * 1.6);
        const by = Math.round(inv * inv * p1.y + 2 * inv * t * midY + t * t * p2.y + (Math.random() - 0.5) * 1.6);
        firePointerAndMouse("mousemove", bx, by, buttonsDuringMove);
        step++;
        if (step > stepsCount) {
          clearInterval(stepTimer);
          if (onCurveFinished) onCurveFinished();
        }
      }, stepInterval);
    };

    const handlePromotionIfNeeded = () => {
      if (!promoPiece) {
        finish(true);
        return;
      }
      const chooserDeadline = Date.now() + 900;
      const findAndSelectPromotion = () => {
        if (extensionInvalidated || !boardEl.isConnected) {
          finish(false);
          return;
        }
        const colChar = myColor === "b" ? "b" : "w";
        const pChar = promoPiece.toLowerCase();
        const selector = `.promotion-window .promotion-piece.${colChar}${pChar}, .promotion-menu [data-piece='${colChar}${pChar}'], .promotion-piece.${colChar}${pChar}`;
        const root = boardEl.getRootNode();
        const promoNode = queryChessComBoard(root.host ? root : boardEl, selector)[0] || document.querySelector(selector);
        if (!promoNode) {
          if (Date.now() < chooserDeadline) setTimeout(findAndSelectPromotion, 60);
          else finish(false);
          return;
        }
        const pr = promoNode.getBoundingClientRect();
        const px = Math.round(pr.left + pr.width / 2 + (Math.random() - 0.5) * 6);
        const py = Math.round(pr.top + pr.height / 2 + (Math.random() - 0.5) * 6);
        firePointerAndMouse("mousedown", px, py, 1);
        setTimeout(() => {
          firePointerAndMouse("mouseup", px, py, 0);
          if (!extensionInvalidated && boardEl.isConnected && promoNode.isConnected) promoNode.click();
          const verifyDeadline = Date.now() + 1500;
          const verifyPromotion = () => {
            if (extensionInvalidated || !boardEl.isConnected) {
              finish(false);
              return;
            }
            const fresh = captureBoardState(true);
            const toCol = FILES.indexOf(toSquare?.[0]);
            const toRow = 8 - Number(toSquare?.[1]);
            const expectedPiece = myColor === "w" ? pChar.toUpperCase() : pChar;
            const confirmed = Boolean(
              fresh &&
              fresh.boardKey !== expectedBoardKey &&
              toRow >= 0 && toRow < 8 && toCol >= 0 && toCol < 8 &&
              fresh.grid?.[toRow]?.[toCol] === expectedPiece
            );
            if (confirmed) finish(true);
            else if (Date.now() < verifyDeadline) setTimeout(verifyPromotion, 75);
            else finish(false);
          };
          setTimeout(verifyPromotion, 75);
        }, 65);
      };
      setTimeout(findAndSelectPromotion, 95);
    };

    // onведен on стартовую piece and onжат
    firePointerAndMouse("mousemove", p1.x - 4, p1.y - 3, 0);
    firePointerAndMouse("mousedown", p1.x, p1.y, 1);

    if (autoClickMethod === "bezier_drag") {
      // Variation 1: Smoothе перетаски pieces by curvesвой Without
      setTimeout(() => {
        animateBezierCurve(7, travelMs, 1, () => {
          const slipX = p2.x + (Math.random() > 0.5 ? 1 : -1);
          const slipY = p2.y + (Math.random() > 0.5 ? 1 : -1);
          firePointerAndMouse("mouseup", slipX, slipY, 0);
          handlePromotionIfNeeded();
        });
      }, 35);
    } else {
      // Variation 2: Биетрис 2-Click with squareт курсора by дуге Without
      setTimeout(() => {
        firePointerAndMouse("mouseup", p1.x + (Math.random() > 0.5 ? 1 : -1), p1.y, 0);
        animateBezierCurve(6, travelMs, 0, () => {
          firePointerAndMouse("mousedown", p2.x, p2.y, 1);
          setTimeout(() => {
            firePointerAndMouse("mouseup", p2.x + (Math.random() > 0.5 ? 1 : -1), p2.y + (Math.random() > 0.5 ? 1 : -1), 0);
            handlePromotionIfNeeded();
          }, hold2Ms);
        });
      }, hold1Ms);
    }
  }

  function detectRealMoveBetweenGrids(prevGrid, currGrid) {
    if (!prevGrid || !currGrid) return null;

    for (const color of ["w", "b"]) {
      const isCol = (p) => p && (color === "w" ? p === p.toUpperCase() : p === p.toLowerCase());
      let fromSq = null;
      let toSq = null;
      let oldPiece = null;
      let newPiece = null;

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const pOld = prevGrid[r][c];
          const pNew = currGrid[r][c];
          if (isCol(pOld) && !isCol(pNew)) {
            if (!fromSq || pOld.toLowerCase() === "k") {
              fromSq = `${FILES[c]}${8 - r}`;
              oldPiece = pOld.toLowerCase();
            }
          }
          if (isCol(pNew) && !isCol(pOld)) {
            if (!toSq || pNew.toLowerCase() === "k") {
              toSq = `${FILES[c]}${8 - r}`;
              newPiece = pNew.toLowerCase();
            }
          }
        }
      }

      if (fromSq && toSq) {
        const promo = (oldPiece === "p" && newPiece && newPiece !== "p") ? newPiece : "";
        const toCol = FILES.indexOf(toSq[0]);
        const toRow = 8 - parseInt(toSq[1], 10);
        const capturedOnTarget = prevGrid[toRow]?.[toCol];
        const isCapture = Boolean(capturedOnTarget && !isCol(capturedOnTarget)) || (oldPiece === "p" && fromSq[0] !== toSq[0]);
        return {
          uci: `${fromSq}${toSq}${promo}`,
          from: fromSq,
          to: toSq,
          piece: oldPiece || "p",
          color,
          isCapture
        };
      }
    }
    return null;
  }

  function resetLegitHistoryStats() {
    legitStats = {
      totalMyMoves: 0,
      top1Matches: 0,
      secondLineMatches: 0,
      windowBlursCount: 0,
      lastBestUciOnMyTurn: "",
      lastAvgUciOnMyTurn: ""
    };
    updateLegitAntiBanMeterUI();
  }

  function resetTrackedGame(grid, boardPart, boardEl, trustStartPosition) {
    analysisRequestId++;
    activeEngineBoardKey = "";
    StockfishWasmEngine.cancel?.();
    committedBoardKey = "";
    committedEnemyBoardKey = "";
    resetTurnDecision();
    const trustedStart = Boolean(trustStartPosition);
    castlingRights = { K: trustedStart, Q: trustedStart, k: trustedStart, q: trustedStart };
    prevGridState = grid.map(row => row.slice());
    prevBoardPartForHistory = boardPart;
    historyBoardElement = boardEl;
    currentEpSquare = "-";
    halfmoveClock = 0;
    fullmoveNumber = 1;
    lastObservedActualTurn = trustedStart ? "w" : null;
    lastRealEnemyMove = null;
    lastOurExecutedMove = null;
    sessionMoveHistory = [];
    uciHistoryList = [];
    recentPositionHistory = trustedStart ? [`${boardPart} w KQkq -`] : [];
    gameStartedFromInitial = trustedStart;
    evalGraphHistory = [];
    lastRecordedGraphBoardKey = "";
    renderLiveEvalGraph();
    lastTelemetryData = null;
    updateEvalMoodAndEngineBadge(null, null);
    gameResultRecorded = false;
    suspectEngineStreak = 0;
    resetLegitHistoryStats();
    const peerBanner = $("cc-peer-detector-banner");
    if (peerBanner) peerBanner.style.display = "none";
  }

  function invalidateTrackedHistory(grid, boardPart, boardEl) {
    resetTrackedGame(grid, boardPart, boardEl, false);
    currentEpSquare = "-";
  }

  function countDifferencesFromInitialGrid(grid) {
    const initialRows = [
      "rnbqkbnr", "pppppppp", "........", "........",
      "........", "........", "PPPPPPPP", "RNBQKBNR"
    ];
    let differences = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const expected = initialRows[row][col] === "." ? null : initialRows[row][col];
        if (grid[row][col] !== expected) differences++;
      }
    }
    return differences;
  }

  function updateCastlingEpAndRealHistory(grid, boardPart, myColor, boardEl, turnHint = null) {
    const startFenBoard = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    const isStartPosition = boardPart === startFenBoard;
    const isNewUrl = location.pathname !== lastPathname;
    const isNewBoardElement = Boolean(historyBoardElement && historyBoardElement !== boardEl);
    const isFreshStartBoard = isStartPosition && prevBoardPartForHistory !== "" && prevBoardPartForHistory !== startFenBoard;
    const isLikelyNewGame = Boolean(
      prevGridState &&
      uciHistoryList.length >= 2 &&
      countDifferencesFromInitialGrid(grid) <= 4 &&
      countDifferencesFromInitialGrid(prevGridState) > 4
    );

    if (isNewUrl || isNewBoardElement || isFreshStartBoard || isLikelyNewGame) {
      lastPathname = location.pathname;
      resetTrackedGame(grid, boardPart, boardEl, isStartPosition);
      if ((isNewUrl || isFreshStartBoard) && visualMask.enabled && visualMask.autoRotateOpponent) {
        randomizePrivacyOpponent();
      }
      return;
    }

    if (!prevGridState) {
      castlingRights = { K: isStartPosition, Q: isStartPosition, k: isStartPosition, q: isStartPosition };
      prevGridState = grid.map(row => row.slice());
      prevBoardPartForHistory = boardPart;
      historyBoardElement = boardEl;
      currentEpSquare = "-";
      halfmoveClock = 0;
      fullmoveNumber = 1;
      lastObservedActualTurn = isStartPosition ? "w" : turnHint;
      recentPositionHistory = isStartPosition ? [`${boardPart} w KQkq -`] : [];
      gameStartedFromInitial = isStartPosition;
      return;
    }

    let diffCount = 0;
    let epFound = "-";
    for (let c = 0; c < 8; c++) {
      if (prevGridState[6][c] === "P" && !grid[6][c] && !grid[5][c] && grid[4][c] === "P") epFound = `${FILES[c]}3`;
      if (prevGridState[1][c] === "p" && !grid[1][c] && !grid[2][c] && grid[3][c] === "p") epFound = `${FILES[c]}6`;
    }
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (prevGridState[r][c] !== grid[r][c]) diffCount++;
      }
    }
    if (diffCount === 0) return;
    if (diffCount === 1) return false;
    if (diffCount > 4) {
      invalidateTrackedHistory(grid, boardPart, boardEl);
      return;
    }

    const realMove = detectRealMoveBetweenGrids(prevGridState, grid);
    const isSingleCastling = Boolean(realMove?.piece === "k" && Math.abs(FILES.indexOf(realMove.from[0]) - FILES.indexOf(realMove.to[0])) === 2);
    const isSingleEnPassant = Boolean(realMove?.piece === "p" && realMove.from[0] !== realMove.to[0] && diffCount === 3);
    const expectedMover = gameStartedFromInitial ? (uciHistoryList.length % 2 === 0 ? "w" : "b") : null;
    const ambiguousDelta =
      !realMove?.uci ||
      (diffCount === 4 && !isSingleCastling) ||
      (diffCount === 3 && !isSingleEnPassant) ||
      (expectedMover && realMove.color !== expectedMover) ||
      (turnHint && realMove.color === turnHint) ||
      gameResultRecorded;
    if (ambiguousDelta) {
      invalidateTrackedHistory(grid, boardPart, boardEl);
      return;
    }

    if (grid[7][4] !== "K") { castlingRights.K = false; castlingRights.Q = false; }
    if (grid[7][7] !== "R") castlingRights.K = false;
    if (grid[7][0] !== "R") castlingRights.Q = false;
    if (grid[0][4] !== "k") { castlingRights.k = false; castlingRights.q = false; }
    if (grid[0][7] !== "r") castlingRights.k = false;
    if (grid[0][0] !== "r") castlingRights.q = false;

    currentEpSquare = epFound;
    const nextTurn = realMove.color === "w" ? "b" : "w";
    lastObservedActualTurn = gameStartedFromInitial || turnHint ? nextTurn : null;

    if (gameStartedFromInitial) {
      halfmoveClock = realMove.piece === "p" || realMove.isCapture ? 0 : halfmoveClock + 1;
      if (realMove.color === "b") fullmoveNumber++;
      const repetitionKey = `${boardPart} ${nextTurn} ${getCastlingString()} ${currentEpSquare}`;
      if (recentPositionHistory[recentPositionHistory.length - 1] !== repetitionKey) {
        recentPositionHistory.push(repetitionKey);
        if (recentPositionHistory.length > 80) recentPositionHistory.shift();
      }
      uciHistoryList.push(realMove.uci);

      if (realMove.color === myColor && prevBoardPartForHistory) {
        sessionMoveHistory.push({ fenKey: `${prevBoardPartForHistory} ${myColor}`, uci: realMove.uci });
        legitStats.totalMyMoves++;
        if (legitStats.lastBestUciOnMyTurn && realMove.uci === legitStats.lastBestUciOnMyTurn) legitStats.top1Matches++;
        else if (legitStats.lastAvgUciOnMyTurn && realMove.uci === legitStats.lastAvgUciOnMyTurn) legitStats.secondLineMatches++;
        updateLegitAntiBanMeterUI();
      }
    } else {
      halfmoveClock = 0;
      fullmoveNumber = 1;
      uciHistoryList = [];
      recentPositionHistory = [];
    }

    if (gameStartedFromInitial || turnHint) {
      if (realMove.color === myColor) {
        lastOurExecutedMove = realMove;
        lastRealEnemyMove = null;
      } else {
        lastRealEnemyMove = {
          from: realMove.from,
          to: realMove.to,
          piece: realMove.piece,
          color: realMove.color,
          epTarget: epFound !== "-" ? epFound : null
        };
      }
    }

    prevGridState = grid.map(row => row.slice());
    prevBoardPartForHistory = boardPart;
    historyBoardElement = boardEl;
  }

  function getCastlingString() {
    let s = "";
    if (castlingRights.K) s += "K";
    if (castlingRights.Q) s += "Q";
    if (castlingRights.k) s += "k";
    if (castlingRights.q) s += "q";
    return s || "-";
  }

  function detectActiveClockTurn(bottomColor, topColor) {
    const hasVisibleMatch = (selector) => Array.from(document.querySelectorAll(selector))
      .some(node => isElementVisibleInViewport(node));
    const bottomActive = hasVisibleMatch(
      ".board-layout-bottom .clock-player-turn, .board-layout-bottom .clock-running, " +
      ".clock-bottom.clock-player-turn, .clock-bottom.clock-running, " +
      ".player-bottom .clock-player-turn, .player-bottom .clock-running"
    );
    const topActive = hasVisibleMatch(
      ".board-layout-top .clock-player-turn, .board-layout-top .clock-running, " +
      ".clock-top.clock-player-turn, .clock-top.clock-running, " +
      ".player-top .clock-player-turn, .player-top .clock-running"
    );
    if (bottomActive === topActive) return null;
    return bottomActive ? bottomColor : topColor;
  }

  function detectDeclaredBoardTurn(boardEl) {
    for (const node of [boardEl, ...getChessComBoardRoots(boardEl).map(root => root.host).filter(Boolean)]) {
      const raw = String(
        node?.getAttribute?.("turn") ||
        node?.getAttribute?.("data-turn") ||
        node?.getAttribute?.("side-to-move") ||
        ""
      ).toLowerCase();
      if (raw === "w" || raw === "white") return "w";
      if (raw === "b" || raw === "black") return "b";
    }
    return null;
  }

  function detectTurnFromLastMoveHighlights(boardEl, grid) {
    const highlightedSquares = new Map();
    for (const highlight of queryChessComBoard(boardEl, ".highlight")) {
      if (!isElementVisibleInViewport(highlight)) continue;
      const squareMatch = (highlight.getAttribute("class") || "").match(/\bsquare-(\d)(\d)\b/);
      if (!squareMatch) continue;
      const col = parseInt(squareMatch[1], 10) - 1;
      const row = 8 - parseInt(squareMatch[2], 10);
      highlightedSquares.set(`${col}:${row}`, { col, row });
    }
    if (highlightedSquares.size !== 2) return null;
    const occupied = [...highlightedSquares.values()].filter(({ row, col }) => Boolean(grid[row]?.[col]));
    if (occupied.length !== 1) return null;
    const piece = grid[occupied[0].row][occupied[0].col];
    const movedColor = piece === piece.toUpperCase() ? "w" : "b";
    return movedColor === "w" ? "b" : "w";
  }

  /**
   * ПАРСЕР СОСТОЯНИЯ BOARD CHESS.COM (<wc-chess-board>):
   * Сcheatывает классы виyes "piece wp square-54", орнтацию .flipped and й сейс move.
   */
  function captureBoardState(allowCachedDuringAnim = false) {
    const boardEl = findChessComBoardElement();
    if (!boardEl) return null;

    const boardRect = boardEl.getBoundingClientRect();
    if (boardRect.width < 50 || boardRect.height < 50) return null;

    if (!allowCachedDuringAnim && !isExecutingMove && queryChessComBoard(boardEl, ".piece.dragging").length) {
      if (!animRetryTimer) {
        animRetryTimer = setTimeout(() => {
          animRetryTimer = null;
          runCycle(false);
        }, 30);
      }
      return { animating: true };
    }

    let isBlackOrientation = false;
    for (let node = boardEl; node; node = node.parentElement || node.getRootNode().host) {
      if (node.classList.contains("flipped") || node.getAttribute("orientation") === "black") {
        isBlackOrientation = true;
        break;
      }
    }
    const bottomColor = isBlackOrientation ? "b" : "w";
    const myColor = forcedMyColor === "w" || forcedMyColor === "b" ? forcedMyColor : bottomColor;
    const topColor = bottomColor === "w" ? "b" : "w";
    const activeClockTurn = detectActiveClockTurn(bottomColor, topColor);
    const declaredBoardTurn = detectDeclaredBoardTurn(boardEl);

    const grid = Array.from({ length: 8 }, () => Array(8).fill(null));
    let pieceCount = 0;

    const pieces = queryChessComBoard(boardEl, ".piece");
    pieces.forEach((p) => {
      const cls = p.getAttribute("class") || "";
      const typeMatch = cls.match(/\b([wb])([pnbrqk])\b/i);
      const sqMatch = cls.match(/\bsquare-(\d)(\d)\b/);
      if (!typeMatch || !sqMatch) return;

      const color = typeMatch[1].toLowerCase();
      const sym = typeMatch[2].toLowerCase();
      const col = parseInt(sqMatch[1], 10) - 1;
      const row = 8 - parseInt(sqMatch[2], 10);

      if (row >= 0 && row <= 7 && col >= 0 && col <= 7) {
        grid[row][col] = color === "w" ? sym.toUpperCase() : sym;
        pieceCount++;
      }
    });

    if (pieceCount === 0 || !grid.some(row => row.includes("K")) || !grid.some(row => row.includes("k"))) return null;

    const fenRows = grid.map((r) => {
      let s = "", empty = 0;
      for (const c of r) {
        if (!c) empty++;
        else {
          if (empty > 0) { s += empty; empty = 0; }
          s += c;
        }
      }
      if (empty > 0) s += empty;
      return s;
    });

    const boardPart = fenRows.join("/");
    if (!allowCachedDuringAnim) {
      const historyStable = updateCastlingEpAndRealHistory(grid, boardPart, myColor, boardEl, activeClockTurn || declaredBoardTurn);
      if (historyStable === false) {
        if (!animRetryTimer) {
          animRetryTimer = setTimeout(() => {
            animRetryTimer = null;
            runCycle(false);
          }, 30);
        }
        return { animating: true };
      }
    }

    // Оlimitен randomредness move on Chess.com
    const startFenBoard = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    const trustedHistoryTurn = gameStartedFromInitial ? (uciHistoryList.length % 2 === 0 ? "w" : "b") : null;
    const highlightedTurn = detectTurnFromLastMoveHighlights(boardEl, grid);
    const actualTurn = boardPart === startFenBoard
      ? "w"
      : (activeClockTurn || declaredBoardTurn || trustedHistoryTurn || lastObservedActualTurn || highlightedTurn || "w");

    let sideToAnalyze = actualTurn;
    if (turnMode === "w") sideToAnalyze = "w";
    else if (turnMode === "b") sideToAnalyze = "b";

    const castlingStr = getCastlingString();
    const state = {
      animating: false,
      grid,
      pieceCount,
      fen: `${boardPart} ${sideToAnalyze} ${castlingStr} ${currentEpSquare} ${halfmoveClock} ${fullmoveNumber}`,
      actualFen: `${boardPart} ${actualTurn} ${castlingStr} ${currentEpSquare} ${halfmoveClock} ${fullmoveNumber}`,
      boardKey: `${boardPart} ${sideToAnalyze} ${castlingStr} ${currentEpSquare}`,
      positionKey: `${boardPart} ${actualTurn} ${castlingStr} ${currentEpSquare}`,
      sessionId: analysisSessionId,
      positionId,
      boardElement: boardEl,
      boardRect,
      isBlackOrientation,
      myColor,
      actualTurn,
      sideToAnalyze
    };
    window.__CHESSCOACH_BOARD_STATE__ = {
      grid: grid.map(row => row.slice()),
      fen: state.actualFen,
      positionKey: state.positionKey,
      positionId,
      actualTurn,
      myColor,
      isBlackOrientation,
      boardElement: boardEl,
      timestamp: Date.now()
    };
    return state;
  }

  function renderEvalBar(state, whiteEvalPawns) {
    let bar = $("chesscoach-eval-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "chesscoach-eval-bar";
      bar.innerHTML = `
        <div id="chesscoach-eval-fill"></div>
        <div id="chesscoach-eval-text">0.0</div>
      `;
      getShadow().appendChild(bar);
    }

    if (!showEvalBar || !state || !state.boardRect || (state.boardElement && !state.boardElement.isConnected)) {
      bar.style.display = "none";
      return;
    }

    const r = state.boardElement ? state.boardElement.getBoundingClientRect() : state.boardRect;
    bar.style.display = "block";
    bar.style.left = `${Math.max(4, r.left - 20)}px`;
    bar.style.top = `${r.top}px`;
    bar.style.height = `${r.height}px`;

    const evalNum = parseFloat(whiteEvalPawns) || 0;
    const clamped = Math.max(-10, Math.min(10, evalNum));
    const whitePercent = 50 + (clamped / 10) * 45;
    const fill = $("chesscoach-eval-fill");
    const txt = $("chesscoach-eval-text");

    if (fill) {
      fill.style.height = `${whitePercent}%`;
      fill.style.top = state.isBlackOrientation ? "0" : "auto";
      fill.style.bottom = state.isBlackOrientation ? "auto" : "0";
    }
    if (txt) txt.textContent = `${evalNum > 0 ? "+" : ""}${evalNum.toFixed(1)}`;
  }

  function hideArrows() {
    const svg = $("chesscoach-screen-svg");
    if (svg) {
      svg.innerHTML = "";
      svg.style.display = "none";
    }
  }

  function buildHeatmapCellsSVG(heatmapList, sqToXY) {
    if (!Array.isArray(heatmapList) || heatmapList.length === 0) return "";
    let out = "";
    for (const cell of heatmapList) {
      const p = sqToXY(cell.sq);
      const x = p.x - 48;
      const y = p.y - 48;
      const op = Math.min(0.62, Math.max(0.18, (cell.intensity || 0.4) * 0.65));

      if (cell.zone === "king_danger") {
        out += `
          <rect x="${x}" y="${y}" width="96" height="96" rx="8"
                fill="rgba(255, 0, 55, ${(op * 0.85).toFixed(2)})"
                stroke="#ff0037" stroke-width="3" stroke-opacity="0.9"
                class="cc-sq-anim" />
          <text x="${p.x}" y="${p.y + 4}" text-anchor="middle" fill="#ffffff"
                font-family="monospace" font-weight="900" font-size="11" opacity="0.9">⚠️${cell.enCount}</text>
        `;
      } else if (cell.zone === "my") {
        out += `
          <rect x="${x}" y="${y}" width="96" height="96" rx="6"
                fill="rgba(0, 245, 212, ${(op * 0.55).toFixed(2)})"
                stroke="#00f5d4" stroke-width="1.5" stroke-opacity="${(op * 0.8).toFixed(2)}" />
        `;
      } else if (cell.zone === "enemy") {
        out += `
          <rect x="${x}" y="${y}" width="96" height="96" rx="6"
                fill="rgba(255, 42, 133, ${(op * 0.52).toFixed(2)})"
                stroke="#ff2a85" stroke-width="1.5" stroke-opacity="${(op * 0.75).toFixed(2)}" />
        `;
      }
    }
    return out;
  }

  function renderArrowsOverlay(state, res) {
    mobileSession?.applyVisualPolicy(getShadow());
    const tokenMismatch = currentPositionKey && (boardDirty || (res.positionId !== undefined && res.positionId !== positionId) || state?.positionKey !== currentPositionKey);
    if (!state || !res || tokenMismatch) {
      hideArrows();
      return;
    }
    if (!state || state.animating || !state.boardRect || (state.boardElement && !state.boardElement.isConnected)) {
      hideArrows();
      return;
    }
    let svg = $("chesscoach-screen-svg");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.id = "chesscoach-screen-svg";
      svg.setAttribute("viewBox", "0 0 800 800");
      svg.setAttribute("preserveAspectRatio", "none");
      getShadow().appendChild(svg);
    }

    const showHeatmapNow = Boolean(isAltPressed || heatmapAlwaysOn);
    const waitingForFinalNnue = Boolean(
      engineMaxMode &&
      useStockfishWasm &&
      res?.best &&
      !res.engineMeta &&
      res.pass !== "deep" &&
      !res.best.fromSyzygy &&
      !res.best.isMateInOne
    );
    const canRenderMoveArrows = showArrows && !waitingForFinalNnue;
    const analysisMatches = !res?.boardKey || res.boardKey === state.boardKey;
    const heatmapMatches = analysisMatches || res?.heatmapBoardKey === state.boardKey;

    if (turnMode === "my" && state && state.actualTurn !== state.myColor && !showHeatmapNow) {
      hideArrows();
      return;
    }

    if (!showHeatmapNow && (!canRenderMoveArrows || !analysisMatches || !res || !res.best)) {
      svg.innerHTML = "";
      svg.style.display = "none";
      return;
    }

    const r = state.boardElement ? state.boardElement.getBoundingClientRect() : state.boardRect;
    if (r.width <= 0 || r.height <= 0) {
      hideArrows();
      return;
    }
    svg.style.display = "block";
    svg.style.position = "fixed";
    svg.style.left = `${r.left}px`;
    svg.style.top = `${r.top}px`;
    svg.style.width = `${r.width}px`;
    svg.style.height = `${r.height}px`;
    svg.style.pointerEvents = "none";
    svg.style.overflow = "visible";
    svg.style.zIndex = "2147483645";
    svg.style.animation = arrowStyle === "chroma_rgb" ? "cc-chroma-shift 2.5s linear infinite" : "none";
    svg.setAttribute("data-cc-orientation", state.isBlackOrientation ? "black" : "white");
    svg.setAttribute("data-cc-board-key", state.boardKey);

    const isBlack = state.isBlackOrientation;
    const sqToXY = (sq) => {
      const file = FILES.indexOf(sq[0]);
      const rank = parseInt(sq[1], 10) - 1;
      const col = isBlack ? 7 - file : file;
      const row = isBlack ? rank : 7 - rank;
      return { x: col * 100 + 50, y: row * 100 + 50 };
    };

    const heatmapSVG = showHeatmapNow && heatmapMatches ? buildHeatmapCellsSVG(res?.heatmap || cachedMoves.heatmap, sqToXY) : "";
    if (!analysisMatches || !res || !res.best || !canRenderMoveArrows || (turnMode === "my" && state.actualTurn !== state.myColor)) {
      svg.innerHTML = heatmapSVG;
      return;
    }

    const { best, average, worst, hangingSquare, lastOpponentMove, enemyKingSquare } = res;

    const drawSquareHighlightMove = (m, solidColor, baseOp, roleLabel = "best") => {
      if (!m || !m.from || !m.to) return "";
      const p1 = sqToXY(m.from);
      const p2 = sqToXY(m.to);
      const op = Math.min(1, baseOp * (arrowOpacity / 0.85));
      const isBest = roleLabel === "best";
      const sw = (isBest ? 4.5 : 3) * arrowScale;

      if (arrowStyle === "sq_cyber_frame") {
        const cornerBrackets = (x, y, s, col, w) => `
          <path d="M ${x - s} ${y - s + 18} L ${x - s} ${y - s} L ${x - s + 18} ${y - s}
                   M ${x + s - 18} ${y - s} L ${x + s} ${y - s} L ${x + s} ${y - s + 18}
                   M ${x - s} ${y + s - 18} L ${x - s} ${y + s} L ${x - s + 18} ${y + s}
                   M ${x + s - 18} ${y + s} L ${x + s} ${y + s} L ${x + s} ${y + s - 18}"
                fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-opacity="${op}" />
        `;
        return `
          <rect x="${p1.x - 45}" y="${p1.y - 45}" width="90" height="90" rx="10"
                fill="${solidColor}" fill-opacity="${op * 0.14}"
                stroke="${solidColor}" stroke-width="${sw * 0.65}" stroke-dasharray="10 6" stroke-opacity="${op * 0.85}" />
          <rect x="${p2.x - 45}" y="${p2.y - 45}" width="90" height="90" rx="12"
                fill="${solidColor}" fill-opacity="${op * (isBest ? 0.28 : 0.16)}" />
          ${cornerBrackets(p2.x, p2.y, 44, solidColor, sw * 1.15)}
          ${isBest ? `
            <rect x="${p1.x - 32}" y="${p1.y + 24}" width="64" height="17" rx="5" fill="rgba(8,10,16,0.9)" stroke="${solidColor}" stroke-width="1.5" />
            <text x="${p1.x}" y="${p1.y + 36}" text-anchor="middle" fill="${solidColor}" font-family="monospace" font-weight="900" font-size="10">START</text>
            <rect x="${p2.x - 38}" y="${p2.y + 24}" width="76" height="18" rx="5" fill="rgba(8,10,16,0.94)" stroke="${solidColor}" stroke-width="1.8" />
            <text x="${p2.x}" y="${p2.y + 36.5}" text-anchor="middle" fill="#ffffff" font-family="monospace" font-weight="900" font-size="10.5">➔ ${m.to.toUpperCase()}</text>
          ` : ""}
        `;
      }

      if (arrowStyle === "sq_Step_badges") {
        const tag = isBest ? "BEST" : (roleLabel === "avg" ? "2-Я LINE" : "BLUNDER");
        return `
          <rect x="${p1.x - 44}" y="${p1.y - 44}" width="88" height="88" rx="14"
                fill="none" stroke="${solidColor}" stroke-width="${sw * 0.75}" stroke-dasharray="12 6" stroke-opacity="${op * 0.85}" />
          <rect x="${p2.x - 44}" y="${p2.y - 44}" width="88" height="88" rx="14"
                fill="${solidColor}" fill-opacity="${op * 0.22}" stroke="${solidColor}" stroke-width="${sw}" stroke-opacity="${op}"
                style="filter: drop-shadow(0 0 10px ${solidColor});" />
          ${isBest ? `
            <g style="animation: cc-marker-float 1.3s ease-in-out infinite;">
              <rect x="${p1.x - 36}" y="${p1.y - 42}" width="72" height="20" rx="6" fill="rgba(7,9,15,0.94)" stroke="${solidColor}" stroke-width="2" />
              <text x="${p1.x}" y="${p1.y - 28}" text-anchor="middle" fill="${solidColor}" font-family="monospace" font-weight="900" font-size="10.5">1: TAKE</text>
              <rect x="${p2.x - 42}" y="${p2.y - 42}" width="84" height="22" rx="6" fill="${solidColor}" />
              <text x="${p2.x}" y="${p2.y - 27}" text-anchor="middle" fill="#05070c" font-family="monospace" font-weight="900" font-size="11">2: HERE!</text>
            </g>
          ` : `
            <rect x="${p2.x - 34}" y="${p2.y + 23}" width="68" height="17" rx="5" fill="rgba(7,9,15,0.9)" stroke="${solidColor}" stroke-width="1.5" />
            <text x="${p2.x}" y="${p2.y + 35}" text-anchor="middle" fill="${solidColor}" font-family="monospace" font-weight="800" font-size="9.5">${tag}</text>
          `}
        `;
      }

      if (arrowStyle === "sq_hologram_tiles") {
        return `
          <rect x="${p1.x - 46}" y="${p1.y - 46}" width="92" height="92" rx="8"
                fill="${solidColor}" fill-opacity="${op * 0.18}" stroke="${solidColor}" stroke-width="2" stroke-opacity="${op * 0.7}" />
          <rect x="${p2.x - 46}" y="${p2.y - 46}" width="92" height="92" rx="8"
                fill="${solidColor}" fill-opacity="${op * 0.34}" stroke="${solidColor}" stroke-width="${sw}" stroke-opacity="${op}"
                style="filter: drop-shadow(0 0 12px ${solidColor});" />
          <g style="transform-origin: ${p2.x}px ${p2.y}px; animation: cc-sniper-rotate 4.5s linear infinite;">
            <circle cx="${p2.x}" cy="${p2.y}" r="${28 * arrowScale}" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="12 8" stroke-opacity="${op * 0.9}" />
          </g>
          <circle cx="${p2.x}" cy="${p2.y}" r="${7 * arrowScale}" fill="#ffffff" fill-opacity="${op}" />
        `;
      }

      return `
        <circle cx="${p1.x}" cy="${p1.y}" r="${40 * arrowScale}" fill="none"
                stroke="${solidColor}" stroke-width="${sw * 0.85}" stroke-opacity="${op * 0.85}" />
        <circle cx="${p2.x}" cy="${p2.y}" r="${(isBest ? 17 : 12) * arrowScale}"
                fill="${solidColor}" fill-opacity="${op * 0.92}"
                style="filter: drop-shadow(0 0 8px ${solidColor});" />
        ${isBest ? `<circle cx="${p2.x}" cy="${p2.y}" r="${32 * arrowScale}" fill="none" stroke="${solidColor}" stroke-width="2.5" stroke-dasharray="8 6" stroke-opacity="${op * 0.75}" />` : ""}
      `;
    };

    const drawSingleArrow = (m, gradId, solidColor, markerId, curveOffset, baseOp, isBest = false, roleLabel = "best") => {
      if (!m || !m.from || !m.to) return "";
      if (arrowStyle.startsWith("sq_")) {
        return drawSquareHighlightMove(m, solidColor, baseOp, roleLabel);
      }

      const p1 = sqToXY(m.from);
      const p2 = sqToXY(m.to);
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;

      const nx = -dy / len;
      const ny = dx / len;
      const tx = p2.x - (dx / len) * 24;
      const ty = p2.y - (dy / len) * 24;

      const width = (isBest ? 14 : 10.5) * arrowScale;
      const op = Math.min(1, baseOp * (arrowOpacity / 0.85));

      if (arrowStyle === "comet_trail") {
        const cx = (p1.x + tx) / 2 + nx * curveOffset * 0.7;
        const cy = (p1.y + ty) / 2 + ny * curveOffset * 0.7;
        const pathD = `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${tx} ${ty}`;
        return `
          <circle cx="${p1.x}" cy="${p1.y}" r="${6 * arrowScale}" fill="${solidColor}" fill-opacity="${op * 0.45}" />
          <path d="${pathD}" fill="none" stroke="url(#${gradId})" stroke-width="${width * 1.25}" stroke-linecap="round"
                stroke-opacity="${op}" style="filter: drop-shadow(0 0 12px ${solidColor});" marker-end="url(#${markerId})" />
          <path d="${pathD}" fill="none" stroke="#ffffff" stroke-width="${width * 0.35}" stroke-dasharray="22 12"
                stroke-linecap="round" stroke-opacity="0.9" class="cc-best-flow" />
          <circle cx="${p2.x}" cy="${p2.y}" r="${35 * arrowScale}" fill="${solidColor}" fill-opacity="${op * 0.16}"
                  stroke="${solidColor}" stroke-width="${3.2 * arrowScale}" stroke-opacity="${op}" />
        `;
      }

      if (arrowStyle === "cyber_chevron") {
        const steps = Math.max(3, Math.floor(len / 55));
        let chevrons = "";
        const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
        for (let i = 1; i <= steps; i++) {
          const t = i / (steps + 0.6);
          const qx = p1.x + dx * t;
          const qy = p1.y + dy * t;
          const sc = (0.75 + 0.35 * t) * arrowScale;
          chevrons += `
            <path d="M -10 -12 L 4 0 L -10 12" fill="none" stroke="${i === steps ? "#ffffff" : solidColor}"
                  stroke-width="${4.2 * sc}" stroke-linecap="round" stroke-linejoin="round"
                  stroke-opacity="${op}" transform="translate(${qx.toFixed(1)}, ${qy.toFixed(1)}) rotate(${angleDeg.toFixed(1)})"
                  style="filter: drop-shadow(0 0 6px ${solidColor});" />
          `;
        }
        return `
          <rect x="${p1.x - 42}" y="${p1.y - 42}" width="84" height="84" rx="12" fill="none"
                stroke="${solidColor}" stroke-width="${2.5 * arrowScale}" stroke-dasharray="10 6" stroke-opacity="${op * 0.7}" />
          <rect x="${p2.x - 42}" y="${p2.y - 42}" width="84" height="84" rx="12"
                fill="${solidColor}" fill-opacity="${op * 0.18}" stroke="${solidColor}" stroke-width="${3.5 * arrowScale}" stroke-opacity="${op}" />
          ${chevrons}
        `;
      }

      if (arrowStyle === "quantum_portal") {
        const lineD = `M ${p1.x} ${p1.y} L ${tx} ${ty}`;
        return `
          <g style="transform-origin: ${p1.x}px ${p1.y}px; animation: cc-sniper-rotate 3.2s linear infinite;">
            <circle cx="${p1.x}" cy="${p1.y}" r="${34 * arrowScale}" fill="none" stroke="${solidColor}" stroke-width="${3 * arrowScale}" stroke-dasharray="14 8" stroke-opacity="${op * 0.85}" />
          </g>
          <g style="transform-origin: ${p2.x}px ${p2.y}px; animation: cc-sniper-rotate 2.2s linear reverse infinite;">
            <circle cx="${p2.x}" cy="${p2.y}" r="${38 * arrowScale}" fill="${solidColor}" fill-opacity="${op * 0.20}" stroke="${solidColor}" stroke-width="${4 * arrowScale}" stroke-dasharray="18 7" stroke-opacity="${op}" />
            <circle cx="${p2.x}" cy="${p2.y}" r="${22 * arrowScale}" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-dasharray="8 6" stroke-opacity="0.85" />
          </g>
          <path d="${lineD}" fill="none" stroke="url(#${gradId})" stroke-width="${width * 0.55}" stroke-dasharray="12 10"
                stroke-linecap="round" stroke-opacity="${op * 0.85}" class="cc-best-flow" marker-end="url(#${markerId})" />
        `;
      }

      if (arrowStyle === "tube_3d") {
        const cx = (p1.x + tx) / 2 + nx * curveOffset;
        const cy = (p1.y + ty) / 2 + ny * curveOffset;
        const pathD = `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${tx} ${ty}`;
        const shadowD = `M ${p1.x + 6} ${p1.y + 10} Q ${cx + 6} ${cy + 10} ${tx + 6} ${ty + 10}`;
        return `
          <circle cx="${p2.x + 5}" cy="${p2.y + 8}" r="${33 * arrowScale}" fill="rgba(0,0,0,0.42)" />
          <path d="${shadowD}" fill="none" stroke="rgba(0,0,0,0.65)" stroke-width="${width * 1.15}" stroke-linecap="round" />
          <circle cx="${p1.x}" cy="${p1.y}" r="${10 * arrowScale}" fill="${solidColor}" fill-opacity="${op * 0.8}" />
          <circle cx="${p2.x}" cy="${p2.y}" r="${34 * arrowScale}" fill="none" stroke="${solidColor}" stroke-width="${3.5 * arrowScale}" stroke-opacity="${op * 0.9}" />
          <path d="${pathD}" fill="none" stroke="url(#${gradId})" stroke-width="${width * 1.15}" stroke-linecap="round" stroke-opacity="${op}" marker-end="url(#${markerId})" />
          <path d="${pathD}" fill="none" stroke="#ffffff" stroke-width="${width * 0.3}" stroke-linecap="round" stroke-opacity="0.78" />
        `;
      }

      if (arrowStyle === "plasma") {
        const z1x = (p1.x + dx * 0.25 + nx * 18).toFixed(1);
        const z1y = (p1.y + dy * 0.25 + ny * 18).toFixed(1);
        const z2x = (p1.x + dx * 0.52 - nx * 18).toFixed(1);
        const z2y = (p1.y + dy * 0.52 - ny * 18).toFixed(1);
        const z3x = (p1.x + dx * 0.76 + nx * 14).toFixed(1);
        const z3y = (p1.y + dy * 0.76 + ny * 14).toFixed(1);
        const boltD = `M ${p1.x} ${p1.y} L ${z1x} ${z1y} L ${z2x} ${z2y} L ${z3x} ${z3y} L ${tx} ${ty}`;
        return `
          <circle cx="${p1.x}" cy="${p1.y}" r="${11 * arrowScale}" fill="${solidColor}" fill-opacity="${op * 0.8}" />
          <circle cx="${p2.x}" cy="${p2.y}" r="${33 * arrowScale}" fill="none" stroke="${solidColor}" stroke-width="${3 * arrowScale}" stroke-dasharray="10 6" stroke-opacity="${op}" />
          <path d="${boltD}" fill="none" stroke="url(#${gradId})" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"
                stroke-opacity="${op}" style="filter: drop-shadow(0 0 8px ${solidColor});" marker-end="url(#${markerId})" />
          <path d="${boltD}" fill="none" stroke="#ffffff" stroke-width="${width * 0.32}" stroke-linejoin="round" stroke-linecap="round" stroke-opacity="0.85" />
        `;
      }

      if (arrowStyle === "sniper_3d") {
        const lineD = `M ${p1.x} ${p1.y} L ${tx} ${ty}`;
        return `
          <circle cx="${p1.x}" cy="${p1.y}" r="${9 * arrowScale}" fill="${solidColor}" fill-opacity="${op * 0.8}" />
          <path d="${lineD}" fill="none" stroke="url(#${gradId})" stroke-width="${width * 0.82}" stroke-dasharray="16 8"
                stroke-linecap="round" stroke-opacity="${op}" style="filter: drop-shadow(0 0 6px ${solidColor});" marker-end="url(#${markerId})" />
          <path d="${lineD}" fill="none" stroke="#ffffff" stroke-width="${2.2 * arrowScale}" stroke-opacity="0.7" />
          <g style="transform-origin: ${p2.x}px ${p2.y}px; animation: cc-sniper-rotate 4.2s linear infinite;">
            <circle cx="${p2.x}" cy="${p2.y}" r="${36 * arrowScale}" fill="none" stroke="${solidColor}" stroke-width="${3 * arrowScale}" stroke-dasharray="18 10" stroke-opacity="${op * 0.95}" />
            <line x1="${p2.x - 42 * arrowScale}" y1="${p2.y}" x2="${p2.x - 24 * arrowScale}" y2="${p2.y}" stroke="${solidColor}" stroke-width="3" />
            <line x1="${p2.x + 24 * arrowScale}" y1="${p2.y}" x2="${p2.x + 42 * arrowScale}" y2="${p2.y}" stroke="${solidColor}" stroke-width="3" />
            <line x1="${p2.x}" y1="${p2.y - 42 * arrowScale}" x2="${p2.x}" y2="${p2.y - 24 * arrowScale}" stroke="${solidColor}" stroke-width="3" />
            <line x1="${p2.x}" y1="${p2.y + 24 * arrowScale}" x2="${p2.x}" y2="${p2.y + 42 * arrowScale}" stroke="${solidColor}" stroke-width="3" />
          </g>
        `;
      }

      if (arrowStyle === "dna_wave") {
        const c1x = (p1.x + tx) / 2 + nx * 32;
        const c1y = (p1.y + ty) / 2 + ny * 32;
        const c2x = (p1.x + tx) / 2 - nx * 32;
        const c2y = (p1.y + ty) / 2 - ny * 32;
        const w1 = `M ${p1.x} ${p1.y} Q ${c1x} ${c1y} ${tx} ${ty}`;
        const w2 = `M ${p1.x} ${p1.y} Q ${c2x} ${c2y} ${tx} ${ty}`;
        return `
          <circle cx="${p1.x}" cy="${p1.y}" r="${10 * arrowScale}" fill="${solidColor}" fill-opacity="${op * 0.75}" />
          <circle cx="${p2.x}" cy="${p2.y}" r="${34 * arrowScale}" fill="none" stroke="${solidColor}" stroke-width="${3.2 * arrowScale}" stroke-opacity="${op * 0.85}" />
          <path d="${w1}" fill="none" stroke="url(#${gradId})" stroke-width="${width * 0.78}" stroke-linecap="round" stroke-opacity="${op}" marker-end="url(#${markerId})" />
          <path d="${w2}" fill="none" stroke="#ffffff" stroke-width="${width * 0.45}" stroke-dasharray="14 9" stroke-linecap="round" stroke-opacity="${op * 0.75}" class="cc-best-flow" />
        `;
      }

      const actualCurve = (arrowStyle === "curved_neon" || arrowStyle === "chroma_rgb") ? curveOffset : 0;
      const cx = (p1.x + tx) / 2 + nx * actualCurve;
      const cy = (p1.y + ty) / 2 + ny * actualCurve;
      const pathD = `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${tx} ${ty}`;
      const dashAttr = arrowStyle === "dotted" ? `stroke-dasharray="14 10"` : "";
      const glowFilter = arrowStyle === "classic" ? "" : `style="filter: drop-shadow(0 0 9px ${solidColor});"`;

      return `
        <circle cx="${p1.x}" cy="${p1.y}" r="${10 * arrowScale}" fill="${solidColor}" fill-opacity="${op * 0.7}" />
        <circle cx="${p2.x}" cy="${p2.y}" r="${34 * arrowScale}" fill="none" stroke="${solidColor}" stroke-width="${3.2 * arrowScale}" stroke-opacity="${op * 0.82}" />
        <path d="${pathD}" fill="none" stroke="url(#${gradId})" stroke-width="${width}"
              stroke-linecap="round" stroke-opacity="${op}" ${dashAttr} ${glowFilter}
              marker-end="url(#${markerId})" />
        ${isBest && arrowStyle !== "classic" ? `<path d="${pathD}" fill="none" stroke="#ffffff" stroke-width="${3.4 * arrowScale}" stroke-linecap="round" stroke-opacity="0.62" class="cc-best-flow" />` : ""}
      `;
    };

    const drawHudMarkerOnSquare = (sq, symbol, borderColor, isLeft = false) => {
      if (!sq) return "";
      const p = sqToXY(sq);
      const bx = isLeft ? p.x - 28 : p.x + 28;
      const by = p.y - 28;
      return `
        <g style="animation: cc-marker-float 1.5s ease-in-out infinite;">
          <rect x="${bx - 16}" y="${by - 16}" width="32" height="32" rx="8"
                fill="rgba(10, 12, 18, 0.94)" stroke="${borderColor}" stroke-width="2.5" />
          <text x="${bx}" y="${by + 6}" text-anchor="middle" fill="${borderColor}"
                font-family="monospace" font-weight="900" font-size="18">${symbol}</text>
        </g>
      `;
    };

    const drawTrapBannerOnSquare = (sq, trapChance) => {
      if (!sq) return "";
      const p = sqToXY(sq);
      const by = Math.max(24, p.y - 42);
      return `
        <g style="animation: cc-marker-float 1.3s ease-in-out infinite;">
          <rect x="${p.x - 48}" y="${by - 12}" width="96" height="24" rx="7"
                fill="rgba(14, 10, 22, 0.96)" stroke="#ffbe0b" stroke-width="2" />
          <text x="${p.x}" y="${by + 4}" text-anchor="middle" fill="#ffbe0b"
                font-family="monospace" font-weight="900" font-size="11">🪤 TRAP ${trapChance}%</text>
        </g>
      `;
    };

    const drawMateInOneSpectacle = (mateSq, kingSq) => {
      const pm = sqToXY(mateSq);
      const pk = kingSq ? sqToXY(kingSq) : pm;
      if (window.ChessFX && window.ChessFX.renderMateSpectacleByStyle) {
        return window.ChessFX.renderMateSpectacleByStyle(mateStyle, pm, pk);
      }
      return "";
    };

    const avgCurve = (best && average && best.from === average.from) ? 42 : 18;
    const worstCurve = (best && worst && best.from === worst.from) ? -42 : -18;

    let markersHTML = "";
    if (best.isMateInOne || best.isForcedMateInTwo) {
      markersHTML += drawMateInOneSpectacle(best.to, enemyKingSquare);
    } else {
      if (hangingSquare) markersHTML += drawHudMarkerOnSquare(hangingSquare, "!", "#ff2a85");
      if (best && best.isTrap && best.trapChance >= 75) {
        markersHTML += drawTrapBannerOnSquare(best.to, best.trapChance);
      } else if (isStrictBrilliantMove(best)) {
        markersHTML += drawHudMarkerOnSquare(best.to, "💎", "#00f5d4");
      } else if (best && best.fromSyzygy) {
        markersHTML += drawHudMarkerOnSquare(best.to, "🔮", "#c77dff");
      } else if (best && best.isSacrifice) {
        markersHTML += drawHudMarkerOnSquare(best.to, "⚡", "#ff4d94");
      } else if (best && best.isFork) {
        markersHTML += drawHudMarkerOnSquare(best.to, "⚔", "#00f5d4");
      } else if (best && best.isPin) {
        markersHTML += drawHudMarkerOnSquare(best.to, "◈", "#00bbf9");
      } else if (res.isDangerPosition) {
        markersHTML += drawHudMarkerOnSquare(best.to, "🛡", "#ffbe0b");
      }

      if ((roflMode || currentStyle === "mogging") && currentRoast && lastOpponentMove && lastOpponentMove.to) {
        markersHTML += drawHudMarkerOnSquare(lastOpponentMove.to, currentRoast.emoji, "#ffbe0b", true);
      }
    }

    const bestGrad = (best.isMateInOne || best.isForcedMateInTwo) ? "grad-mate" : "grad-best";
    const bestGlow = (best.isMateInOne || best.isForcedMateInTwo) ? "#ffbe0b" : "#00f5d4";

    svg.innerHTML = `
      <defs>
        <linearGradient id="grad-best" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="800" y2="800">
          <stop offset="0%" stop-color="#00bbf9" />
          <stop offset="100%" stop-color="#00f5d4" />
        </linearGradient>
        <linearGradient id="grad-mate" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="800" y2="800">
          <stop offset="0%" stop-color="#ff2a85" />
          <stop offset="50%" stop-color="#ffbe0b" />
          <stop offset="100%" stop-color="#00f5d4" />
        </linearGradient>
        <linearGradient id="grad-avg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="800" y2="800">
          <stop offset="0%" stop-color="#ff9e00" />
          <stop offset="100%" stop-color="#ffbe0b" />
        </linearGradient>
        <linearGradient id="grad-worst" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="800" y2="800">
          <stop offset="0%" stop-color="#b5179e" />
          <stop offset="100%" stop-color="#ff2a85" />
        </linearGradient>
        <marker id="m-best" markerWidth="3.2" markerHeight="3.2" refX="1.5" refY="1.6" orient="auto">
          <path d="M0,0 L3.2,1.6 L0,3.2 L0.6,1.6 Z" fill="${bestGlow}" fill-opacity="0.96"/>
        </marker>
        <marker id="m-avg" markerWidth="3.2" markerHeight="3.2" refX="1.5" refY="1.6" orient="auto">
          <path d="M0,0 L3.2,1.6 L0,3.2 L0.6,1.6 Z" fill="#ffbe0b" fill-opacity="0.88"/>
        </marker>
        <marker id="m-worst" markerWidth="3.2" markerHeight="3.2" refX="1.5" refY="1.6" orient="auto">
          <path d="M0,0 L3.2,1.6 L0,3.2 L0.6,1.6 Z" fill="#ff2a85" fill-opacity="0.82"/>
        </marker>
      </defs>
      ${heatmapSVG}
      ${!best.isMateInOne && showWorstMove && workMode === "all" ? drawSingleArrow(worst, "grad-worst", "#ff2a85", "m-worst", worstCurve, 0.45, false, "worst") : ""}
      ${!best.isMateInOne && showAverageMove ? drawSingleArrow(average, "grad-avg", "#ffbe0b", "m-avg", avgCurve, 0.62, false, "avg") : ""}
      ${drawSingleArrow(best, bestGrad, bestGlow, "m-best", 0, 0.92, true, "best")}
      ${markersHTML}
    `;
  }

  function explainWithModule(m, type, fen) {
    if (window.ChessExplainer && window.ChessExplainer.explainMove) {
      return window.ChessExplainer.explainMove(m, type, fen, currentStyle, roflMode);
    }
    return m ? `${m.from} → ${m.to}` : "";
  }

  function checkGameEndAndLearn(myColor) {
    if (gameResultRecorded || sessionMoveHistory.length < 2) return;

    const modalEl = document.querySelector(
      ".game-over-modal-content, .board-modal-container-container, [data-cy='game-over-modal']"
    );
    if (!modalEl) return;
    const text = (modalEl.innerText || "").toLowerCase();

    const whiteWon = text.includes("white won") || text.includes("white bytroubleor");
    const blackWon = text.includes("black won") || text.includes("black bytroubleor");
    const youWon = text.includes("you won") || text.includes("you bytroubleor");
    const isDraw = text.includes("draw") || text.includes("draw") || text.includes("stalemate") || text.includes("stalemate");

    if (!whiteWon && !blackWon && !youWon && !isDraw) return;

    gameResultRecorded = true;
    let outcome = "draw";
    if (youWon) outcome = "win";
    else if (whiteWon) outcome = myColor === "w" ? "win" : "loss";
    else if (blackWon) outcome = myColor === "b" ? "win" : "loss";

    safeSendMessage(
      { type: "RECORD_GAME_RESULT", history: sessionMoveHistory, result: outcome },
      (res) => {
        if (res && res.ok) {
          if ($("cc-misc-db-summary")) {
            $("cc-misc-db-summary").textContent = `Positions learned in memory: ${res.positionsCount}`;
          }
          $("cc-opening-name").textContent =
            outcome === "win" ? "👑 WIN SAVED TO DATABASE" : "◈ GAME ERRORS LEARNED";
        }
      }
    );
  }

  function updateBehavioralCheatDetector(res) {
    if (!res || !res.lastOpponentMove) return;
    if (uciHistoryList.length < 8) return;

    const drop = parseFloat(res.opponentEvalDropPawns) || 0;
    if (drop <= 0.08) {
      suspectEngineStreak++;
    } else if (drop >= 0.45) {
      suspectEngineStreak = Math.max(0, suspectEngineStreak - 2);
    }

    const banner = $("cc-peer-detector-banner");
    if (banner && suspectEngineStreak >= 5) {
      banner.style.display = "block";
      $("cc-peer-detector-text").textContent =
        `Opponent played ${suspectEngineStreak} moves in a row by 1st lines without eval loss (0.00 CP Loss). High probability software!`;
    }
  }

  function normalizeEngineWdl(line, state) {
    const raw = line?.wdl;
    const win = Number(Array.isArray(raw) ? raw[0] : raw?.win);
    const draw = Number(Array.isArray(raw) ? raw[1] : raw?.draw);
    const loss = Number(Array.isArray(raw) ? raw[2] : raw?.loss);
    if (![win, draw, loss].every(Number.isFinite)) return null;
    const total = win + draw + loss;
    if (total <= 0) return null;
    const sideIsMine = state?.sideToAnalyze === state?.myColor;
    const myRaw = sideIsMine ? win : loss;
    const enemyRaw = sideIsMine ? loss : win;
    return {
      myWin: Math.round((myRaw / total) * 100),
      draw: Math.round((draw / total) * 100),
      enemyWin: Math.round((enemyRaw / total) * 100)
    };
  }

  function mergeWasmAnalysisIntoResult(baseRes, wasmOut, state) {
    if (!baseRes || !baseRes.best || !wasmOut || !wasmOut.lines || !wasmOut.lines[1]) {
      return baseRes;
    }
    const strictBestPolicy = usesStrictBestMovePolicy();
    if (
      baseRes.syzygyActive ||
      baseRes.best.fromSyzygy ||
      (!strictBestPolicy && (baseRes.best.isMateInOne || baseRes.best.isForcedMateInTwo))
    ) {
      return baseRes;
    }

    const safeSet = !strictBestPolicy && Array.isArray(baseRes.safeNonRepeatingUcis) && baseRes.safeNonRepeatingUcis.length > 0
      ? new Set(baseRes.safeNonRepeatingUcis)
      : null;
    const legalSet = Array.isArray(baseRes.legalUcis) && baseRes.legalUcis.length > 0 ? new Set(baseRes.legalUcis) : null;
    const hardRejectedSet = !strictBestPolicy && Array.isArray(baseRes.hardRejectedUcis) ? new Set(baseRes.hardRejectedUcis) : null;

    let chosenLine = null;
    const engineCandidates = [wasmOut.primaryLine, wasmOut.lines[1], wasmOut.lines[2], wasmOut.lines[3]]
      .filter((candidate, index, all) => candidate && all.findIndex(item => item?.uci === candidate.uci) === index);
    for (const candidate of engineCandidates) {
      if (!candidate || !candidate.uci) continue;
      if (legalSet && !legalSet.has(candidate.uci)) continue;
      if (hardRejectedSet?.has(candidate.uci)) continue;
      if (candidate.isMate && candidate.mateIn > 0) {
        chosenLine = candidate;
        break;
      }
      const isPrimary = candidate === engineCandidates[0];
      if (strictBestPolicy || isPrimary || !safeSet || safeSet.has(candidate.uci)) {
        if (candidate === engineCandidates[0] || candidate.scoreCp >= -40 || candidate.scoreCp >= (wasmOut.lines[1].scoreCp - 110)) {
          chosenLine = candidate;
          break;
        }
      }
    }

    if (!chosenLine) {
      return baseRes;
    }

    if (
      !strictBestPolicy &&
      baseRes.best.fromCloud &&
      baseRes.best.uci !== chosenLine.uci &&
      Number(baseRes.best.cloudDepth) >= Number(chosenLine.depth || 0)
    ) {
      return baseRes;
    }

    const primarySfLine = engineCandidates[0] || null;
    const trapSfLine = engineCandidates.find(line => line.uci === baseRes.best.uci) || null;
    const primarySfScore = structuredScoreValue(getStructuredMoveScore(primarySfLine));
    const trapSfScore = structuredScoreValue(getStructuredMoveScore(trapSfLine));
    const objectiveTrapDelta = Number.isFinite(primarySfScore) && Number.isFinite(trapSfScore)
      ? primarySfScore - trapSfScore
      : null;
    if (
      !strictBestPolicy &&
      trapRadarEnabled &&
      baseRes.best.isTrap &&
      baseRes.best.uci !== chosenLine.uci &&
      baseRes.best.trapChance >= 84 &&
      (currentStyle === "tal" || currentStyle === "mogging" || currentStyle === "hikaru") &&
      Number.isFinite(objectiveTrapDelta) &&
      objectiveTrapDelta <= 35 &&
      !chosenLine.isMate
    ) {
      return baseRes;
    }

    const pieceAtSq = (sq) => {
      if (!state || !state.grid || !sq || sq.length < 2) return "p";
      const c = FILES.indexOf(sq[0]);
      const r = 8 - parseInt(sq[1], 10);
      const p = state.grid[r]?.[c];
      return p ? p.toLowerCase() : "p";
    };

    const capturedAtSq = (sq, fromSq = null) => {
      if (!state || !state.grid || !sq || sq.length < 2) return null;
      const c = FILES.indexOf(sq[0]);
      const r = 8 - parseInt(sq[1], 10);
      const p = state.grid[r]?.[c];
      if (p) return p.toLowerCase();
      if (fromSq && pieceAtSq(fromSq) === "p" && fromSq[0] !== sq[0]) return "p";
      return null;
    };

    const isMateIn1 = Boolean(chosenLine.isMate && chosenLine.mateIn === 1);
    const isMateIn2 = Boolean(chosenLine.isMate && chosenLine.mateIn === 2);
    const sameAsBase = chosenLine.uci === baseRes.best.uci;
    const evalPawnsStr = chosenLine.isMate
      ? (chosenLine.mateIn > 0 ? `MATE #${chosenLine.mateIn}` : `-MATE #${Math.abs(chosenLine.mateIn)}`)
      : (chosenLine.scoreCp / 100).toFixed(2);
    const whiteEval = chosenLine.isMate
      ? (state.sideToAnalyze === "w" ? (chosenLine.mateIn > 0 ? 10 : -10) : (chosenLine.mateIn > 0 ? -10 : 10))
      : ((state.sideToAnalyze === "w" ? chosenLine.scoreCp : -chosenLine.scoreCp) / 100).toFixed(2);

    const updatedBest = {
      ...baseRes.best,
      uci: chosenLine.uci,
      from: chosenLine.from,
      to: chosenLine.to,
      promo: chosenLine.promo || null,
      piece: pieceAtSq(chosenLine.from),
      captured: capturedAtSq(chosenLine.to, chosenLine.from),
      isEnPassant: pieceAtSq(chosenLine.from) === "p" && chosenLine.from[0] !== chosenLine.to[0] && !capturedAtSq(chosenLine.to),
      fromWasm: true,
      fromCloud: sameAsBase ? baseRes.best.fromCloud : false,
      fromExplorer: sameAsBase ? baseRes.best.fromExplorer : false,
      cloudDepth: sameAsBase ? baseRes.best.cloudDepth : 0,
      isMateInOne: isMateIn1,
      isForcedMateInTwo: isMateIn2,
      isCheckmate: Boolean(chosenLine.isMate && chosenLine.mateIn > 0),
      blundersMate: false,
      causesStalemate: false,
      isRepetitionDrawRisk: false,
      underDirectAttack: sameAsBase ? baseRes.best.underDirectAttack : false,
      ignoredHangingPiece: sameAsBase ? baseRes.best.ignoredHangingPiece : false,
      ruinedCastling: sameAsBase ? baseRes.best.ruinedCastling : false,
      bookName: sameAsBase ? baseRes.best.bookName : null,
      savedHangingPiece: sameAsBase ? baseRes.best.savedHangingPiece : null,
      isSacrifice: sameAsBase ? baseRes.best.isSacrifice : false,
      isFork: sameAsBase ? baseRes.best.isFork : false,
      isPin: sameAsBase ? baseRes.best.isPin : false,
      trueScore: chosenLine.scoreCp,
      scoreCp: chosenLine.scoreCp,
      isMate: Boolean(chosenLine.isMate),
      mateIn: chosenLine.isMate ? chosenLine.mateIn : null,
      pvLine: chosenLine.pvChain || baseRes.best.pvLine,
      pureSearchScore: chosenLine.scoreCp,
      evalPawns: evalPawnsStr,
      whitePerspectiveEval: whiteEval,
      isTrap: sameAsBase ? baseRes.best.isTrap : false,
      engineHashMb: wasmOut.hashMb || 0,
      engineWorkers: wasmOut.workers || 1,
      engineDepth: chosenLine.depth || 0,
      engineConsensus: wasmOut.consensus || "primary-only",
      engineNps: chosenLine.nps || 0,
      engineHashFull: chosenLine.hashFull || 0
    };

    let updatedAvg = isNegativeMateMove(baseRes.average) ? null : baseRes.average;
    const averageLine = [1, 2, 3]
      .map(index => wasmOut.lines[index])
      .find(line =>
        line &&
        line.uci !== updatedBest.uci &&
        !isNegativeMateMove(line) &&
        (!legalSet || legalSet.has(line.uci)) &&
        !hardRejectedSet?.has(line.uci) &&
        (!safeSet || safeSet.has(line.uci))
      );
    if (averageLine) {
      const l2 = averageLine;
      if (!safeSet || safeSet.has(l2.uci)) {
        updatedAvg = {
          ...(baseRes.average || baseRes.best),
          uci: l2.uci,
          from: l2.from,
          to: l2.to,
          promo: l2.promo || null,
          piece: pieceAtSq(l2.from),
          captured: capturedAtSq(l2.to, l2.from),
          fromWasm: true,
          isMateInOne: false,
          isForcedMateInTwo: false,
          isCheckmate: Boolean(l2.isMate && l2.mateIn > 0),
          blundersMate: false,
          causesStalemate: false,
          isRepetitionDrawRisk: false,
          underDirectAttack: false,
          ignoredHangingPiece: false,
          ruinedCastling: false,
          savedHangingPiece: null,
          isSacrifice: false,
          isFork: false,
          isPin: false,
          trueScore: l2.scoreCp,
          scoreCp: l2.scoreCp,
          isMate: Boolean(l2.isMate),
          mateIn: l2.isMate ? l2.mateIn : null,
          pvLine: l2.pvChain,
          pureSearchScore: l2.scoreCp,
          evalPawns: l2.isMate
            ? (l2.mateIn > 0 ? `MATE #${l2.mateIn}` : `-MATE #${Math.abs(l2.mateIn)}`)
            : (l2.scoreCp / 100).toFixed(2),
          whitePerspectiveEval: l2.isMate
            ? (state.sideToAnalyze === "w" ? (l2.mateIn > 0 ? 10 : -10) : (l2.mateIn > 0 ? -10 : 10))
            : ((state.sideToAnalyze === "w" ? l2.scoreCp : -l2.scoreCp) / 100).toFixed(2)
        };
      }
    }

    const workerCount = wasmOut.workers || 1;
    const mergedWdl = normalizeEngineWdl(chosenLine, state);
    const consensusLabel = workerCount > 1
      ? (wasmOut.consensus === "strong" ? "CONSENSUS" : wasmOut.consensus === "weak" ? "VERIFY" : "SPLIT")
      : "PRIMARY";
    const engineLabel = wasmOut.resources?.fullNnue || wasmOut.backend?.includes("full") ? "SF FULL" : "SF LOCAL";
    const updatedTelemetry = baseRes.telemetry
      ? {
          ...baseRes.telemetry,
          ...(mergedWdl || {}),
          serverSource: `${engineLabel} ${workerCount}C • H${wasmOut.hashMb || "?"}M • D${chosenLine.depth || 12} • ${consensusLabel}`,
          nearestThreatText: isMateIn1
            ? `👑 MATE IN 1 MOVE: ${updatedBest.from}→${updatedBest.to}#`
            : (isMateIn2
                ? `👑 FORCE. MATE IN 2 MOVES: ${updatedBest.from}→${updatedBest.to}+`
                : `Plan SF LOCAL: ${updatedBest.from}→${updatedBest.to} (${evalPawnsStr})`)
        }
      : null;

    return {
      ...baseRes,
      ...(mergedWdl || {}),
      best: updatedBest,
      average: updatedAvg,
      engineMeta: {
        workers: workerCount,
        hashMb: wasmOut.hashMb || 0,
        depth: chosenLine.depth || 0,
        selDepth: chosenLine.selDepth || chosenLine.depth || 0,
        nps: chosenLine.nps || 0,
        hashFull: chosenLine.hashFull || 0,
        consensus: wasmOut.consensus || "primary-only",
        backend: wasmOut.backend || "stockfish-19-lite-asm",
        fullNnue: Boolean(wasmOut.resources?.fullNnue || wasmOut.backend?.includes("full"))
      },
      telemetry: updatedTelemetry
    };
  }

  function applyAnalysisResult(state, res, isDeepPass = false, prevBestUci = "") {
    if (!res || res.error) return;
    if (res.average && res.average.uci === res.best?.uci) res = { ...res, average: null };
    if (isNegativeMateMove(res.average)) res = { ...res, average: null };
    const resultMeta = res.meta || null;
    if (resultMeta && !isCurrentAnalysisMeta(resultMeta)) return;
    if (usesStrictBestMovePolicy() && !res.engineMeta && !res.syzygyActive && !res.best?.fromSyzygy) {
      setAutoStatusText(
        engineMaxMode ? "♚ ENGINE MAX: WAITING FOR PRIMARY STOCKFISH..." : "♚ ELO 2000+: WAITING FOR FINAL STOCKFISH / SYZYGY...",
        "#64cdb9"
      );
      return;
    }
    const qualityRank = res.best?.fromSyzygy ? 60 : res.engineMeta ? 50 : isDeepPass ? 30 : 10;
    if (cachedMoves?.positionId === positionId && cachedMoves.meta?.analysisId === positionAnalysisId && Number(cachedMoves.qualityRank || 0) > qualityRank) return;
    if (!isDeepPass && res.lastOpponentMove) {
      updateBehavioralCheatDetector(res);
    }
    cachedMoves = { ...res, meta: resultMeta, sessionId: analysisSessionId, positionId, positionKey: currentPositionKey, qualityRank };

    // Заbyonем best and average move on onш move, to fromслева T1% yes on руч игре мыш
    if (state.actualTurn === state.myColor) {
      legitStats.lastBestUciOnMyTurn = res.best?.uci || "";
      legitStats.lastAvgUciOnMyTurn = res.average?.uci || "";
    }

    if (res.telemetry) {
      lastTelemetryData = res.telemetry;
    }
    updateLiveTelemetryUI();
    updateTimeSniperBanner(res);
    updateEvalMoodAndEngineBadge(state, res);

    if (res.best) {
      recordEvalPoint(state.boardKey, res.best.whitePerspectiveEval ?? res.best.evalPawns, res.opponentEvalDropPawns);
    }

    if (audioRadarEnabled && (!mobileSession || mobileSession.effective().audioRadarEnabled) && window.ChessFX && state.actualTurn === state.myColor) {
      const dropVal = parseFloat(res.opponentEvalDropPawns) || 0;
      if (res.best && (res.best.isMateInOne || res.best.isForcedMateInTwo || res.best.isCheckmate)) {
        window.ChessFX.playTacticalAudioPing("mate_lock", state.boardKey);
      } else if (!isDeepPass && dropVal >= 2.0) {
        window.ChessFX.playTacticalAudioPing("blunder", state.boardKey);
      } else if (res.best && res.best.isTrap && res.best.trapChance >= 85) {
        window.ChessFX.playTacticalAudioPing("trap", state.boardKey);
      }
    }

    if (isDeepPass && currentTurnDecision.boardKey === state.boardKey && !currentTurnDecision.skip) {
      if (autoMoveTimer && currentTurnDecision.attempts === 0) {
        clearTimeout(autoMoveTimer);
        autoMoveTimer = null;
      }
      const finalPick = chooseAutoMoveOnce(res);
      if (finalPick?.move) {
        currentTurnDecision.move = finalPick.move;
        currentTurnDecision.choiceKind = finalPick.choiceKind || "policy";
        currentTurnDecision.typeLabel = `${finalPick.typeLabel} • ${(currentTurnDecision.totalDelay / 1000).toFixed(2)}с`;
      }
    }

    if (res.positionsCount !== undefined && $("cc-misc-db-summary")) {
      $("cc-misc-db-summary").textContent = `Positions learned in memory: ${res.positionsCount}`;
    }

    const mateBanner = $("cc-mate-banner");
    if (mateBanner) {
      if (res.best && (res.best.isMateInOne || res.best.isForcedMateInTwo)) {
        mateBanner.style.display = "block";
        const mateTitleEl = $("cc-mate-banner-title");
        if (mateTitleEl) {
          mateTitleEl.textContent = res.best.isMateInOne
            ? "👑💀 MATE IN 1 MOVE on BOARD!"
            : "👑⚡ FORCED MATE IN 2 MOVES!";
        }
        $("cc-mate-banner-text").textContent = res.best.isMateInOne
          ? `Move ${res.best.from} → ${res.best.to}# delivers pure mate in 1 move!`
          : `Move ${res.best.from} → ${res.best.to}+ delivers forced mate in 2 move!`;
      } else {
        mateBanner.style.display = "none";
      }
    }

    const roastBox = $("cc-roast-box");
    if ((roflMode || currentStyle === "mogging") && res.lastOpponentMove && window.ChessExplainer) {
      currentRoast = window.ChessExplainer.roastOpponentMove(
        res.lastOpponentMove,
        res.opponentEvalDropPawns,
        state.fen,
        Boolean(res.best && (res.best.isMateInOne || res.best.isForcedMateInTwo))
      );
      if (currentRoast && roastBox && !(res.best && res.best.isMateInOne)) {
        roastBox.style.display = "block";
        $("cc-roast-badge").textContent = `⚡ ${currentRoast.badgeText}`;
        $("cc-roast-text").textContent = currentRoast.text;
      } else if (roastBox) {
        roastBox.style.display = "none";
      }
    } else if (roastBox) {
      currentRoast = null;
      roastBox.style.display = "none";
    }

    if (res.best) {
      const isBrilliant = isStrictBrilliantMove(res.best);
      const isTrap = Boolean(res.best.isTrap && res.best.trapChance >= 75);
      const isSyzygy = Boolean(res.best.fromSyzygy);
      const bestCard = $("cc-best-card");
      if (bestCard) {
        bestCard.classList.toggle("cc-brilliant-card", isBrilliant);
        bestCard.classList.toggle("cc-trap-card", !isBrilliant && isTrap);
      }

      const styleLabel = ALL_STYLE_NAMES[currentStyle] || "✦ Tal";
      if ($("cc-best-title")) {
        let badgesHtml = "";
        if (isSyzygy) badgesHtml += `<span class="cc-syzygy-badge">🔮 SYZYGY GOD</span>`;
        if (isBrilliant) badgesHtml += `<span class="cc-brilliant-badge">💎 BRILLIANT !!</span>`;
        if (isTrap) badgesHtml += `<span class="cc-trap-badge">🪤 TRAP (${res.best.trapChance}%)</span>`;
        $("cc-best-title").innerHTML = `✦ BEST MOVE (1ST LINE) • ${styleLabel}${badgesHtml}`;
      }

      if ((isDeepPass || res.best.isMateInOne) && isBrilliant && phonkEditEnabled && (!mobileSession || mobileSession.effective().mobileVisualEffects) && state.actualTurn === state.myColor && window.ChessFX) {
        window.ChessFX.triggerBrilliantPhonkEdit(getShadow(), res.best, state, 15000, false);
      }

      const improvedByDeep = isDeepPass && prevBestUci && prevBestUci !== res.best.uci;
      const evalPrefix = (!res.best.isMateInOne && !res.best.isForcedMateInTwo && !res.best.fromSyzygy && parseFloat(res.best.evalPawns) > 0) ? "+" : "";
      $("cc-best-eval").textContent = `${evalPrefix}${res.best.evalPawns}`;
      $("cc-best-desc").textContent =
        (improvedByDeep ? "✦ [IMPROVED BY DEPTH] " : "") + explainWithModule(res.best, "best", state.fen);
      $("cc-best-pv").textContent = res.best.pvLine ? `◈ Variation: ${res.best.pvLine}` : "";

      const openingCard = $("cc-opening-card");
      const detectedOpening = window.ChessOpenings ? window.ChessOpenings.detect(uciHistoryList) : null;

      if (res.syzygyActive && res.best.fromSyzygy) {
        if (openingCard) openingCard.style.borderLeftColor = "#c77dff";
        $("cc-opening-name").textContent = `🔮 TABLE SYZYGY (${res.pieceCount} PIECES ON BOARD)`;
        $("cc-opening-plan").textContent = `${res.best.syzygyBadge || "100% accuracy endgame"}.`;
      } else if (res.isDangerPosition && !res.best.isMateInOne) {
        if (openingCard) openingCard.style.borderLeftColor = "#ff2a85";
        $("cc-opening-name").textContent = `🛡 ANTI-MATE RADAR: ${res.dangerReason || "THREAT KING"}!`;
        $("cc-opening-plan").textContent = `Aboutonрalreadyon threat yourhim king — recommend defenseу ${res.best.from} → ${res.best.to}.`;
      } else if (res.hangingSquare && !res.best.isMateInOne) {
        if (openingCard) openingCard.style.borderLeftColor = "#ffbe0b";
        $("cc-opening-name").textContent = `⚠️ WARNING: square ${res.hangingSquare.toUpperCase()} UNDER ATTACK!`;
        $("cc-opening-plan").textContent = `Piece on ${res.hangingSquare} attacked — defense or move away its!`;
      } else {
        if (openingCard) openingCard.style.borderLeftColor = "var(--cc-accent)";
        if (res.best.bookName) {
          $("cc-opening-name").textContent = `◈ OPENING: ${res.best.bookName.split("—")[0].trim()}`;
          $("cc-opening-plan").textContent = detectedOpening?.plan || res.best.bookName;
        } else if (detectedOpening) {
          $("cc-opening-name").textContent = `◈ ${detectedOpening.name.toUpperCase()}`;
          $("cc-opening-plan").textContent = detectedOpening.plan;
        }
      }

      renderEvalBar(state, res.best.whitePerspectiveEval ?? res.best.evalPawns);

      if (autoMoveEnabled && state.actualTurn === state.myColor) {
        const mySecs = getMyRemainingSeconds();
        const isExtremePanicTime = mySecs <= 5;
        const needsDeepVerification = Boolean(
          (res.isDangerPosition || res.hangingSquare) &&
          !res.best.isMateInOne &&
          !res.best.isForcedMateInTwo &&
          !res.best.fromSyzygy
        );
        if (!isDeepPass && needsDeepVerification && !isExtremePanicTime) {
          setAutoStatusText(`🛡 Deep aboutcheck tactical threats...`, "#ffbe0b");
        } else {
          scheduleAutoMoveIfNeeded();
        }
      }
    }

    if (showAverageMove && res.average) {
      if ($("cc-avg-card")) $("cc-avg-card").style.display = "block";
      const avgPref = parseFloat(res.average.evalPawns) > 0 ? "+" : "";
      $("cc-avg-eval").textContent = `${avgPref}${res.average.evalPawns}`;
      $("cc-avg-desc").textContent = explainWithModule(res.average, "avg", state.fen);
    } else if ($("cc-avg-card")) {
      $("cc-avg-card").style.display = "none";
    }

    if (showWorstMove && workMode === "all" && res.worst) {
      if ($("cc-worst-card")) $("cc-worst-card").style.display = "block";
      const wstPref = parseFloat(res.worst.evalPawns) > 0 ? "+" : "";
      $("cc-worst-eval").textContent = `${wstPref}${res.worst.evalPawns}`;
      $("cc-worst-desc").textContent = explainWithModule(res.worst, "worst", state.fen);
    } else if ($("cc-worst-card")) {
      $("cc-worst-card").style.display = "none";
    }

    renderArrowsOverlay(state, cachedMoves);
  }

  function getStockfishMoveTimeMs(fastRes) {
    const profile = window.__CC_ANDROID_RUNTIME__?.profile || window.__CC_DEVICE_PROFILE__;
    const deviceScale = Math.max(0.5, Math.min(1.5, Number(profile?.recommendation?.movetimeScale) || 1));
    if (!engineMaxMode) {
      const base = currentElo >= 2800 ? 620 : (currentElo >= 2400 ? 420 : 300);
      const budget = base + (fastRes.isDangerPosition || fastRes.hangingSquare ? 240 : 0);
      return Math.max(70, Math.round(budget * deviceScale));
    }
    const seconds = getMyRemainingSeconds();
    const danger = Boolean(fastRes.isDangerPosition || fastRes.hangingSquare);
    let budget = !Number.isFinite(seconds) ? 2200
      : seconds >= 300 ? 2600
      : seconds >= 120 ? 1900
      : seconds >= 45 ? 1200
      : seconds >= 15 ? 550
      : seconds >= 5 ? 220 : 80;
    if (danger) budget = Math.round(budget * 1.3);
    budget = Math.round(budget * deviceScale);
    if (Number.isFinite(seconds)) {
      const reserve = Math.max(1200, seconds * 50);
      budget = Math.min(budget, Math.max(70, seconds * 1000 - reserve - 850));
    }
    return Math.max(70, Math.min(3600, Math.round(budget)));
  }

  function runCycle(forceByButton = false) {
    if (extensionInvalidated || !isContextValid()) {
      shutdownOrphanedScript();
      return;
    }
    if (document.hidden || (mobileSession && !mobileSession.isReady)) return;
    if (mobileSession && window.__CC_ANDROID_SETTINGS_OPEN__ === true && !showArrows && !showEvalBar) return;
    if (forceByButton) clearAnalysisRetry();

    ensurePanel();
    updateLiveTelemetryUI();

    const state = captureBoardState(false);
    if (!state) {
      clearAnalysisRetry();
      if (currentPositionKey) markBoardDirty("NO_BOARD");
      if (activeEngineBoardKey) {
        analysisRequestId++;
        activeEngineBoardKey = "";
        StockfishWasmEngine.cancel?.();
      }
      hideArrows();
      renderEvalBar(null, 0);
      updateEvalMoodAndEngineBadge(null, null);
      return;
    }
    if (state.animating) return;
    adoptPositionState(state);
    const mobileConfigKey = mobileSession ? getMobileAnalysisConfig() : "";
    mobileSession?.observe(state, mobileConfigKey);
    if (mobileSession && isNativeAutoBlocked(state) && state.actualTurn === state.myColor && !forceByButton) {
      StockfishWasmEngine.terminate();
      return;
    }
    if (pendingAnalysisRetry && (pendingAnalysisRetry.url !== location.href || pendingAnalysisRetry.positionKey !== state.positionKey)) clearAnalysisRetry();
    if (!forceByButton && (isExecutingMove || Date.now() < moveCooldownUntil)) return;
    if (!forceByButton && pendingAnalysisRetry &&
        (Date.now() < pendingAnalysisRetry.notBefore || pendingAnalysisRetry.timer !== null)) return;
    if (activeEngineBoardKey && activeEngineBoardKey !== state.boardKey) {
      analysisRequestId++;
      activeEngineBoardKey = "";
      StockfishWasmEngine.cancel?.();
    }

    checkGameEndAndLearn(state.myColor);

    const standbyBox = $("cc-enemy-turn-standby");
    const activeBox = $("cc-my-turn-active");
    const deepBadge = $("cc-deep-status");

    if (!forceByButton && turnMode === "my" && state.actualTurn !== state.myColor) {
      resetTurnDecision();
      if (deepBadge) deepBadge.style.display = "none";
      if (standbyBox) {
        standbyBox.style.display = "flex";
        const mySideText = state.myColor === "w" ? "you for White ⚪" : "you for Black ⚫";
        $("cc-standby-title").textContent = `Opponent move (${mySideText})`;
      }
      if (activeBox) activeBox.style.display = "none";
      if (autoMoveEnabled) {
        setAutoStatusText("Waiting reply opponent on Chess.com...", "#94a3b8");
      }
      committedBoardKey = "";
      if (mobileSession) StockfishWasmEngine.terminate();

      if (committedEnemyBoardKey !== state.boardKey) {
        committedEnemyBoardKey = state.boardKey;
        hideArrows();
        if (isAltPressed || (heatmapAlwaysOn && (!mobileSession || mobileSession.effective().heatmapAlwaysOn))) {
          safeSendMessage({ type: "GET_BOARD_HEATMAP", fen: state.fen, myColor: state.myColor }, (hmRes) => {
            if (hmRes && Array.isArray(hmRes.heatmap)) {
              const fresh = captureBoardState(true);
              if (!fresh || fresh.animating || fresh.boardElement !== state.boardElement || fresh.boardKey !== state.boardKey) return;
              cachedMoves.heatmap = hmRes.heatmap;
              cachedMoves.heatmapBoardKey = state.boardKey;
              cachedMoves.boardKey = state.boardKey;
              cachedMoves.positionId = positionId;
              cachedMoves.positionKey = currentPositionKey;
              renderArrowsOverlay(fresh, cachedMoves);
            }
          });
        }
      }
      return;
    }

    if (standbyBox) standbyBox.style.display = "none";
    if (activeBox) activeBox.style.display = "flex";
    if (mobileSession && !mobileSession.canAnalyze(state, forceByButton)) return;
    if (mobileSession?.hasAnalysis(state.positionKey, mobileConfigKey)) {
      if (cachedMoves.best && isCachedAnalysisCurrent(state)) scheduleAutoMoveIfNeeded();
      return;
    }

    if (!forceByButton && state.boardKey === committedBoardKey) {
      if (
        autoMoveEnabled &&
        state.actualTurn === state.myColor &&
        !autoMoveTimer &&
        !currentTurnDecision.skip &&
        cachedMoves.best &&
        cachedMoves.boardKey === state.boardKey &&
        (!(cachedMoves.isDangerPosition || cachedMoves.hangingSquare) || cachedMoves.pass === "deep")
      ) {
        scheduleAutoMoveIfNeeded();
      }
      return;
    }

    const lease = mobileSession?.beginAnalysis(state, mobileConfigKey);
    if (mobileSession && !lease) return;
    mobileAnalysisLease = lease || null;
    committedBoardKey = state.boardKey;
    committedEnemyBoardKey = "";
    resetTurnDecision();

    const myReqId = ++analysisRequestId;
    const cycleAnalysisId = ++positionAnalysisId;
    const fastMeta = createAnalysisMeta(state, "fast", cycleAnalysisId);
    const deepMeta = createAnalysisMeta(state, "deep", cycleAnalysisId);
    activeEngineBoardKey = state.boardKey;
    const sideText = state.sideToAnalyze === "w" ? "WHITE TO MOVE ⚪" : "BLACK TO MOVE ⚫";
    if ($("cc-turn-indicator")) $("cc-turn-indicator").textContent = sideText;

    const mySecs = getMyRemainingSeconds();
    const enemySecs = getEnemyRemainingSeconds();
    const strictBestPolicy = usesStrictBestMovePolicy();
    const needAvg = Boolean(!engineMaxMode && (showAverageMove || (!strictBestPolicy && (useAverageMoveSometimes || autoT1LimiterEnabled))));
    const needWorst = Boolean(!strictBestPolicy && showWorstMove && workMode === "all");
    const historyTrustedForState = Boolean(gameStartedFromInitial && state.sideToAnalyze === state.actualTurn);

    safeSendMessage(
      {
        type: "ANALYZE_POSITION",
        fen: state.fen,
        elo: currentElo,
        style: currentStyle,
        pass: "fast",
        lastEnemyMove: lastRealEnemyMove,
        bulletTurbo: false,
        calcAverage: needAvg,
        calcWorst: needWorst,
        myColor: state.myColor,
        mySeconds: mySecs,
        enemySeconds: enemySecs,
        trapRadarEnabled,
        recentPositions: recentPositionHistory,
        lastOurMove: lastOurExecutedMove,
        uciHistory: uciHistoryList,
        historyTrusted: historyTrustedForState,
        meta: fastMeta
      },
      async (fastRes) => {
        const responseMeta = fastRes?.meta || fastMeta;
        if (myReqId !== analysisRequestId || !isCurrentAnalysisMeta(responseMeta)) return;
        if (!fastRes || !fastRes.best || fastRes.error) {
          finishCurrentAnalysis(myReqId, "failed");
          clearPositionPresentation(fastRes?.error ? "ANALYSIS ERROR • RETRY..." : "MATE / STALEMATE • NO MOVES");
          committedBoardKey = state.boardKey;
          boardDirty = false;
          if (fastRes?.error && analysisRetryCount < 5) {
            const retryDelay = Math.min(3000, 180 * (2 ** analysisRetryCount++));
            scheduleAnalysisRetry(state, retryDelay);
          }
          return;
        }
        fastRes.meta = responseMeta;
        const fastIsSyzygy = Boolean(fastRes.syzygyActive || fastRes.best.fromSyzygy);
        const fastCanFinalize = Boolean(fastIsSyzygy || (!fastRes.analysisIncomplete && !strictBestPolicy && (fastRes.best.isMateInOne || fastRes.best.isForcedMateInTwo)));
        fastRes.analysisFinalized = fastCanFinalize;
        analysisRetryCount = 0;
        applyAnalysisResult(state, fastRes, false, "");

        if (fastCanFinalize) {
          if (deepBadge) deepBadge.style.display = "none";
          finishCurrentAnalysis(myReqId);
          return;
        }

        if (deepBadge) {
          deepBadge.textContent = fastRes.isDangerPosition
            ? "🛡 SEARCHING DEFENSE..."
            : (useStockfishWasm ? "🧠 SF LOCAL + CLOUD..." : "⚡ DEEP SEARCH...");
          deepBadge.style.display = "inline-block";
        }
        const firstBestUci = fastRes.best ? fastRes.best.uci : "";

        const shouldRunWasm = Boolean(useStockfishWasm);
        const wasmMovetime = getStockfishMoveTimeMs(fastRes);
        const wasmPromise = shouldRunWasm
          ? StockfishWasmEngine.analyze(state.fen, wasmMovetime, needAvg ? 3 : 1, uciHistoryList, historyTrustedForState, { ...deepMeta, engineMaxMode, isDangerPosition: Boolean(fastRes.isDangerPosition || fastRes.hangingSquare), needAverage: needAvg })
          : Promise.resolve(null);
        if (shouldRunWasm && window.__CC_ANDROID_RUNTIME__) {
          const dispatch = await StockfishWasmEngine.whenDispatched();
          if (myReqId !== analysisRequestId || !isCurrentAnalysisMeta(deepMeta)) return;
          deepMeta.ownedEngineRequestId = dispatch?.requestId || "";
          deepMeta.annotationOnly = true;
        }

        safeSendMessage(
          {
            type: "ANALYZE_POSITION",
            fen: state.fen,
            elo: currentElo,
            style: currentStyle,
            pass: "deep",
            lastEnemyMove: lastRealEnemyMove,
            bulletTurbo: false,
            calcAverage: needAvg,
            calcWorst: needWorst,
            myColor: state.myColor,
            mySeconds: mySecs,
            enemySeconds: enemySecs,
            trapRadarEnabled,
            recentPositions: recentPositionHistory,
            lastOurMove: lastOurExecutedMove,
            uciHistory: uciHistoryList,
            historyTrusted: historyTrustedForState,
            meta: deepMeta
          },
          async (deepRes) => {
            const responseMeta = deepRes?.meta || deepMeta;
            if (myReqId !== analysisRequestId || !isCurrentAnalysisMeta(responseMeta)) return;
            const backgroundDeepOk = Boolean(deepRes && !deepRes.error && deepRes.best);
            let finalDeep = backgroundDeepOk ? deepRes : fastRes;
            let wasmApplied = false;
            if (shouldRunWasm) {
              try {
                const wasmOut = await wasmPromise;
                if (myReqId !== analysisRequestId || !isCurrentAnalysisMeta(deepMeta)) return;
                if (wasmOut) {
                  finalDeep = mergeWasmAnalysisIntoResult(finalDeep, wasmOut, state);
                  wasmApplied = Boolean(finalDeep?.engineMeta);
                }
              } catch (e) {}
            }

            const requiresFinalEngine = usesStrictBestMovePolicy() || Boolean(finalDeep?.analysisIncomplete);
            if (!backgroundDeepOk && !wasmApplied && !requiresFinalEngine) {
              if (deepBadge) deepBadge.style.display = "none";
              finishCurrentAnalysis(myReqId);
              return;
            }

            const hasFinalEngine = Boolean(finalDeep?.engineMeta || finalDeep?.syzygyActive || finalDeep?.best?.fromSyzygy);
            if (requiresFinalEngine && !hasFinalEngine) {
              finishCurrentAnalysis(myReqId, "failed");
              if (!useStockfishWasm) {
                if (deepBadge) deepBadge.style.display = "none";
                committedBoardKey = state.boardKey;
                setAutoStatusText(usesStrictBestMovePolicy() ? "2000+ ELO requires enabled STOCKFISH LOCAL" : "Analysis not finished: enable Stockfish or move manually.", "#ffbe0b");
                return;
              }
              if (finalEngineRetryCount < 3) {
                const retryAttempt = ++finalEngineRetryCount;
                const retryDelay = Math.min(20000, 5500 * (2 ** (retryAttempt - 1)));
                if (deepBadge) {
                  deepBadge.textContent = `🧠 STOCKFISH RETRY ${retryAttempt}/3...`;
                  deepBadge.style.display = "inline-block";
                }
                scheduleAnalysisRetry(state, retryDelay);
              } else {
                if (deepBadge) deepBadge.style.display = "none";
                committedBoardKey = state.boardKey;
                setAutoStatusText("STOCKFISH unavailable • automove blocked", "#ff2a85");
                scheduleEngineRecovery(state);
              }
              return;
            }
            finalEngineRetryCount = 0;

            if (deepBadge) deepBadge.style.display = "none";

            finalDeep.meta = deepMeta;
            finalDeep.analysisFinalized = true;
            finalDeep.analysisSource = finalDeep.best?.fromSyzygy ? "syzygy" : (wasmApplied ? "stockfish" : "deep");
            applyAnalysisResult(state, finalDeep, true, firstBestUci);
            finishCurrentAnalysis(myReqId);
          }
        );
      }
    );
  }

  let rafPending = false;
  function triggerDebouncedCycle() {
    if (extensionInvalidated || document.hidden || (mobileSession && !mobileSession.isReady) || rafPending || isExecutingMove) return;
    if (Date.now() < moveCooldownUntil) {
      if (mobileSession && !cycleWakeTimer) cycleWakeTimer = setTimeout(() => {
        cycleWakeTimer = null;
        triggerDebouncedCycle();
      }, Math.max(16, moveCooldownUntil - Date.now()));
      return;
    }
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      runCycle(false);
    });
  }

  let observedBoardNode = null;
  let observedBoardRoots = [];
  let boardObserversAttached = false;
  const domObserver = new MutationObserver((mutations) => {
    const boardStructureChanged = mutations.some(mutation =>
      mutation.type === "childList" &&
      [...(mutation.addedNodes || []), ...(mutation.removedNodes || [])].some(node =>
        node?.matches?.(CHESSCOM_BOARD_SELECTOR) || node?.querySelector?.(CHESSCOM_BOARD_SELECTOR)
      )
    );
    if (boardStructureChanged) cachedChessComRoots = [];
    if (boardStructureChanged) cachedChessComBoardElement = null;
    const touchesPiece = mutations.some(mutation => {
      const target = mutation.target;
      if (target?.matches?.(".piece, piece")) return true;
      return [...(mutation.addedNodes || []), ...(mutation.removedNodes || [])].some(node =>
        node?.matches?.(".piece, piece") || node?.querySelector?.(".piece, piece")
      );
    });
    const touchesTurn = mutations.some(mutation => mutation.target?.matches?.("wc-chess-board, chess-board, .clock-player-turn, .clock-running, .clock-bottom, .clock-top"));
    if (mobileSession && !touchesPiece && !boardStructureChanged && !touchesTurn) return;
    if (touchesPiece || touchesTurn || boardStructureChanged) markBoardDirty("MOVE");
    if (!mobileSession) syncVisualPosition();
    triggerDebouncedCycle();
  });
  const boardResizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => syncVisualPosition()) : null;

  function ensureObserversAttached() {
    if (extensionInvalidated || !isContextValid()) return;
    const boardEl = findChessComBoardElement();
    const roots = boardEl ? getChessComBoardRoots(boardEl) : [];
    if (!boardObserversAttached || boardEl !== observedBoardNode || roots.length !== observedBoardRoots.length || roots.some((root, i) => root !== observedBoardRoots[i])) {
      domObserver.disconnect();
      if (boardResizeObserver) boardResizeObserver.disconnect();
      if (boardEl !== observedBoardNode) {
        markBoardDirty("BOARD_REPLACED");
      }
      observedBoardNode = boardEl;
      observedBoardRoots = roots;
      boardObserversAttached = true;
      domObserver.observe(document.documentElement, { childList: true, subtree: true });
      for (const root of roots) {
        domObserver.observe(root, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["class", "style", "orientation", "turn", "data-turn", "side-to-move"]
        });
      }
      if (boardEl && boardResizeObserver) boardResizeObserver.observe(boardEl);
      if (!mobileSession) syncVisualPosition();
      triggerDebouncedCycle();
    }
  }

  const syncVisualPosition = () => {
    if (extensionInvalidated || !isContextValid()) return;
    ensureObserversAttached();
    const state = captureBoardState(true);
    if (!state || state.animating || !isCachedAnalysisCurrent(state) || (!cachedMoves.best && !isAltPressed && !heatmapAlwaysOn)) {
      hideArrows();
      renderEvalBar(null, 0);
      if (!state) updateEvalMoodAndEngineBadge(null, null);
      return;
    }
    renderEvalBar(state, cachedMoves.best?.whitePerspectiveEval ?? cachedMoves.best?.evalPawns ?? 0);
    const svg = $("chesscoach-screen-svg");
    const r = state.boardRect;
    if (!svg || svg.style.display === "none" || svg.style.left !== `${r.left}px` || svg.style.top !== `${r.top}px` ||
        svg.style.width !== `${r.width}px` || svg.style.height !== `${r.height}px` ||
        svg.getAttribute("data-cc-orientation") !== (state.isBlackOrientation ? "black" : "white") ||
        svg.getAttribute("data-cc-board-key") !== state.boardKey) {
      renderArrowsOverlay(state, cachedMoves);
    }
  };

  try { chrome.storage?.onChanged?.addListener(handleStorageChanges); } catch (e) {}
  function scheduleMobilePoll() {
    clearTimeout(mobilePollTimer);
    if (extensionInvalidated || document.hidden || !mobileSession?.isReady) return;
    mobilePollTimer = setTimeout(() => {
      mobilePollTimer = null;
      if (extensionInvalidated || document.hidden) return;
      ensureObserversAttached();
      if (!isExecutingMove && Date.now() >= moveCooldownUntil) runCycle(false);
      scheduleMobilePoll();
    }, 1600);
  }

  const settingsReady = loadSettings();
  if (mobileSession) {
    Promise.all([settingsReady, mobileSession.ready]).then(() => {
      if (extensionInvalidated) return;
      unregisterMobileCore = mobileSession.registerCore("chesscom", {
        captureState: () => captureBoardState(true),
        isAnimating: board => Boolean(queryChessComBoard(board, ".piece.dragging, .piece.animating").length),
        viewState: () => ({ executing: isExecutingMove, bestUci: cachedMoves.best?.uci || null,
          finalAnalysis: Boolean(cachedMoves.engineMeta || cachedMoves.syzygyActive), retryPending: Boolean(pendingAnalysisRetry), nativeInputBlocked: Boolean(nativeMoveBlockedState) }),
        cancelSearch() {
          analysisRequestId++;
          positionAnalysisId++;
          activeEngineBoardKey = "";
          mobileAnalysisLease = null;
          StockfishWasmEngine.cancel();
          clearAnalysisRetry();
        },
        suspend: suspendMobileCore,
        resume() {
          boardDirty = true;
          ensureObserversAttached();
          triggerDebouncedCycle();
          scheduleMobilePoll();
        },
        refreshVisuals() { mobileSession.applyVisualPolicy(shadowRoot); triggerDebouncedCycle(); }
      });
      mobileSession.applyVisualPolicy(shadowRoot);
      ensureObserversAttached();
      triggerDebouncedCycle();
      scheduleMobilePoll();
    }).catch(error => mobileSession.reportError(error));
  } else ensureObserversAttached();

  let lastIdleBoardPollAt = 0;
  if (!mobileSession) mainIntervalId = setInterval(() => {
    if (extensionInvalidated || !isContextValid()) {
      shutdownOrphanedScript();
      return;
    }
    if (document.hidden) return;
    if (window.__CC_ANDROID_RUNTIME__ && !observedBoardNode) {
      const now = performance.now();
      if (now - lastIdleBoardPollAt < 1200) return;
      lastIdleBoardPollAt = now;
    }
    syncVisualPosition();
    if (!isExecutingMove && Date.now() >= moveCooldownUntil) {
      runCycle(false);
    }
  }, 260);

  window.addEventListener("scroll", syncVisualPosition, { passive: true, capture: true });
  window.addEventListener("resize", syncVisualPosition, { passive: true });
  document.addEventListener?.("visibilitychange", handleEngineVisibilityChange);
  window.addEventListener("pagehide", handleEngineVisibilityChange);
  window.addEventListener("cc-mobile-lifecycle", handleMobileMoveLifecycle);
})();
