# Pecha Kyxa ll — deck file format

> Note: the file `format` string inside `deck.json` is the literal
> `"pecha-kyxa-ii"` — that value is historical and must stay exactly as written,
> even though the app is now "Pecha Kyxa ll".

This is the reference spec for the `.pechakyxa.zip` deck file that the
[Pecha Kyxa ll](https://tkluysk.github.io/pecha-kyxa-ll/) web app imports and
exports.

**How to use it:** attach this whole file to your LLM chat unchanged, then send
a short prompt naming your topic (and any style/tone). The app's *Make a deck
with an LLM* panel gives you that prompt to copy. You do not need to edit this
file.

---

## What makes a good Pecha Kucha deck

Read this before generating content — it matters more than the JSON details.

- **Visual-first.** Each slide is one image or strong visual. The audience looks
  at the slide and listens to the speaker; the slide is not a teleprompter.
- **Little or no text on the slide.** No bullet lists, no sentences, no
  paragraphs. At most a few words — a title, a single number, a name, a label.
  Many slides have zero text.
- **The slide must not echo the narration.** Never place what the speaker says
  onto the slide. If a slide carries any words, they should add or anchor
  something the spoken narration doesn't state verbatim.
- **Narration goes in `notes` only.** Write `notes` as spoken-word sentences,
  roughly 20 seconds of talking per slide (about 2–4 sentences). That is the
  script; it is shown only to the presenter in play mode.
- **20 × 20.** Exactly 20 slides, each on screen for 20 seconds, auto-advancing.
  Pace the story so each slide's narration fits its 20 seconds.
- **A visual can be an image, GIF, or video — all equal options.** Usually it's
  an image (a photo, chart, diagram). GIF and video are fine when they fit;
  video plays muted and loops, so keep any clip **well under 20 seconds**. Any
  of these can be a web URL — you don't have to bundle the file; see
  "Referencing media by URL" below.

## What a deck file is

A `.pechakyxa.zip` file is an ordinary ZIP archive (store or deflate, both work)
containing:

```
deck.json            # required — the manifest + deck data
media/<blobId>       # optional — one raw media file per image/gif/video slide
media/<blobId>       #            filename is exactly the slide's blobId, no extension needed
```

- `deck.json` is UTF-8 JSON.
- Every file under `media/` must be referenced by some slide's `media.blobId`,
  and every slide with `media` must have a matching file under `media/`.
- Slides that use `embedUrl` (or have no visual at all) need no `media/` file.

## `deck.json` shape

```jsonc
{
  "format": "pecha-kyxa-ii",   // must be exactly this string
  "version": 2,                 // must be 2
  "deck": {
    "id": "<uuid>",             // any unique string
    "name": "My Deck Title",
    "createdAt": 1735689600000, // epoch milliseconds
    "updatedAt": 1735689600000, // epoch milliseconds
    "slides": [ /* exactly 20 Slide objects, in presentation order */ ]
  }
}
```

### Slide object

```jsonc
{
  "id": "<uuid>",              // any unique string
  "notes": "Presenter notes shown only to the presenter in play mode.",
  "media": null,               // OR a Media object (see below). null if unused.
  "embedUrl": null             // OR "https://..." to embed a live web page.
}
```

A slide's visual is one of, in priority order: `embedUrl` (a live embedded web
page), then `media` (an image / gif / video, either bundled in the zip **or**
referenced by URL), then nothing (a notes-only slide).

Rules for each slide:

- `media` and `embedUrl` are mutually exclusive. If `embedUrl` is set, `media`
  must be `null`, and vice versa. Both `null` is allowed (blank slide with just
  notes).
- `notes` is always a string (use `""` if empty).
- `embedUrl`, when set, must be a full `https://` URL to a page that allows being
  embedded in an iframe. Many big sites (Google, Twitter/X, most news sites) block
  embedding — prefer Wikipedia article URLs, `*.wikimedia.org`, YouTube
  `https://www.youtube.com/embed/<id>` URLs, CodePen, Observable, or your own
  pages.

### Media object

A media object is **either** bundled (`blobId` + a file under `media/`) **or**
referenced by URL (`url`). Set exactly one of `blobId` / `url`.

**Bundled file:**

```jsonc
{
  "kind": "image",             // "image" | "gif" | "video"
  "blobId": "slide-03",        // any unique string; also the filename under media/
  "mimeType": "image/png",     // MUST accurately match the bytes in media/<blobId>
  "fileName": "diagram.png"    // original filename, for display only
}
```

**Referenced by URL (no `media/` file needed):**

