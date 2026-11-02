import { useState } from 'react'

const STORAGE_KEY = 'tutorly.geminiKey'

// sessionStorage keeps the key across a refresh but drops it when the tab closes.
function readStoredKey() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState(readStoredKey)

  function setApiKey(value) {
    setApiKeyState(value)
    try {
      sessionStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Storage can be blocked (for example in some private windows); the key then lives in memory only.
    }
  }

  return [apiKey, setApiKey]
}
