import { useEffect, useMemo, useState } from 'react'

interface DeckFormatHelpProps {
  onClose: () => void
}

const SPEC_URL = `${import.meta.env.BASE_URL}deck-format.md`
const SPEC_ABS_URL =
  typeof window !== 'undefined' ? new URL(SPEC_URL, window.location.href).href : SPEC_URL

const SPEC_GIST = `In short: exactly 20 slides, 20 seconds each; each slide is one visual (an \
image / GIF / short-video URL, or an embedUrl) with little or no text on it; the \
spoken narration goes ONLY in each slide's "notes" (2-4 spoken-style sentences) \
and must never be printed on the slide. Prefer public media URLs \
(upload.wikimedia.org is ideal) so no files need bundling.`

function buildPrompt(topic: string, instructions: string): string {
  const t = topic.trim() || '[fill in a topic]'
  const lines = [
    'Build me a Pecha Kucha deck for the Pecha Kyxa ll site.',
    '',
    `Topic: ${t}`,
  ]
  const extra = instructions.trim()
  if (extra) {
    lines.push('', 'Style / instructions:', extra)
  }
  lines.push(
    '',
    `Follow the Pecha Kyxa ll deck-format spec at ${SPEC_ABS_URL} exactly`,
    '(also attached to this message if your chat supports file uploads).',
    SPEC_GIST,
    '',
    'Output the finished deck as a .pechakyxa.zip I can download and upload to',
    'the site. If you can’t emit a binary zip, output deck.json and the exact',
    '`zip` command to build it.',
  )
  return lines.join('\n')
}

export function DeckFormatHelp({ onClose }: DeckFormatHelpProps) {
  const [topic, setTopic] = useState('')
  const [instructions, setInstructions] = useState('')
  const [copied, setCopied] = useState(false)

  const prompt = useMemo(() => buildPrompt(topic, instructions), [topic, instructions])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(id)
  }, [copied])

  function copyPrompt() {
    navigator.clipboard?.writeText(prompt).then(
      () => setCopied(true),
      () => setCopied(false),
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose} title="Close">
          ✕
        </button>
        <h2>Make a deck with an LLM</h2>
        <p className="modal__lead">
          Fill in a topic, copy the prompt, and paste it into ChatGPT, Claude, or
          any LLM chat. Then upload the <code>.pechakyxa.zip</code> it returns with{' '}
          <strong>Upload deck</strong>.
        </p>

        <label className="field">
          <span>Topic</span>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. the history of the shipping container"
            autoFocus
          />
        </label>

        <label className="field">
          <span>Style / tone / instructions (optional)</span>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. wry and fast-paced; assume a general audience; lean on striking photos; end on a provocation"
            rows={3}
          />
        </label>

        <div className="modal__prompt-head">
          <span>Prompt to paste</span>
          <button className="btn btn--primary" onClick={copyPrompt}>
            {copied ? '✓ Copied' : 'Copy prompt'}
          </button>
        </div>
        <pre className="modal__prompt">{prompt}</pre>

        <p className="modal__footnote">
          The prompt links to the format spec. Some chats read the URL directly;
          otherwise{' '}
          <a href={SPEC_URL} download="deck-format.md">
            download deck-format.md
          </a>{' '}
          and attach it to the same message. (
          <a href={SPEC_URL} target="_blank" rel="noreferrer">
            view it ↗
          </a>
          )
        </p>
      </div>
    </div>
  )
}
