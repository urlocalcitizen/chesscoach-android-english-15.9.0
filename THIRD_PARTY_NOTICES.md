# Third-Party Notices

This project includes or depends on third-party software. Original copyright and license notices remain in effect.

## Stockfish.js 19.0.1

The following unmodified Stockfish.js `v19.0.1` release artifacts are bundled:

| Bundled file | Upstream artifact | SHA-256 |
| --- | --- | --- |
| `app/src/main/assets/lib/stockfish-local.js` | `stockfish-19-asm.js` | `c07dad9a00a89f4b1dcba3971d58d8078715556eac0212368e4aab510e1e27c9` |
| `app/src/main/assets/vendor/stockfish/stockfish-19-single.js` | `stockfish-19-single.js` | `8071dee87312f74805a859de933e1a1ef465579ab1a51fbd597388cdce9d444d` |
| `app/src/main/assets/vendor/stockfish/stockfish-19-single.wasm` | `stockfish-19-single.wasm` | `991bede2f253ebb08ff01fcc48270f4b9c8e66b12d5bd5f8d6f52eb3e3b3a740` |

Copyright notice from the bundled artifact:

```text
Stockfish.js 19 (c) 2026, Chess.com, LLC
Based on Stockfish (c) T. Romstad, M. Costalba, J. Kiiski,
G. Linscott and other contributors.
Nets by Chris Bao (sscg13).
```

License: GNU General Public License version 3 or later.

Source and build scripts:

- https://github.com/nmrugg/stockfish.js/tree/v19.0.1
- https://github.com/official-stockfish/Stockfish/tree/sf_19
- https://tests.stockfishchess.org/nns?network_name=nn-61e7af4bb97d

Release artifact:

- https://github.com/nmrugg/stockfish.js/releases/download/v19.0.1/stockfish-19-asm.js
- https://github.com/nmrugg/stockfish.js/releases/download/v19.0.1/stockfish-19-single.js
- https://github.com/nmrugg/stockfish.js/releases/download/v19.0.1/stockfish-19-single.wasm

The bundled files match those release artifacts exactly. The complete GPL text is in `LICENSE`, is packaged next to Stockfish as `app/src/main/assets/vendor/stockfish/COPYING.txt`, and is shipped beside CI artifacts. The Android application source needed to build the APK is this repository. Anyone distributing an APK or AAB must keep the complete corresponding source available under the GPL terms for the required period and by an allowed GPL section 6 method.

## AndroidX

The application uses AndroidX Core KTX, AppCompat, and WebKit. AndroidX is copyright The Android Open Source Project and is distributed under the Apache License 2.0.

- https://github.com/androidx/androidx
- Local license text: [`APACHE-2.0.txt`](APACHE-2.0.txt)

## Kotlin

The Kotlin Gradle plugin and Kotlin standard library are copyright JetBrains and contributors and are distributed under the Apache License 2.0.

- https://github.com/JetBrains/kotlin
- Local license text: [`APACHE-2.0.txt`](APACHE-2.0.txt)

## Gradle Wrapper

The repository includes the Gradle Wrapper JAR and scripts for Gradle 8.13. Gradle is copyright Gradle, Inc. and contributors and is distributed under the Apache License 2.0.

- https://github.com/gradle/gradle/tree/v8.13.0
- Local license text: [`APACHE-2.0.txt`](APACHE-2.0.txt)

## Project License

Except where a file or this notice says otherwise, ChessCoach Android is distributed under GNU GPL version 3 or later. See `LICENSE` for the complete terms. There is no warranty, to the extent permitted by law.
