# Adding content (no code changes needed)

The app renders whatever it finds in two files. Add knowledge by editing data,
never code.

```
src/content/topics.json       the chapters
src/content/questions.json    the quiz bank
```

After editing either file, run `npm run build` (or `npm run dev` for live reload).
New topics, questions, and quiz categories appear automatically — the topic
filter and chapter list are derived from the data.

---

## Topic schema (`topics.json`)

Each topic is one object in the array. Only the first few fields are required;
the rest render only when present, so a sparse topic is fine.

```jsonc
{
  "id": "logistic-regression",        // unique slug
  "n": 4,                             // order in the curriculum (and prereq id)
  "title": "Logistic Regression",
  "tag": "your PD model",            // one-line subtitle

  // --- the 10-section schema (all optional; render only if non-empty) ---
  "why":         "What problem this solves and why earlier approaches failed.",
  "intuition":   "Plain-language / geometric understanding before any formula.",
  "visualization": "",               // usually delivered by an interactive tab (see `tabs`)
  "mathematics": "Formula\\nInterpretation of every symbol.",
  "code":        "Python / numpy that maps directly onto the math.",
  "failure":     "When the method breaks. MANDATORY in spirit — the highest-signal section.",

  "interview": {                      // three-level answers
    "s30": "30-second answer.",
    "m2":  "2-minute answer.",
    "m5":  "5-minute expert answer."
  },

  "sharpen": [                        // bare reasoning questions — NO answers
    "A question that forces reasoning, not recall.",
    "Another one."
  ],

  "connections": null,                // optional [strings], render if present
  "resources":   null,                // optional [strings], only if truly valuable
  "realWorld":   null,                // optional [strings] — where it shows up in practice
  "caseStudy":   null,                // optional {title, body} — ONE illuminating example
  "required":    null,                // optional [section keys] — override the default contract
  "prereqs":     ["3"],               // optional [topic ids/ns] learned first

  // --- rich render body (the original interactive blocks) ---
  "blocks": [ ... ],                  // ordered content blocks (see below)
  "tabs":   [ { "id": "sig", "label": "see it: sigmoid tab" } ],
  "keyFacts": [ "..." ]
}
```

### Adaptive contract: required vs optional

Different topics need different emphases, so the schema declares a contract.

**Required by default** (every topic is expected to have these, and the app shows
a small `to-expand` note listing any that are missing):

```
why · intuition · visualization · mathematics · failure · interview · sharpen
```

**Optional** (render only when present, never flagged as missing — this is what
stops authors from padding empty slots with fluff):

```
code · connections · resources · realWorld · caseStudy
```

A topic can **override the required set** with its own `required` array when it
genuinely differs. Example: the meta chapter "How to Read Any Equation" has no
single formula or picture, so it declares
`"required": ["why","intuition","failure","interview","sharpen"]` and is not
penalized for lacking `visualization`/`mathematics`.

In the contents list, a topic meeting its full contract shows **complete**; a
partially-enriched one shows **+deep**.

### Case study — optional, and that's the point

`caseStudy` is `{ "title": "...", "body": "..." }`. Add one **only when a topic
has a genuinely illuminating real example** — one strong case (FICO for logistic,
COVID concept-shift for experimental design, Kaggle dominance for boosting)
teaches more than ten generic ones. Leave it `null` otherwise; a forced case
study is worse than none.

### Design rules baked into the schema

- **`failure` and `sharpen` are sacred.** They're where the compounding value is —
  the sections that make someone who can critique and reason, not just implement.
  Put most content-writing effort here.
- **`failure` is required.** A topic without it is incomplete (and the app says so).
- **`sharpen` holds bare questions with no answers** — the friction of not seeing
  the answer is the point. (Add a `hint` field later if you want, collapsed.)
- **`caseStudy`, `realWorld`, `connections`, `resources` are optional and nullable.**
  Leave them `null` rather than padding with filler; they simply won't render.
- **Prioritize insight over completeness.** Omit any optional section that doesn't
  add value, and override `required` for a topic whose natural shape differs.

### Block kinds (the `blocks` array — the interactive body)

| `k`    | fields                | renders as                                  |
|--------|-----------------------|---------------------------------------------|
| `p`    | `t`                   | a paragraph                                 |
| `h`    | `t`                   | a subheading                                |
| `key`  | `items[]`             | a "key facts" box                           |
| `code` | `t`                   | a monospace code block                      |
| `say`  | `f`, `t`              | a "say it aloud" formula + interpretation   |
| `lab`  | `data`, `steps[]`     | a "lab — try it on real data" box           |
| `tab`  | `id`, `label`         | a button linking to an interactive tab      |

Interactive tabs (`sig`, `attn`, `mha`, `roc`, `calib`, `biasvar`, …) are the
only thing that lives in code, because each is a custom visualization. A new
*text* topic needs zero code; a new *interactive* tab is the one exception.

---

## Question schema (`questions.json`)

```jsonc
{
  "t": "logistic",                    // topic/category (auto-added to the filter)
  "q": "The question text.",
  "o": ["correct answer first", "distractor", "distractor", "distractor"],
  "w": "The explanation shown after answering — the intuition being tested."
}
```

The **first option is always the correct one**; the app shuffles them at runtime.
Add a question with a new `t` value and that category appears in the quiz filter
automatically.

---

## Expanding a topic later (the workflow)

The migration auto-filled `intuition`, `mathematics`, `code`, and a seed `s30`
for all 26 topics, and preserved every original interactive block losslessly.
Six flagship topics (linear core, logistic, gradient descent, attention, trees,
experimental design) are fully enriched with `why` / `failure` / `sharpen` /
full interview tiers — look for the **+deep** badge in the contents list.

To bring another topic to that standard: open `topics.json`, find it by `title`,
and fill the empty `why` / `failure` / `sharpen` / `interview.m2` / `interview.m5`
fields. That's it — demand-driven, one topic at a time, no code.
