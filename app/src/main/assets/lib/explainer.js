window.ChessExplainer = (function () {
  const PIECE_NAMES = {
    p: "Pawn",
    n: "Knight",
    b: "Bishop",
    r: "Rook",
    q: "Queen",
    k: "King"
  };

  const PIECE_GENITIVE = {
    p: "pawn",
    n: "knight",
    b: "bishop",
    r: "rook",
    q: "queen",
    k: "king"
  };

  const FILES = "abcdefgh";

  function parseBoard(fen) {
    if (!fen) return null;
    const parts = fen.split(" ");
    const rows = parts[0].split("/");
    const turn = parts[1] || "w";
    const grid = [];
    for (let r = 0; r < 8; r++) {
      const row = [];
      for (const ch of rows[r]) {
        if (!isNaN(ch)) {
          for (let i = 0; i < parseInt(ch, 10); i++) row.push(null);
        } else {
          row.push(ch);
        }
      }
      grid.push(row);
    }
    return { grid, turn };
  }

  function sqToRC(sq) {
    if (!sq || sq.length < 2) return { r: 0, c: 0 };
    const c = FILES.indexOf(sq[0]);
    const r = 8 - parseInt(sq[1], 10);
    return { r, c };
  }

  function detectPositionalMotifs(m, fen) {
    const parsed = parseBoard(fen);
    if (!parsed || !m || !m.from || !m.to) return {};
    const { grid, turn } = parsed;
    const isW = turn === "w";
    const from = sqToRC(m.from);
    const to = sqToRC(m.to);
    const ownPawn = isW ? "P" : "p";
    const enemyPawn = isW ? "p" : "P";
    const ownRook = isW ? "R" : "r";
    const ownQueen = isW ? "Q" : "q";
    const ownBishop = isW ? "B" : "b";

    let ownPawnsOnDestFile = 0;
    let enemyPawnsOnDestFile = 0;
    for (let r = 0; r < 8; r++) {
      if (grid[r][to.c] === ownPawn) ownPawnsOnDestFile++;
      if (grid[r][to.c] === enemyPawn) enemyPawnsOnDestFile++;
    }
    const isOpenFile = (m.piece === "r" || m.piece === "q") && ownPawnsOnDestFile === 0 && enemyPawnsOnDestFile === 0;
    const isSemiOpenFile = (m.piece === "r" || m.piece === "q") && ownPawnsOnDestFile === 0 && enemyPawnsOnDestFile > 0;

    const seventhRank = isW ? 1 : 6;
    const isSeventhRankInvasion = (m.piece === "r" || m.piece === "q") && to.r === seventhRank;

    const pawnSupportRow = isW ? to.r + 1 : to.r - 1;
    const supportedByPawn =
      pawnSupportRow >= 0 &&
      pawnSupportRow <= 7 &&
      ((to.c > 0 && grid[pawnSupportRow][to.c - 1] === ownPawn) ||
        (to.c < 7 && grid[pawnSupportRow][to.c + 1] === ownPawn));
    const inEnemyTerritory = isW ? to.r <= 4 : to.r >= 3;
    const isOutpost = (m.piece === "n" || m.piece === "b") && supportedByPawn && inEnemyTerritory;

    const isFianchetto = m.piece === "b" && ["g2", "b2", "g7", "b7"].includes(m.to);

    const isProphylaxisEdge =
      m.piece === "p" &&
      !m.captured &&
      ((isW && (m.to === "a3" || m.to === "h3")) || (!isW && (m.to === "a6" || m.to === "h6")));

    const enemyCenterRow = isW ? to.r - 1 : to.r + 1;
    const challengesEnemyPawn =
      m.piece === "p" &&
      !m.captured &&
      enemyCenterRow >= 0 &&
      enemyCenterRow <= 7 &&
      ((to.c > 0 && grid[enemyCenterRow][to.c - 1] === enemyPawn) ||
        (to.c < 7 && grid[enemyCenterRow][to.c + 1] === enemyPawn));

    let isPassedPawn = false;
    if (m.piece === "p" && (isW ? to.r <= 4 : to.r >= 3)) {
      isPassedPawn = true;
      const startR = isW ? 0 : to.r + 1;
      const endR = isW ? to.r - 1 : 7;
      for (let r = startR; r <= endR; r++) {
        for (let dc = -1; dc <= 1; dc++) {
          const cc = to.c + dc;
          if (cc >= 0 && cc <= 7 && grid[r][cc] === enemyPawn) {
            isPassedPawn = false;
          }
        }
      }
    }

    const boardAfter = grid.map(row => row.slice());
    const movedPiece = boardAfter[from.r]?.[from.c] || (isW ? m.piece.toUpperCase() : m.piece);
    if (boardAfter[from.r]) boardAfter[from.r][from.c] = null;
    if (boardAfter[to.r]) boardAfter[to.r][to.c] = movedPiece;

    function seesFriendlySlider(directions, compatiblePieces) {
      for (const [dr, dc] of directions) {
        let r = to.r + dr;
        let c = to.c + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const piece = boardAfter[r][c];
          if (piece) {
            if (compatiblePieces.includes(piece)) return true;
            break;
          }
          r += dr;
          c += dc;
        }
      }
      return false;
    }

    let isBattery = false;
    if (m.piece === "q" || m.piece === "r") {
      isBattery = seesFriendlySlider(
        [[-1, 0], [1, 0], [0, -1], [0, 1]],
        [ownRook, ownQueen]
      );
    }
    if (!isBattery && (m.piece === "q" || m.piece === "b")) {
      isBattery = seesFriendlySlider(
        [[-1, -1], [-1, 1], [1, -1], [1, 1]],
        [ownBishop, ownQueen]
      );
    }

    const homeRow = isW ? 7 : 0;
    const isDevelopment = (m.piece === "n" || m.piece === "b") && from.r === homeRow && to.r !== homeRow;
    const isRetreat = isW ? to.r > from.r : to.r < from.r;
    const isCenterControl = ["d4", "d5", "e4", "e5"].includes(m.to);

    return {
      isOpenFile,
      isSemiOpenFile,
      isSeventhRankInvasion,
      isOutpost,
      isFianchetto,
      isProphylaxisEdge,
      challengesEnemyPawn,
      isPassedPawn,
      isBattery,
      isDevelopment,
      isRetreat,
      isCenterControl
    };
  }

  function explainMove(m, category, fen = "", style = "tal", roflMode = false) {
    if (!m) return "Waiting your move...";

    const pName = PIECE_NAMES[m.piece] || "Piece";
    const capAcc = m.captured ? PIECE_GENITIVE[m.captured] || "piece" : "";
    const promoText = m.promo ? `=${m.promo.toUpperCase()}` : "";
    const syzygyTag = m.fromSyzygy ? " 🔮[SYZYGY GOD]" : "";
    const sfWasmTag = m.fromWasm ? " 🧠[SF LOCAL]" : "";
    const cloudTag = (!m.fromSyzygy && !m.fromWasm && m.fromCloud) ? " ⚡[SF 3000]" : "";
    const memTag = m.memoryBonus > 20 ? " ◈[MEM]" : "";
    const zeitnotTag = m.isZeitnotBranched ? " ⏱️[FLAG STORM]" : "";
    const tags = `${syzygyTag}${sfWasmTag}${cloudTag}${memTag}${zeitnotTag}`;
    const header = `${pName} ${m.from} → ${m.to}${promoText}${tags}`;

    const motifs = detectPositionalMotifs(m, fen);

    if (category === "best") {
      if (m.isMateInOne) {
        return `👑💀 ${header}# — HAHAHA, MATE IN 1 MOVE! Opponent blundered a direct fatality. Finish him!`;
      }
      if (m.isForcedMateInTwo) {
        return `👑⚡ ${header}+ — FORCED MATE IN 2 MOVES! Any opponent reply gets mate next move.`;
      }
      if (m.fromSyzygy && m.syzygyBadge) {
        if (m.syzygyOutcome === "win") {
          return `🔮👑 ${header} — ${m.syzygyBadge}. Flawless mathematical endgame conversion!`;
        }
        if (m.syzygyOutcome === "draw") {
          return `🔮🛡 ${header} — ${m.syzygyBadge}. Precise holding of the tablebase fortress.`;
        }
        return `🔮 ${header} — ${m.syzygyBadge}. Stubborn resistance by endgame tablebase.`;
      }
      if (m.isCheckmate || m.trueScore > 15000) {
        return `👑 ${header} — Inevitable forced mate in a few moves!`;
      }
      if (m.isTrap && m.trapChance >= 75) {
        return `🪤 ${header} — TRAP (Chance of enemy error: ${m.trapChance}%)! ${m.trapSubtitle}`;
      }
      if (m.promo === "n") {
        return `⚔ ${header} — Tactical promotion to Knight! Instead of queen we put knight with a fork or mating threat.`;
      }
      if (m.promo === "q") {
        return `👑 ${header} — We promote the pawn to a new Queen and get a decisive material advantage!`;
      }
      if (m.isEnPassant) {
        return `⚡ ${header} — Capture on passant (En Passant)! We remove s board passed-over pawn opponent.`;
      }

      if (style === "mogging" || roflMode) {
        if (m.isTalSacrifice || m.isSacrifice) {
          return `⚡ ${header} — Sound tactical sacrifice! Open king's cover s objective advantage.`;
        }
        if (m.isFork) {
          return `⚔ ${header} — Brutal fork on two pieces! One will have to say goodbye.`;
        }
        if (m.isPin) {
          return `◈ ${header} — Device pin completely. Piece opponent paralyzed.`;
        }
        if (m.captured) {
          return `✦ ${header} — Taking ${capAcc} on ${m.to} and pressing further.`;
        }
        if (m.kicksEnemyPiece) {
          return `▲ ${header} — Kicking the enemy piece with a pawn and gaining tempo.`;
        }
      }

      if (m.bookName) {
        return `◈ ${header} — ${m.bookName}.`;
      }
      if (m.savedHangingPiece) {
        return `🛡 ${header} — Saving piece or pawn from a direct attack.`;
      }
      if (m.isTalSacrifice || m.isSacrifice) {
        return `⚡ ${header} — Calculated tactical sacrifice to break through to the king.`;
      }
      if (m.isFork) {
        return `⚔ ${header} — Double attack (fork) on two targets at once.`;
      }
      if (m.isPin) {
        return `◈ ${header} — Pinning the opponent's piece on the king or queen line.`;
      }
      if (m.isCastling) {
        return `🛡 ${header} — Castling: hide the king and bring the rook into play.`;
      }
      if (m.captured && m.givesCheck) {
        return `⚡ ${header} — Taking ${capAcc} on ${m.to} with check!`;
      }
      if (m.captured) {
        return `✦ ${header} — Winning ${capAcc} or making a favorable exchange on ${m.to}.`;
      }
      if (m.kicksEnemyPiece) {
        return `▲ ${header} — We drive away piece enemy s loss of tempo.`;
      }
      if (m.givesCheck) {
        return `⚡ ${header} — Attacking check to the king seizing the initiative.`;
      }
      if (motifs.isSeventhRankInvasion) {
        return `▲ ${header} — Breaking into the 7th rank after enemy pawns.`;
      }
      if (motifs.isOpenFile || motifs.isSemiOpenFile) {
        return `◈ ${header} — Seizing the ${m.to[0]}-file with a heavy piece.`;
      }
      if (motifs.isBattery) {
        return `❖ ${header} — Building a powerful battery on one line.`;
      }
      if (motifs.isOutpost) {
        return `✦ ${header} — Planting a piece on the strong protected outpost ${m.to}.`;
      }
      if (motifs.isFianchetto) {
        return `◈ ${header} — Developing the bishop onto the long diagonal.`;
      }
      if (motifs.challengesEnemyPawn) {
        return `▲ ${header} — Undermining the opponent's pawn center.`;
      }
      if (motifs.isPassedPawn) {
        return `▲ ${header} — We push passed pawn toward promotion.`;
      }
      if (motifs.isDevelopment) {
        return `✦ ${header} — Quickly prepare piece into play closer to center.`;
      }
      if (m.piece === "p" && motifs.isCenterControl) {
        return `✦ ${header} — We seize center board and open line.`;
      }
      return `✦ ${header} — Strong positional move: we improve pieces и increase pressure.`;
    }

    if (category === "avg") {
      if (m.isTrap && m.trapChance >= 75) {
        return `🪤 ${header} — Sharp alternative trap (Chance of enemy error: ${m.trapChance}%).`;
      }
      if (m.promo === "q") {
        return `❖ ${header} — Promotion to Queen transitioning into a calm won endgame.`;
      }
      if (m.isEnPassant) {
        return `❖ ${header} — En passant capture relieving the center.`;
      }
      if (m.bookName) {
        return `❖ ${header} — Quiet theoretical continuation (${m.bookName}).`;
      }
      if (m.captured) {
        return `❖ ${header} — Working exchange on ${m.to}, but 1st line is more precise.`;
      }
      return `❖ ${header} — Reliable backup move without risk.`;
    }

    if (category === "worst") {
      if (m.causesStalemate) {
        return `✖ ${header} — DANGER STALEMATE! Leaves opponent king without moves and gives away a draw 1/2 in a won position!`;
      }
      if (m.isRepetitionDrawRisk) {
        return `✖ ${header} — Position repetition! Leads to threefold repetition and loss of the win.`;
      }
      if (m.underDirectAttack) {
        return `✖ ${header} — Crude blunder! Hangs piece or pawn under attack on ${m.to}.`;
      }
      if (m.ignoredHangingPiece) {
        return `✖ ${header} — Leaves your attacked piece without defense.`;
      }
      if (m.ruinedCastling) {
        return `✖ ${header} — Deprives the king of castling in a dangerous center.`;
      }
      return `✖ ${header} — Weak move: loses time and gives away the initiative.`;
    }
  }

  function roastOpponentMove(oppMove, evalDropPawns, fen, weHaveMateInOne = false) {
    if (!oppMove || !oppMove.from || !oppMove.to) return null;

    const pName = PIECE_NAMES[oppMove.piece] || "Piece";
    const moveStr = `${pName} ${oppMove.from} → ${oppMove.to}`;
    const drop = parseFloat(evalDropPawns) || 0;
    const toRC = sqToRC(oppMove.to);

    if (weHaveMateInOne) {
      return {
        emoji: "😱",
        badgeText: "BLUNDERED FORCED MATE! 😂💀",
        text: `😱💀 ${moveStr} — HAHAHA! Dude really blundered forced MATE! Book him a ticket to the lobby!`
      };
    }

    if (drop >= 2.0) {
      const blunders = [
        `💀 ${moveStr} (-${drop.toFixed(1)}) — Firm blunder! Opponent gifted advantage in an equal position.`,
        `😂 ${moveStr} (-${drop.toFixed(1)}) — Classical boost from opponent, we punish!`,
        `🤡 ${moveStr} (-${drop.toFixed(1)}) — Collapsed their position with one move.`
      ];
      return {
        emoji: "💀",
        badgeText: `BLUNDER • -${drop.toFixed(1)}`,
        text: blunders[(toRC.r + toRC.c) % blunders.length]
      };
    }

    if (drop >= 0.75) {
      return {
        emoji: "😂",
        badgeText: `MISTAKE • -${drop.toFixed(1)}`,
        text: `😂 ${moveStr} (-${drop.toFixed(1)}) — Inaccurate move, we seize initiative!`
      };
    }

    if (oppMove.piece === "p" && (oppMove.to[0] === "a" || oppMove.to[0] === "h")) {
      return {
        emoji: "◈",
        badgeText: "PASSIVE ON THE EDGE",
        text: `◈ ${moveStr} — Wastes time on the edge of the board; we take the center.`
      };
    }

    return null;
  }

  return {
    explainMove,
    roastOpponentMove
  };
})();
