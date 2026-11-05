# Decisions

## How I decided

Whenever a choice depended on how Gemini or Vercel behaves, I measured instead of guessing. Examples:

- The first model was picked by timing candidates, and a later check showed the timings mostly reflected Gemini's load (see Model).
- A language bug was reproduced and counted before it was fixed.
- I measured that the SDK does not retry a 429 or a 503 by itself before deciding how to handle them.
- When plans seemed slow, I measured the tokens and the "thinking" time before touching any setting. Nothing needed changing.
- A "Stop" claim I could not verify is listed as a weakness below instead of being stated as fact.

## Main choices and why

### Hosting: one Vercel project

Vite front end and Node functions in `/api` share one URL: no CORS, and no server that sleeps (Render's free tier does).
Vercel's docs list Hobby functions at up to 300 s including streamed responses, which is enough for a chat reply or a plan.
Vercel limits request bodies (about 4.5 MB), so files will be read in the browser and only the text sent. The free version
is enough for the assignment and I've personally used Vercel in the past so I was familiar with it.

### AI provider: Gemini through Google AI Studio

Free key, long context for big documents, can read page images (for scanned pages), supports JSON output and streaming.

Considered:

- **Groq** free tier: reported at about 8k tokens per minute, too small for long documents.
- **OpenRouter** free models: reported at about 50 requests a day until credits are bought, and the free list rotates.

### Model: `gemini-flash-lite-latest` (picked by measurement)

Timed on my free key with the same tutoring question each time:

| Model                                       | Result                                      |
| ------------------------------------------- | ------------------------------------------- |
| `gemini-flash-lite-latest`                  | first word 0.8 s, full reply 1.4 s          |
| `gemini-3.5-flash-lite`                     | first word 12.8 s                           |
| `gemini-3.1-flash-lite`                     | first word 27.5 s                           |
| `gemini-3.5-flash`                          | 503 "high demand"                           |
| `gemini-2.5-flash`, `gemini-2.5-flash-lite` | 404 "no longer available to new users"      |
| `gemini-flash-latest` (my first default)    | no word in 45 s; about 4 minutes in the app |

### Model fallback

Reviewers' keys may not have the same models as mine, and Gemini is sometimes out of capacity. So each call goes through a list:
the lite alias, `gemini-3.1-flash-lite`, `gemini-2.5-flash-lite`, then `gemini-flash-latest`.

- If every model fails, the teacher sees the last model's error.

### The lesson planner

- The teacher's request and the source go to Gemini in one call that must answer in JSON matching a schema
- The teacher's constraints ("7th graders, French, Socratic, 15 minutes") are read from their request in that same call.
  Defaults when missing: the language of the request itself, "general learners", "guided, step by step", 15 minutes.
- The browser cuts the source into passages (p1, p2...) of paragraph size. The model cites them with "view the source".

## Weaknesses I know about

- Stop may not cancel the Gemini call in production. I believe it still continues in Gemini but stops sending back the request.
- The grader is a model, so it can be wrong.
- The tutor can still give the answers away; it is much rarer now but not impossible.
- A redirect sometimes states the question instead of asking it.
- In a long lesson it can forget early details, though the plan and the current step are always sent.
- Free-tier limits and capacity.
- Speed varies a lot with Gemini's load. The same 15 minute plan took 3.1s in one run, and took over 20sin an run.
- Long documents are refused, not summarized. Over 300,000 characters gives an error.
- Scanned PDFs are not read. Depending on the scanned pdf it works or doesn't, it needs refining.
- Text that is read from a file is not shown as pages or sections, just as one block of text.
- A refresh loses the lesson.
- "Continue the reply" rewrites the message from the start, because the tutor cannot pick up half-way through; it is not a true resume.
- Stars can discourage as well as motivate. Sometimes it could be a bad thing when kids lose stars.
- The Match-up game might not make sense sometimes for example if the subject is math and instead of equations it gives subtraction,addition,multiplication as the match-up game.
- Any refresh losses all progress of the lesson.
- The number of steps for a lesson length depends on the prompt, not on code.

## If I had more than ~4 hours.

- I would continue to improve the AI's teaching methods. I think they are still rigid and don't make sense at times.
  A lot of times instead of teaching the material it simply asks the student a question they may not know the answer to
  I think it needs refining.
- I would create a more fun environment and make the lesson's more creative.
- I would allow Tutorly to take in photos and more scanned files. I think it lacks that for now and I would love if It worked more.
- I would put more color or pictures or atmosphere in the webapp to have a more rich and engaging experience for the students.

## How you know it works.

- I've set it up so in each step there is a few possible scenarios:
  Getting stuck:

1. First wrong answer: The AI gives the student a hint and a small nudge with an example.
2. Second wrong answer: The AI gives a second hint and narrows down the answer.
3. Third wrong answer: The AI reveals the answers and moves on to the next step.

- Correct answers: Congratulate the student and moves on.
- Partial answers: Counts as a fail but leads the student towards the full answer.
- Wrong (Explained above).
- Gave up: Same as wrong answer.
- Question: No change, answers briefly and asks again.
- Off Topic: No change, answers briefly and asks again.

With the help of Claude I asked it to create multiple different Unit Tests for many different scenarios to ensure everything I wanted
tested and working IS in fact working. I had it create tests for:

- The tutor's prompts for each move.
- Two hint's per step.
- Grader's request is checked.
- Lesson rules (3 attempts per step, questions are free)
- Match-up game: only asks about previous steps not future ones.
- The chat state.
- Reading files (.txt, .md, .pdf, and .docx)
