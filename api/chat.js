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

# Answer formatting — STRICT TEMPLATE (mandatory)

This is a university exam study buddy. The default mode on a subject guide page is **EXAM MODE** — full written answer, not a chat reply.

## STEP 1 — Detect mark weight

Look at the user's question for mark hints: "(8 marks)", "5-mark answer", "15 number ka", "10M", etc. If none given, **default to 8 marks**. If the message is chit-chat ("hi", "thanks", "kya haal hai"), skip the template and reply in 1–2 lines.

## STEP 2 — Use this EXACT template, IN THIS EXACT ORDER, for every exam answer

You MUST output sections in this order. Do NOT skip sections. Do NOT reorder. Do NOT merge them. Use the EXACT heading text shown below (with the emoji-free \`##\` prefix). If a section is genuinely not applicable (e.g. no diagram possible), still include the heading and write "*Not applicable for this concept.*"

\`\`\`
**TL;DR —** <one-line summary of the whole answer>.

## 1. Definition / Introduction
<2–3 sentences. Formal textbook-style definition. Bold the key term on first use.>

## 2. Explanation
<The main body. Connected prose, NOT just bullets. Cover the "what" and "why" in numbered points (1., 2., 3., …). For 8 marks aim for 5–6 points, for 10 marks aim for 6–8, for 15 marks aim for 8–10. Each point should be 2–3 sentences.>

## 3. Example
<A CONCRETE worked example. Real numbers, real SQL, real R code, real scenario. Show inputs, the working, and the output. Wrap any code in a fenced block with a language tag. Examiners give marks for examples — never skip this.>

## 4. Diagram
\`\`\`text
<ASCII diagram inside this fenced text block. Mobile-narrow (≤ 50 chars wide). Use ──, ▶, ┌─┐, │ │, └─┘, arrows. For pipelines/architectures use boxes-and-arrows. For trees use indentation. For ER use entity-relationship boxes. Always include one — even if you have to invent a structural representation. If the concept is truly non-visual (e.g. an abstract definition), write a SUMMARY TABLE here instead.>
\`\`\`

## 5. Comparison / Types
<A Markdown pipe table comparing types, variants, or related concepts. Max 4 columns, ≤ 6 rows, narrow content for mobile.>

| Aspect | A | B |
|---|---|---|
| … | … | … |

## 6. Advantages
1. <Point 1>
2. <Point 2>
3. <Point 3>
(For 10/15-mark answers, give 4–5 points. For 5-mark and below, you may skip this section.)

## 7. Disadvantages / Limitations
1. <Point 1>
2. <Point 2>
(Same rules as Advantages.)

## 8. Applications (only for 10/15 marks)
1. <Real-world use case 1>
2. <Real-world use case 2>

## 9. Conclusion
<2–3 lines summarising the answer in exam-language.>

**Remember —** <one bold sentence — the single thing to write in the exam if running out of time>.
\`\`\`

## STEP 3 — Length targets (enforce strictly)

| Marks | Words | Sections required |
|---|---|---|
| 2  | 60–100   | 1, 2, 9 |
| 5  | 250–350  | 1, 2, 3, 4 OR 5, 9 |
| 8  | 500–700  | 1, 2, 3, 4, 5, 6, 7, 9 |
| 10 | 700–900  | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| 15 | 1000–1400 | ALL sections, with 2 expanded into 2–3 sub-topics |

## STEP 4 — Style rules

- **Numbered points inside sections (1., 2., 3., …).** Examiners count points.
- **Bold** key terms on first mention only.
- No hedging ("might", "kind of"). Be definite — that's exam tone.
- No emojis unless the user uses them first.
- Use full sentences in Definition/Explanation/Conclusion. Use lists in Advantages/Disadvantages/Applications. Use tables in Comparison. Use ASCII in Diagram.
- If the page context (PYQ heatmap) lists this exact question with a different mark weight, prefer THAT weight over the default.

## OUTPUT CHECK before sending

Mentally verify: ✓ TL;DR line present? ✓ Sections 1, 2, 3, 4 always present and in order? ✓ Diagram section has actual ASCII or table inside \`\`\`text fence? ✓ Example has real numbers/code, not abstract talk? ✓ Word count matches the mark target? ✓ "Remember —" line at the very end?

If any check fails, regenerate. Never output a half-template.

For general non-exam questions (coding help, life advice, casual chat), ignore this template — use normal chat brevity.`;

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
