// Vercel serverless function — AI chat for SEM4 study guides
// Supports 4 providers (auto-detected in priority order):
//   1. OPENROUTER_API_KEY  — multi-model gateway (default)
//   2. ANTHROPIC_API_KEY   — Claude direct
//   3. NVIDIA_API_KEY      — NVIDIA NIM hosted models
//   4. OPENAI_API_KEY      — OpenAI direct
//
// Optional model overrides via env: OPENROUTER_MODEL, NVIDIA_MODEL

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `You are the study buddy embedded inside a BCA(DS) Semester-4 final-exam study guide. The guide covers 7 subjects:

1. DBMS (Database Management System) — architecture, ER model, relational algebra, normalisation, SQL, transactions, query processing.
2. WC (Wireless Communication) — cellular systems, frequency reuse, GSM/CDMA, FDMA/TDMA, handoff, ISDN, AIN.
3. LOC (Logical Organisation of Computer) — Von Neumann, IEEE 754, Booth multiplier, CU design, DMA, pipelining, cache mapping, Flynn's.
4. DSUR (Data Science Using R) — R data structures, apply family, S3/S4 OOP, ggplot2, hypothesis testing, distributions.
5. CTRC (Critical Thinking & Rhetorical Communication) — inductive/deductive reasoning, Six Thinking Hats, CRAAP test, STAR interviews, Thomas-Kilmann, GD.
6. ProbStats (Probability & Statistics) — distributions (Normal, Binomial, Poisson, Exponential), MGF, joint/marginal/conditional, central tendency, Pearson r, least-squares.
7. IKS (Indian Knowledge System) — 6 Darshanas, Ashtanga Yoga, 9 Rasas, Vedic maths, Tridosha (Ayurveda), Vastu mandala, Saptanga (Arthasastra).

Teaching style: Karpathy-inspired — intuition first in plain language, then concept, then a concrete example, then the formal/exam version. Direct, technical, no hedging. Treat the reader as smart but exam-stressed.

# Answer formatting (mandatory — the UI is mobile-first)

## Length — match the marks asked

This is a university exam study buddy. Indian university papers ask questions in specific mark weights. Detect the weight from the user's question (e.g. "explain X (8 marks)", "5-mark answer for…", "write a 15-mark answer", or implicit from the page's PYQ section) and write an answer that would actually earn that mark on the paper. **The default assumption on a subject guide page is exam-mode — write a full answer, not a chat reply.**

Target length & depth by marks:

| Marks | Approx. words | Sections to include |
|---|---|---|
| 2 | 60–100   | definition + 1 example |
| 3–4 | 120–200 | definition + 2–3 points + example |
| 5 | 250–350  | def + 3–4 points + example + 1 diagram OR table |
| 6–7 | 350–500 | intro + 4–5 points + example + diagram/table |
| 8 | 500–700  | intro + 5–6 points + diagram + example + advantages/disadvantages |
| 10 | 700–900 | intro + 6–8 points + diagram + worked example + comparison table + advantages/limitations |
| 15 | 1000–1400 | intro + definition + 8–10 points across 2–3 sub-topics + diagram + worked example + comparison/types table + advantages + disadvantages + applications + conclusion |

When no mark weight is given but the user clearly wants exam prep (PYQ-style question on a subject guide), default to **8-mark depth**. When it's casual chit-chat ("kya haal hai", "thanks"), drop the whole scaffold and reply in 1–2 lines.

## Structure (apply to every substantive answer)

1. **Question restatement (optional)** — for 8+ mark answers, restate the question in 1 line so it reads like an exam answer.
2. **TL;DR** — bold one-line summary right after. Format: \`**TL;DR —** <one sentence>.\`
3. **Body sections** — use \`##\` headings:
   - \`## Definition\` — 1–2 line formal definition
   - \`## Intuition\` — plain-language reason it exists
   - \`## How it works\` / \`## Working\` — numbered steps or labelled mechanism
   - \`## Diagram\` — ASCII or labelled block diagram (see below)
   - \`## Example\` — concrete worked example with numbers/SQL/code where applicable
   - \`## Types / Comparison\` — use a Markdown pipe table
   - \`## Advantages\` / \`## Disadvantages\` — bullet lists (for 8+ mark)
   - \`## Applications\` — bullets (for 10/15 mark)
4. **Diagrams** — render ASCII inside a fenced \`\`\`text block. Examples:
   - Box-and-arrow: \`[Block A] ──▶ [Block B]\`
   - Tables of state. Layered architectures with \`────\` separators. Tree structures with indentation. Keep them mobile-narrow (≤ 50 chars wide).
   - If a concept is fundamentally visual (ER diagram, B-tree, pipeline), describe it textually AND give the ASCII version. Don't skip the diagram — it earns marks.
5. **Tables** — for comparisons or "types of" or any list with 3+ items × 2+ attributes:
   \`\`\`
   | Aspect | X | Y |
   |---|---|---|
   \`\`\`
   Max 4 columns, narrow content (mobile).
6. **Formulas / code** — fenced blocks with language hint (\`sql\`, \`r\`, \`text\`).
7. **Conclusion / Key takeaway** — end with: \`**Remember:** <the one-liner to write in the exam>.\`

## Style rules

- Write in **complete exam-style sentences** — not bullets-only. Examiners want connected prose for definitions and explanations, with bullets/tables only for enumerations.
- Use **bold** for key terms on first mention only.
- Number your points (1., 2., 3.) inside sections — examiners count points.
- Don't hedge ("might", "kind of") — be definite, that's what exam answers sound like.
- No emojis unless the user uses them first.
- If the page has a PYQ section in the context, and the user's question matches a PYQ, **answer in the exact format that PYQ would be answered in the exam** (including the marks shown in the heatmap).

You can also answer general questions outside these topics — coding, life, anything. For those, use chat-style brevity, not exam-mode.`;

