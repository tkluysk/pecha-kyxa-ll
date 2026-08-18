import { useCallback, useEffect, useRef, useState } from 'react'
import { getAllDecks, putDeck } from './db'
import { createEmptyDeck, type Deck } from '../types'

export function useDeck() {
  const [deck, setDeck] = useState<Deck | null>(null)
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef<number | null>(null)
  const initStarted = useRef(false)

  useEffect(() => {
    if (initStarted.current) return
    initStarted.current = true
    getAllDecks<Deck>().then((decks) => {
      if (decks.length > 0) {
        setDeck(decks.sort((a, b) => b.updatedAt - a.updatedAt)[0])
      } else {
        setDeck(createEmptyDeck('Pecha Kyxa II'))
      }
      setLoaded(true)
    })
  }, [])

  const updateDeck = useCallback((updater: (prev: Deck) => Deck) => {
    setDeck((prev) => {
      if (!prev) return prev
      const next = updater(prev)
      next.updatedAt = Date.now()
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        putDeck(next)
      }, 300)
      return next
    })
  }, [])

  return { deck, loaded, updateDeck }
}
