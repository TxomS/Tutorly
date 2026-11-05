# Tutorly

Upload a file, write a teaching prompt, and chat with an AI tutor that teaches the file's content step by step.

Built with React, Vite and Tailwind on the front end, Node functions on Vercel on the back end, and Google Gemini as the AI.

**Live app:** https://tutorly-bice.vercel.app

## Use it

1. **Paste your Gemini API key** Get a free one at (https://aistudio.google.com/apikey).
   It stays in your browser tab and is sent with each request. The server never stores or logs it.
2. **Describe the lesson**, for example: "Teach this to 7th graders. Be Socratic. Keep it under 15 minutes."
3. **Add the material:** choose or drop a `.txt`, `.md`, `.pdf` or `.docx` file (up to 10 MB), or paste text.
   Try the files in [`samples/`](samples), for example `photosynthesis-en.pdf`.
4. **Create lesson plan**, edit the material to your liking and hit **Create lesson plan**.
5. **Learn** Answer the tutor's questions in the chat. You can press **Stop** while it writes,
   open **View source** on a message to see the passage it came from, and watch the progress bar and stars.
   Halfway through there is a short match-up game (the yellow bar marks where).

## Run it locally

You need Node.js 22 or newer and the [Vercel CLI](https://vercel.com/docs/cli) (`npm install -g vercel`).

```bash
npm install
vercel dev
```

```bash
npm test        # unit tests (Node's built-in test runner)
npm run lint    # oxlint
npm run build   # production build
```

## Where things are

- `src/components/` the screens (React components).
- `src/lesson/` the lesson state and rules: plan, progress, stars, match-up and the chat.
- `src/api/` the browser's calls to the back end.
- `server/` the AI logic: prompts, planner, grader and tutor.
- `api/` the three endpoints: `plan`, `assess` and `teach`.

Choices, trade-offs and what is not done are in [`DECISIONS.md`](DECISIONS.md).
