import { useEffect } from 'react'

interface DeckFormatHelpProps {
  onClose: () => void
}

const SPEC_URL = `${import.meta.env.BASE_URL}deck-format.md`

const PROMPT_TEMPLATE = `Create a Pecha Kucha deck about <YOUR TOPIC> for use on the Pecha Kyxa ll site.

Pecha Kucha is visual-first. Each slide is one image or strong visual with
LITTLE OR NO TEXT on it — no bullet points, no sentences, at most a few words
(a title, a number, a label); many slides have zero text. The slide must NOT
repeat or paraphrase what the speaker says. The spoken narration lives ONLY in
each slide's "notes" (2-4 spoken-style sentences, ~20 seconds of talking).

Prefer referencing media by URL over bundling files: point a slide at a public
image URL (upload.wikimedia.org links are ideal) so the ZIP is just deck.json
with no media/ folder. A slide's visual can be an image, an animated GIF, or a
video — all equal options. Video plays muted and loops, so any clip must be
well under 20 seconds.

The deck file is a ZIP named <name>.pechakyxa.zip containing:
  - deck.json  (UTF-8 JSON manifest, described below)
  - media/<blobId>  (OPTIONAL — only for bundled files, not for URL media)

deck.json:
{
  "format": "pecha-kyxa-ii",
  "version": 2,
  "deck": {
    "id": "<unique string>",
    "name": "<deck title>",
    "createdAt": <epoch ms>,
    "updatedAt": <epoch ms>,
    "slides": [ /* EXACTLY 20 slide objects, in order */ ]
  }
}

Each slide:
{
  "id": "<unique string>",
  "notes": "<presenter notes, 2-4 spoken-style sentences>",
  "media": null,        // OR a media object (see below). null if unused.
  "embedUrl": null       // OR "https://..." to a page that allows iframe embedding (Wikipedia, youtube.com/embed/<id>, CodePen, etc.)
}

media object — set EXACTLY ONE of blobId / url:
  URL media (preferred):  { "kind": "image"|"gif"|"video", "url": "https://.../photo.jpg", "mimeType": "", "fileName": "photo.jpg" }
  bundled file:            { "kind": "image"|"gif"|"video", "blobId": "<unique string, also the media/ filename>", "mimeType": "<exact mime>", "fileName": "<original name>" }
  - url must link straight to the media file (.jpg/.png/.gif/.mp4/.webm), not to a page containing it.

Rules:
  - EXACTLY 20 slides, 20 seconds each (duration is fixed by the app).
  - Slides carry little/no text and never echo the narration; the script is in "notes" only.
  - A slide sets media OR embedUrl, never both. Both null = notes-only slide.
  - Each media object sets exactly one of blobId / url. URL media needs no media/ file.
  - Every media.blobId has a matching media/<blobId> file and vice versa.
  - Any video (bundled or URL) is well under 20 seconds.
  - mimeType must match the bytes for bundled files; it may be "" for URL media.

Output the finished .pechakyxa.zip for download. If you can't emit a binary zip,
output deck.json and give me the exact \`zip\` command to build it, then I'll
upload it via the site's "Upload deck" button.`

export function DeckFormatHelp({ onClose }: DeckFormatHelpProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function copyPrompt() {
    navigator.clipboard?.writeText(PROMPT_TEMPLATE)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose} title="Close">
          ✕
        </button>
        <h2>Make a deck with an LLM</h2>
        <p className="modal__lead">
          Ask ChatGPT, Claude, or any LLM chat to build a deck, then upload the
          resulting <code>.pechakyxa.zip</code> here with <strong>Upload deck</strong>.
        </p>
        <p className="modal__lead">
          Pecha Kucha is visual-first: each slide is one image or visual with
          little or no text, and the slide never repeats what the speaker says —
          the spoken script lives only in the per-slide presenter notes. Slides
          can point at a web image, GIF, or short video by URL (nothing to bundle).
          The prompt below tells the LLM all of this.
        </p>

        <ol className="modal__steps">
          <li>Copy the prompt below and paste it into your LLM chat.</li>
          <li>
            Replace <code>&lt;YOUR TOPIC&gt;</code> with what the deck is about.
          </li>
          <li>
            Download the <code>.pechakyxa.zip</code> it produces (or, if every
            slide uses a URL, just save the <code>deck.json</code> it prints and
            zip that one file).
          </li>
          <li>
            Back here, click <strong>Upload deck</strong> and choose that file.
          </li>
        </ol>

        <div className="modal__prompt-head">
          <span>Prompt template</span>
          <button className="btn" onClick={copyPrompt}>
            Copy prompt
          </button>
        </div>
        <pre className="modal__prompt">{PROMPT_TEMPLATE}</pre>

        <p className="modal__footnote">
          Full written spec (with a worked example):{' '}
          <a href={SPEC_URL} target="_blank" rel="noreferrer">
            deck-format.md ↗
          </a>
        </p>
      </div>
    </div>
  )
}
