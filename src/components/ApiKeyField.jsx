export default function ApiKeyField({ value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="api-key" className="text-sm font-medium">
        Gemini API key
      </label>
      <input
        id="api-key"
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste your key"
        className="rounded-lg border border-slate-300 px-3 py-2"
      />
      <p className="text-xs text-slate-500">
        Stays in this browser tab and is sent with each request. The server never stores it.{' '}
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline">
          Get a free key
        </a>
      </p>
    </div>
  )
}
