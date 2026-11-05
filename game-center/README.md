# Game Center

Samodzielna, statyczna aplikacja PWA do prowadzenia prywatnej biblioteki gier mobilnych. Projekt znajduje się w katalogu `game-center/` i nie wymaga zmian w plikach głównych repozytorium.

## Funkcje

- Gaming PRO UI, responsywny układ na telefon i komputer.
- Biblioteka startowa z Goodgame Empire.
- Otwieranie linków do Google Play w nowej karcie.
- Ręczne dodawanie gier z linkiem Google Play.
- Wyszukiwanie, filtrowanie i usuwanie własnych pozycji.
- Lokalny zapis biblioteki w `localStorage` (na danym urządzeniu i w danej przeglądarce).
- PWA: manifest, ikona i service worker z podstawowym cache offline.

## Publikacja na GitHub Pages

1. Otwórz repozytorium `marwlo-ops/Empire` → **Settings** → **Pages**.
2. W sekcji **Build and deployment** wybierz **Deploy from a branch**.
3. Wybierz gałąź `main` i folder `/(root)`, jeśli repozytorium ma publikować katalog główny.
4. Ponieważ Game Center jest podkatalogiem, po publikacji repozytorium otwórz:
   `https://marwlo-ops.github.io/Empire/game-center/`

Jeśli GitHub Pages nie jest jeszcze aktywne, trzeba włączyć je w ustawieniach repozytorium. Repozytorium może być prywatne; dostępność Pages zależy od planu i ustawień organizacji/konta.

## Dodawanie gier

W aplikacji wybierz **Dodaj grę**, podaj nazwę, pełny bezpieczny adres z `https://play.google.com/store/...` i kategorię. Linki spoza Google Play są odrzucane.

## Ważne ograniczenia

- Strona otwiera stronę aplikacji w Google Play; nie uruchamia plików APK ani gry wewnątrz przeglądarki.
- Instalacja/uruchomienie aplikacji zależy od Androida, dostępności gry i obsługi linków przez urządzenie.
- Biblioteka jest zapisywana lokalnie. Nie synchronizuje się automatycznie między urządzeniami.
- Katalog nie pobiera automatycznie danych z Google Play i nie wymaga kluczy API.
- Google Fonts są opcjonalnym zewnętrznym zasobem; bez nich strona użyje czcionek systemowych.

## Struktura

```
game-center/
├── index.html
├── manifest.webmanifest
├── sw.js
├── README.md
└── assets/
    ├── app.css
    ├── app.js
    └── icon.svg
```
