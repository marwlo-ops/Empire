# Game Center AI Bot — cloud service (etap 1)

Usługa przyjmuje polecenia z panelu Game Center, klasyfikuje je, zapisuje w PostgreSQL i udostępnia historię. To bezpieczny szkielet infrastruktury, a nie działający bot sterujący Goodgame Empire.

## Wdrożenie

1. Zaloguj się do Render i wybierz **New → Blueprint**.
2. Wskaż repozytorium `marwlo-ops/Empire` i zatwierdź `render.yaml`.
3. Render utworzy usługę Node oraz bazę PostgreSQL. Poczekaj na status **Live**.
4. W ustawieniach usługi skopiuj wartość `BOT_API_TOKEN` (nie publikuj jej).
5. Otwórz `https://marwlo-ops.github.io/Empire/game-center/bot.html`, wklej URL usługi i token. Zapisz połączenie.

## Endpointy

- `GET /api/health` — status usługi i adaptera.
- `POST /api/commands` — zapis polecenia.
- `GET /api/commands` — ostatnie 50 poleceń.

Każdy endpoint API wymaga nagłówka `Authorization: Bearer <BOT_API_TOKEN>`. CORS ograniczony do GitHub Pages.

## Status integracji z grą

Adapter Goodgame Empire pozostaje **niepodłączony**. Serwis nie przyjmuje haseł gry, ciasteczek sesji ani tokenów przeglądarki. Komendy dotyczące zbierania surowców i wysyłania wojsk są jawnie blokowane. Raporty ataków i wydarzeń trafiają do kolejki ze statusem `awaiting_connector`; nie są przedstawiane jako prawdziwe dane.

Przed implementacją adaptera należy potwierdzić dostępność oficjalnego, dozwolonego API lub innego interfejsu zatwierdzonego przez operatora gry. Nie należy odtwarzać prywatnych endpointów, omijać zabezpieczeń ani automatyzować klienta wbrew regulaminowi.

## Zmienne środowiskowe

- `BOT_API_TOKEN` — wymagany sekret dostępu.
- `DATABASE_URL` — wymagane połączenie PostgreSQL.
- `ALLOWED_ORIGIN` — domyślnie `https://marwlo-ops.github.io`.
- `PGSSL` — domyślnie SSL włączony.

Nie umieszczaj sekretów w repozytorium ani w plikach frontendu.