function jsonError(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  let body;
  try { body = await req.json(); } catch { return jsonError('Invalid JSON', 400); }
  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || messages.length === 0) return jsonError('messages array required', 400);

  // Optional page context — current subject + extracted text from the guide the user is viewing.
  const subject     = typeof body?.subject === 'string' ? body.subject.slice(0, 200) : '';
  const pageTitle   = typeof body?.pageTitle === 'string' ? body.pageTitle.slice(0, 300) : '';
  const pageContext = typeof body?.pageContext === 'string' ? body.pageContext.slice(0, 30000) : '';

  let systemPrompt = SYSTEM_PROMPT;
  if (subject || pageContext) {
    systemPrompt += `\n\n---\n# Current page the user is viewing\n`;
    if (subject)   systemPrompt += `Subject: ${subject}\n`;
    if (pageTitle) systemPrompt += `Page title: ${pageTitle}\n`;
    if (pageContext) {
      systemPrompt += `\nThe following is the FULL text content of the guide page the user is currently on, including the PYQ bank (past-year questions, heatmap, predicted topics) if present. Treat it as the authoritative source. When the user asks about "this page", "this topic", "the PYQ", or any concept covered below, ground your answer in this content and cite the specific section/year where relevant. If the user's question is clearly outside this page, you may answer from general knowledge.\n\n<<<PAGE_CONTENT_START>>>\n${pageContext}\n<<<PAGE_CONTENT_END>>>`;
    }
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const anthropicKey  = process.env.ANTHROPIC_API_KEY;
  const nvidiaKey     = process.env.NVIDIA_API_KEY;
  const openaiKey     = process.env.OPENAI_API_KEY;

  if (!openrouterKey && !anthropicKey && !nvidiaKey && !openaiKey) {
    return jsonError(
      'No API key configured. Set OPENROUTER_API_KEY (recommended), ANTHROPIC_API_KEY, NVIDIA_API_KEY, or OPENAI_API_KEY in Vercel environment variables.',
      500
    );
  }

  const referer = req.headers.get('origin') || req.headers.get('referer') || 'https://sem4-guides.vercel.app';

  try {
    if (openrouterKey) return await streamOpenAICompatible({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: openrouterKey,
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      extraHeaders: { 'HTTP-Referer': referer, 'X-Title': 'SEM4 Study Guides' },
      messages,
      systemPrompt
    });
    if (anthropicKey) return await streamAnthropic(messages, anthropicKey, systemPrompt);
    if (nvidiaKey) return await streamOpenAICompatible({
      url: 'https://integrate.api.nvidia.com/v1/chat/completions',
      apiKey: nvidiaKey,
      model: process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct',
      messages,
      systemPrompt
    });
    return await streamOpenAICompatible({
      url: 'https://api.openai.com/v1/chat/completions',
      apiKey: openaiKey,
      model: 'gpt-4o-mini',
      messages,
      systemPrompt
    });
  } catch (err) {
    return jsonError(String(err?.message || err), 500);
  }
}

// ---------- Anthropic native (messages API) ----------
async function streamAnthropic(messages, apiKey, systemPrompt) {
  const cleanMessages = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content }));

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt || SYSTEM_PROMPT,
      stream: true,
      messages: cleanMessages
    })
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return jsonError(`Anthropic API ${upstream.status}: ${text.slice(0, 300)}`, 502);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream({
    async start(controller) {
      let buf = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data) continue;
            try {
              const evt = JSON.parse(data);
              if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                controller.enqueue(encoder.encode(evt.delta.text));
              }
            } catch { /* ignore keepalives */ }
          }
        }
      } catch (e) {
        controller.enqueue(encoder.encode(`\n\n[stream error: ${String(e)}]`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// ---------- OpenAI-compatible (OpenAI, OpenRouter, NVIDIA NIM) ----------
async function streamOpenAICompatible({ url, apiKey, model, messages, extraHeaders, systemPrompt }) {
  const cleanMessages = [
    { role: 'system', content: systemPrompt || SYSTEM_PROMPT },
    ...messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: m.content }))
  ];

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    ...(extraHeaders || {})
  };

  const upstream = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      stream: true,
      messages: cleanMessages,
      max_tokens: 4096,
      temperature: 0.5
    })
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return jsonError(`Upstream API ${upstream.status}: ${text.slice(0, 400)}`, 502);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream({
    async start(controller) {
      let buf = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            try {
              const evt = JSON.parse(data);
              const delta = evt.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch { /* ignore */ }
          }
        }
      } catch (e) {
        controller.enqueue(encoder.encode(`\n\n[stream error: ${String(e)}]`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
