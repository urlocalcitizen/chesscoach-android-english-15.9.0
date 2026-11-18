window.ChessOpenings = {
  database: [
    {
      id: "italian",
      name: "Italian Game",
      moves: "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5",
      plan: "We control the center, aim at f7 and prepare the c3 + d4 advance."
    },
    {
      id: "spanish",
      name: "Spanish Game (Ruy Lopez)",
      moves: "e2e4 e7e5 g1f3 b8c6 f1b5",
      plan: "Pressure on knight c6, castle quickly and prepare seizure of the center."
    },
    {
      id: "scotch",
      name: "Scotch Game",
      moves: "e2e4 e7e5 g1f3 b8c6 d2d4",
      plan: "Now we open the center and open lines for bishops and queen."
    },
    {
      id: "petrov",
      name: "Russian Game (Defense Petroff)",
      moves: "e2e4 e7e5 g1f3 g8f6",
      plan: "Counterattack on pawn e4 and solid symmetric fight for center."
    },
    {
      id: "vienna",
      name: "Vienna game",
      moves: "e2e4 e7e5 b1c3",
      plan: "We reinforce e4 and prepare an active break on the kingside flank."
    },
    {
      id: "sicilian",
      name: "Sicilian Defense",
      moves: "e2e4 c7c5",
      plan: "Sharp fight: Black control d4 and prepare counterplay on the c-file."
    },
    {
      id: "sicilian_najdorf",
      name: "Sicilian: Variation OnNajdorf",
      moves: "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6",
      plan: "We take away b5 and prepare the counter strike e7-e5 or b7-b5."
    },
    {
      id: "sicilian_dragon",
      name: "Sicilian: Variation Dragonon",
      moves: "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 g7g6",
      plan: "Bishop Black with g7 aboutrakes long diagonal, game goes on counter courses."
    },
    {
      id: "sicilian_alapin",
      name: "Sicilian: Variation Alapinon",
      moves: "e2e4 c7c5 c2c3",
      plan: "White build powerful pawn center d2-d4, black counterattack through d5 or Nf6."
    },
    {
      id: "caro_kann",
      name: "Caro-Kann Defense",
      moves: "e2e4 c7c6 d2d4 d7d5",
      plan: "Reliable Black pawn triangle and free development of the light-squared bishop on c8."
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
      plan: "Immediate exchange of the central e4 pawn and rapid piece development."
    },
    {
      id: "queens_gambit",
      name: "Queen's Gambit",
      moves: "d2d4 d7d5 c2c4",
      plan: "Break pawns d5, seizure center and pressure by file «c»."
    },
    {
      id: "london",
      name: "London System",
      moves: "d2d4 d7d5 g1f3 g8f6 c1f4",
      plan: "Solid pyramidyes pawns d4-c3-e3, bishop on f4 and setup knight on outpost e5."
    },
    {
      id: "kings_indian",
      name: "King's Indian Defense",
      moves: "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7",
      plan: "Fianchetto bishop on g7, breakthrough e7-e5 and attack on kingside flank."
    },
    {
      id: "grunfeld",
      name: "Grünfeld Defense",
      moves: "d2d4 g8f6 c2c4 g7g6 b1c3 d7d5",
      plan: "Direct pieces underbreak white center bishop with g7 and move c7-c5."
    },
    {
      id: "nimzo_indian",
      name: "Nimzo-Indian Defense",
      moves: "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4",
      plan: "Pin knight c3 and fight for the key central square e4."
    },
    {
      id: "dutch",
      name: "Dutch Defense",
      moves: "d2d4 f7f5",
      plan: "Hard squeeze squares e4 and preparation attack on kingside flank."
    },
    {
      id: "english",
      name: "English Opening",
      moves: "c2c4",
      plan: "Flexible control center with flank and pressure on square d5."
    },
    {
      id: "evans",
      name: "🔥 Evans Gambit",
      moves: "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 b2b4",
      plan: "We sacrifice pawn b4 for instant seizure of the center moves c3 and d4."
    },
    {
      id: "fried_liver",
      name: "⚔ Attack Fried Liver (Fried Liver)",
      moves: "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5",
      plan: "Direct strike knight and bishop on square f7. Yes on king in the center."
    },
    {
      id: "morra",
      name: "⚡ Morra Gambit",
      moves: "e2e4 c7c5 d2d4 c5d4 c2c3",
      plan: "Sacrifice pawns in Sicilianor for fast development pieces and open lines «c» and «d»."
    },
    {
      id: "kings_gambit",
      name: "👑 King's Gambit",
      moves: "e2e4 e7e5 f2f4",
      plan: "We open file «f» for rook and seizure center pawn d4."
    },
    {
      id: "danish",
      name: "⚔ Northern (Yes) gambit",
      moves: "e2e4 e7e5 d2d4 e5d4 c2c3",
      plan: "We open lines for two bishop-snipers on c4 and b2, raking the kingside flank."
    },
    {
      id: "budapest",
      name: "⚡ Budapest gambit",
      moves: "d2d4 g8f6 c2c4 e7e5",
      plan: "Black sacrifices a central pawn for piece tempo and attack."
    },
    {
      id: "albin",
      name: "⚡ Countergambit Albinon",
      moves: "d2d4 d7d5 c2c4 e7e5",
      plan: "Break White center with the idea of pushing d4 and cramping their development."
    },
    {
      id: "alien",
      dubious: true,
      name: "👽 Alien gambit (Alien Gambit)",
      moves: "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 g8f6 e4g5 h7h6 g5f7",
      plan: "Bold sacrifice knight on f7! deprive Black's king of castling, lure it to the center and attack with all pieces (Bc4, Qh5, Nf3)."
    },
    {
      id: "alien_prep",
      dubious: true,
      name: "👽 Alien Gambit setup",
      moves: "e2e4 c7c6 d2d4 d7d5 b1c3 d5e4 c3e4 g8f6 e4g5",
      plan: "We provoke move h7-h6, to bloblow up the position with knight sacrifice Nxf7! If Black plays e6 — develop bishop to c4 and queen to e2."
    },
    {
      id: "halloween",
      dubious: true,
      name: "🎃 Gambit Halloween (Halloween Gambit)",
      moves: "e2e4 e7e5 g1f3 b8c6 b1c3 g8f6 f3e5",
      plan: "Shocking sacrifice of the target knight for a pawn! We push d2-d4 and e4-e5, driviving both knights Black on starting squares."
    },
    {
      id: "scandi_icbm",
      dubious: true,
      name: "🚀 Tennison Gambit (ICBM )",
      moves: "e2e4 d7d5 g1f3 d5e4 f3g5",
      plan: "We attack the e4 pawn: after Nf6 d3 exd3 Bxd3 prepare trap Bg6 winning the black queen on d8!"
    },
    {
      id: "tennison_nf3",
      dubious: true,
      name: "🚀 Tennison Gambit (through 1. Nf3)",
      moves: "g1f3 d7d5 e2e4",
      plan: "We sacrifice pawn for rapid seizure of squares g5 and c4 with focus on square f7."
    },
    {
      id: "nakhmanson",
      dubious: true,
      name: "💥 Gambit Nachmanson",
      moves: "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d4 e5d4 e1g1 f6e4 b1c3",
      plan: "Total tactical meat grinder: press still and knight on c3 for crushing opening lines «e» about king Black!"
    },
    {
      id: "stafford",
      dubious: true,
      name: "⚡ Gambit Staffordyes",
      moves: "e2e4 e7e5 g1f3 g8f6 f3e5 b8c6",
      plan: "Trap for Black: after Nxc6 dxc6 instantly we develop bishop on c5, queen on d4 and knight on g4 with mate threats."
    },
    {
      id: "traxler",
      dubious: true,
      name: "🔥 Counterattack Traxler",
      moves: "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 f8c5",
      plan: "We ignore strike on f7 and we ourselves sacrifice bishop Bxf2+, dragging white king under mate attack queen and knight!"
    },
    {
      id: "englund",
      dubious: true,
      name: "💣 Gambit Englundyes",
      moves: "d2d4 e7e5",
      plan: "Explosive reply against 1. d4: we sacrifice pawn, to seize initiative queen on e7 and bishop on b4."
    },
    {
      id: "blackburne",
      dubious: true,
      name: "🪤 Gambit Blackburne-Shilling",
      moves: "e2e4 e7e5 g1f3 b8c6 f1c4 c6d4",
      plan: "Cunning trap: if white greedily take Nxe5, should Qg5! with double attack on g2 and knight."
    }
  ],

  detect(uciMoveList) {
    if (!Array.isArray(uciMoveList) || uciMoveList.length === 0) {
      return {
        name: "Start of game",
        plan: "Occupy center pawns e4 or d4, develop light pieces and prepare castling.",
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
        plan: `Position matches ${futureMatches} opening branches. Don't name the variation until the opponent's defining move opponent.`,
        inBook: true
      };
    }

    return {
      name: "Middlegame • Active phase",
      plan: "Look for checks, captures and double attacks. Put rook on open lines.",
      inBook: false
    };
  }
};
