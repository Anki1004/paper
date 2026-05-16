# SEM4 STUDY GUIDE — SHARED SPEC (read this first)

All 44 agents follow this spec exactly. Identical CSS classes + structure = consistent output.

---

## AESTHETIC DIRECTION — "Editorial Exam Notebook"

Dark-academia × technical-textbook. Parchment paper, deep ink, oxblood section markers, forest-green examples, warm-gold mnemonics, navy diagrams. **Mobile-first** (target 360–414px width). Distinctive fonts — NO Inter/Arial/Roboto.

### Fonts (Google Fonts — load via stylesheet @import in styles.css)
```
Fraunces (variable serif, opsz 9..144, wght 300..900) — display, headings
IBM Plex Sans (300, 400, 500, 600) — body
JetBrains Mono (400, 600) — formulas, code, mono
```

### Color tokens (CSS variables in styles.css :root)
```
--paper:        #f5efe1   /* page background */
--paper-card:   #fffaf0   /* card surface */
--paper-soft:   #ede5d0   /* subtle band */
--ink:          #1a1f2e   /* primary text */
--ink-2:        #4a5060   /* secondary text */
--ink-3:        #7a8090   /* muted */
--oxblood:      #7a1a1a   /* HIGH priority, definitions, section markers */
--forest:       #1a5a3a   /* examples, "correct" */
--gold:         #b8860b   /* tips, mnemonics, warnings */
--navy:         #1f4e8c   /* diagrams, links, info */
--accent-bg-ox: #f7e8e3
--accent-bg-fo: #e6f1ea
--accent-bg-go: #fbf2da
--accent-bg-nv: #e7eef8
--border:       #d4c89a
--border-soft:  #e8dfc4
--code-bg:      #f0e9d2
```

### Spacing scale (use rem)
0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 / 3 / 4

### Mobile-first sizes
- Body: 16px (1rem) min on mobile, 17px on desktop
- H1 display: `clamp(2rem, 7vw, 3.5rem)`, Fraunces 700, letter-spacing -0.02em
- H2 section: `clamp(1.5rem, 5vw, 2.25rem)`, Fraunces 600
- H3 question: `clamp(1.125rem, 4vw, 1.5rem)`, IBM Plex Sans 600
- Line height: 1.6 body, 1.15 display
- Max content width: 720px
- Container padding: 14px mobile → 24px tablet → 40px desktop

---

## CSS CLASS CATALOG (use these exactly)

```
LAYOUT
.container       — max-w 720px, mobile-first padding
.page-bg         — gradient parchment background on <body>
.crumb           — top breadcrumb back to index
.hero            — page hero block (title + meta + dot pattern)
.hero h1         — Fraunces display title
.hero-meta       — small caps meta row (subject • unit • probability)
.toc             — table of contents card

BADGES & PILLS
.badge           — small pill, all-caps tracking, 11px
.badge.high      — oxblood bg
.badge.med       — gold bg
.badge.low       — navy bg
.chip            — tag/topic chip
.dot             — colored dot prefix

SECTION MARKERS
.section         — wrapper around §A/§B/§C
.section-mark    — large letter A/B/C in oxblood Fraunces
.section-title   — section heading
.section-lead    — paragraph under heading

SECTION A — Expected Questions
.qtable          — striped table of predicted questions
.qtable th       — bold, oxblood underline
.prob-bar        — visual probability bar (uses width %)

SECTION B — Detailed Solutions
.qcard           — bordered card per question, soft shadow
.qcard h3        — Q-number badge + title
.intuition       — amber-left-bordered box, "⚡ Core Intuition"
.concept         — body block, "📖 Concept Explained"
.connects        — chip list, "🔗 Connects To"
.structure       — tip box, "📐 Exam Answer Structure"
.diagram         — inline SVG wrapper, white card, navy stroke
.diagram-caption — small mono caption below SVG
.example         — green-left-bordered box, "💡 Example"
.numerical       — light-bg mono numerical solution
.answer-model    — oxblood-left-bordered "✅ Model Exam Answer"
.source-line     — small footer line "📚 Source: …"

UTILITY
.formula         — JetBrains Mono block, code-bg, ink colored !important
.mnemonic        — gold dashed border, italic
.callout.def     — navy bg, "Definition"
.callout.tip     — gold bg, "Tip"
.callout.warn    — oxblood bg, "Pitfall"
.simple          — teal badge "IN SIMPLE WORDS"
.walkthrough     — amber badge "WORKED EXAMPLE"
.quiz .q         — clickable question
.quiz .a         — hidden answer revealed on click (use <details>)

SECTION C — Cram Sheet
.cram-grid       — 1-col mobile, 2-col tablet
.cram-card       — bordered cram entry
.must-draw       — table of diagrams with trigger
.concept-map     — pre-formatted indented map
.redflag         — oxblood callout for prof penalties

NAV
.footer-nav      — prev/next pill buttons
.toc-link        — hover underline, ink color

TABLE
.table-wrap      — horizontal scroll wrapper
.t               — base styled table
```

