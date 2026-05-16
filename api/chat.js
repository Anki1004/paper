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

You can also answer general questions outside these topics — coding, life, anything the user asks. Stay concise. Use Markdown formatting (lists, **bold**, code blocks) when it helps clarity. Avoid emojis unless the user uses them first.`;

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
      messages
    });
    if (anthropicKey) return await streamAnthropic(messages, anthropicKey);
    if (nvidiaKey) return await streamOpenAICompatible({
      url: 'https://integrate.api.nvidia.com/v1/chat/completions',
      apiKey: nvidiaKey,
      model: process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct',
      messages
    });
    return await streamOpenAICompatible({
      url: 'https://api.openai.com/v1/chat/completions',
      apiKey: openaiKey,
      model: 'gpt-4o-mini',
      messages
    });
  } catch (err) {
    return jsonError(String(err?.message || err), 500);
  }
}

// ---------- Anthropic native (messages API) ----------
async function streamAnthropic(messages, apiKey) {
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
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
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
async function streamOpenAICompatible({ url, apiKey, model, messages, extraHeaders }) {
  const cleanMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
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
      max_tokens: 2048,
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
