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
    if (!m) return "Waiting for your move...";

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
        return `⚔ ${header} — Tactical underpromotion to Knight! Instead of queen we put a knight with a fork or mating threat.`;
      }
      if (m.promo === "q") {
        return `👑 ${header} — Aboutbring pawn in new Queen and we get decisive matematerial advantage!`;
      }
      if (m.isEnPassant) {
        return `⚡ ${header} — Capture en passant! We remove from the boardtpassed pawn opponent.`;
      }

      if (style === "mogging" || roflMode) {
        if (m.isTalSacrifice || m.isSacrifice) {
          return `⚡ ${header} — Sound tactical sacrifice! We open the king's cover with objective advantage.`;
        }
        if (m.isFork) {
          return `⚔ ${header} — Hard fork on two pieces! One will have to say goodbye.`;
        }
        if (m.isPin) {
          return `◈ ${header} — or pin ondead. Piece opponent paralyzed.`;
        }
        if (m.captured) {
          return `✦ ${header} — Taking ${capAcc} on ${m.to} and yes yes.`;
        }
        if (m.kicksEnemyPiece) {
          return `▲ ${header} — Kicking the enemy piece with a pawn and we take tempo.`;
        }
      }

      if (m.bookName) {
        return `◈ ${header} — ${m.bookName}.`;
      }
      if (m.savedHangingPiece) {
        return `🛡 ${header} — Saving piece or pawn from under a direct attack.`;
      }
      if (m.isTalSacrifice || m.isSacrifice) {
        return `⚡ ${header} — Calculated tactical sacrifice for breakthrough to the king.`;
      }
      if (m.isFork) {
        return `⚔ ${header} — Double attack (fork) immediately by two targets.`;
      }
      if (m.isPin) {
        return `◈ ${header} — We pin piece opponent by lines king or queen.`;
      }
      if (m.isCastling) {
        return `🛡 ${header} — Castling: hide king and we bring rook in play.`;
      }
      if (m.captured && m.givesCheck) {
        return `⚡ ${header} — Taking ${capAcc} on ${m.to} with check!`;
      }
      if (m.captured) {
        return `✦ ${header} — Winning ${capAcc} or making a favorable exchange on ${m.to}.`;
      }
      if (m.kicksEnemyPiece) {
        return `▲ ${header} — We drive piece enemy with loss of tempo.`;
      }
      if (m.givesCheck) {
        return `⚡ ${header} — Attacking check king with seizing the initiative.`;
      }
      if (motifs.isSeventhRankInvasion) {
        return `▲ ${header} — Breaking in in «7th rank» for pawns enemy.`;
      }
      if (motifs.isOpenFile || motifs.isSemiOpenFile) {
        return `◈ ${header} — We seize file «${m.to[0]}» heavy piece.`;
      }
      if (motifs.isBattery) {
        return `❖ ${header} — Building powerful battery on one line.`;
      }
      if (motifs.isOutpost) {
        return `✦ ${header} — Planting piece on powerful protected outpost ${m.to}.`;
      }
      if (motifs.isFianchetto) {
        return `◈ ${header} — Developing the bishop on long diagonal.`;
      }
      if (motifs.challengesEnemyPawn) {
        return `▲ ${header} — Undermining the pawn center opponent.`;
      }
      if (motifs.isPassedPawn) {
        return `▲ ${header} — Push passed pawn forward toward queens.`;
      }
      if (motifs.isDevelopment) {
        return `✦ ${header} — Quickly bringing the piece into play closer to the center.`;
      }
      if (m.piece === "p" && motifs.isCenterControl) {
        return `✦ ${header} — We seize center board and we open lines.`;
      }
      return `✦ ${header} — Strong positional move: we improve pieces and increase pressure.`;
    }

    if (category === "avg") {
      if (m.isTrap && m.trapChance >= 75) {
        return `🪤 ${header} — Sharp alternative trap (Chance errors enemy: ${m.trapChance}%).`;
      }
      if (m.promo === "q") {
        return `❖ ${header} — Promotion in Queen with remove in calm won endgame.`;
      }
      if (m.isEnPassant) {
        return `❖ ${header} — Capture pawns on passant with relieving center.`;
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
        return `✖ ${header} — DANGER STALSTALEMATE! Leaves opponent king without moves and gives a draw 1/2 in won position!`;
      }
      if (m.isRepetitionDrawRisk) {
        return `✖ ${header} — Repetition position! Leads to threefold repetition and loss of victory.`;
      }
      if (m.underDirectAttack) {
        return `✖ ${header} — Crude blunder! Hangs piece or pawn under play on ${m.to}.`;
      }
      if (m.ignoredHangingPiece) {
        return `✖ ${header} — Leaves your attacked piece without defense.`;
      }
      if (m.ruinedCastling) {
        return `✖ ${header} — deprives king castling in a safe center.`;
      }
      return `✖ ${header} — Weak move: loses time and gives away initiative.`;
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
        badgeText: "BLUNDER FORCED MATE! 😂💀",
        text: `😱💀 ${moveStr} — HAHAHA! Dude really blundered forced MATE! Book him a ticket to the lobby!`
      };
    }

    if (drop >= 2.0) {
      const blunders = [
        `💀 ${moveStr} (-${drop.toFixed(1)}) — Hard blunder! Opponent gifted advantage on equal place.`,
        `😂 ${moveStr} (-${drop.toFixed(1)}) — Classical gift from opponent, we punish!`,
        `🤡 ${moveStr} (-${drop.toFixed(1)}) — collapsed own position one move.`
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
        text: `😂 ${moveStr} (-${drop.toFixed(1)}) — No move, we seize initiative!`
      };
    }

    if (oppMove.piece === "p" && (oppMove.to[0] === "a" || oppMove.to[0] === "h")) {
      return {
        emoji: "◈",
        badgeText: "PASSIVE ON EDGE",
        text: `◈ ${moveStr} — Wastes time on edge board, we take center.`
      };
    }

    return null;
  }

  return {
    explainMove,
    roastOpponentMove
  };
})();
