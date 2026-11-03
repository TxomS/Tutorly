import { useState } from 'react'

const ICON_PROPS = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, className: 'h-5 w-5' }

function EyeIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function EyeSlashIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

/** The key is hidden as dots until the teacher asks to see it (to check a paste, say). It is hidden again whenever this field is mounted afresh. */
export default function ApiKeyField({ value, onChange }) {
  const [isShown, setIsShown] = useState(false)

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="api-key" className="text-sm font-medium">
        Gemini API key
      </label>
      <div className="relative">
        <input
          id="api-key"
          type={isShown ? 'text' : 'password'}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Paste your key"
          // Letters like I and l, or 0 and O, are easier to tell apart in a fixed-width font.
          className={`w-full rounded-lg border border-slate-300 py-2 ps-3 pe-12 ${isShown ? 'font-mono' : ''}`}
        />
        <button
          type="button"
          onClick={() => setIsShown((shown) => !shown)}
          aria-label={isShown ? 'Hide API key' : 'Show API key'}
          title={isShown ? 'Hide API key' : 'Show API key'}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-lg text-slate-500 hover:text-slate-800 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500"
        >
          {isShown ? <EyeSlashIcon /> : <EyeIcon />}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Stays in this browser tab and is sent with each request. The server never stores it.{' '}
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline">
          Get a free key
        </a>
      </p>
    </div>
  )
}
