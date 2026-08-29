# Pecha Kyxa ll

A tiny web app for building and presenting [Pecha Kucha](https://en.wikipedia.org/wiki/PechaKucha)
decks — 20 slides, 20 seconds each. Editor, timed play mode, and portable
deck files that move between browsers.

Live: https://tkluysk.github.io/pecha-kyxa-ll/

## Deck files

Decks export/import as a `.pechakyxa.zip` archive (`deck.json` manifest plus a
`media/` folder). The format is documented in
[`public/deck-format.md`](public/deck-format.md), which is also served at
[`/pecha-kyxa-ll/deck-format.md`](https://tkluysk.github.io/pecha-kyxa-ll/deck-format.md)
so you can paste it into an LLM chat and ask it to build a deck for you. The
editor's **✨ Make a deck with an LLM** link opens an in-app copy of the prompt.

## Develop

```sh
npm install
npm run dev      # http://localhost:5173/pecha-kyxa-ll/
npm run build
npm run lint
```
