import { useState } from 'react'
import { Editor } from './components/Editor'
import { PlayMode } from './components/PlayMode'
import { useDeck } from './storage/useDeck'
import type { Deck } from './types'
import './App.css'

function App() {
  const { deck, loaded, updateDeck } = useDeck()
  const [mode, setMode] = useState<'edit' | 'play'>('edit')

  if (!loaded || !deck) {
    return <div className="app-loading">Loading Pecha Kyxa II…</div>
  }

  function handleImportDeck(imported: Deck) {
    updateDeck(() => imported)
  }

  return (
    <div className="app">
      {mode === 'edit' ? (
        <Editor
          deck={deck}
          updateDeck={updateDeck}
          onPlay={() => setMode('play')}
          onImportDeck={handleImportDeck}
        />
      ) : (
        <PlayMode deck={deck} onExit={() => setMode('edit')} />
      )}
    </div>
  )
}

export default App
