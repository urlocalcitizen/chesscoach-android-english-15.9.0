# ChessCoach Android

Android-приложение для работы с Lichess и Chess.com со встроенным шахматным движком Stockfish. Открывайте шахматные площадки в приложении и используйте анализ позиций для обучения и разбора партий.

**Версия:** `15.9.0-Mobile` · **Требования:** Android 8.0 или новее.

## Возможности

- Поддержка [Lichess](https://lichess.org) и [Chess.com](https://www.chess.com) внутри приложения.
- Анализ шахматных позиций с помощью встроенного Stockfish 19.
- Автоматическая адаптация параметров движка к возможностям телефона.
- Локальное сохранение настроек на устройстве.

## Установка

1. [Скачайте APK ChessCoach 15.9.0-Mobile](ChessCoach-15.9.0-Mobile.apk?raw=true) на Android-устройство.
2. Откройте файл и, если Android попросит, разрешите установку приложений из этого источника.
3. Установите приложение, откройте его и выберите шахматную площадку.

Для доступа к Lichess и Chess.com требуется интернет. Движок уже включён в APK, отдельно скачивать его не нужно.

Тестовые сборки также доступны в [GitHub Actions](https://github.com/zizazle/chesscoach-android/actions/workflows/build-apk.yml): откройте успешный запуск `Android CI`, скачайте артефакт с окончанием `-debug-apk` и извлеките APK из ZIP-архива.

## Честная игра

Используйте анализ для обучения, разбора завершённых партий и в режимах, где помощь движка разрешена правилами площадки. Использование подсказок в партиях против других игроков нарушает правила честной игры Lichess и Chess.com и может привести к блокировке аккаунта.

## Сборка из исходников

Для разработчиков: необходимы JDK 17, Android SDK Platform 36 и Build Tools 36.0.0. Можно открыть проект в Android Studio или собрать его через Gradle Wrapper.

```bash
git clone https://github.com/zizazle/chesscoach-android.git
cd chesscoach-android
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

Готовый тестовый APK: `app/build/outputs/apk/debug/app-debug.apk`.

Если Gradle не находит Android SDK, укажите путь к нему в локальном файле `local.properties`, например для Windows:

```properties
sdk.dir=C\:\\Users\\you\\AppData\\Local\\Android\\Sdk
```

## Обратная связь

Об ошибках и предложениях можно сообщить в [Issues](https://github.com/zizazle/chesscoach-android/issues). Для отчёта об ошибке укажите версию приложения, версию Android и шаги воспроизведения.

## Лицензия

Проект распространяется по **GNU GPL v3 или более поздней версии**. Полный текст лицензии находится в [LICENSE](LICENSE), сведения о Stockfish.js и других сторонних компонентах, включая ссылки на их исходный код, в [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). При распространении готовых сборок необходимо соблюдать условия GPL и предоставлять соответствующий исходный код приложения и Stockfish.js.

ChessCoach Android не является официальным приложением Lichess или Chess.com и не связан с этими площадками. Названия и товарные знаки принадлежат их владельцам.
