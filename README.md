# Pecha Kyxa ll

A tiny web app for building and presenting [Pecha Kucha](https://en.wikipedia.org/wiki/PechaKucha)
decks — 20 slides, 20 seconds each. Editor, timed play mode, and portable
deck files that move between browsers.

Live: https://tkluysk.github.io/pecha-kyxa-ll/

## Deck files

Decks export/import as a `.pechakyxa.zip` archive (`deck.json` manifest plus an
optional `media/` folder; media may also be referenced by URL). The format is
documented in [`public/deck-format.md`](public/deck-format.md), served at
[`/pecha-kyxa-ll/deck-format.md`](https://tkluysk.github.io/pecha-kyxa-ll/deck-format.md).

The editor's **✨ Make a deck with an LLM** link opens a panel that lets you
download that spec file and copy a short prompt. Attach the (unedited) spec to
an LLM chat, paste the prompt with your topic, and upload the `.pechakyxa.zip`
it returns.

## Develop

```sh
npm install
npm run dev      # http://localhost:5173/pecha-kyxa-ll/
npm run build
npm run lint
```
