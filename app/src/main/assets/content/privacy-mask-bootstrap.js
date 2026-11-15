(function () {
  "use strict";

  const STYLE_ID = "cc-privacy-mask-bootstrap-style";
  const STORAGE_KEY = "chesscom.chesscomVisualMaskV1";
  const LEGACY_STORAGE_KEY = "chesscomVisualMaskV1";
  const PLAYER_ROOTS = [
    ".board-layout-top", ".board-layout-bottom",
    ".player-component.player-top", ".player-component.player-bottom",
    ".player-tagline-top", ".player-tagline-bottom",
    ".player-top", ".player-bottom"
  ].join(",");
  const PRIVATE_FIELDS = [
    "[data-test-element='user-tagline-username']",
    "[data-test-element='user-rating']",
    "[data-cy='user-tagline-username']",
    "[data-cy='user-tagline-rating']",
    ".user-tagline-username", ".user-username-component",
    ".user-tagline-rating", ".cc-user-username-white", ".cc-user-rating-white"
  ].join(",");

  function removeBootstrap() {
    document.getElementById(STYLE_ID)?.remove();
  }

  function installBootstrap() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `:is(${PLAYER_ROOTS}) :is(${PRIVATE_FIELDS}) { opacity: 0 !important; }`;
    (document.head || document.documentElement).appendChild(style);
  }

  try {
    chrome.storage.local.get([STORAGE_KEY, LEGACY_STORAGE_KEY], result => {
      if (chrome.runtime.lastError) return;
      const mask = result?.[STORAGE_KEY] ?? result?.[LEGACY_STORAGE_KEY];
      if (mask?.enabled === true) installBootstrap();
      else removeBootstrap();
    });
  } catch (e) {}
})();