```jsonc
{
  "kind": "image",                                  // "image" | "gif" | "video"
  "url": "https://upload.wikimedia.org/…/photo.jpg",// direct link to the image/video file
  "mimeType": "",                                   // may be "" for URL media; the browser sniffs it
  "fileName": "photo.jpg"                           // display only; derive from the URL is fine
}
```

- `kind`: use `"gif"` for animated GIFs, `"image"` for other stills, `"video"`
  for video files. For URL media, infer it from the file extension.
- `blobId`: any unique string (e.g. `slide-03`, or a UUID). The file at
  `media/<blobId>` holds the raw bytes. No file extension required on the entry.
- `url`: a direct link to the media file itself (ending in `.jpg`, `.png`,
  `.gif`, `.mp4`, `.webm`, …), **not** a link to a web page that contains it.
  Wikimedia (`upload.wikimedia.org`), Wikipedia file URLs, and most CDN-hosted
  images work. The host must allow hotlinking and serve over HTTPS.
- `mimeType`: authoritative for bundled files (`image/png`, `image/jpeg`,
  `image/gif`, `video/mp4`, `video/webm`, …). For URL media it can be `""`.
- **Video** (bundled or URL) plays muted and loops, so keep clips short — well
  under the slide's 20 seconds.

## Referencing media by URL

The easiest way for an LLM to build a rich deck is to skip bundled files
entirely and give every visual slide a `media` object with a `url` (or an
`embedUrl`). Then the zip is just `deck.json` — no `media/` folder.

- Prefer direct image URLs from `upload.wikimedia.org` and Wikimedia Commons —
  they're stable, hotlink-friendly, and cover most topics.
- Use `embedUrl` for live pages (Wikipedia articles, `youtube.com/embed/<id>`,
  CodePen); use `media.url` for a single image, GIF, or short video file.
- If a URL might rot or block hotlinking, fall back to a bundled file.

## Constraints checklist

- [ ] `deck.slides` has **exactly 20** entries.
- [ ] Each slide runs 20 seconds (this is fixed by the app; nothing to set).
- [ ] Every slide has `id`, `notes`, `media`, `embedUrl` keys.
- [ ] No slide sets both `media` and `embedUrl`.
- [ ] Each `media` object sets **exactly one** of `blobId` / `url`.
- [ ] Every `media.blobId` has a matching `media/<blobId>` file, and vice versa.
- [ ] `media.url` slides need no `media/` file.
- [ ] Any video is well under 20 seconds (it plays muted and loops).
- [ ] `format` is `"pecha-kyxa-ii"` and `version` is `2`.

## Minimal example (3 slides shown; a real deck needs 20)

`deck.json`:

```json
{
  "format": "pecha-kyxa-ii",
  "version": 2,
  "deck": {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Tiny Example",
    "createdAt": 1735689600000,
    "updatedAt": 1735689600000,
    "slides": [
      {
        "id": "slide-1",
        "notes": "Open on the subject in one breath. The slide is just the face; you carry the words.",
        "media": {
          "kind": "image",
          "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/PechaKucha_Night_Tokyo.jpg/1280px-PechaKucha_Night_Tokyo.jpg",
          "mimeType": "",
          "fileName": "pechakucha-night.jpg"
        },
        "embedUrl": null
      },
      {
        "id": "slide-2",
        "notes": "Talk through the history while the article sits behind you — do not read it aloud.",
        "media": null,
        "embedUrl": "https://en.wikipedia.org/wiki/PechaKucha"
      },
      {
        "id": "slide-3",
        "notes": "A bundled cover image, for when you have your own artwork rather than a URL.",
        "media": {
          "kind": "image",
          "blobId": "cover",
          "mimeType": "image/png",
          "fileName": "cover.png"
        },
        "embedUrl": null
      }
    ]
  }
}
```

Archive layout for the above:

```
deck.json
media/cover        # raw PNG bytes for slide-3 (no .png extension needed)
```

If every visual slide uses `media.url` or `embedUrl`, there is **no** `media/`
folder and the archive is just `deck.json`.

## Building the zip by hand

If your LLM gives you `deck.json` and any media files:

```sh
mkdir -p mydeck/media
# put deck.json in mydeck/
# put each media file in mydeck/media/ named exactly as its blobId (no extension)
cd mydeck
zip -r ../my-deck.pechakyxa.zip deck.json media/
```

Then open the site, click **Upload deck**, and choose `my-deck.pechakyxa.zip`.

> Tip: an all-`embedUrl` / notes-only deck needs **no** `media/` folder at all —
> just `zip my-deck.pechakyxa.zip deck.json`.
