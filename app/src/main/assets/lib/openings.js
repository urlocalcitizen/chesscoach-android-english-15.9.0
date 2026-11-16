window.ChessOpenings = {
  database: [
    {
      id: "italian",
      name: "Italian game",
      moves: "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5",
      plan: "We control center, aim к f7 и prepare advance c3 + d4."
    },
    {
      id: "spanish",
      name: "Spanish game (Ruy Lopez)",
      moves: "e2e4 e7e5 g1f3 b8c6 f1b5",
      plan: "Pressure on knight c6, quickly castle и prepare seizure of center."
    },
    {
      id: "scotch",
      name: "Scotch game",
      moves: "e2e4 e7e5 g1f3 b8c6 d2d4",
      plan: "Immediately open center and open lines for bishops and queen."
    },
    {
      id: "petrov",
      name: "Russian game (Petroff Defense)",
      moves: "e2e4 e7e5 g1f3 g8f6",
      plan: "Counterattack on the e4 pawn and solid symmetrical fight for the center."
    },
    {
      id: "vienna",
      name: "Vienna game",
      moves: "e2e4 e7e5 b1c3",
      plan: "We reinforce e4 и prepare active break on kingside flank."
    },
    {
      id: "sicilian",
      name: "Sicilian defense",
      moves: "e2e4 c7c5",
      plan: "Sharp fight: black control the square d4 и prepare counterplay on line «c»."
    },
    {
      id: "sicilian_najdorf",
      name: "Sicilian: Najdorf Variation",
      moves: "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6",
      plan: "We take away square b5 и prepare counter strike e7-e5 or b7-b5."
    },
    {
      id: "sicilian_dragon",
      name: "Sicilian: Dragon Variation",
      moves: "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 g7g6",
      plan: "Bishop black s g7 rakes long diagonal, play goes on counter courses."
    },
    {
      id: "sicilian_alapin",
      name: "Sicilian: Alapin Variation",
      moves: "e2e4 c7c5 c2c3",
      plan: "White build powerful pawn center d2-d4, black counterattack via d5 or Nf6."
    },
    {
      id: "caro_kann",
      name: "Caro-Kann Defense",
      moves: "e2e4 c7c6 d2d4 d7d5",
      plan: "Reliable pawn triangle black и free develop light-squared bishop c8."
    },
    {
      id: "french",
      name: "French Defense",
      moves: "e2e4 e7e6 d2d4 d7d5",
      plan: "Solid Black chain with obligatory center break c7-c5."
    },
    {
      id: "scandinavian",
      name: "Scandinavian Defense",
      moves: "e2e4 d7d5 e4d5",
      plan: "Immediate exchange of central e4 pawn and rapid piece development."
    },
    {
      id: "queens_gambit",
      name: "Queen's Gambit",
      moves: "d2d4 d7d5 c2c4",
      plan: "Undermine d5 pawn, seize the center and pressure the c-file."
    },
    {
      id: "london",
      name: "London System",
      moves: "d2d4 d7d5 g1f3 g8f6 c1f4",
      plan: "Solid pawn pyramid d4-c3-e3, bishop on f4 and knight on e5 outpost."
    },
    {
      id: "kings_indian",
      name: "King's Indian Defense",
      moves: "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7",
      plan: "Fianchetto bishop on g7, break e7-e5 and kingside attack."
    },
    {
      id: "grunfeld",
      name: "Grünfeld Defense",
      moves: "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5",
      plan: "Direct piece pressure on White's center with g7 bishop and c7-c5."
    },
    {
      id: "nimzo_indian",
      name: "Nimzo-Indian Defense",
      moves: "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4",
      plan: "Pin on c3 knight and fight for key central square e4."
    },
    {
      id: "dutch",
      name: "Dutch Defense",
      moves: "d2d4 f7f5",
      plan: "Firm grip on e4 and prepare kingside attack."
    },
    {
      id: "english",
      name: "English Opening",
      moves: "c2c4",
      plan: "Flexible flank control of center and pressure on d5."
    },
    {
      id: "evans",
      name: "🔥 Evans Gambit",
      moves: "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 b2b4",
      plan: "Sacrifice b4 pawn for instant center seizure with c3 and d4."
    },
    {
      id: "fried_liver",
      name: "⚔ Fried Liver Attack",
      moves: "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5",
      plan: "Direct knight and bishop strike on f7. Pressure the king in the center."
    },
    {
      id: "morra",
      name: "⚡ Morra Gambit",
      moves: "e2e4 c7c5 d2d4 c5d4 c2c3",
      plan: "Pawn sacrifice in the Sicilian for rapid development and open c- and d-files."
    },
    {
      id: "kings_gambit",
      name: "👑 King's Gambit",
      moves: "e2e4 e7e5 f2f4",
      plan: "Open the f-file for the rook and seize the center with d4."
    },
    {
      id: "danish",
      name: "⚔ Danish Gambit",
      moves: "e2e4 e7e5 d2d4 e5d4 c2c3",
      plan: "Give up pawns for two sniper bishops on c4 and b2 raking the kingside."
    },
    {
      id: "budapest",
      name: "⚡ Budapest Gambit",
      moves: "d2d4 g8f6 c2c4 e7e5",
      plan: "Black sacrifices a central pawn for a tempo piece attack."
    },
    {
      id: "albin",
      name: "⚡ Albin Countergambit",
      moves: "d2d4 d7d5 c2c4 e7e5",
      plan: "Undermine White's center aiming to push d4 and cramp development."
    },
    {
      id: "alien",
      dubious: true,
      name: "👽 Alien Gambit",
      moves: "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 g8f6 e4g5 h7h6 g5f7",
      plan: "Bold knight sacrifice on f7! Deprive Black's king of castling, lure it в center и attack all pieces (Bc4, Qh5, Nf3)."
    },
    {
      id: "alien_prep",
      dubious: true,
      name: "👽 Preparing the Alien Gambit",
      moves: "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 g8f6 e4g5",
      plan: "We provoke move h7-h6, to blow up position with a sacrifice of knight Nxf7! If black play e6 — we develop bishop to c4 and queen to e2."
    },
    {
      id: "halloween",
      dubious: true,
      name: "🎃 Halloween Gambit",
      moves: "e2e4 e7e5 g1f3 b8c6 b1c3 g8f6 f3e5",
      plan: "Shocking sacrifice of a whole knight for a pawn! Push d2-d4 and e4-e5, driving both Black knights back."
    },
    {
      id: "scandi_icbm",
      dubious: true,
      name: "🚀 Tennison Gambit (ICBM Rocket)",
      moves: "e2e4 d7d5 g1f3 d5e4 f3g5",
      plan: "Attack e4: after Nf6 d3 exd3 Bxd3 prepare Bg6 trap winning Black queen on d8!"
    },
    {
      id: "tennison_nf3",
      dubious: true,
      name: "🚀 Tennison Gambit (via 1. Nf3)",
      moves: "g1f3 d7d5 e2e4",
      plan: "Sacrifice a pawn for rapid seizure of g5 and c4 aiming at f7."
    },
    {
      id: "nakhmanson",
      dubious: true,
      name: "💥 Nachmanson Gambit",
      moves: "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d4 e5d4 e1g1 f6e4 b1c3",
      plan: "Total tactical meat grinder: give the c3 knight too for crushing open e-file against Black king!"
    },
    {
      id: "stafford",
      dubious: true,
      name: "⚡ Stafford Gambit",
      moves: "e2e4 e7e5 g1f3 g8f6 f3e5 b8c6",
      plan: "Trap for Black: after Nxc6 dxc6 immediately develop bishop to c5, queen to d4 and knight to g4 with mating threats."
    },
    {
      id: "traxler",
      dubious: true,
      name: "🔥 Traxler Counterattack",
      moves: "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 f8c5",
      plan: "Ignore the hit on f7 and sacrifice bishop Bxf2+, dragging White king under mating attack with queen and knight!"
    },
    {
      id: "englund",
      dubious: true,
      name: "💣 Gambit Englund",
      moves: "d2d4 e7e5",
      plan: "Explosive reply against 1. d4: we sacrifice pawn, to seize initiative with queen on e7 and bishop on b4."
    },
    {
      id: "blackburne",
      dubious: true,
      name: "🪤 Blackburne-Shilling Gambit",
      moves: "e2e4 e7e5 g1f3 b8c6 f1c4 c6d4",
      plan: "Cunning trap: if white greedily capture Nxe5, should Qg5! s double attack on g2 и knight."
    }
  ],

  detect(uciMoveList) {
    if (!Array.isArray(uciMoveList) || uciMoveList.length === 0) {
      return {
        name: "Start game",
        plan: "Occupy the center with pawns e4 or d4, develop light pieces and prepare castling.",
        inBook: true
      };
    }

    const historyStr = uciMoveList.join(" ");
    let exactMatch = null;
    let futureMatches = 0;
    let bestPastMatch = null;
    let maxPastLen = 0;

    for (const item of this.database) {
      if (item.moves === historyStr) {
        exactMatch = item;
      } else if (item.moves.startsWith(historyStr + " ")) {
        futureMatches++;
      } else if (historyStr.startsWith(item.moves + " ") && item.moves.length > maxPastLen) {
        maxPastLen = item.moves.length;
        bestPastMatch = item;
      }
    }

    if (exactMatch) {
      return {
        name: exactMatch.name,
        plan: exactMatch.plan,
        inBook: true
      };
    }
    if (bestPastMatch) {
      return {
        name: bestPastMatch.name,
        plan: bestPastMatch.plan,
        inBook: false
      };
    }
    if (futureMatches > 0) {
      return {
        name: "Opening preparation",
        plan: `Position matches s ${futureMatches} opening branches. Don't name the variation until the defining move opponent.`,
        inBook: true
      };
    }

    return {
      name: "Middlegame • Active phase",
      plan: "Look for checks, captures and double attacks. Put the rook on open files.",
      inBook: false
    };
  }
};