---

## HTML SKELETON (every unit page uses this)

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>[Subject] · Unit [N] — [Title] | SEM4 Guide</title>
<link rel="stylesheet" href="../styles.css">
</head>
<body class="page-bg">
<div class="container">

  <a class="crumb" href="../index.html">← All subjects</a>

  <header class="hero">
    <div class="hero-meta"><span>[Subject Code]</span> • <span>Unit [N]</span> • <span class="badge high|med|low">[Probability]</span></div>
    <h1>[Unit Title]</h1>
    <p class="section-lead">[Syllabus line — verbatim]</p>
  </header>

  <!-- TOC -->
  <nav class="toc">
    <strong>On this page</strong>
    <ul>
      <li><a href="#section-a">A · Expected Questions</a></li>
      <li><a href="#section-b">B · Detailed Solutions</a></li>
      <li><a href="#section-c">C · Cram Sheet</a></li>
    </ul>
  </nav>

  <!-- SECTION A -->
  <section id="section-a" class="section">
    <div class="section-mark">A</div>
    <h2 class="section-title">Expected Questions</h2>
    <p class="section-lead">Ranked by PYQ frequency + syllabus weight.</p>
    <div class="table-wrap">
      <table class="qtable t">
        <thead><tr><th>#</th><th>Question</th><th>Type</th><th>Probability</th><th>Marks</th></tr></thead>
        <tbody>
          <!-- ≥4 rows -->
        </tbody>
      </table>
    </div>
    <p class="source-line">Source of prediction: [PYQ years cited]</p>
  </section>

  <!-- SECTION B -->
  <section id="section-b" class="section">
    <div class="section-mark">B</div>
    <h2 class="section-title">Detailed Solutions</h2>

    <!-- ≥4 qcards. Each follows: -->
    <article class="qcard">
      <h3><span class="badge high">Q1</span> [Question text]</h3>

      <div class="intuition"><strong>⚡ Core Intuition</strong><p>[2–3 lines plain language]</p></div>

      <div class="concept"><strong>📖 Concept Explained</strong><p>[Why it exists, what problem, how works, edge cases]</p></div>

      <div class="connects"><strong>🔗 Connects to</strong>
        <span class="chip">[topic]</span> <span class="chip">[topic]</span>
      </div>

      <div class="structure"><strong>📐 Exam Answer Structure</strong>
        <ul><li>[How to write it]</li></ul>
      </div>

      <figure class="diagram">
        <svg viewBox="0 0 600 360" width="100%" height="auto" role="img" aria-label="[label]">
          <!-- inline SVG, see SVG rules below -->
        </svg>
        <figcaption class="diagram-caption">Fig — [explanation]</figcaption>
      </figure>

      <div class="example"><strong>💡 Example</strong><p>[Concrete textbook example]</p></div>

      <!-- if numerical: -->
      <pre class="formula numerical">Given: …
Find:  …
Step 1: …
Answer: …</pre>

      <div class="answer-model"><strong>✅ Model Exam Answer</strong>
        <ol><li>[Definition line]</li><li>[Diagram reference]</li><li>[Explanation 3-4 bullets]</li><li>[Example]</li><li>[Significance]</li></ol>
      </div>

      <p class="source-line">📚 Primary: [my material] · Supplemented: [book/external if used]</p>
    </article>

  </section>

  <!-- SECTION C -->
  <section id="section-c" class="section">
    <div class="section-mark">C</div>
    <h2 class="section-title">Quick Reference Sheet</h2>

    <h3>🧠 Key concepts</h3>
    <div class="table-wrap"><table class="t cram-grid">…</table></div>

    <h3>⚡ Formulas</h3>
    <pre class="formula">…</pre>

    <h3>🖼️ Must-draw diagrams</h3>
    <div class="table-wrap"><table class="t must-draw">…</table></div>

    <h3>🗺️ Concept map</h3>
    <pre class="concept-map">…</pre>

    <h3>🚨 Common mistakes</h3>
    <ul class="redflag-list"><li class="redflag">[mistake]</li></ul>
  </section>

  <nav class="footer-nav">
    <a href="[prev]">← Prev</a>
    <a href="../index.html">Index</a>
    <a href="[next]">Next →</a>
  </nav>

</div>
</body>
</html>
```

---

## SVG DIAGRAM RULES (mandatory)

- Inline SVG only. No external images.
- `viewBox="0 0 W H"` with `width="100%" height="auto"`.
- Palette: bg `#fffaf0`, primary stroke `#1f4e8c`, accent stroke `#7a1a1a`, ok stroke `#1a5a3a`, ink `#1a1f2e`, neutral `#7a8090`, line `#d4c89a`.
- `rx="8"` rounded rects, `stroke-width="2"`.
- Unique marker id per diagram (e.g. `arr-q3`).
- Text baseline INSIDE rects: y ≥ rect.y + font-size.
- Long labels: `text-anchor="middle"` + centered x, or split into 2 `<text>` lines.
- ViewBox ≥20px padding below last text element.
- Font 14px; on narrow widths, the CSS scales SVG down — don't fix font sizes too small.
- `role="img"` + `aria-label="…"` on every <svg>.

