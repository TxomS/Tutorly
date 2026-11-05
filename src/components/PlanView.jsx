import { planReview } from '../lesson/review.js'
import Markdown from './Markdown.jsx'

export default function PlanView({ plan }) {
  const review = planReview(plan.steps)

  return (
    <section className="flex flex-col gap-4">
      <header dir="auto">
        <h2 className="text-xl font-semibold">{plan.title}</h2>
        <p className="text-sm text-slate-500">
          {plan.language} · {plan.audience} · {plan.style} · {plan.durationMinutes} min · {plan.steps.length} steps ·{' '}
          {plan.askFirst ? 'asks first' : 'explains first'}
        </p>
        {review && (
          <p className="mt-1 text-sm text-slate-500">
            Includes a match-up game after step {review.after}, on the key words of {review.after === 1 ? 'step 1' : `steps 1 to ${review.after}`}.
          </p>
        )}
      </header>
      <ol className="flex flex-col gap-3">
        {plan.steps.map((step, index) => (
          <li key={step.id} className="rounded-lg border border-slate-200 p-4">
            <h3 dir="auto" className="font-semibold">
              Step {index + 1}: {step.title}
            </h3>
            <Markdown>{step.goal}</Markdown>
            <ul className="my-2 list-disc ps-6 text-sm">
              {step.keyPoints.map((point) => (
                <li key={point}>
                  <Markdown>{point}</Markdown>
                </li>
              ))}
            </ul>
            <div className="text-sm">
              <span className="font-medium">Check question: </span>
              <Markdown>{step.checkQuestion}</Markdown>
            </div>
            <div className="mt-2 text-sm text-slate-500">
              <span className="font-medium">Hints if the student is stuck:</span>
              <ol className="list-decimal ps-6">
                {step.hints.map((hint) => (
                  <li key={hint} dir="auto">
                    {hint}
                  </li>
                ))}
              </ol>
            </div>
            {step.terms?.length > 0 && (
              <div className="mt-2 text-sm text-slate-500">
                <span className="font-medium">Key words:</span>
                <ul className="list-disc ps-6">
                  {step.terms.map(({ term, meaning }, index) => (
                    <li key={`${index}-${term}`} dir="auto">
                      <span className="font-medium">{term}</span>: {meaning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">Source passages: {step.sourceIds.join(', ')}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
