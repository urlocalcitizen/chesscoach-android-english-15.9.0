/**
 * ЭТАОН ДЕМО-SCRIPT CHESSCOACH SDK v2.0 (scripts/sample.js)
 * On enabledии во вклад «📜 SCRIPTS» opens second window settings on site
 * with toggle «Expected score», choice of color, бинд клавиши and 60 FPS underсbranch move.
 */
(function () {
  if (!window.CC) return;

  let bannerEnabled = false;
  let pulseBoardEnabled = true;
  let accentColor = "#00f5d4";
  let pulsePhase = 0;

  window.CC.registerScript({
    id: "sample_expected_result",
    name: "✨ Sample Script: Expected score (SDK v2.0)",
    version: "2.0.0",
    author: "ChessCoach Community",
    description: "Opens on site second window settings with toggle «Expected score», choice of color and 60 FPS effect on board.",

    onEnable(api) {
      // 1. Созyesем notforвисимое reтаскиое window settings script
      const win = api.createWindow({
        id: "cc-sample-script-window",
        title: "✨ SAMPLE.JS // SCRIPT MENU",
        x: 28,
        y: 90,
        width: 345
      });

      // 2. Созyesем tabs внутри window script
      const tabs = api.ui.createTabs(win.body, ["⚡ Main", "🎨 Visual 60 FPS"]);

      // Вклад 1: Toggle «Expected score» and горяя key
      api.ui.addNote(tabs["⚡ Main"], {
        text: "Drag this window for header in any convenient place. When script is disabled window and effects are automaticallyally."
      });

      const updateBanner = () => {
        if (bannerEnabled) {
          api.audio.playTone(987.77, 130, "triangle");
          api.osd.showBanner({
            id: "cc-sample-result-banner",
            text: "✨ WAIT RESULT ✨",
            subtext: "Script scripts/sample.js successfully ran through ChessCoach SDK v2.0!",
            accentColor: accentColor,
            position: "top-center"
          });
        } else {
          api.osd.hideBanner("cc-sample-result-banner");
        }
      };

      const toggleEl = api.ui.addToggle(tabs["⚡ Main"], {
        label: "🔥 Display «Expected score»",
        value: bannerEnabled,
        onChange(val) {
          bannerEnabled = val;
          updateBanner();
        }
      });

      api.ui.addKeybind(tabs["⚡ Main"], {
        label: "⌨️ Bind switching banner",
        defaultKey: "KeyB",
        onTrigger() {
          bannerEnabled = !bannerEnabled;
          toggleEl.checked = bannerEnabled;
          updateBanner();
        }
      });

      // Вклад 2: Settings color and 60 FPS Canvas-effect on board
      api.ui.addColorPicker(tabs["🎨 Visual 60 FPS"], {
        label: "🎨 Neon color effect",
        value: accentColor,
        onChange(newColor) {
          accentColor = newColor;
          if (bannerEnabled) updateBanner();
        }
      });

      api.ui.addToggle(tabs["🎨 Visual 60 FPS"], {
        label: "🌌 60 FPS Pulse after last move on board",
        value: pulseBoardEnabled,
        onChange(val) {
          pulseBoardEnabled = val;
        }
      });
    },

    // 3. Smooth 60 FPS fromрисов on встроенн Canvas board (800x800)
    onFrame(api, ctx, dt, state) {
      if (!pulseBoardEnabled || !state.lastMoveTo) return;

      pulsePhase += dt * 4.2;
      const pt = api.board.sqToXY(state.lastMoveTo);
      const radius = 28 + Math.sin(pulsePhase) * 10;

      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    },

    onDisable(api) {
      // All window, banners, timers and 60 FPS слои очищаются ядр automatically
      bannerEnabled = false;
    }
  });
})();