/** Says that a file is being read, or why it could not be. Nothing is shown otherwise. */
export default function FileReadStatus({ file: { status, name, message } }) {
  if (status === 'failed') {
    return (
      <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {message}
      </p>
    )
  }
  if (status === 'reading') {
    return (
      <p aria-live="polite" className="text-sm text-slate-500">
        Reading {name}…
      </p>
    )
  }
  return null
}
