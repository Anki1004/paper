# SEM4 Study Guides — with AI Study Buddy

Static HTML study guides for BCA(DS) Semester 4 final university exam, plus a floating AI chat widget on every page.

## Deploy to Vercel

1. Push this `guides/` folder to a GitHub repo (or use `vercel` CLI directly).
2. On [vercel.com](https://vercel.com), click **Add New → Project**, import the repo.
3. **Root Directory:** set to the folder that contains `index.html` and `api/`.
4. **Build settings:** leave defaults — no build step, static files + `api/chat.js`.
5. **Environment Variables** (Project Settings → Environment Variables) — set any **one** of:
   - `OPENROUTER_API_KEY` — recommended; gets you Claude, GPT, Llama, etc. through one key. Get it at <https://openrouter.ai/keys>
   - `ANTHROPIC_API_KEY` — Claude only. <https://console.anthropic.com>
   - `NVIDIA_API_KEY` — NVIDIA hosted models. <https://build.nvidia.com>
   - `OPENAI_API_KEY` — OpenAI only. <https://platform.openai.com/api-keys>
6. **Deploy.** Visit the URL — floating **Ask AI** button bottom-right on every page.

Priority order when multiple keys are set: OpenRouter → Anthropic → NVIDIA → OpenAI.

## Local dev

```bash
npm install -g vercel
# .env.local already contains your keys (it is gitignored).
vercel dev
```

Open <http://localhost:3000>.

## Changing the model

Set env vars to override defaults:
- `OPENROUTER_MODEL` (default: `anthropic/claude-haiku-4.5`) — try `openai/gpt-4o-mini`, `google/gemini-2.5-flash`, `meta-llama/llama-3.3-70b-instruct`, etc.
- `NVIDIA_MODEL` (default: `meta/llama-3.1-70b-instruct`)
- Anthropic / OpenAI models are hardcoded in `api/chat.js` — edit if needed.

## Files

- `index.html` + 7 subject pages — content
- `styles.css` — shared styles
- `chat-widget.js` — floating AI widget (injected into all HTML pages)
- `api/chat.js` — Vercel serverless function, supports 4 providers
- `vercel.json` — Vercel config
- `.env.example` — template (safe to commit)
- `.env.local` — your real keys (gitignored — never commit)

## Security note

Never put real API keys into `.env.example` or any file that gets committed to GitHub. Only `.env.local` (which is in `.gitignore`) should contain real keys. For production, paste keys directly into Vercel's Environment Variables UI.

If a key was ever exposed publicly, rotate it immediately at the provider's dashboard.
