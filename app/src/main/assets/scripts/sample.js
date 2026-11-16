/**
 * ЭТАЛОННЫЙ ДЕМО-SCRIPT CHESSCOACH SDK v2.0 (scripts/sample.js)
 * При enabledии во onадке «📜 SCRIPTS» opens second window settings на site
 * s toggle «Expected score», choice color, биндом клавиши и 60 FPS подsветкой move.
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
    description: "Opens on site second window settings s toggle «Expected score», choice color и 60 FPS effect on board.",

    onEnable(api) {
      // 1. Создаем незавиsимое перетаsкиваемое window settings script
      const win = api.createWindow({
        id: "cc-sample-script-window",
        title: "✨ SAMPLE.JS // MENU SCRIPT",
        x: 28,
        y: 90,
        width: 345
      });

      // 2. Создаем tabs внутри окна script
      const tabs = api.ui.createTabs(win.body, ["⚡ Main", "🎨 Visual 60 FPS"]);

      // Вкладка 1: Toggle «Expected score» и горячая клавиша
      api.ui.addNote(tabs["⚡ Main"], {
        text: "Drag this window by the header to any convenient place. When the script is disabled the window and effects are removed automatically."
      });

      const updateBanner = () => {
        if (bannerEnabled) {
          api.audio.playTone(987.77, 130, "triangle");
          api.osd.showBanner({
            id: "cc-sample-result-banner",
            text: "✨ EXPECTED RESULT ✨",
            subtext: "Script scripts/sample.js successfully ran via ChessCoach SDK v2.0!",
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
        label: "⌨️ Banner toggle bind",
        defaultKey: "KeyB",
        onTrigger() {
          bannerEnabled = !bannerEnabled;
          toggleEl.checked = bannerEnabled;
          updateBanner();
        }
      });

      // Вкладка 2: Settings color и 60 FPS Canvas-effect на board
      api.ui.addColorPicker(tabs["🎨 Visual 60 FPS"], {
        label: "🎨 Neon color effect",
        value: accentColor,
        onChange(newColor) {
          accentColor = newColor;
          if (bannerEnabled) updateBanner();
        }
      });

      api.ui.addToggle(tabs["🎨 Visual 60 FPS"], {
        label: "🌌 60 FPS Pulse last move on board",
        value: pulseBoardEnabled,
        onChange(val) {
          pulseBoardEnabled = val;
        }
      });
    },

    // 3. Плавная 60 FPS отриsовка на вsтроенном Canvas board (800x800)
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
      // All окна, баннеры, таймеры и 60 FPS sлои очищаютsя ядром automatically
      bannerEnabled = false;
    }
  });
})();