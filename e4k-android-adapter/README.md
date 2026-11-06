# E4K Map Adapter (Android)

Companion app for **user-initiated, screenshot-based** capture of visible E4K map information. It does not log in to the game, inspect private app memory, intercept traffic, automate taps, or bypass protections.

## Current MVP flow
1. In E4K, the user takes a screenshot and shares it to **E4K Map Adapter**.
2. OCR runs locally on the Android device (Google ML Kit Text Recognition).
3. The app proposes a region, NPC type, coordinates and level from visible text.
4. The user reviews/edits every field and explicitly confirms the import.
5. The app sends only the confirmed structured NPC record to the user's Game Center API over HTTPS using a bearer token entered for that session.

Screenshots and OCR text are not uploaded. The app does not retain the API token between launches.

## Supported regions
- `glacier` — Lodowe Rubieże
- `sands` — Płonące Piaski
- `fire_peaks` — Ogniste Szczyty

## Build
Open this directory in Android Studio (JDK 17, Android SDK 35), allow Gradle sync, then run on an Android device. Share a screenshot from E4K/Gallery and choose E4K Map Adapter.

## Limitations / next step
This MVP imports only information visibly present in a screenshot and confirmed by the user. It is **not** a background map crawler and does not claim to discover unseen NPCs. Automatic server-side map synchronization requires a documented, game-authorized data interface from the game operator. Do not enter game-account credentials here.
