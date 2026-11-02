/** What is happening or went wrong, in the spot just below the chat. */
export default function StatusNotice({ status, error, canAnswer, onRetry }) {
  if (status === 'grading') {
    return (
      <p className="text-sm text-slate-500" aria-live="polite">
        Checking your answer…
      </p>
    )
  }
  if (status === 'stopped') {
    return (
      <p className="text-sm text-slate-500" aria-live="polite">
        Stopped.{' '}
        <button type="button" onClick={onRetry} className="font-medium text-indigo-600 hover:underline">
          Continue the reply
        </button>
        {canAnswer && ' or type your answer.'}
      </p>
    )
  }
  if (status === 'failed') {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        <p>{error}</p>
        <button type="button" onClick={onRetry} className="font-medium underline">
          Try again
        </button>
      </div>
    )
  }
  return null
}
