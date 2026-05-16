// Floating AI chat widget — vanilla JS, no dependencies
// Calls /api/chat (Vercel serverless function). Streams response.
(function () {
  'use strict';

  // Resolve API endpoint — same origin
  const API_URL = (location.origin || '') + '/api/chat';
  const STORAGE_KEY = 'sem4-ai-chat-history';

  // ---------- Styles ----------
  const css = `
    .ai-fab {
      position: fixed; right: 18px; bottom: 18px; z-index: 9998;
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.7rem 1.05rem;
      background: #1a1f2e; color: #fffaf0;
      border: 1px solid #7a1a1a;
      border-radius: 999px;
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      font-weight: 600; font-size: 0.92rem;
      letter-spacing: 0.02em;
      cursor: pointer; user-select: none;
      box-shadow: 0 6px 20px rgba(26,31,46,0.28), 0 2px 4px rgba(26,31,46,0.18);
      transition: transform 0.15s ease, background 0.2s ease;
    }
    .ai-fab:hover { transform: translateY(-2px); background: #7a1a1a; }
    .ai-fab .ai-fab-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #1a5a3a; box-shadow: 0 0 0 3px rgba(26,90,58,0.28);
    }
    .ai-fab svg { width: 16px; height: 16px; }

    .ai-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(26,31,46,0.38);
      backdrop-filter: blur(2px);
      display: none;
      align-items: flex-end; justify-content: center;
    }
    .ai-overlay.open { display: flex; }

    .ai-panel {
      width: 100%; max-width: 540px;
      height: min(82vh, 720px);
      background: #f5efe1;
      border: 1px solid #d4c89a;
      border-radius: 16px 16px 0 0;
      box-shadow: 0 -12px 40px rgba(26,31,46,0.28);
      display: flex; flex-direction: column;
      overflow: hidden;
      animation: ai-slide-up 0.22s ease-out;
    }
    @media (min-width: 720px) {
      .ai-overlay { align-items: center; padding: 24px; }
      .ai-panel { border-radius: 16px; height: min(80vh, 720px); }
    }
    @keyframes ai-slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .ai-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.85rem 1.1rem;
      background: #fffaf0;
      border-bottom: 1px solid #d4c89a;
      flex: 0 0 auto;
    }
    .ai-title {
      font-family: "Fraunces", Georgia, serif;
      font-weight: 600; font-size: 1.05rem;
      color: #1a1f2e;
      display: flex; align-items: center; gap: 0.5rem;
    }
    .ai-title-sub {
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      font-size: 0.72rem; font-weight: 500;
      letter-spacing: 0.08em; text-transform: uppercase;
      color: #7a1a1a;
      background: #f7e8e3;
      padding: 2px 8px; border-radius: 999px;
    }
    .ai-header-actions { display: flex; gap: 0.35rem; }
    .ai-iconbtn {
      background: transparent; border: 1px solid #d4c89a; color: #4a5060;
      width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .ai-iconbtn:hover { background: #ede5d0; color: #1a1f2e; }
    .ai-iconbtn svg { width: 15px; height: 15px; }

    .ai-messages {
      flex: 1 1 auto; overflow-y: auto;
      padding: 1rem 1.1rem 0.5rem;
      display: flex; flex-direction: column; gap: 0.85rem;
      background: #f5efe1;
    }
    .ai-msg { display: flex; flex-direction: column; gap: 0.25rem; max-width: 100%; }
    .ai-msg-role {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase;
      color: #7a8090;
    }
    .ai-msg-body {
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      font-size: 0.95rem; line-height: 1.55;
      color: #1a1f2e;
      padding: 0.7rem 0.9rem;
      border-radius: 10px;
      word-wrap: break-word; overflow-wrap: anywhere;
    }
    .ai-msg.user .ai-msg-body { background: #e7eef8; border: 1px solid #cfd9ea; align-self: flex-end; max-width: 88%; }
    .ai-msg.user .ai-msg-role { color: #1f4e8c; align-self: flex-end; }
    .ai-msg.assistant .ai-msg-body { background: #fffaf0; border: 1px solid #d4c89a; }
    .ai-msg.assistant .ai-msg-role { color: #7a1a1a; }
    .ai-msg.error .ai-msg-body { background: #f7e8e3; border: 1px solid #7a1a1a; color: #7a1a1a; }

    .ai-msg-body p { margin: 0.4rem 0; }
    .ai-msg-body p:first-child { margin-top: 0; }
    .ai-msg-body p:last-child { margin-bottom: 0; }
    .ai-msg-body ul, .ai-msg-body ol { margin: 0.4rem 0 0.4rem 1.2rem; padding: 0; }
    .ai-msg-body li { margin: 0.15rem 0; }
    .ai-msg-body strong { color: #1a1f2e; font-weight: 600; }
    .ai-msg-body code {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      background: #f0e9d2; color: #1a1f2e;
      padding: 0.08rem 0.3rem; border-radius: 4px; font-size: 0.88em;
    }
    .ai-msg-body pre {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      background: #1a1f2e; color: #f5efe1;
      padding: 0.7rem 0.85rem; border-radius: 8px;
      overflow-x: auto; font-size: 0.85rem; margin: 0.5rem 0;
    }
    .ai-msg-body pre code { background: transparent; color: inherit; padding: 0; }
    .ai-msg-body h1, .ai-msg-body h2, .ai-msg-body h3 {
      font-family: "Fraunces", Georgia, serif; font-weight: 600;
      margin: 0.55rem 0 0.3rem; color: #1a1f2e;
    }
    .ai-msg-body h1 { font-size: 1.1rem; }
    .ai-msg-body h2 { font-size: 1.02rem; }
    .ai-msg-body h3 { font-size: 0.96rem; }
    .ai-msg-body a { color: #1f4e8c; text-decoration: underline; }
    .ai-msg-body blockquote {
      border-left: 3px solid #b8860b; padding: 0.15rem 0.7rem;
      margin: 0.4rem 0; color: #4a5060; background: #fbf2da;
      border-radius: 0 6px 6px 0;
    }
    .ai-msg-body .ai-table-wrap {
      margin: 0.55rem -0.2rem; overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border: 1px solid #d4c89a; border-radius: 8px;
      background: #fffaf0;
    }
    .ai-msg-body table {
      width: 100%; border-collapse: collapse;
      font-size: 0.86rem; min-width: 100%;
    }
    .ai-msg-body th, .ai-msg-body td {
      padding: 0.45rem 0.6rem;
      border-bottom: 1px solid #e8dfc2;
      text-align: left; vertical-align: top;
      word-break: break-word;
    }
    .ai-msg-body th {
      background: #f0e9d2; color: #1a1f2e;
      font-weight: 600; white-space: nowrap;
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      font-size: 0.78rem; letter-spacing: 0.02em;
      text-transform: uppercase;
      position: sticky; top: 0;
    }
    .ai-msg-body tr:last-child td { border-bottom: none; }
    .ai-msg-body tr:nth-child(even) td { background: rgba(240,233,210,0.35); }
    .ai-tldr {
      background: #fbf2da; border-left: 3px solid #7a1a1a;
      padding: 0.5rem 0.7rem; border-radius: 0 6px 6px 0;
      margin: 0 0 0.55rem; font-size: 0.92rem;
    }
    .ai-remember {
      background: #f0f5ec; border-left: 3px solid #1a5a3a;
      padding: 0.5rem 0.7rem; border-radius: 0 6px 6px 0;
      margin: 0.55rem 0 0; font-size: 0.92rem;
    }

    .ai-suggestions {
      display: flex; flex-wrap: wrap; gap: 0.4rem;
      padding: 0.4rem 1.1rem 0.6rem;
    }
    .ai-suggestion {
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      font-size: 0.82rem;
      background: #fffaf0; color: #1a1f2e;
      border: 1px solid #d4c89a;
      padding: 0.35rem 0.7rem; border-radius: 999px;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .ai-suggestion:hover { background: #ede5d0; border-color: #7a1a1a; }

    .ai-input-wrap {
      flex: 0 0 auto;
      padding: 0.65rem 0.85rem 0.85rem;
      border-top: 1px solid #d4c89a;
      background: #fffaf0;
    }
    .ai-input-row { display: flex; gap: 0.5rem; align-items: flex-end; }
    .ai-input {
      flex: 1; min-height: 42px; max-height: 140px;
      resize: none;
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      font-size: 0.96rem; line-height: 1.4;
      padding: 0.6rem 0.75rem;
      background: #f5efe1; color: #1a1f2e;
      border: 1px solid #d4c89a; border-radius: 10px;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .ai-input:focus { border-color: #1f4e8c; }
    .ai-input::placeholder { color: #7a8090; }
    .ai-send {
      background: #1a1f2e; color: #fffaf0;
      border: none; border-radius: 10px;
      padding: 0 0.95rem; height: 42px;
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      font-weight: 600; font-size: 0.9rem;
      cursor: pointer;
      display: inline-flex; align-items: center; gap: 0.35rem;
      transition: background 0.15s ease;
    }
    .ai-send:hover { background: #7a1a1a; }
    .ai-send:disabled { background: #7a8090; cursor: not-allowed; }
    .ai-send svg { width: 14px; height: 14px; }

    .ai-typing { display: inline-flex; gap: 3px; padding: 4px 0; }
    .ai-typing span {
      width: 6px; height: 6px; border-radius: 50%;
      background: #7a8090; animation: ai-bounce 1.2s infinite ease-in-out;
    }
    .ai-typing span:nth-child(2) { animation-delay: 0.15s; }
    .ai-typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes ai-bounce { 0%,80%,100%{transform:scale(0.6);opacity:.4;} 40%{transform:scale(1);opacity:1;} }

    .ai-footer-hint {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 0.68rem; color: #7a8090;
      text-align: center; margin-top: 0.4rem;
    }

    @media (max-width: 480px) {
      .ai-fab { right: 12px; bottom: 12px; font-size: 0.85rem; padding: 0.6rem 0.9rem; }
      .ai-panel { height: 100dvh; border-radius: 0; }
      .ai-overlay { align-items: stretch; }
      .ai-header { padding: 0.7rem 0.85rem; }
      .ai-title { font-size: 0.98rem; }
      .ai-messages { padding: 0.75rem 0.85rem 0.4rem; gap: 0.7rem; }
      .ai-msg-body { font-size: 0.92rem; padding: 0.6rem 0.75rem; }
      .ai-msg.user .ai-msg-body { max-width: 92%; }
      .ai-msg-body h1 { font-size: 1.02rem; }
      .ai-msg-body h2 { font-size: 0.96rem; }
      .ai-msg-body h3 { font-size: 0.9rem; }
      .ai-msg-body table { font-size: 0.8rem; }
      .ai-msg-body th, .ai-msg-body td { padding: 0.4rem 0.5rem; }
      .ai-suggestions { padding: 0.35rem 0.85rem 0.5rem; }
      .ai-suggestion { font-size: 0.78rem; padding: 0.32rem 0.6rem; }
      .ai-input-wrap { padding: 0.55rem 0.7rem 0.7rem; padding-bottom: max(0.7rem, env(safe-area-inset-bottom)); }
      .ai-input { font-size: 16px; } /* prevents iOS zoom on focus */
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- DOM ----------
  const fab = document.createElement('button');
  fab.className = 'ai-fab';
  fab.setAttribute('aria-label', 'Open AI study assistant');
  fab.innerHTML = `
    <span class="ai-fab-dot"></span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    <span>Ask AI</span>
  `;
  document.body.appendChild(fab);

  const overlay = document.createElement('div');
  overlay.className = 'ai-overlay';
  overlay.innerHTML = `
    <div class="ai-panel" role="dialog" aria-label="AI study assistant">
      <div class="ai-header">
        <div class="ai-title">
          <span>SEM4 Study Buddy</span>
          <span class="ai-title-sub">AI</span>
        </div>
        <div class="ai-header-actions">
          <button class="ai-iconbtn ai-clear" aria-label="Clear conversation" title="Clear conversation">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
          <button class="ai-iconbtn ai-close" aria-label="Close" title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="ai-messages" aria-live="polite"></div>
      <div class="ai-suggestions">
        <button class="ai-suggestion">Explain normalisation 1NF→3NF</button>
        <button class="ai-suggestion">Difference between FDMA & CDMA?</button>
        <button class="ai-suggestion">Booth's algorithm with example</button>
        <button class="ai-suggestion">When to use t-test vs z-test?</button>
      </div>
      <div class="ai-input-wrap">
        <div class="ai-input-row">
          <textarea class="ai-input" rows="1" placeholder="Ask anything — from these subjects or beyond…"></textarea>
          <button class="ai-send" aria-label="Send">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Send
          </button>
        </div>
        <div class="ai-footer-hint">Enter to send · Shift+Enter for newline</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const panel = overlay.querySelector('.ai-panel');
  const msgsEl = overlay.querySelector('.ai-messages');
  const input = overlay.querySelector('.ai-input');
  const sendBtn = overlay.querySelector('.ai-send');
  const closeBtn = overlay.querySelector('.ai-close');
  const clearBtn = overlay.querySelector('.ai-clear');
  const suggestionsEl = overlay.querySelector('.ai-suggestions');

  // ---------- State ----------
  let messages = loadHistory();
  let isStreaming = false;

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function saveHistory() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch {}
  }

  // ---------- Markdown (tiny renderer; supports headings, bold, italics, code, lists, links) ----------
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function renderInline(s) {
    s = s.replace(/`([^`\n]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`);
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  }
  function renderMarkdown(text) {
    if (!text) return '';
    let s = text;
    // Code fences (extract first so their contents are untouched by other rules)
    const codeBlocks = [];
    s = s.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      codeBlocks.push(`<pre><code>${escapeHtml(code)}</code></pre>`);
      return ` CODEBLOCK${codeBlocks.length - 1} `;
    });
    // Pipe tables: header row | --- | --- | then data rows
    s = s.replace(
      /(?:^|\n)(\|[^\n]+\|)\n(\|[\s:|-]+\|)\n((?:\|[^\n]+\|\n?)+)/g,
      (_, header, _sep, rows) => {
        const splitRow = (r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
        const ths = splitRow(header).map(c => `<th>${renderInline(escapeHtml(c))}</th>`).join('');
        const trs = rows.trim().split('\n').map(r => {
          const tds = splitRow(r).map(c => `<td>${renderInline(escapeHtml(c))}</td>`).join('');
          return `<tr>${tds}</tr>`;
        }).join('');
        return `\n<div class="ai-table-wrap"><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>\n`;
      }
    );
    // Headings
    s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    s = s.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    // Inline formatting on the rest
    s = s.replace(/`([^`\n]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`);
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // Lists
    s = s.replace(/(?:^|\n)((?:[-*] .+(?:\n|$))+)/g, (m, block) => {
      const items = block.trim().split(/\n/).map(l => l.replace(/^[-*] /, '').trim());
      return '\n<ul>' + items.map(i => `<li>${i}</li>`).join('') + '</ul>';
    });
    s = s.replace(/(?:^|\n)((?:\d+\. .+(?:\n|$))+)/g, (m, block) => {
      const items = block.trim().split(/\n/).map(l => l.replace(/^\d+\. /, '').trim());
      return '\n<ol>' + items.map(i => `<li>${i}</li>`).join('') + '</ol>';
    });
    // Paragraphs (blank-line-separated lines that aren't already wrapped)
    s = s.split(/\n{2,}/).map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^<(h\d|ul|ol|pre|blockquote|div|table)/.test(trimmed)) return trimmed;
      if (/^ CODEBLOCK\d+ $/.test(trimmed)) return trimmed;
      // TL;DR callout — paragraph that starts with "**TL;DR" (already converted to <strong>)
      if (/^<strong>TL;DR[^<]*<\/strong>/i.test(trimmed)) {
        return `<div class="ai-tldr">${trimmed.replace(/\n/g, '<br>')}</div>`;
      }
      // Remember callout
      if (/^<strong>Remember[^<]*<\/strong>/i.test(trimmed)) {
        return `<div class="ai-remember">${trimmed.replace(/\n/g, '<br>')}</div>`;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');
    // Restore code blocks
    s = s.replace(/ CODEBLOCK(\d+) /g, (_, i) => codeBlocks[+i] || '');
    return s;
  }

  // ---------- Rendering ----------
  function renderAll() {
    msgsEl.innerHTML = '';
    if (messages.length === 0) {
      const intro = document.createElement('div');
      intro.className = 'ai-msg assistant';
      intro.innerHTML = `
        <div class="ai-msg-role">Study Buddy</div>
        <div class="ai-msg-body">
          <p>Hey — ask me anything about <strong>DBMS, WC, LOC, DSUR, CTRC, ProbStats, or IKS</strong>, or anything else on your mind.</p>
          <p>Tap a suggestion below to start.</p>
        </div>`;
      msgsEl.appendChild(intro);
      suggestionsEl.style.display = '';
      return;
    }
    suggestionsEl.style.display = 'none';
    for (const m of messages) appendMessage(m.role, m.content, false);
    scrollToBottom();
  }

  function appendMessage(role, content, shouldScroll) {
    const wrap = document.createElement('div');
    wrap.className = 'ai-msg ' + role;
    const roleLabel = role === 'user' ? 'You' : role === 'error' ? 'Error' : 'Study Buddy';
    const bodyHtml = role === 'assistant' ? renderMarkdown(content) : escapeHtml(content).replace(/\n/g, '<br>');
    wrap.innerHTML = `
      <div class="ai-msg-role">${roleLabel}</div>
      <div class="ai-msg-body">${bodyHtml || '<span class="ai-typing"><span></span><span></span><span></span></span>'}</div>
    `;
    msgsEl.appendChild(wrap);
    if (shouldScroll !== false) scrollToBottom();
    return wrap;
  }

  function scrollToBottom() {
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  // ---------- Send ----------
  async function send(text) {
    text = (text || '').trim();
    if (!text || isStreaming) return;

    messages.push({ role: 'user', content: text });
    appendMessage('user', text);
    suggestionsEl.style.display = 'none';
    input.value = '';
    autoResize();
    saveHistory();

    const assistantEl = appendMessage('assistant', '');
    const bodyEl = assistantEl.querySelector('.ai-msg-body');
    isStreaming = true;
    sendBtn.disabled = true;

    let accumulated = '';
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages.map(m => ({ role: m.role, content: m.content })) })
      });

      if (!res.ok || !res.body) {
        let errText = `Request failed (${res.status})`;
        try { const j = await res.json(); if (j?.error) errText = j.error; } catch {}
        bodyEl.innerHTML = '';
        assistantEl.classList.remove('assistant');
        assistantEl.classList.add('error');
        assistantEl.querySelector('.ai-msg-role').textContent = 'Error';
        bodyEl.textContent = errText;
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        bodyEl.innerHTML = renderMarkdown(accumulated);
        scrollToBottom();
      }
      messages.push({ role: 'assistant', content: accumulated });
      saveHistory();
    } catch (err) {
      bodyEl.innerHTML = '';
      assistantEl.classList.remove('assistant');
      assistantEl.classList.add('error');
      assistantEl.querySelector('.ai-msg-role').textContent = 'Error';
      bodyEl.textContent = 'Network error: ' + String(err?.message || err);
    } finally {
      isStreaming = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // ---------- UI events ----------
  function open() {
    overlay.classList.add('open');
    renderAll();
    setTimeout(() => input.focus(), 50);
  }
  function close() { overlay.classList.remove('open'); }
  function clearAll() {
    messages = [];
    saveHistory();
    renderAll();
  }
  function autoResize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  }

  fab.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  clearBtn.addEventListener('click', clearAll);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });

  input.addEventListener('input', autoResize);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input.value);
    }
  });
  sendBtn.addEventListener('click', () => send(input.value));

  suggestionsEl.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.classList.contains('ai-suggestion')) send(t.textContent);
  });
})();
