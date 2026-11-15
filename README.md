# ChessCoach Android

Android-оболочка ChessCoach для Lichess и Chess.com. Debug APK автоматически проверяется и собирается в GitHub Actions после каждого push. Signed release APK и AAB собираются только по тегу и только при наличии полного набора signing secrets.

## Toolchain

| Компонент | Версия |
| --- | --- |
| Android Gradle Plugin | 8.12.2 |
| Gradle Wrapper | 8.13 |
| Kotlin | 2.1.21 |
| Java | JDK 17 |
| compileSdk / targetSdk | 36 / 36 |
| minSdk | 26 |
| AndroidX Core KTX | 1.18.0 |
| AndroidX AppCompat | 1.8.0 |
| AndroidX WebKit | 1.18.0 |

Версия приложения: `15.8.1-Mobile` (`versionCode 1581`). Wrapper проверяет официальный SHA-256 Gradle distribution до запуска.

## Runtime и профили телефона

- WebView сайта принимает только exact HTTPS origins `lichess.org` и `www.chess.com`.
- Background, offscreen и Stockfish выполняются в отдельном app-owned WebView на `appassets.androidplatform.net`.
- Native API передаётся через origin-checked WebMessage JSON protocol; глобальный `addJavascriptInterface` не используется.
- Storage сохраняется атомарно через `AtomicFile`; backup и device transfer для app data запрещены.
- LOW профиль использует Lite/16 MiB и уменьшенные budgets, BALANCED — Lite/32 MiB, HIGH — full NNUE/64 MiB. Класс выбирается по RAM, heap, CPU, ABI, power-save и thermal status; точная модель остаётся только в локальном engine profile.
- При background/pause поиски и pending requests отменяются; renderer восстанавливается с ограниченным числом попыток и Lite fallback.

Full Stockfish WASM занимает около 99 MiB, поэтому debug APK имеет размер около 100 MiB. Неподтверждённые портреты, произвольные user scripts, file import/export и custom wallpaper upload в защищённой Android-сборке отключены.

## Clone и локальная сборка

Требуются JDK 17 и Android SDK Platform 36 с Build Tools 36.0.0.

```bash
git clone <URL_РЕПОЗИТОРИЯ>
cd ChessCoach-Android
```

Linux/macOS:

```bash
chmod +x gradlew
./gradlew lintDebug testDebugUnitTest assembleDebug
```

Windows PowerShell:

```powershell
.\gradlew.bat lintDebug testDebugUnitTest assembleDebug
```

Готовый installable debug APK находится в `app/build/outputs/apk/debug/app-debug.apk`. Это APK с автоматически созданным debug certificate; он предназначен для тестирования, а не для публикации.

Если SDK не определяется через `ANDROID_HOME` или `ANDROID_SDK_ROOT`, создайте локальный `local.properties`:

```properties
sdk.dir=C\:\\Users\\you\\AppData\\Local\\Android\\Sdk
```

`local.properties`, SDK, build-каталоги и keystore-файлы исключены из Git.

## Загрузка существующей папки в GitHub

Создайте пустой GitHub repository без автоматически добавленных README или LICENSE, затем выполните из этой папки:

```bash
git init
git add .
git commit -m "Initial Android source"
git branch -M main
git remote add origin https://github.com/<OWNER>/<REPOSITORY>.git
git push -u origin main
```

После push откройте `Actions` -> `Android CI`. Job `Lint, test, and build debug APK` выполняет Wrapper validation, `lintDebug`, `testDebugUnitTest` и `assembleDebug`. Установочный APK, файл `.sha256`, GPL/Apache license texts и third-party notice доступны в artifact с именем `ChessCoach-15.8.1-Mobile-<SHA>-debug-apk`.

Workflow использует `ubuntu-24.04`, JDK 17, Android SDK 36 и Actions, закреплённые по immutable commit SHA. Права `GITHUB_TOKEN` ограничены `contents: read` только для jobs, которым нужен checkout; Gradle cache включён.

## Signed release по тегу

Release никогда не подписывается debug key. Добавьте в `Settings` -> `Secrets and variables` -> `Actions` следующие repository secrets:

| Secret | Содержимое |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Keystore целиком в Base64 без переносов |
| `STORE_PASSWORD` | Пароль keystore |
| `KEY_ALIAS` | Alias release-ключа |
| `KEY_PASSWORD` | Пароль release-ключа |

Linux:

```bash
base64 -w 0 release.keystore
```

Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore"))
```

Запустите release push тегом:

```bash
git tag v15.8.1-Mobile
git push origin v15.8.1-Mobile
```

При наличии всех четырёх secrets workflow сначала требует успешный debug quality gate, затем собирает R8-minified signed APK и AAB, проверяет подписи и публикует их вместе с `SHA256SUMS.txt`, GPL/Apache license texts и third-party notice. Если хотя бы одного secret нет, signed release job пропускается; независимый debug job продолжает работать.

## Dependency locks

Gradle dependency locking включён для всех проектов. После намеренного изменения зависимостей обновите lock state и повторите CI-команды:

```bash
./gradlew :app:dependencies --write-locks
./gradlew lintDebug testDebugUnitTest assembleDebug
```

## Лицензия и исходный код

Проект распространяется по GNU GPL v3 или более поздней версии; полный текст находится в [LICENSE](LICENSE). Bundled Stockfish.js является GPL-компонентом, поэтому при распространении APK необходимо одновременно сохранять доступ к соответствующему исходному коду этой версии приложения и Stockfish.js. Точные версии, checksums, copyright и ссылки на upstream source перечислены в [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Lichess и Chess.com являются товарными знаками соответствующих владельцев. Этот репозиторий не заявляет об их одобрении или аффилированности.