---

## CONTENT RULES (strict)

1. **No paragraphs.** Each `<p>` = 1 sentence MAX. Use bullets ≤10 words.
2. **Karpathy teaching style:** Intuition first (plain language) → concept → diagram → example → numerical → model answer. WHY before HOW.
3. **Every Section B question has a diagram** unless purely textual (rare).
4. **Every box has ≤2 lines of text.**
5. **Tables wrapped in `.table-wrap`** for horizontal scroll on mobile.
6. **Formulas use `<pre class="formula">` with `color:#1a1f2e !important`** in CSS.
7. **PYQ-grounded:** Section A predictions cite years from materials.
8. **No "I think" / "perhaps"** — write with authority.
9. **Concrete examples > abstract definitions.**
10. **Include 1 mnemonic per qcard** where applicable.

---

## SECTIONS PER UNIT FILE (4 required, 1 optional)

- §A — Expected Questions (table, ≥4 rows)
- §B — Detailed Solutions (≥4 qcards, each with intuition+concept+diagram+example+model-answer)
- §C — Cram Sheet (key concepts table + formulas + must-draw diagrams + concept map + red flags)
- (optional but encouraged) §D — Quick quiz reveal pattern using `<details>`

---

## CRAM PAGE (subject/cram.html — 6 files)

Cross-unit consolidated revision page. Sections:
1. **All formulas this subject** — one big mono block, grouped by unit
2. **All diagrams to memorize** — table linking to unit pages
3. **Master concept map** — connects all 4 units
4. **Last-day 3-hour plan** — hour-by-hour breakdown
5. **Top 20 1-mark recall** — Q&A drill table
6. **Top 10 high-probability questions across whole syllabus**

---

## PYQ PAGE (subject/pyq.html — 6 files)

Subject-wide PYQ analysis. Sections:
1. **PYQ heatmap** — table: Topic × Year, ✓ marks where appeared
2. **Frequency ranking** — top 10 most-asked topics, with predicted-likely status
3. **Year-wise question dump** — all PYQs grouped by year
4. **Topic-wise consolidation** — same Q variations grouped by topic
5. **Predicted question paper** — model paper for next sessional based on patterns

---

## TONE

- Direct, technical, no hedging.
- Treat reader as smart but rushed (exam tomorrow).
- Karpathy: intuition + first-principles + concrete-before-abstract.
- Use 2nd-person rarely; mostly declarative.

---

## MATERIALS LOCATIONS (each agent reads only their subject)

```
DBMS:      d:\ankit\Documents\SEM4\DBMS\
   PYQs: DBMS25-BTECH.pdf, DBMS25-BCA.pdf, DBMS24_CSE.pdf, DBMS24_BBA.pdf, DBMS23_CSE.pdf
   Modules: DBMS Module 1.pdf ... DBMS Module 6.pdf
WC:        d:\ankit\Documents\SEM4\WIRELESS\
   PYQs: BCA25.pdf, IT25.pdf, IT24.pdf, IT23.pdf, 24BTECH.pdf, 23BTECH.pdf
LOC:       d:\ankit\Documents\SEM4\LOC\
   PYQs: loc25.pdf, loc24.pdf, LOC23.pdf, LOC_CSE24.pdf, loc_may25.pdf
   Notes: unit 1 loc part 1.pdf, unit 1 loc part 2.pdf, unit 4 loc notes.pdf
DSUR:      d:\ankit\Documents\SEM4\Ds usig r\
   PYQs: BCA23.pdf, CSE25.pdf, ML21.pdf, ML24.pdf
   Notes: UNIT 1.pdf, R_Built_in_Functions_with_Examples.pdf
   DOCX: OOPS in R.docx, Statistical distribution in R.docx, DSUR PUT IMPORTANT.docx
CTRC:      d:\ankit\Documents\SEM4\Critical thinking and rhetorical communication\
   PYQs: CS23.pdf, CSE23.pdf, BCA25.pdf, BSC25.pdf
   DOCX: 10+ topic .docx files
ProbStats: d:\ankit\Documents\SEM4\Statistics_&_probability\
   PYQs: STATS23_BTECH.pdf, STATS23_BTECH (2).pdf, STATS23_BSC.pdf
   Notes: Probability and Statistics.pdf, Correlation.pdf
IKS:       d:\ankit\Documents\SEM4\IKS\
   PYQs: BCA25.pdf, BCA25(1).pdf, BSC24.pdf, BSC25.pdf, BSC25(1).pdf, BSC25(2).pdf
   Notes: IKS unit 1-6 book notes.PDF
```

---

## OUTPUT EXPECTATION

Each agent returns: **`DONE: <filepath> · <bytes> · <qcard count> · <svg count>`** + any blocker. ≤ 60 words.
