import React, { useState, useMemo, useEffect } from "react";
import { storage, auth } from "./storage";
import TOPICS from "./content/topics.json";
import QUESTIONS from "./content/questions.json";

// ---------------------------------------------------------------
// MATH INTUITION LAB
// Thesis: every symbol exists in three forms — notation, code,
// picture. Tap a symbol and all three light up in the same color.
// ---------------------------------------------------------------

const BG = "#0D1412", PANEL = "#111C19", PANEL2 = "#16221F", INK = "#E9E6DE",
  DIM = "#8C968F", LINE = "#29332f";
const AMBER = "#C6A15E", CYAN = "#6CA0A6", VIOLET = "#A893C7", GREEN = "#7BAE86",
  ROSE = "#C98896", BLUE = "#78A6B0";
const MATH = { fontFamily: "'Fraunces', Georgia, serif" };
const MONO = { fontFamily: "'IBM Plex Mono', ui-monospace, monospace" };

function useActive() {
  const [pin, setPin] = useState(null);
  const [hov, setHov] = useState(null);
  return {
    active: hov || pin,
    hover: setHov,
    pin: (p) => setPin((prev) => (prev === p ? null : p)),
  };
}

function softmaxArr(a) {
  const m = Math.max(...a);
  const e = a.map((v) => Math.exp(v - m));
  const s = e.reduce((x, y) => x + y, 0);
  return e.map((v) => v / s);
}

// ---------------- shared UI ----------------

function Tok({ tok, palette, A }) {
  if (!tok.part) return <span style={{ color: DIM }}>{tok.t}</span>;
  const c = palette[tok.part];
  const on = A.active === tok.part;
  return (
    <span
      onMouseEnter={() => A.hover(tok.part)}
      onMouseLeave={() => A.hover(null)}
      onClick={() => A.pin(tok.part)}
      style={{
        color: c, cursor: "pointer", padding: "1px 3px", borderRadius: 5,
        background: on ? c + "26" : "transparent",
        boxShadow: on ? `0 0 0 1px ${c}66` : "none",
        borderBottom: `2px solid ${c}55`,
        transition: "background .15s, box-shadow .15s",
      }}
    >
      {tok.t}
    </span>
  );
}

function EqLine({ tokens, palette, A, size = 26 }) {
  return (
    <div style={{ ...MATH, fontSize: size, fontStyle: "italic", lineHeight: 1.9, letterSpacing: 0.5, color: DIM }}>
      {tokens.map((t, i) => (
        <Tok key={i} tok={t} palette={palette} A={A} />
      ))}
    </div>
  );
}

function CodeLine({ tokens, palette, A }) {
  return (
    <div style={{ ...MONO, fontSize: 13.5, background: "#0f1916", border: `1px solid ${LINE}`, borderRadius: 8, padding: "9px 12px", overflowX: "auto", whiteSpace: "nowrap" }}>
      <span style={{ color: "#8C968F" }}>{"# python   "}</span>
      {tokens.map((t, i) =>
        t.part ? (
          <span
            key={i}
            onMouseEnter={() => A.hover(t.part)}
            onMouseLeave={() => A.hover(null)}
            onClick={() => A.pin(t.part)}
            style={{
              color: palette[t.part], cursor: "pointer", borderRadius: 4,
              background: A.active === t.part ? palette[t.part] + "26" : "transparent",
            }}
          >
            {t.t}
          </span>
        ) : (
          <span key={i} style={{ color: "#aab1ab" }}>{t.t}</span>
        )
      )}
    </div>
  );
}

function Explain({ A, parts, palette, fallback }) {
  const k = A.active;
  const has = k && parts[k];
  return (
    <div
      style={{
        minHeight: 56, background: PANEL2,
        border: `1px solid ${has ? palette[k] + "55" : LINE}`,
        borderLeft: `3px solid ${has ? palette[k] : "#394640"}`,
        borderRadius: 8, padding: "10px 12px", fontSize: 13.5,
        color: has ? INK : DIM, lineHeight: 1.55, transition: "border-color .2s",
      }}
    >
      {has ? (
        <span>
          <b style={{ color: palette[k] }}>{parts[k][0]}</b>
          {" — "}
          {parts[k][1]}
        </span>
      ) : (
        fallback
      )}
    </div>
  );
}

function Slider({ label, value, set, min, max, step = 0.01, color = BLUE, fmt = (v) => v.toFixed(2) }) {
  return (
    <div style={{ flex: "1 1 140px", minWidth: 130 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: DIM, marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ ...MONO, color }}>{fmt(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: color }}
      />
    </div>
  );
}

function Section({ title, why, children }) {
  return (
    <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 14, padding: "16px 14px", display: "flex", flexDirection: "column", gap: 13 }}>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, color: INK }}>{title}</div>
        <div style={{ fontSize: 12, color: AMBER, marginTop: 3, lineHeight: 1.5 }}>
          <span style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: 10 }}>why you care · </span>
          {why}
        </div>
      </div>
      {children}
    </div>
  );
}

// ---------------- 1. SIGMOID ----------------

function SigmoidViz({ b0, b1, x, active, pal }) {
  const W = 360, H = 210, L = 30, R = 12, T = 12, B = 24;
  const px = (v) => L + ((v + 6) / 12) * (W - L - R);
  const py = (v) => H - B - v * (H - T - B);
  const pts = [];
  for (let xx = -6; xx <= 6.001; xx += 0.12) {
    const s = 1 / (1 + Math.exp(-(b0 + b1 * xx)));
    pts.push(`${px(xx).toFixed(1)},${py(s).toFixed(1)}`);
  }
  const s = 1 / (1 + Math.exp(-(b0 + b1 * x)));
  const mid = b1 !== 0 ? -b0 / b1 : 0;
  const curveColor = active === "b1" ? pal.b1 : active === "sig" || active === "ez" ? pal.sig : "#3f74d4";
  const curveHot = active === "sig" || active === "ez" || active === "b1";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      {[0, 0.5, 1].map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={py(g)} y2={py(g)} stroke={LINE} strokeDasharray="3 4" />
          <text x={4} y={py(g) + 4} fill={DIM} fontSize="10">{g}</text>
        </g>
      ))}
      <line x1={px(0)} x2={px(0)} y1={py(0)} y2={py(1)} stroke={LINE} />
      {active === "b0" && mid > -6 && mid < 6 && (
        <g>
          <line x1={px(mid)} x2={px(mid)} y1={py(0)} y2={py(1)} stroke={pal.b0} strokeDasharray="4 4" />
          <text x={px(mid) + 5} y={T + 10} fill={pal.b0} fontSize="10">center = −β₀/β₁</text>
        </g>
      )}
      <polyline points={pts.join(" ")} fill="none" stroke={curveColor} strokeWidth={curveHot ? 3.5 : 2.5} />
      <line x1={px(x)} x2={px(x)} y1={py(0)} y2={py(s)} stroke={pal.x} strokeDasharray="3 3" opacity={active === "x" ? 1 : 0.45} strokeWidth={active === "x" ? 2 : 1} />
      <line x1={L} x2={px(x)} y1={py(s)} y2={py(s)} stroke={pal.pd} strokeDasharray="3 3" opacity={active === "pd" ? 1 : 0.45} strokeWidth={active === "pd" ? 2 : 1} />
      <circle cx={px(x)} cy={py(s)} r={active === "pd" || active === "x" ? 6.5 : 4.5} fill={pal.pd} />
      <text x={px(x) > W - 110 ? px(x) - 8 : px(x) + 8} y={py(s) - 9} fill={pal.pd} fontSize="12" fontWeight="700" textAnchor={px(x) > W - 110 ? "end" : "start"}>
        PD = {s.toFixed(3)}
      </text>
      <text x={W - R} y={H - 8} fill={DIM} fontSize="10" textAnchor="end">x →</text>
    </svg>
  );
}

function SigmoidModule() {
  const A = useActive();
  const [b0, setB0] = useState(-1);
  const [b1, setB1] = useState(1.2);
  const [x, setX] = useState(1.5);
  const pal = { pd: GREEN, sig: CYAN, b0: AMBER, b1: ROSE, x: BLUE, ez: VIOLET };
  const parts = {
    pd: ["PD", "the output: probability of default, trapped in (0,1). No clamping needed — the shape guarantees it."],
    sig: ["σ — the squasher", "takes any number from −∞ to +∞ and compresses it into (0,1). That is its entire job."],
    b0: ["β₀ — baseline", "risk before the feature says anything. Slides the whole S-curve left or right; never changes its steepness."],
    b1: ["β₁ — sensitivity", "how steeply risk climbs per unit of x. Crank it past 3 and the gentle ramp becomes a cliff. Make it negative and the curve flips."],
    x: ["x — the feature", "DTI, LTV, FICO… where this borrower sits on the axis."],
    ez: ["e⁻ᶻ — the engine", "large z ⇒ e⁻ᶻ → 0 ⇒ PD → 1. Very negative z ⇒ e⁻ᶻ explodes ⇒ PD → 0. This one term creates the S."],
  };
  return (
    <Section title="The Sigmoid · σ" why="this is your PD model. Every logistic regression you've shipped is this one line.">
      <EqLine
        A={A} palette={pal}
        tokens={[
          { t: "PD", part: "pd" }, { t: " = " }, { t: "σ", part: "sig" }, { t: "(" },
          { t: "β₀", part: "b0" }, { t: " + " }, { t: "β₁", part: "b1" }, { t: "x", part: "x" }, { t: ")" },
        ]}
      />
      <EqLine
        A={A} palette={pal} size={17}
        tokens={[
          { t: "where  " }, { t: "σ(z)", part: "sig" }, { t: " = 1 ⁄ (1 + " }, { t: "e⁻ᶻ", part: "ez" }, { t: ")" },
        ]}
      />
      <Explain A={A} parts={parts} palette={pal}
        fallback={'Read aloud: "baseline plus weighted feature, squashed into a probability." Tap any colored symbol — it lights up here, in the code, and in the picture.'} />
      <CodeLine
        A={A} palette={pal}
        tokens={[
          { t: "pd", part: "pd" }, { t: " = " }, { t: "1/(1 + ", part: "sig" }, { t: "np.exp", part: "ez" },
          { t: "(-(" }, { t: "b0", part: "b0" }, { t: " + " }, { t: "b1", part: "b1" }, { t: "*" },
          { t: "x", part: "x" }, { t: ")))" },
        ]}
      />
      <SigmoidViz b0={b0} b1={b1} x={x} active={A.active} pal={pal} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Slider label="β₀ baseline" value={b0} set={setB0} min={-5} max={5} color={AMBER} />
        <Slider label="β₁ sensitivity" value={b1} set={setB1} min={-4} max={4} color={ROSE} />
        <Slider label="x feature" value={x} set={setX} min={-6} max={6} color={BLUE} />
      </div>
    </Section>
  );
}

// ---------------- 2. SUMMATION / EXPECTATION ----------------

function SumViz({ xs, ps, E, active, pal, labels }) {
  const W = 360, H = 185, L = 22, R = 16, base = 138;
  const px = (v) => L + (v / 100) * (W - L - R);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
      <line x1={L} x2={W - R} y1={base} y2={base} stroke="#39435a" strokeWidth="1.5" />
      {xs.map((v, i) => {
        const h = ps[i] * 110;
        const hot = active === "p" || active === "sum";
        return (
          <g key={i}>
            <line x1={px(v)} x2={px(v)} y1={base} y2={base - h} stroke={hot ? pal.p : "#5b6680"} strokeWidth={hot ? 5 : 4} opacity={hot ? 1 : 0.8} />
            <circle cx={px(v)} cy={base - h} r={hot ? 6 : 5} fill={pal.p} opacity={hot ? 1 : 0.85} />
            <text x={px(v)} y={base - h - 9} fill={pal.p} fontSize="10" textAnchor="middle">{(ps[i] * 100).toFixed(0)}%</text>
            <text x={px(v)} y={base + 14} fill={active === "x" ? pal.x : DIM} fontSize="10" textAnchor="middle" fontWeight={active === "x" ? 700 : 400}>{v}</text>
            <text x={px(v)} y={base + 27} fill={DIM} fontSize="8.5" textAnchor="middle">{labels[i]}</text>
          </g>
        );
      })}
      <g>
        <path d={`M ${px(E)} ${base + 2} l 7 11 l -14 0 Z`} fill={pal.E} />
        <text x={px(E)} y={base + 44} fill={pal.E} fontSize={active === "E" ? 14 : 12} fontWeight="700" textAnchor="middle">
          E[X] = {E.toFixed(1)}
        </text>
      </g>
    </svg>
  );
}

function SumModule() {
  const A = useActive();
  const [w, setW] = useState([6, 2, 1.5, 0.6]);
  const xs = [0, 10, 40, 100];
  const labels = ["no default", "cure", "partial loss", "wipeout"];
  const tot = w.reduce((a, b) => a + b, 0);
  const ps = w.map((v) => v / tot);
  const E = ps.reduce((acc, p, i) => acc + p * xs[i], 0);
  const pal = { E: GREEN, sum: CYAN, p: AMBER, x: BLUE };
  const parts = {
    E: ["E[X] — expectation", "the long-run average. The center of mass of the distribution — the triangle is literally where the picture balances."],
    sum: ["Σ — a for-loop", 'nothing mystical. Σᵢ means "loop over i and add up." Every intimidating Σ in a paper is three lines of Python.'],
    p: ["pᵢ — the weights", "how much each scenario counts. Pile probability onto wipeout and watch the triangle slide right."],
    x: ["xᵢ — the values", "what you lose in scenario i (here: loss per ₹100 of exposure)."],
  };
  return (
    <Section title="Summation & Expectation · Σ, E[·]" why="EL = PD × LGD × EAD is an expectation in disguise — a Σ over default scenarios. CCAR is this Σ under a stressed distribution.">
      <EqLine
        A={A} palette={pal}
        tokens={[
          { t: "E[X]", part: "E" }, { t: " = " }, { t: "Σᵢ", part: "sum" }, { t: "  " },
          { t: "pᵢ", part: "p" }, { t: " · " }, { t: "xᵢ", part: "x" },
        ]}
      />
      <Explain A={A} parts={parts} palette={pal}
        fallback={'Read aloud: "for every scenario, multiply value by probability, add it all up." Drag the sliders to move probability mass and watch the balance point.'} />
      <CodeLine
        A={A} palette={pal}
        tokens={[
          { t: "ev", part: "E" }, { t: " = " }, { t: "sum(", part: "sum" }, { t: "p[i]", part: "p" },
          { t: " * " }, { t: "x[i]", part: "x" }, { t: " for i in range(n)", part: "sum" }, { t: ")", part: "sum" },
        ]}
      />
      <SumViz xs={xs} ps={ps} E={E} active={A.active} pal={pal} labels={labels} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {labels.map((lb, i) => (
          <Slider
            key={i} label={lb} value={w[i]} min={0.05} max={10} color={AMBER}
            fmt={() => (ps[i] * 100).toFixed(0) + "%"}
            set={(v) => setW(w.map((o, j) => (j === i ? v : o)))}
          />
        ))}
      </div>
    </Section>
  );
}

// ---------------- 3. SOFTMAX ----------------

function SoftmaxModule() {
  const A = useActive();
  const [z, setZ] = useState([2.0, 0.5, -1.0, 1.2]);
  const [T, setT] = useState(1);
  const ps = softmaxArr(z.map((v) => v / T));
  const pal = { pi: GREEN, num: VIOLET, z: BLUE, T: ROSE, den: CYAN };
  const parts = {
    pi: ["P(i)", "class i's share of belief. Every share is positive and they sum to exactly 1 — a probability distribution from raw scores."],
    num: ["eᶻ — amplify", "exponentiation makes every score positive and exaggerates gaps: a lead of +2 in logits becomes ~7.4× the weight."],
    z: ["zᵢ — logits", "raw, unbounded scores straight out of the model. Meaningless alone — only the gaps between them matter. Add 100 to all of them: nothing changes."],
    T: ["T — temperature", "divide logits before exponentiating. T → 0: winner-take-all (argmax). T → ∞: everyone equal. Drag it and watch the bars."],
    den: ["Σ — normalize", "divide by the total so everything sums to 1. This denominator is the entire difference between scores and probabilities."],
  };
  return (
    <Section title="Softmax & Temperature" why="the output layer of every classifier you'll build — and the beating heart of attention, one tab over.">
      <EqLine
        A={A} palette={pal}
        tokens={[
          { t: "P(i)", part: "pi" }, { t: " = " },
          { t: "e", part: "num" },
          { t: <sup>zᵢ</sup>, part: "z" },
          { t: <sup>/T</sup>, part: "T" },
          { t: " ⁄ " },
          { t: <span>Σⱼ e<sup>zⱼ/T</sup></span>, part: "den" },
        ]}
      />
      <Explain A={A} parts={parts} palette={pal}
        fallback={'Read aloud: "exponentiate every score, then divide each by the total." Pin T and drag its slider to 0.1, then to 5.'} />
      <CodeLine
        A={A} palette={pal}
        tokens={[
          { t: "p", part: "pi" }, { t: " = " }, { t: "np.exp(", part: "num" }, { t: "z", part: "z" },
          { t: "/T", part: "T" }, { t: ")" }, { t: ";  p /= " }, { t: "p.sum()", part: "den" },
        ]}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {ps.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...MONO, width: 62, fontSize: 12, color: BLUE }}>z{i + 1} = {z[i].toFixed(1)}</span>
            <div style={{ flex: 1, height: 20, background: "#1b2824", borderRadius: 6, overflow: "hidden", border: `1px solid ${LINE}` }}>
              <div style={{ width: `${p * 100}%`, height: "100%", background: GREEN + "cc", transition: "width .25s" }} />
            </div>
            <span style={{ ...MONO, width: 52, textAlign: "right", fontSize: 12, color: GREEN }}>{(p * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {z.map((v, i) => (
          <Slider key={i} label={`logit z${i + 1}`} value={v} min={-4} max={4} color={BLUE} fmt={(x) => x.toFixed(1)}
            set={(nv) => setZ(z.map((o, j) => (j === i ? nv : o)))} />
        ))}
        <Slider label="T temperature" value={T} set={setT} min={0.05} max={5} color={ROSE} />
      </div>
    </Section>
  );
}

// ---------------- 4. ATTENTION ----------------

const ATT_TOKENS = ["the", "loan", "defaulted", "early"];
const ATT_S = [
  [0.2, 0.5, 0.3, 0.1],
  [0.3, 0.4, 1.2, 0.2],
  [0.1, 1.4, 0.5, 0.9],
  [0.2, 0.4, 1.1, 0.6],
];

function AttentionModule() {
  const A = useActive();
  const [qi, setQi] = useState(2);
  const [d, setD] = useState(16);
  const scaled = softmaxArr(ATT_S[qi]);
  const unscaled = softmaxArr(ATT_S[qi].map((v) => v * Math.sqrt(d)));
  const heat = ATT_S.map((row) => softmaxArr(row));
  const pal = { Q: BLUE, K: AMBER, d: ROSE, sm: CYAN, V: GREEN };
  const parts = {
    Q: ["Q — queries", 'each token asks a question: "who here is relevant to me?" One query vector per token. Tap a row label below to choose whose question we follow.'],
    K: ["Kᵀ — keys", "each token's advertisement of what it holds. QKᵀ multiplies every query against every key — the full table of dot-product similarities below."],
    d: ["√d — the pressure valve", "dot products grow like √d as embedding dimension rises. Without this division, scores blow up, softmax saturates to one-hot, and gradients die. Drag d and compare the two bar sets."],
    sm: ["softmax — scores → weights", "turns a row of similarity scores into weights that sum to 1. Same machine as the previous tab."],
    V: ["V — values", "the actual content being mixed. Each token's output is a weighted blend of everyone's values — the weights are the bars below."],
  };
  const barRow = (wts, color, tag) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ fontSize: 11, color: DIM }}>{tag}</div>
      {ATT_TOKENS.map((t, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...MONO, width: 70, fontSize: 11.5, color: DIM }}>{t}</span>
          <div style={{ flex: 1, height: 14, background: "#1b2824", borderRadius: 5, overflow: "hidden", border: `1px solid ${LINE}` }}>
            <div style={{ width: `${wts[i] * 100}%`, height: "100%", background: color, transition: "width .25s" }} />
          </div>
          <span style={{ ...MONO, width: 42, textAlign: "right", fontSize: 11, color }}>{(wts[i] * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
  return (
    <Section title="Attention · QKᵀ/√d" why="the core of your FiLM / transformer build. The whole mechanism is this one line.">
      <EqLine
        A={A} palette={pal} size={23}
        tokens={[
          { t: "Attn = " }, { t: "softmax", part: "sm" }, { t: "(" }, { t: "Q", part: "Q" },
          { t: "Kᵀ", part: "K" }, { t: " ⁄ " }, { t: "√d", part: "d" }, { t: ") " }, { t: "V", part: "V" },
        ]}
      />
      <Explain A={A} parts={parts} palette={pal}
        fallback={'Read aloud: "score every token against every token, scale, turn scores into weights, blend the values." Tap a row label to switch the query token.'} />
      <CodeLine
        A={A} palette={pal}
        tokens={[
          { t: "out = " }, { t: "softmax(", part: "sm" }, { t: "Q", part: "Q" }, { t: " @ " },
          { t: "K.T", part: "K" }, { t: " / " }, { t: "sqrt(d)", part: "d" }, { t: ")", part: "sm" },
          { t: " @ " }, { t: "V", part: "V" },
        ]}
      />
      <div>
        <div style={{ fontSize: 11, color: DIM, marginBottom: 6 }}>
          attention map — rows ask (<span style={{ color: BLUE }}>Q</span>), columns answer (<span style={{ color: AMBER }}>K</span>). Tap a row.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "78px repeat(4, 1fr)", gap: 4 }}>
          <div />
          {ATT_TOKENS.map((t) => (
            <div key={t} style={{ ...MONO, fontSize: 10, color: AMBER, textAlign: "center" }}>{t}</div>
          ))}
          {ATT_TOKENS.map((t, r) => (
            <React.Fragment key={t}>
              <div
                onClick={() => setQi(r)}
                style={{
                  ...MONO, fontSize: 11, padding: "8px 4px", cursor: "pointer", borderRadius: 6,
                  color: r === qi ? "#0D1412" : BLUE, textAlign: "center",
                  background: r === qi ? BLUE : "transparent", border: `1px solid ${r === qi ? BLUE : LINE}`,
                  fontWeight: r === qi ? 700 : 400, transition: "all .15s",
                }}
              >
                {t}
              </div>
              {heat[r].map((wv, c) => (
                <div
                  key={c}
                  style={{
                    height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                    background: `rgba(52, 214, 242, ${0.06 + wv * 0.72})`,
                    outline: r === qi ? `1px solid ${CYAN}88` : "none",
                    color: wv > 0.35 ? "#06222a" : "#9fb6c4", ...MONO, fontSize: 10,
                  }}
                >
                  {wv.toFixed(2)}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {barRow(scaled, CYAN + "cc", `where "${ATT_TOKENS[qi]}" looks — WITH ÷√d  (stable as d grows)`)}
        {barRow(unscaled, ROSE + "cc", "WITHOUT ÷√d — raw dot products grow with d, softmax saturates")}
      </div>
      <Slider label="d embedding dimension" value={d} set={setD} min={1} max={64} step={1} color={ROSE} fmt={(v) => v.toFixed(0)} />
    </Section>
  );
}

// ---------------- 5. GRADIENT DESCENT ----------------

const gdL = (t) => 0.05 * t ** 4 - 0.8 * t ** 2 + 0.3 * t + 4;
const gdG = (t) => 0.2 * t ** 3 - 1.6 * t + 0.3;

function GDModule() {
  const A = useActive();
  const [eta, setEta] = useState(0.12);
  const [trail, setTrail] = useState([4.2]);
  const [diverged, setDiverged] = useState(false);
  const th = trail[trail.length - 1];
  const pal = { th: BLUE, arrow: CYAN, eta: ROSE, grad: AMBER };
  const parts = {
    th: ["θ — the knob", "the parameter being tuned. In your PD model it's the βs; in a transformer it's a hundred million of these, all updated by this same line."],
    arrow: ["← an update, not an equation", "this is assignment inside a loop, not algebra. Training a model = run this one line until the loss stops falling."],
    eta: ["η — stride length", "too small: you crawl for epochs. Too big: you overshoot the valley and explode. Set η above 1.0, press ×10, and watch it diverge."],
    grad: ["∇L — slope under your feet", "the gradient points uphill, so we subtract it to walk downhill. Backprop is just the machinery for computing this."],
  };
  const step = (n) => {
    if (diverged) return;
    let t = th;
    const tr = [...trail];
    for (let i = 0; i < n; i++) {
      t = t - eta * gdG(t);
      if (!isFinite(t) || Math.abs(t) > 8) { setDiverged(true); break; }
      tr.push(t);
    }
    setTrail(tr.slice(-90));
  };
  const reset = () => { setTrail([4.2]); setDiverged(false); };
  const W = 360, H = 215, L = 26, R = 12, T = 10, B = 22;
  const px = (v) => L + ((v + 4.6) / 9.2) * (W - L - R);
  const py = (v) => H - B - ((v + 0.6) / 10.8) * (H - T - B);
  const pts = [];
  for (let t = -4.6; t <= 4.601; t += 0.08) pts.push(`${px(t).toFixed(1)},${py(gdL(t)).toFixed(1)}`);
  const btn = (label, fn, primary) => (
    <button
      onClick={fn}
      style={{
        ...MONO, fontSize: 13, padding: "9px 16px", borderRadius: 8, cursor: "pointer",
        background: primary ? BLUE : "transparent", color: primary ? "#0D1412" : INK,
        border: `1px solid ${primary ? BLUE : "#39435a"}`, fontWeight: 600,
      }}
    >
      {label}
    </button>
  );
  return (
    <Section title="Gradient Descent · ∇" why="how every β and every attention weight gets found. Bonus: watch the ball settle in the shallow right valley — a local minimum. That's why initialization and LR schedules exist.">
      <EqLine
        A={A} palette={pal}
        tokens={[
          { t: "θ", part: "th" }, { t: " ← ", part: "arrow" }, { t: "θ", part: "th" }, { t: " − " },
          { t: "η", part: "eta" }, { t: " · " }, { t: "∇L(θ)", part: "grad" },
        ]}
      />
      <Explain A={A} parts={parts} palette={pal}
        fallback={'Read aloud: "new position = old position, minus a stride downhill." Press Step. Then crank η past 1.0 and press ×10.'} />
      <CodeLine
        A={A} palette={pal}
        tokens={[
          { t: "theta", part: "th" }, { t: " -= ", part: "arrow" }, { t: "lr", part: "eta" },
          { t: " * " }, { t: "grad(theta)", part: "grad" },
        ]}
      />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <polyline points={pts.join(" ")} fill="none" stroke="#3f74d4" strokeWidth="2.5" />
        {trail.map((t, i) => (
          <circle key={i} cx={px(t)} cy={py(gdL(t))} r={3} fill={BLUE} opacity={0.12 + (0.55 * i) / trail.length} />
        ))}
        {!diverged && (
          <g>
            {(A.active === "grad") && (
              <line
                x1={px(th)} y1={py(gdL(th))}
                x2={px(th) + Math.sign(gdG(th)) * 34} y2={py(gdL(th)) + Math.abs(gdG(th)) * 6}
                stroke={AMBER} strokeWidth="2.5" markerEnd="" />
            )}
            <circle cx={px(th)} cy={py(gdL(th))} r={7} fill={BLUE} stroke="#1b302e" strokeWidth="1.5" />
          </g>
        )}
        <text x={W - R} y={H - 7} fill={DIM} fontSize="10" textAnchor="end">θ →</text>
        <text x={6} y={T + 8} fill={DIM} fontSize="10">L(θ)</text>
        {diverged && (
          <text x={W / 2} y={T + 26} fill={ROSE} fontSize="14" fontWeight="700" textAnchor="middle">
            diverged 💥 — η too big. Reset.
          </text>
        )}
      </svg>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {btn("step", () => step(1), true)}
        {btn("×10", () => step(10), false)}
        {btn("reset", reset, false)}
        <span style={{ ...MONO, fontSize: 12, color: DIM }}>
          θ = <span style={{ color: BLUE }}>{diverged ? "∞" : th.toFixed(3)}</span>
          {"   L = "}
          <span style={{ color: GREEN }}>{diverged ? "∞" : gdL(th).toFixed(3)}</span>
        </span>
      </div>
      <Slider label="η learning rate" value={eta} set={setEta} min={0.01} max={1.3} color={ROSE} />
    </Section>
  );
}

// ---------------- 6. GAUSSIAN ----------------

function GaussModule() {
  const A = useActive();
  const [mu, setMu] = useState(0);
  const [sg, setSg] = useState(1);
  const pal = { norm: CYAN, exp: VIOLET, dist: BLUE, mu: AMBER, wid: ROSE };
  const parts = {
    norm: ["1/σ√2π — bookkeeping", "purely a normalizer so total area = 1. The least interesting part of the formula — skip it when reading. Notice it shrinks as σ grows: wider bell, lower peak, same area."],
    exp: ["e^(−·) — decay", "likelihood decays exponentially with squared distance. Far things become absurdly unlikely fast — which is exactly why outliers wreck Gaussian assumptions."],
    dist: ["(x−μ)² — distance", "squared distance from the center. The square is what makes the bell symmetric: 2 above counts the same as 2 below."],
    mu: ["μ — center", "where the bell sits. Pure location — shifts everything, changes no shape."],
    wid: ["2σ² — tolerance", 'the unit of "far." Big σ forgives distance (wide, flat). Small σ punishes it (sharp spike). The shaded band is always μ ± 1σ ≈ 68% of the mass.'],
  };
  const W = 360, H = 200, L = 14, R = 14, T = 10, B = 22;
  const px = (v) => L + ((v + 6) / 12) * (W - L - R);
  const f = (x) => (1 / (sg * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - mu) ** 2) / (2 * sg * sg));
  const py = (v) => H - B - (v / 1.45) * (H - T - B);
  const pts = [];
  for (let x = -6; x <= 6.001; x += 0.08) pts.push(`${px(x).toFixed(1)},${py(f(x)).toFixed(1)}`);
  let band = `M ${px(Math.max(-6, mu - sg)).toFixed(1)} ${py(0).toFixed(1)} `;
  for (let x = Math.max(-6, mu - sg); x <= Math.min(6, mu + sg) + 0.001; x += 0.06)
    band += `L ${px(x).toFixed(1)} ${py(f(x)).toFixed(1)} `;
  band += `L ${px(Math.min(6, mu + sg)).toFixed(1)} ${py(0).toFixed(1)} Z`;
  return (
    <Section title="The Gaussian · 𝒩(μ, σ²)" why="behind every z-score, confidence interval, and the error term in OLS. The shaded band is μ ± 1σ — the famous 68%.">
      <EqLine
        A={A} palette={pal} size={22}
        tokens={[
          { t: "f(x) = " },
          { t: "1 ⁄ σ√2π", part: "norm" },
          { t: " · " },
          { t: "e", part: "exp" },
          { t: <sup>−(x−</sup>, part: "dist" },
          { t: <sup>μ</sup>, part: "mu" },
          { t: <sup>)²</sup>, part: "dist" },
          { t: <sup>/2σ²</sup>, part: "wid" },
        ]}
      />
      <Explain A={A} parts={parts} palette={pal}
        fallback={'Read aloud: "likelihood falls off exponentially with squared distance from the center, in units of σ." Three of the five symbols are bookkeeping. Two carry all the meaning.'} />
      <CodeLine
        A={A} palette={pal}
        tokens={[
          { t: "f = norm.pdf(x, loc=" }, { t: "mu", part: "mu" }, { t: ", scale=" },
          { t: "sigma", part: "wid" }, { t: ")" },
        ]}
      />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <line x1={L} x2={W - R} y1={py(0)} y2={py(0)} stroke="#39435a" />
        <path d={band} fill={A.active === "wid" ? ROSE + "44" : CYAN + "22"} stroke="none" />
        <polyline
          points={pts.join(" ")} fill="none"
          stroke={A.active === "exp" ? VIOLET : A.active === "dist" ? BLUE : "#3f74d4"}
          strokeWidth={A.active === "exp" || A.active === "dist" ? 3.5 : 2.5}
        />
        <line x1={px(mu)} x2={px(mu)} y1={py(0)} y2={py(f(mu))} stroke={pal.mu} strokeDasharray="4 4"
          opacity={A.active === "mu" ? 1 : 0.5} strokeWidth={A.active === "mu" ? 2.2 : 1.2} />
        <text x={px(mu)} y={H - 6} fill={pal.mu} fontSize="11" textAnchor="middle" fontWeight="700">μ</text>
        <text x={px(mu + sg) + 4} y={py(f(mu + sg)) - 6} fill={ROSE} fontSize="10">μ+σ</text>
      </svg>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Slider label="μ center" value={mu} set={setMu} min={-4} max={4} color={AMBER} />
        <Slider label="σ spread" value={sg} set={setSg} min={0.3} max={3} color={ROSE} />
      </div>
    </Section>
  );
}

// ---------------- 7. FiLM ----------------

const FILM_H = [0.8, -0.4, 1.2, 0.3, -0.9, 0.6, -0.2, 1.0];

function FilmModule() {
  const A = useActive();
  const [g, setG] = useState(1);
  const [b, setB] = useState(0);
  const pal = { hout: VIOLET, gam: ROSE, h: BLUE, bet: AMBER, s: GREEN, dot: CYAN };
  const parts = {
    hout: ["h̃ — conditioned embedding", "same loan, now viewed through a scenario's lens. The encoder never re-runs — one embedding, many scenario views."],
    gam: ["γ(s) — scale", "the scenario amplifies or mutes each feature. γ > 1: this feature matters more under stress. γ < 0 flips its meaning entirely."],
    bet: ["β(s) — shift", "the scenario adds a per-feature bias, moving the embedding to a different region of representation space."],
    h: ["h — the loan embedding", "scenario-agnostic output of your encoder. FiLM's bet: stress doesn't need a new representation, just a re-weighting of this one."],
    s: ["s — conditioning signal", "your macro scenario: HPI path, unemployment, rates. A small MLP maps s → (γ, β). Change the scenario, change the lens."],
    dot: ["⊙ — element-wise", "each of the d features gets its own γᵢ and βᵢ. This demo uses one slider for all 8 — the real thing outputs 2d numbers from the film-net."],
  };
  const presets = [
    { n: "baseline", g: 1, b: 0 },
    { n: "adverse", g: 1.5, b: -0.4 },
    { n: "severely adverse", g: 2.3, b: -0.9 },
  ];
  const W = 360, H = 190, L = 14, R = 8;
  const py = (v) => 95 - v * 18;
  return (
    <Section title="FiLM Conditioning" why="your paper's core mechanism. One affine transform per feature, computed from the scenario — that is all FiLM is.">
      <EqLine
        A={A} palette={pal}
        tokens={[
          { t: "h̃", part: "hout" }, { t: " = " }, { t: "γ(s)", part: "gam" }, { t: " ⊙ ", part: "dot" },
          { t: "h", part: "h" }, { t: " + " }, { t: "β(s)", part: "bet" },
        ]}
      />
      <Explain A={A} parts={parts} palette={pal}
        fallback={'Read aloud: "scale every feature, then shift it — with scale and shift dictated by the scenario." Tap the CCAR presets below.'} />
      <CodeLine
        A={A} palette={pal}
        tokens={[
          { t: "g, b = " }, { t: "film_net(s)", part: "s" }, { t: ";  " },
          { t: "h_out", part: "hout" }, { t: " = " }, { t: "g", part: "gam" },
          { t: " * ", part: "dot" }, { t: "h", part: "h" }, { t: " + " }, { t: "b", part: "bet" },
        ]}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {presets.map((p) => {
          const on = Math.abs(g - p.g) < 0.05 && Math.abs(b - p.b) < 0.05;
          return (
            <button
              key={p.n}
              onClick={() => { setG(p.g); setB(p.b); }}
              style={{
                ...MONO, fontSize: 12, padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                background: on ? GREEN : "transparent", color: on ? "#0D1412" : GREEN,
                border: `1px solid ${GREEN}66`, fontWeight: on ? 700 : 400,
              }}
            >
              {p.n}
            </button>
          );
        })}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <line x1={L} x2={W - R} y1={py(0)} y2={py(0)} stroke="#39435a" />
        {FILM_H.map((v, i) => {
          const out = g * v + b;
          const x = L + 14 + i * 42;
          return (
            <g key={i}>
              <rect x={x} width={12} y={Math.min(py(0), py(v))} height={Math.max(1, Math.abs(py(v) - py(0)))}
                fill={A.active === "h" ? BLUE : "#3a4a6b"} rx={2} />
              <rect x={x + 15} width={12} y={Math.min(py(0), py(out))} height={Math.max(1, Math.abs(py(out) - py(0)))}
                fill={VIOLET} rx={2} opacity={0.95} />
              <text x={x + 13} y={H - 8} fill={DIM} fontSize="9" textAnchor="middle">h{i + 1}</text>
            </g>
          );
        })}
        <rect x={L} y={6} width={10} height={10} fill="#3a4a6b" rx={2} />
        <text x={L + 15} y={15} fill={DIM} fontSize="10">h before</text>
        <rect x={L + 76} y={6} width={10} height={10} fill={VIOLET} rx={2} />
        <text x={L + 91} y={15} fill={DIM} fontSize="10">γ·h + β after</text>
      </svg>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Slider label="γ scale" value={g} set={setG} min={-2} max={3} color={ROSE} />
        <Slider label="β shift" value={b} set={setB} min={-1.5} max={1.5} color={AMBER} />
      </div>
    </Section>
  );
}

// ---------------- 8. LOG-LIKELIHOOD ----------------

function LogLikModule() {
  const A = useActive();
  const [y, setY] = useState(1);
  const [p, setP] = useState(0.7);
  const pal = { l: ROSE, y: AMBER, logp: VIOLET, p: GREEN, term2: CYAN };
  const parts = {
    l: ["ℓ — the penalty", "the cost of one prediction. Sum over the portfolio = negative log-likelihood; minimizing it IS fitting your PD model. MLE and log-loss are the same act."],
    y: ["y — the truth", "1 = defaulted, 0 = survived. A switch: it activates exactly one of the two terms and zeroes out the other."],
    logp: ["−log p — the whip", "→ 0 as p → 1 (correct and confident: no pain). → ∞ as p → 0 (confidently wrong: infinite pain). This is why models never output exactly 0 or 1."],
    p: ["p — your predicted PD", "drag it toward the wrong end of the truth and watch the curve explode."],
    term2: ["(1−y)·log(1−p)", "the mirror term for survivors: they punish you by −log(1−p) when you predicted high PD on a loan that performed."],
  };
  const loss = y === 1 ? -Math.log(p) : -Math.log(1 - p);
  const W = 360, H = 200, L = 30, R = 12, T = 12, B = 24;
  const px = (v) => L + ((v - 0.01) / 0.98) * (W - L - R);
  const py = (v) => H - B - (Math.min(v, 4.7) / 4.7) * (H - T - B);
  const pts = [];
  for (let q = 0.01; q <= 0.991; q += 0.005) {
    const lv = y === 1 ? -Math.log(q) : -Math.log(1 - q);
    pts.push(`${px(q).toFixed(1)},${py(lv).toFixed(1)}`);
  }
  return (
    <Section title="Log-Likelihood · Cross-Entropy" why='MLE for logistic regression = minimizing exactly this. When an interviewer says "derive the loss for logistic regression," this is the answer.'>
      <EqLine
        A={A} palette={pal} size={20}
        tokens={[
          { t: "ℓ", part: "l" }, { t: " = −[ " }, { t: "y", part: "y" }, { t: "·" },
          { t: "log ", part: "logp" }, { t: "p", part: "p" }, { t: " + " },
          { t: "(1−y)·log(1−p)", part: "term2" }, { t: " ]" },
        ]}
      />
      <Explain A={A} parts={parts} palette={pal}
        fallback={'Read aloud: "if it defaulted, pay −log p; if it survived, pay −log(1−p)." Toggle the truth, then drag p toward the wrong end.'} />
      <CodeLine
        A={A} palette={pal}
        tokens={[
          { t: "loss", part: "l" }, { t: " = -(" }, { t: "y", part: "y" }, { t: "*" },
          { t: "np.log(", part: "logp" }, { t: "p", part: "p" }, { t: ")", part: "logp" },
          { t: " + " }, { t: "(1-y)*np.log(1-p)", part: "term2" }, { t: ")" },
        ]}
      />
      <div style={{ display: "flex", gap: 8 }}>
        {[1, 0].map((v) => (
          <button
            key={v}
            onClick={() => setY(v)}
            style={{
              ...MONO, fontSize: 12.5, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
              background: y === v ? AMBER : "transparent", color: y === v ? "#0D1412" : AMBER,
              border: `1px solid ${AMBER}66`, fontWeight: y === v ? 700 : 400,
            }}
          >
            y = {v} {v === 1 ? "(defaulted)" : "(survived)"}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        {[0, 1, 2, 3, 4].map((gl) => (
          <g key={gl}>
            <line x1={L} x2={W - R} y1={py(gl)} y2={py(gl)} stroke={LINE} strokeDasharray="3 4" />
            <text x={4} y={py(gl) + 3} fill={DIM} fontSize="9">{gl}</text>
          </g>
        ))}
        <polyline points={pts.join(" ")} fill="none" stroke={A.active === "logp" || A.active === "term2" ? VIOLET : "#3f74d4"} strokeWidth={2.5} />
        <line x1={px(p)} x2={px(p)} y1={py(0)} y2={py(loss)} stroke={GREEN} strokeDasharray="3 3" opacity={0.6} />
        <circle cx={px(p)} cy={py(loss)} r={6} fill={ROSE} />
        <text x={px(p) > W - 120 ? px(p) - 10 : px(p) + 10} y={py(loss) - 9} fill={ROSE} fontSize="12" fontWeight="700"
          textAnchor={px(p) > W - 120 ? "end" : "start"}>
          ℓ = {loss.toFixed(2)}
        </text>
        <text x={W - R} y={H - 8} fill={DIM} fontSize="10" textAnchor="end">predicted p →</text>
      </svg>
      <Slider label="p predicted PD" value={p} set={setP} min={0.01} max={0.99} color={GREEN} />
    </Section>
  );
}

// ---------------- 9. KL DIVERGENCE ----------------

function KLModule() {
  const A = useActive();
  const P = [0.4, 0.3, 0.2, 0.1];
  const [wq, setWq] = useState([1, 1, 1, 1]);
  const tq = wq.reduce((a, b) => a + b, 0);
  const Q = wq.map((v) => Math.max(v / tq, 0.001));
  const kl = P.reduce((acc, pv, i) => acc + pv * Math.log(pv / Q[i]), 0);
  const klRev = Q.reduce((acc, qv, i) => acc + qv * Math.log(qv / P[i]), 0);
  const pal = { kl: ROSE, P: BLUE, Q: AMBER, ratio: VIOLET, sum: CYAN };
  const parts = {
    kl: ["KL(P‖Q) — the surprise bill", "how surprised you are using Q as your model when reality is P. Zero iff identical; never negative; measured in nats here."],
    P: ["P — reality", "e.g., this quarter's live score distribution. Fixed here at 40 / 30 / 20 / 10%."],
    Q: ["Q — your reference", "e.g., the development-sample distribution your model was built on. Drag its sliders away from P and watch the bill grow."],
    ratio: ["log(p/q) — surprise per bucket", "p > q: reality shows up here more than your model expected — positive contribution. p < q: negative contribution."],
    sum: ["Σ p·(...) — expectation under reality", "average surprise, weighted by what actually happens. Mismatch in buckets reality rarely visits costs little."],
  };
  return (
    <Section title="KL Divergence" why="PSI — the drift metric you already run in model monitoring — is symmetrized KL with the same p·log(p/q) core. You have been computing this for years.">
      <EqLine
        A={A} palette={pal} size={21}
        tokens={[
          { t: "KL(", part: "kl" }, { t: "P", part: "P" }, { t: "‖", part: "kl" }, { t: "Q", part: "Q" },
          { t: ")", part: "kl" }, { t: " = " }, { t: "Σᵢ pᵢ", part: "sum" }, { t: " · " },
          { t: "log(pᵢ ⁄ qᵢ)", part: "ratio" },
        ]}
      />
      <Explain A={A} parts={parts} palette={pal}
        fallback={'Read aloud: "the average surprise of believing Q when reality is P." Match Q to P and watch KL hit zero. Then starve one bucket.'} />
      <CodeLine
        A={A} palette={pal}
        tokens={[
          { t: "kl", part: "kl" }, { t: " = " }, { t: "np.sum(", part: "sum" }, { t: "p", part: "P" },
          { t: " * " }, { t: "np.log(p/q)", part: "ratio" }, { t: ")", part: "sum" },
        ]}
      />
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <div style={{ ...MONO, fontSize: 13 }}>
          <span style={{ color: DIM }}>KL(P‖Q) = </span>
          <span style={{ color: ROSE, fontWeight: 700, fontSize: 16 }}>{kl.toFixed(3)}</span>
        </div>
        <div style={{ ...MONO, fontSize: 13 }}>
          <span style={{ color: DIM }}>KL(Q‖P) = </span>
          <span style={{ color: "#c98896", fontWeight: 700 }}>{klRev.toFixed(3)}</span>
          <span style={{ color: "#69746e", fontSize: 11 }}>  ← different: not symmetric</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {P.map((pv, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...MONO, width: 56, fontSize: 11, color: DIM }}>bucket {i + 1}</span>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ height: 11, background: "#1b2824", borderRadius: 4, overflow: "hidden", border: `1px solid ${LINE}` }}>
                <div style={{ width: `${pv * 100}%`, height: "100%", background: BLUE + "cc" }} />
              </div>
              <div style={{ height: 11, background: "#1b2824", borderRadius: 4, overflow: "hidden", border: `1px solid ${LINE}` }}>
                <div style={{ width: `${Q[i] * 100}%`, height: "100%", background: AMBER + "cc", transition: "width .2s" }} />
              </div>
            </div>
            <span style={{ ...MONO, width: 76, fontSize: 10.5, textAlign: "right" }}>
              <span style={{ color: BLUE }}>{(pv * 100).toFixed(0)}%</span>
              <span style={{ color: DIM }}> / </span>
              <span style={{ color: AMBER }}>{(Q[i] * 100).toFixed(0)}%</span>
            </span>
          </div>
        ))}
        <div style={{ fontSize: 10.5, color: DIM }}>
          <span style={{ color: BLUE }}>■ P reality</span>{"   "}<span style={{ color: AMBER }}>■ Q model</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {wq.map((v, i) => (
          <Slider key={i} label={`q bucket ${i + 1}`} value={v} min={0.05} max={6} color={AMBER}
            fmt={() => (Q[i] * 100).toFixed(0) + "%"}
            set={(nv) => setWq(wq.map((o, j) => (j === i ? nv : o)))} />
        ))}
      </div>
    </Section>
  );
}

// ---------------- 10. LAYERNORM ----------------

const LN_H = [0.5, -0.3, 0.9, 0.2, -0.6, 0.4, 1.1, -0.8];

function LayerNormModule() {
  const A = useActive();
  const [o, setO] = useState(0);
  const [g, setG] = useState(1);
  const [b, setB] = useState(0);
  const pal = { mu: AMBER, sig: ROSE, gam: GREEN, bet: VIOLET, h: BLUE };
  const raw = LN_H.map((v, i) => (i === 2 ? v + o : v));
  const mu = raw.reduce((a, v) => a + v, 0) / raw.length;
  const sd = Math.sqrt(raw.reduce((a, v) => a + (v - mu) ** 2, 0) / raw.length) || 1;
  const out = raw.map((v) => ((v - mu) / sd) * g + b);
  const parts = {
    mu: ["μ — mean across features", "computed per sample, per layer, on the fly — from this one loan's activations, not a batch statistic. That is the Layer in LayerNorm."],
    sig: ["σ — std across features", "divide by it and every downstream layer sees inputs at a standard scale, no matter how wild the raw activations got."],
    gam: ["γ — learnable scale", "a fixed, learned constant per feature. Sound familiar? It is FiLM's γ — except FiLM computes it dynamically from a conditioning signal."],
    bet: ["β — learnable shift", "lets the network undo or reshape the normalization if useful. Forcing strict mean-0/std-1 would shrink what the layer can express."],
    h: ["h — raw activations", "left alone, these drift to extreme scales as depth grows, and gradients die. Drag the outlier slider and watch raw escape while normalized stays calm."],
  };
  const W = 360, H = 195, L = 14, R = 8;
  const py = (v) => 118 - v * 11.5;
  return (
    <Section title="LayerNorm" why="inside every transformer block, twice. And its γ, β pair is exactly the hook that FiLM hijacks — one tab back.">
      <EqLine
        A={A} palette={pal} size={22}
        tokens={[
          { t: "h̃ = (" }, { t: "h", part: "h" }, { t: " − " }, { t: "μ", part: "mu" },
          { t: ") ⁄ " }, { t: "σ", part: "sig" }, { t: " · " }, { t: "γ", part: "gam" },
          { t: " + " }, { t: "β", part: "bet" },
        ]}
      />
      <Explain A={A} parts={parts} palette={pal}
        fallback={'Read aloud: "center, rescale to unit spread, then let the network re-style it." Drag the outlier slider to 6 and compare the two bar sets.'} />
      <CodeLine
        A={A} palette={pal}
        tokens={[
          { t: "h_n = (" }, { t: "h", part: "h" }, { t: " - " }, { t: "h.mean()", part: "mu" },
          { t: ") / " }, { t: "h.std()", part: "sig" }, { t: ";  out = " }, { t: "g", part: "gam" },
          { t: "*h_n + " }, { t: "b", part: "bet" },
        ]}
      />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <line x1={L} x2={W - R} y1={py(0)} y2={py(0)} stroke="#39435a" />
        {A.active === "mu" && <line x1={L} x2={W - R} y1={py(mu)} y2={py(mu)} stroke={AMBER} strokeDasharray="4 4" />}
        {raw.map((v, i) => {
          const x = L + 14 + i * 42;
          return (
            <g key={i}>
              <rect x={x} width={12} y={Math.min(py(0), py(v))} height={Math.max(1, Math.abs(py(v) - py(0)))}
                fill={A.active === "h" ? BLUE : "#3a4a6b"} rx={2} />
              <rect x={x + 15} width={12} y={Math.min(py(0), py(out[i]))} height={Math.max(1, Math.abs(py(out[i]) - py(0)))}
                fill={CYAN} rx={2} opacity={0.95} />
              <text x={x + 13} y={H - 8} fill={DIM} fontSize="9" textAnchor="middle">h{i + 1}</text>
            </g>
          );
        })}
        <rect x={L} y={6} width={10} height={10} fill="#3a4a6b" rx={2} />
        <text x={L + 15} y={15} fill={DIM} fontSize="10">raw</text>
        <rect x={L + 50} y={6} width={10} height={10} fill={CYAN} rx={2} />
        <text x={L + 65} y={15} fill={DIM} fontSize="10">after LN</text>
        <text x={W - R} y={15} fill={DIM} fontSize="10" textAnchor="end">μ = {mu.toFixed(2)}  σ = {sd.toFixed(2)}</text>
      </svg>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Slider label="outlier on h₃" value={o} set={setO} min={0} max={8} color={BLUE} fmt={(v) => "+" + v.toFixed(1)} />
        <Slider label="γ scale" value={g} set={setG} min={0.2} max={2.5} color={GREEN} />
        <Slider label="β shift" value={b} set={setB} min={-1.5} max={1.5} color={VIOLET} />
      </div>
    </Section>
  );
}

// ---------------- 11. QUIZ ----------------

const QBANK = QUESTIONS.map(q => ({ ...q }));  // loaded from content/questions.json (content-driven)

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const QTOPICS = ["all", ...Array.from(new Set(QBANK.map((q) => q.t)))];

function buildDeck(topic) {
  const pool = topic === "all" ? QBANK : QBANK.filter((q) => q.t === topic);
  return shuffle(pool).map((q) => {
    const order = shuffle([0, 1, 2, 3]);
    return { ...q, opts: order.map((i) => q.o[i]), correct: order.indexOf(0) };
  });
}

function QuizModule() {
  const [topic, setTopic] = useState("all");
  const [deck, setDeck] = useState(() => buildDeck("all"));
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState(null);
  const [sc, setSc] = useState({ right: 0, total: 0, streak: 0, best: 0 });
  const [allTimeBest, setAllTimeBest] = useState(0);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await storage.get("mil:bestStreak");
        if (alive && r && r.value) setAllTimeBest(parseInt(r.value, 10) || 0);
      } catch (e) { /* no key yet */ }
    };
    pull();
    // re-pull when sign-in state changes (syncs streak across devices)
    const off = auth.enabled ? auth.onChange(() => pull()) : null;
    return () => { alive = false; if (off) off(); };
  }, []);

  const q = deck[idx];
  const pick = (i) => {
    if (sel !== null) return;
    setSel(i);
    const ok = i === q.correct;
    setSc((s) => {
      const newStreak = ok ? s.streak + 1 : 0;
      if (newStreak > allTimeBest) {
        setAllTimeBest(newStreak);
        try { if (storage) storage.set("mil:bestStreak", String(newStreak)); } catch (e) {}
      }
      return {
        right: s.right + (ok ? 1 : 0),
        total: s.total + 1,
        streak: newStreak,
        best: Math.max(s.best, newStreak),
      };
    });
  };
  const next = () => {
    setSel(null);
    if (idx + 1 >= deck.length) { setDeck(buildDeck(topic)); setIdx(0); }
    else setIdx(idx + 1);
  };
  const changeTopic = (t) => { setTopic(t); setDeck(buildDeck(t)); setIdx(0); setSel(null); };
  return (
    <Section title="Interview Gauntlet" why="every question mirrors a real interview probe. The explanation after each answer is the intuition the interviewer is actually testing for.">
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {QTOPICS.map((t) => (
          <button
            key={t}
            onClick={() => changeTopic(t)}
            style={{
              ...MONO, fontSize: 11, padding: "6px 10px", borderRadius: 999, whiteSpace: "nowrap",
              cursor: "pointer", flexShrink: 0,
              background: topic === t ? AMBER : "transparent",
              color: topic === t ? "#0D1412" : DIM,
              border: `1px solid ${topic === t ? AMBER : "#34413b"}`,
              fontWeight: topic === t ? 700 : 400,
            }}
          >
            {t} · {t === "all" ? QBANK.length : QBANK.filter((x) => x.t === t).length}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", ...MONO, fontSize: 12, color: DIM, flexWrap: "wrap", gap: 4 }}>
        <span>Q {idx + 1}/{deck.length} · <span style={{ color: CYAN }}>{q.t}</span></span>
        <span>
          <span style={{ color: GREEN }}>{sc.right}</span>/{sc.total}
          {" · streak "}<span style={{ color: AMBER }}>{sc.streak}</span>
          {" · best "}<span style={{ color: ROSE }}>{sc.best}</span>
          {" · all-time "}<span style={{ color: VIOLET }}>{allTimeBest}</span>
        </span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: INK, lineHeight: 1.5 }}>{q.q}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.opts.map((opt, i) => {
          let bg = "transparent", bd = "#34413b", col = INK;
          if (sel !== null) {
            if (i === q.correct) { bg = GREEN + "22"; bd = GREEN; col = GREEN; }
            else if (i === sel) { bg = ROSE + "22"; bd = ROSE; col = ROSE; }
            else { col = "#5a647a"; }
          }
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              style={{
                textAlign: "left", fontSize: 13.5, lineHeight: 1.45, padding: "11px 13px",
                borderRadius: 9, cursor: sel === null ? "pointer" : "default",
                background: bg, color: col, border: `1px solid ${bd}`,
                fontFamily: "inherit", transition: "all .15s",
              }}
            >
              <span style={{ ...MONO, color: sel === null ? DIM : col, marginRight: 8 }}>{"ABCD"[i]}</span>
              {opt}
            </button>
          );
        })}
      </div>
      {sel !== null && (
        <div style={{
          background: PANEL2, borderRadius: 8, padding: "11px 13px", fontSize: 13.5, lineHeight: 1.55,
          border: `1px solid ${sel === q.correct ? GREEN + "55" : ROSE + "55"}`,
          borderLeft: `3px solid ${sel === q.correct ? GREEN : ROSE}`,
        }}>
          <b style={{ color: sel === q.correct ? GREEN : ROSE }}>
            {sel === q.correct ? "Correct." : "Not quite."}
          </b>{" "}
          <span style={{ color: INK }}>{q.w}</span>
        </div>
      )}
      {sel !== null && (
        <button
          onClick={next}
          style={{
            ...MONO, fontSize: 14, padding: "11px 0", borderRadius: 9, cursor: "pointer",
            background: BLUE, color: "#0D1412", border: "none", fontWeight: 700, width: "100%",
          }}
        >
          next →
        </button>
      )}
    </Section>
  );
}

// ---------------- 12. ROC / AUC / KS ----------------

function ncdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

function ROCModule() {
  const A = useActive();
  const [mb, setMb] = useState(0.65);
  const [thr, setThr] = useState(0.55);
  const mg = 0.4, sg = 0.1, sb = 0.12;
  const tpr = 1 - ncdf((thr - mb) / sb);
  const fpr = 1 - ncdf((thr - mg) / sg);
  const auc = ncdf((mb - mg) / Math.sqrt(sb * sb + sg * sg));
  let ks = 0;
  const roc = [];
  for (let t = 1.2; t >= -0.2; t -= 0.01) {
    const tp = 1 - ncdf((t - mb) / sb), fp = 1 - ncdf((t - mg) / sg);
    roc.push([fp, tp]);
    if (tp - fp > ks) ks = tp - fp;
  }
  const pal = { auc: GREEN, gini: VIOLET, tpr: CYAN, fpr: ROSE, ks: AMBER, t: BLUE };
  const parts = {
    auc: ["AUC — ranking quality", "the probability that a random defaulter scores above a random good loan. Threshold-free, prevalence-free. 0.5 = coin flip, 1.0 = perfect separation."],
    gini: ["Gini = 2·AUC − 1", "the same number rescaled to (0,1) — the scorecard convention. AUC 0.75 ⟺ Gini 0.50. Saying the conversion out loud is a credit-domain credibility marker."],
    tpr: ["TPR (recall) — catch rate", "of the loans that actually default, the share you flag at this threshold. P(s > t | bad). Moves with the threshold; AUC does not."],
    fpr: ["FPR — false alarm rate", "of the good loans, the share you wrongly flag. The cost of being aggressive. Each threshold buys TPR with FPR."],
    ks: ["KS — the fintech favorite", "max(TPR − FPR) over all thresholds — the biggest vertical gap between the two classes' cumulative score distributions. The standard scorecard discrimination stat alongside Gini."],
    t: ["t — the business decision", "the model only produces a ranking; the threshold prices the trade-off. Set it from costs (loss per miss vs review cost), never default to 0.5."],
  };
  const W = 360, DH = 140, L = 14, R = 10;
  const px = (v) => L + v * (W - L - R);
  const dens = (m, s) => {
    const pts = [];
    for (let x = 0; x <= 1.001; x += 0.01) {
      const y = Math.exp(-((x - m) ** 2) / (2 * s * s)) / s;
      pts.push(`${px(x).toFixed(1)},${(DH - 14 - y * 28).toFixed(1)}`);
    }
    return pts.join(" ");
  };
  const RW = 360, RH = 190, RL = 32, RB = 24, RT = 10, RR = 12;
  const rx = (v) => RL + v * (RW - RL - RR);
  const ry = (v) => RH - RB - v * (RH - RT - RB);
  return (
    <Section title="ROC · AUC · KS" why="your validation vocabulary, interactive. Discrimination ≠ calibration — this tab is the ranking half; chapter 12 covers when a perfect AUC still fails a capital model.">
      <EqLine
        A={A} palette={pal} size={21}
        tokens={[
          { t: "AUC", part: "auc" }, { t: " = P( s₊ > s₋ )" }, { t: "    " },
          { t: "Gini", part: "gini" }, { t: " = 2·AUC − 1" },
        ]}
      />
      <EqLine
        A={A} palette={pal} size={16}
        tokens={[
          { t: "TPR", part: "tpr" }, { t: " = P(s > " }, { t: "t", part: "t" }, { t: " | bad)    " },
          { t: "FPR", part: "fpr" }, { t: " = P(s > " }, { t: "t", part: "t" }, { t: " | good)    " },
          { t: "KS", part: "ks" }, { t: " = max(TPR−FPR)" },
        ]}
      />
      <Explain A={A} parts={parts} palette={pal}
        fallback={'Read aloud: "AUC is the chance a random bad outranks a random good." Drag the threshold along the ranking; drag separation to change the model itself.'} />
      <CodeLine
        A={A} palette={pal}
        tokens={[
          { t: "auc", part: "auc" }, { t: " = roc_auc_score(y, s);  " },
          { t: "gini", part: "gini" }, { t: " = 2*auc - 1" },
        ]}
      />
      <svg viewBox={`0 0 ${W} ${DH}`} style={{ width: "100%", display: "block" }}>
        <line x1={L} x2={W - R} y1={DH - 14} y2={DH - 14} stroke="#39435a" />
        <polyline points={dens(mg, sg)} fill="none" stroke={GREEN} strokeWidth="2" opacity="0.9" />
        <polyline points={dens(mb, sb)} fill="none" stroke={ROSE} strokeWidth="2" opacity="0.9" />
        <line x1={px(thr)} x2={px(thr)} y1={8} y2={DH - 14} stroke={BLUE} strokeWidth={A.active === "t" ? 2.5 : 1.5} strokeDasharray="5 4" />
        <text x={px(thr) + 4} y={16} fill={BLUE} fontSize="10">t — flag →</text>
        <text x={px(mg)} y={DH - 2} fill={GREEN} fontSize="10" textAnchor="middle">goods</text>
        <text x={px(Math.min(mb, 0.93))} y={DH - 2} fill={ROSE} fontSize="10" textAnchor="middle">bads</text>
      </svg>
      <svg viewBox={`0 0 ${RW} ${RH}`} style={{ width: "100%", display: "block" }}>
        <line x1={rx(0)} y1={ry(0)} x2={rx(1)} y2={ry(1)} stroke="#39435a" strokeDasharray="4 4" />
        <line x1={rx(0)} x2={rx(1)} y1={ry(0)} y2={ry(0)} stroke="#39435a" />
        <line x1={rx(0)} x2={rx(0)} y1={ry(0)} y2={ry(1)} stroke="#39435a" />
        <polyline points={roc.map(([f, t]) => `${rx(f).toFixed(1)},${ry(t).toFixed(1)}`).join(" ")}
          fill="none" stroke={A.active === "auc" || A.active === "gini" ? GREEN : "#3f74d4"} strokeWidth="2.5" />
        <circle cx={rx(fpr)} cy={ry(tpr)} r={6} fill={BLUE} />
        <text x={rx(0.55)} y={ry(0.08)} fill={DIM} fontSize="10">FPR →</text>
        <text x={rx(0.02)} y={RT + 8} fill={DIM} fontSize="10">TPR</text>
        <text x={rx(0.55)} y={ry(0.45)} fill={GREEN} fontSize="13" fontWeight="700">AUC = {auc.toFixed(3)}</text>
        <text x={rx(0.55)} y={ry(0.34)} fill={VIOLET} fontSize="11">Gini = {(2 * auc - 1).toFixed(3)}</text>
        <text x={rx(0.55)} y={ry(0.24)} fill={AMBER} fontSize="11">KS = {ks.toFixed(3)}</text>
      </svg>
      <div style={{ ...MONO, fontSize: 12, color: DIM }}>
        at t = {thr.toFixed(2)}:  <span style={{ color: CYAN }}>TPR {(tpr * 100).toFixed(1)}%</span>
        {"  ·  "}<span style={{ color: ROSE }}>FPR {(fpr * 100).toFixed(1)}%</span>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Slider label="t threshold" value={thr} set={setThr} min={0.05} max={1.05} color={BLUE} />
        <Slider label="separation (model quality)" value={mb} set={setMb} min={0.45} max={0.9} color={ROSE} />
      </div>
    </Section>
  );
}

// ---------------- 13. BIAS–VARIANCE ----------------

function mulberry(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function polyfit(xs, ys, deg) {
  const n = deg + 1;
  const Am = Array.from({ length: n }, () => new Array(n).fill(0));
  const bv = new Array(n).fill(0);
  for (let k = 0; k < xs.length; k++) {
    const pw = [1];
    for (let j = 1; j < n; j++) pw.push(pw[j - 1] * xs[k]);
    for (let i = 0; i < n; i++) {
      bv[i] += pw[i] * ys[k];
      for (let j = 0; j < n; j++) Am[i][j] += pw[i] * pw[j];
    }
  }
  for (let i = 0; i < n; i++) Am[i][i] += 1e-8;
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(Am[r][i]) > Math.abs(Am[piv][i])) piv = r;
    [Am[i], Am[piv]] = [Am[piv], Am[i]];
    [bv[i], bv[piv]] = [bv[piv], bv[i]];
    const d = Am[i][i] || 1e-12;
    for (let j = i; j < n; j++) Am[i][j] /= d;
    bv[i] /= d;
    for (let r = 0; r < n; r++) if (r !== i) {
      const f = Am[r][i];
      for (let j = i; j < n; j++) Am[r][j] -= f * Am[i][j];
      bv[r] -= f * bv[i];
    }
  }
  return bv;
}
const polyval = (c, x) => c.reduce((acc, ci, i) => acc + ci * x ** i, 0);

function BiasVarModule() {
  const A = useActive();
  const [deg, setDeg] = useState(3);
  const truef = (x) => 0.5 * Math.sin(2 * Math.PI * x);
  const data = useMemo(() => {
    const rnd = mulberry(42);
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    const mk = (n) => {
      const xs = Array.from({ length: n }, () => rnd()).sort((a, b) => a - b);
      const ys = xs.map((x) => truef(x) + 0.16 * gauss());
      return { xs, ys };
    };
    const tr = mk(16), te = mk(40);
    const errs = [];
    for (let d = 0; d <= 9; d++) {
      const c = polyfit(tr.xs, tr.ys, d);
      const mse = (s) => s.xs.reduce((a, x, i) => a + (polyval(c, x) - s.ys[i]) ** 2, 0) / s.xs.length;
      errs.push([mse(tr), mse(te)]);
    }
    return { tr, te, errs };
  }, []);
  const coef = useMemo(() => polyfit(data.tr.xs, data.tr.ys, deg), [data, deg]);
  const pal = { bias: CYAN, varr: ROSE, deg: BLUE, train: GREEN, test: AMBER };
  const parts = {
    bias: ["Bias² — wrongness of the family", "how far your model family's average guess sits from the truth. Degree 0–1 cannot bend like the true curve: train AND test error both stay high. That regime is underfitting."],
    varr: ["Variance — sample sensitivity", "how much the fit would change if you drew a different training sample. Degree 9 threads every noise point: train error → 0 while test error explodes. That regime is overfitting."],
    deg: ["complexity — the knob", "polynomial degree here, but every capacity knob you will ever meet is this slider in costume: tree depth, number of boosting rounds, network width, 1/λ."],
    train: ["train error — the liar", "optimistic by construction; it falls monotonically as capacity grows. Selecting models on it is the original sin of ML."],
    test: ["test error — the truth", "U-shaped: bias falls, then variance takes over. The bottom of the U is your model. Regularization, early stopping, and more data are all ways of moving or flattening this curve."],
  };
  const W = 360, H = 195, L = 14, R = 10, T = 10, B = 20;
  const px = (v) => L + v * (W - L - R);
  const py = (v) => H - B - ((v + 1) / 2) * (H - T - B);
  const fitPts = [], truePts = [];
  for (let x = 0; x <= 1.001; x += 0.01) {
    fitPts.push(`${px(x).toFixed(1)},${py(Math.max(-1, Math.min(1, polyval(coef, x)))).toFixed(1)}`);
    truePts.push(`${px(x).toFixed(1)},${py(truef(x)).toFixed(1)}`);
  }
  const EW = 360, EH = 165, EL = 30, EB = 22, ET = 10, ER = 12;
  const ex = (d) => EL + (d / 9) * (EW - EL - ER);
  const cap = 0.14;
  const ey = (v) => EH - EB - (Math.min(v, cap) / cap) * (EH - ET - EB);
  return (
    <Section title="Bias–Variance" why="the single most-asked conceptual question in AS/RS breadth rounds. The U-curve below is the canonical answer — be able to draw it from memory.">
      <EqLine
        A={A} palette={pal} size={20}
        tokens={[
          { t: "Err(x) = " }, { t: "Bias²", part: "bias" }, { t: " + " },
          { t: "Variance", part: "varr" }, { t: " + σ²ₙₒᵢₛₑ" },
        ]}
      />
      <Explain A={A} parts={parts} palette={pal}
        fallback={'Read aloud: "error = systematic wrongness, plus sensitivity to the sample, plus irreducible noise." Drag complexity from 0 to 9 and watch the fit go from too stiff to insane.'} />
      <CodeLine
        A={A} palette={pal}
        tokens={[
          { t: "for d in range(10): fit(", part: "deg" }, { t: "d", part: "deg" },
          { t: "); plot(" }, { t: "mse_train", part: "train" }, { t: ", " },
          { t: "mse_test", part: "test" }, { t: ")" },
        ]}
      />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <line x1={L} x2={W - R} y1={py(0)} y2={py(0)} stroke={LINE} />
        <polyline points={truePts.join(" ")} fill="none" stroke="#39435a" strokeWidth="2" strokeDasharray="5 5" />
        <polyline points={fitPts.join(" ")} fill="none" stroke={VIOLET} strokeWidth="2.5" />
        {data.tr.xs.map((x, i) => (
          <circle key={i} cx={px(x)} cy={py(data.tr.ys[i])} r={3.5} fill={BLUE} />
        ))}
        <text x={W - R} y={T + 8} fill={DIM} fontSize="10" textAnchor="end">— truth (dashed) · fit (violet) · train pts</text>
      </svg>
      <svg viewBox={`0 0 ${EW} ${EH}`} style={{ width: "100%", display: "block" }}>
        <line x1={EL} x2={EW - ER} y1={EH - EB} y2={EH - EB} stroke="#39435a" />
        <polyline points={data.errs.map(([t], d) => `${ex(d).toFixed(1)},${ey(t).toFixed(1)}`).join(" ")}
          fill="none" stroke={GREEN} strokeWidth={A.active === "train" ? 3.5 : 2.2} />
        <polyline points={data.errs.map(([, t], d) => `${ex(d).toFixed(1)},${ey(t).toFixed(1)}`).join(" ")}
          fill="none" stroke={AMBER} strokeWidth={A.active === "test" ? 3.5 : 2.2} />
        <line x1={ex(deg)} x2={ex(deg)} y1={ET} y2={EH - EB} stroke={BLUE} strokeDasharray="4 4" />
        {[0, 3, 6, 9].map((d) => (
          <text key={d} x={ex(d)} y={EH - 7} fill={DIM} fontSize="9" textAnchor="middle">{d}</text>
        ))}
        <text x={EL + 4} y={ET + 9} fill={GREEN} fontSize="10">train MSE</text>
        <text x={EL + 4} y={ET + 22} fill={AMBER} fontSize="10">test MSE</text>
        <text x={EW - ER} y={EH - 7} fill={DIM} fontSize="9" textAnchor="end">degree →</text>
        <text x={ex(1)} y={ET + 9} fill={CYAN} fontSize="9" opacity={A.active === "bias" ? 1 : 0.5}>← bias zone</text>
        <text x={ex(7.6)} y={ET + 9} fill={ROSE} fontSize="9" opacity={A.active === "varr" ? 1 : 0.5}>variance zone →</text>
      </svg>
      <div style={{ ...MONO, fontSize: 12, color: DIM }}>
        degree {deg}: <span style={{ color: GREEN }}>train {data.errs[deg][0].toFixed(3)}</span>
        {"  ·  "}<span style={{ color: AMBER }}>test {data.errs[deg][1].toFixed(3)}</span>
        {deg >= 8 ? "  · memorizing noise" : deg <= 1 ? "  · too stiff to learn" : ""}
      </div>
      <Slider label="model complexity (degree)" value={deg} set={setDeg} min={0} max={9} step={1} color={BLUE} fmt={(v) => v.toFixed(0)} />
    </Section>
  );
}

// ---------------- 14. MULTI-HEAD ATTENTION ----------------

const MHA_TOKENS = ["risk", "rose", "as", "rates", "fell"];
// per-head bias patterns: each head "specializes" in a different relation
const HEAD_PATTERNS = [
  { name: "syntax (adjacent)", w: (i, j) => Math.exp(-Math.abs(i - j) * 1.3) },
  { name: "subject ← verb", w: (i, j) => (j === 0 ? 1.4 : 0.2) },
  { name: "global / [first]", w: (i, j) => (j === 0 ? 1.0 : 0.4) },
  { name: "cause → effect", w: (i, j) => Math.exp(-Math.abs(i - j - 1) * 1.1) },
];

function MultiHeadModule() {
  const A = useActive();
  const [head, setHead] = useState(0);
  const [qi, setQi] = useState(0);
  const pal = { proj: BLUE, heads: VIOLET, concat: AMBER, out: GREEN, scale: ROSE };
  const parts = {
    proj: ["W_Q, W_K, W_V — per-head projections", "each head gets its OWN learned Q/K/V matrices, slicing the embedding into a d/h-dim subspace. Different projections = different questions asked of the same tokens."],
    heads: ["h parallel heads", "the same attention machine runs h times at once, each in its own subspace. They don't coordinate — specialization is emergent, not assigned. Tap the heads below to see four learned a row patterns."],
    scale: ["√(d/h) — per-head scaling", "each head works in a d/h-dim space, so the scaling uses the HEAD dimension, not the full d. Total compute ≈ single full-width attention — heads are free."],
    concat: ["concat — restack the subspaces", "the h head outputs (each d/h wide) are concatenated back to width d. No information lost; it was a partition, not a bottleneck."],
    out: ["W_O — mix the heads", "a final learned projection lets heads talk: the syntax head's output can be combined with the coreference head's. Without W_O the heads stay siloed."],
  };
  const pat = HEAD_PATTERNS[head];
  const rowRaw = MHA_TOKENS.map((_, j) => pat.w(qi, j));
  const tot = rowRaw.reduce((a, b) => a + b, 0);
  const row = rowRaw.map((v) => v / tot);
  const fullHeat = MHA_TOKENS.map((_, i) => {
    const r = MHA_TOKENS.map((_, j) => pat.w(i, j));
    const s = r.reduce((a, b) => a + b, 0);
    return r.map((v) => v / s);
  });
  return (
    <Section title="Multi-Head Attention" why="single-head answers 'how does attention work'; multi-head answers 'why does it actually work' — emergent head specialization is a top AS/RS probe.">
      <EqLine
        A={A} palette={pal} size={18}
        tokens={[
          { t: "headₖ = softmax(" }, { t: "QₖKₖᵀ", part: "proj" }, { t: " ⁄ " },
          { t: "√(d/h)", part: "scale" }, { t: ")" }, { t: "Vₖ", part: "proj" },
        ]}
      />
      <EqLine
        A={A} palette={pal} size={18}
        tokens={[
          { t: "MHA = " }, { t: "W_O", part: "out" }, { t: " · " },
          { t: "concat", part: "concat" }, { t: "(" }, { t: "head₁…head_h", part: "heads" }, { t: ")" },
        ]}
      />
      <Explain A={A} parts={parts} palette={pal}
        fallback={'Read aloud: "run h attention heads in parallel, each in its own learned subspace, concatenate, then mix with one projection." Tap the heads below — each learned a different relation.'} />
      <CodeLine
        A={A} palette={pal}
        tokens={[
          { t: "Q,K,V = " }, { t: "x@Wq, x@Wk, x@Wv", part: "proj" }, { t: "  # split into h heads\n" },
          { t: "out = " }, { t: "concat", part: "concat" }, { t: "(heads) @ " }, { t: "Wo", part: "out" },
        ]}
      />
      <div style={{ fontSize: 11, color: DIM }}>4 heads, each specialized on a different relation (tap to switch):</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {HEAD_PATTERNS.map((p, i) => (
          <button key={i} onClick={() => setHead(i)}
            style={{
              ...MONO, fontSize: 11, padding: "7px 10px", borderRadius: 8, cursor: "pointer", flexShrink: 0,
              background: head === i ? VIOLET : "transparent", color: head === i ? "#0D1412" : VIOLET,
              border: `1px solid ${VIOLET}66`, fontWeight: head === i ? 700 : 400,
            }}>
            head {i + 1}: {p.name}
          </button>
        ))}
      </div>
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "60px repeat(5, 1fr)", gap: 3 }}>
          <div />
          {MHA_TOKENS.map((t) => (
            <div key={t} style={{ ...MONO, fontSize: 9.5, color: AMBER, textAlign: "center" }}>{t}</div>
          ))}
          {MHA_TOKENS.map((t, r) => (
            <React.Fragment key={t}>
              <div onClick={() => setQi(r)}
                style={{
                  ...MONO, fontSize: 10, padding: "6px 3px", cursor: "pointer", borderRadius: 5,
                  color: r === qi ? "#0D1412" : BLUE, textAlign: "center",
                  background: r === qi ? BLUE : "transparent", border: `1px solid ${r === qi ? BLUE : LINE}`,
                }}>
                {t}
              </div>
              {fullHeat[r].map((wv, c) => (
                <div key={c} style={{
                  height: 28, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center",
                  background: `rgba(177, 148, 250, ${0.06 + wv * 0.78})`,
                  outline: r === qi ? `1px solid ${VIOLET}88` : "none",
                  color: wv > 0.4 ? "#1a1230" : "#9fb6c4", ...MONO, fontSize: 9,
                }}>
                  {wv.toFixed(2)}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
        <div style={{ fontSize: 11, color: DIM, marginTop: 8 }}>
          where <span style={{ color: BLUE }}>"{MHA_TOKENS[qi]}"</span> attends under <span style={{ color: VIOLET }}>head {head + 1} ({pat.name})</span>:
        </div>
        {MHA_TOKENS.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ ...MONO, width: 56, fontSize: 11, color: DIM }}>{t}</span>
            <div style={{ flex: 1, height: 14, background: "#1b2824", borderRadius: 5, overflow: "hidden", border: `1px solid ${LINE}` }}>
              <div style={{ width: `${row[i] * 100}%`, height: "100%", background: VIOLET + "cc", transition: "width .25s" }} />
            </div>
            <span style={{ ...MONO, width: 38, textAlign: "right", fontSize: 10.5, color: VIOLET }}>{(row[i] * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "#b8bdb8", lineHeight: 1.6, background: PANEL2, borderRadius: 8, padding: "10px 12px", border: `1px solid ${LINE}` }}>
        Same sentence, same tokens — four heads, four completely different attention maps. No one told them to specialize; it emerged from training. That is the whole reason multi-head beats single-head.
      </div>
    </Section>
  );
}

// ---------------- 15. CALIBRATION · PR · LIFT ----------------

function CalibModule() {
  const A = useActive();
  const [skew, setSkew] = useState(0);
  const [view, setView] = useState("calib");
  const prev = 0.08; // 8% base rate — rare-event credit
  const pal = { cal: GREEN, brier: ROSE, pr: CYAN, lift: AMBER };
  // 10 buckets: predicted vs observed. skew bends the calibration curve.
  const buckets = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const pred = (i + 0.5) / 10;
      // skew>0: overconfident (obs < pred at high end); skew<0: underconfident
      const obs = Math.max(0, Math.min(1, pred - skew * pred * (1 - pred) * 2.5));
      return { pred, obs };
    });
  }, [skew]);
  const brier = buckets.reduce((a, b) => a + (b.pred - b.obs) ** 2, 0) / buckets.length;
  // PR curve from a separable-ish model at prevalence
  const prPts = useMemo(() => {
    const pts = [];
    for (let t = 1; t >= 0; t -= 0.02) {
      const recall = 1 - ncdf((t - 0.62) / 0.13);
      const fpr = 1 - ncdf((t - 0.4) / 0.13);
      const tp = recall * prev, fp = fpr * (1 - prev);
      const prec = tp + fp > 0 ? tp / (tp + fp) : 1;
      pts.push([recall, prec]);
    }
    return pts;
  }, []);
  const prauc = prPts.reduce((a, p, i) => i === 0 ? a : a + ((p[1] + prPts[i - 1][1]) / 2) * Math.abs(p[0] - prPts[i - 1][0]), 0);
  // lift: model captures positives faster than random across sorted deciles
  const lift = [4.1, 2.6, 1.7, 1.1, 0.8, 0.55, 0.4, 0.3, 0.25, 0.2];
  const parts = {
    cal: ["calibration curve", "bucket predictions, plot mean-predicted vs actually-observed rate. The diagonal is perfection. Above it = underconfident, below = overconfident. Capital models live or die here."],
    brier: ["Brier score", "mean squared error on probabilities. One number folding calibration AND sharpness together. Lower is better; 0.25 is the all-0.5 baseline."],
    pr: ["PR curve / PR-AUC", "precision vs recall as the threshold sweeps. At an 8% base rate this is far more honest than ROC, whose FPR denominator is the huge negative class. The no-skill line sits at the prevalence (0.08), not 0.5."],
    lift: ["lift / gains chart", "sort by score, decile the population: how many more positives does the top decile catch vs random? Lift 4× in decile 1 = the business story credit and marketing teams actually read."],
  };
  const W = 360, H = 195, L = 32, R = 12, T = 10, B = 24;
  const px = (v) => L + v * (W - L - R);
  const py = (v) => H - B - v * (H - T - B);
  return (
    <Section title="Calibration · PR-AUC · Lift" why="ROC is the discrimination half; this tab is everything rare-event credit modeling actually reports. PR over ROC when positives are scarce.">
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[["calib", "calibration"], ["pr", "PR curve"], ["lift", "gains/lift"]].map(([k, lb]) => (
          <button key={k} onClick={() => setView(k)}
            style={{
              ...MONO, fontSize: 11.5, padding: "7px 11px", borderRadius: 8, cursor: "pointer",
              background: view === k ? CYAN : "transparent", color: view === k ? "#0D1412" : CYAN,
              border: `1px solid ${CYAN}66`, fontWeight: view === k ? 700 : 400,
            }}>
            {lb}
          </button>
        ))}
      </div>
      {view === "calib" && (
        <>
          <EqLine A={A} palette={pal} size={19}
            tokens={[{ t: "Brier", part: "brier" }, { t: " = (1/n) Σᵢ (" }, { t: "pᵢ", part: "cal" }, { t: " − yᵢ)²" }]} />
          <Explain A={A} parts={parts} palette={pal}
            fallback={'Discrimination ≠ calibration. A perfect ranker can output garbage probabilities. Drag the skew slider to make the model over/underconfident.'} />
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
            <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} stroke="#39435a" strokeDasharray="5 5" />
            <text x={px(0.62)} y={py(0.72)} fill={DIM} fontSize="9" transform={`rotate(-32 ${px(0.62)} ${py(0.72)})`}>perfect</text>
            <polyline points={buckets.map((b) => `${px(b.pred).toFixed(1)},${py(b.obs).toFixed(1)}`).join(" ")}
              fill="none" stroke={GREEN} strokeWidth="2.5" />
            {buckets.map((b, i) => <circle key={i} cx={px(b.pred)} cy={py(b.obs)} r={3.5} fill={GREEN} />)}
            <text x={px(0.5)} y={H - 6} fill={DIM} fontSize="10" textAnchor="middle">predicted PD →</text>
            <text x={8} y={py(0.5)} fill={DIM} fontSize="10" transform={`rotate(-90 8 ${py(0.5)})`} textAnchor="middle">observed</text>
            <text x={px(0.05)} y={T + 10} fill={ROSE} fontSize="12" fontWeight="700">Brier = {brier.toFixed(3)}</text>
          </svg>
          <div style={{ ...MONO, fontSize: 11.5, color: DIM }}>
            {skew > 0.15 ? "below diagonal → overconfident (says 80%, only 60% default) → Platt/isotonic fixes it"
              : skew < -0.15 ? "above diagonal → underconfident" : "well-calibrated"}
          </div>
          <Slider label="miscalibration" value={skew} set={setSkew} min={-0.6} max={0.6} color={ROSE} fmt={(v) => v.toFixed(2)} />
        </>
      )}
      {view === "pr" && (
        <>
          <EqLine A={A} palette={pal} size={18}
            tokens={[{ t: "Precision = TP/(TP+FP)   " }, { t: "Recall", part: "pr" }, { t: " = TP/(TP+FN)" }]} />
          <Explain A={A} parts={parts} palette={pal}
            fallback={'At 8% prevalence, ROC flatters; PR tells the truth. The no-skill baseline is the prevalence line, not 0.5.'} />
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
            <line x1={px(0)} x2={px(1)} y1={py(prev)} y2={py(prev)} stroke="#39435a" strokeDasharray="5 5" />
            <text x={px(0.7)} y={py(prev) - 4} fill={DIM} fontSize="9">no-skill = prevalence (0.08)</text>
            <polyline points={prPts.map(([r, p]) => `${px(r).toFixed(1)},${py(p).toFixed(1)}`).join(" ")}
              fill="none" stroke={CYAN} strokeWidth="2.5" />
            <text x={px(0.5)} y={H - 6} fill={DIM} fontSize="10" textAnchor="middle">recall →</text>
            <text x={8} y={py(0.5)} fill={DIM} fontSize="10" transform={`rotate(-90 8 ${py(0.5)})`} textAnchor="middle">precision</text>
            <text x={px(0.45)} y={T + 12} fill={CYAN} fontSize="12" fontWeight="700">PR-AUC ≈ {prauc.toFixed(2)}</text>
          </svg>
          <div style={{ ...MONO, fontSize: 11, color: DIM }}>vs a no-skill PR-AUC of just 0.08 — that gap is the real signal on rare events.</div>
        </>
      )}
      {view === "lift" && (
        <>
          <Explain A={A} parts={parts} palette={pal}
            fallback={'Sort by score, split into deciles. Lift = positives caught in this decile ÷ what random would catch. The chart the business reads.'} />
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
            <line x1={L} x2={W - R} y1={py(1 / 4.5)} y2={py(1 / 4.5)} stroke="#39435a" strokeDasharray="4 4" />
            <text x={W - R} y={py(1 / 4.5) - 3} fill={DIM} fontSize="9" textAnchor="end">random = 1×</text>
            {lift.map((lv, i) => {
              const bw = (W - L - R) / 10;
              const x = L + i * bw;
              const h = (lv / 4.5) * (H - T - B);
              return (
                <g key={i}>
                  <rect x={x + 2} width={bw - 4} y={H - B - h} height={h} fill={AMBER + "cc"} rx={2} />
                  <text x={x + bw / 2} y={H - 8} fill={DIM} fontSize="8" textAnchor="middle">D{i + 1}</text>
                </g>
              );
            })}
            <text x={L + 2} y={T + 10} fill={AMBER} fontSize="11" fontWeight="700">{lift[0].toFixed(1)}× lift in decile 1</text>
          </svg>
          <div style={{ ...MONO, fontSize: 11, color: DIM }}>top decile catches {lift[0].toFixed(1)}× its fair share of defaults — the deployment headline.</div>
        </>
      )}
    </Section>
  );
}

// ---------------- 16. THEORY / CURRICULUM ----------------

const CHAPTERS = TOPICS;  // loaded from content/topics.json (content-driven)
const TRACKS = {
  all: { label: "All chapters", chapters: CHAPTERS.map((c) => c.n) },
  general: { label: "General Applied ML", chapters: [0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 20, 22, 24, 25] },
  fintech: { label: "Fintech & Risk", chapters: [0, 2, 3, 4, 5, 7, 10, 11, 12, 13, 14, 15, 16, 20, 22, 23, 24, 25] },
  llm: { label: "LLM Applied Scientist", chapters: [0, 1, 5, 6, 7, 8, 9, 10, 17, 18, 19, 20, 21, 24, 25] },
  research: { label: "Research-heavy AS", chapters: [0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 16, 17, 18, 19, 20, 21, 22, 25] },
};

function chapterStatus(c) {
  const iv = c.interview || {};
  const fullInterview = !!(iv.s30 && iv.m2 && iv.m5);
  if (fullInterview && missingRequired(c).length === 0) return { label: "interview-ready", color: GREEN };
  if (missingRequired(c).length === 0) return { label: "core-ready", color: BLUE };
  return { label: "building", color: AMBER };
}

function Bk({ b, goTo }) {
  if (b.k === "h")
    return <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 6 }}>{b.t}</div>;
  if (b.k === "p")
    return <div style={{ fontSize: 13.5, color: "#b8bdb8", lineHeight: 1.7 }}>{b.t}</div>;
  if (b.k === "say")
    return (
      <div style={{ background: PANEL2, border: `1px solid ${AMBER}44`, borderLeft: `3px solid ${AMBER}`, borderRadius: 8, padding: "11px 13px" }}>
        <div style={{ ...MONO, fontSize: 10, letterSpacing: 1.5, color: AMBER, marginBottom: 6 }}>SAY IT ALOUD · INTERVIEW VOICE</div>
        <div style={{ ...MATH, fontStyle: "italic", fontSize: 17, color: INK, marginBottom: 7 }}>{b.f}</div>
        <div style={{ fontSize: 13, color: "#b8bdb8", lineHeight: 1.65 }}>{b.t}</div>
      </div>
    );
  if (b.k === "key")
    return (
      <div style={{ background: PANEL2, border: `1px solid ${CYAN}33`, borderLeft: `3px solid ${CYAN}`, borderRadius: 8, padding: "11px 13px" }}>
        <div style={{ ...MONO, fontSize: 10, letterSpacing: 1.5, color: CYAN, marginBottom: 6 }}>KEY FACTS</div>
        {b.items.map((it, i) => (
          <div key={i} style={{ fontSize: 13, color: "#b8bdb8", lineHeight: 1.6, display: "flex", gap: 8, marginBottom: 4 }}>
            <span style={{ color: CYAN }}>·</span>
            <span>{it}</span>
          </div>
        ))}
      </div>
    );
  if (b.k === "code")
    return (
      <pre style={{ ...MONO, fontSize: 11.5, background: "#0f1916", border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 12px", overflowX: "auto", color: "#b8bdb8", lineHeight: 1.6, margin: 0 }}>
        {b.t}
      </pre>
    );
  if (b.k === "lab")
    return (
      <div style={{ background: PANEL2, border: `1px solid ${GREEN}33`, borderLeft: `3px solid ${GREEN}`, borderRadius: 8, padding: "11px 13px" }}>
        <div style={{ ...MONO, fontSize: 10, letterSpacing: 1.5, color: GREEN, marginBottom: 5 }}>LAB · TRY IT ON REAL DATA</div>
        <div style={{ fontSize: 12.5, color: GREEN, marginBottom: 7 }}>{b.data}</div>
        {b.steps.map((s, i) => (
          <div key={i} style={{ fontSize: 13, color: "#b8bdb8", lineHeight: 1.6, display: "flex", gap: 8, marginBottom: 4 }}>
            <span style={{ ...MONO, color: GREEN }}>{i + 1}.</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
    );
  if (b.k === "tab")
    return (
      <button
        onClick={() => goTo(b.id)}
        style={{ ...MONO, fontSize: 12.5, padding: "9px 14px", borderRadius: 8, cursor: "pointer", background: "transparent", color: VIOLET, border: `1px solid ${VIOLET}66`, textAlign: "left", fontWeight: 600 }}
      >
        ▸ {b.label}
      </button>
    );
  return null;
}

// Adaptive schema contract: these sections are expected on every topic unless
// the topic declares its own `required` array. Optional sections (code,
// connections, resources, realWorld, caseStudy) render only when present and
// are never flagged as missing — this prevents filling empty slots with fluff.
const DEFAULT_REQUIRED = ["why", "intuition", "visualization", "mathematics", "failure", "interview", "sharpen"];

function sectionPresent(c, key) {
  if (key === "interview") return !!(c.interview && (c.interview.s30 || c.interview.m2 || c.interview.m5));
  if (key === "sharpen") return !!(c.sharpen && c.sharpen.length);
  if (key === "visualization") return !!c.visualization || !!(c.tabs && c.tabs.length);
  return !!c[key];
}

function missingRequired(c) {
  const req = Array.isArray(c.required) && c.required.length ? c.required : DEFAULT_REQUIRED;
  return req.filter((k) => !sectionPresent(c, k));
}

function SchemaSections({ c }) {
  const iv = c.interview || {};
  const hasInterview = iv.s30 || iv.m2 || iv.m5;
  const hasSharpen = c.sharpen && c.sharpen.length;
  const cs = c.caseStudy;
  const rw = c.realWorld && c.realWorld.length ? c.realWorld : null;
  const missing = missingRequired(c);
  if (!c.why && !c.visualization && !c.failure && !hasInterview && !hasSharpen && !cs && !rw && !missing.length) return null;
  return (
    <>
      {c.why && (
        <div style={{ background: PANEL2, border: `1px solid ${BLUE}33`, borderLeft: `3px solid ${BLUE}`, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: 1.5, color: BLUE, marginBottom: 6 }}>WHY DOES THIS EXIST?</div>
          <div style={{ fontSize: 13, color: "#b8bdb8", lineHeight: 1.65 }}>{c.why}</div>
        </div>
      )}
      {c.visualization && (
        <div style={{ background: PANEL2, border: `1px solid ${VIOLET}33`, borderLeft: `3px solid ${VIOLET}`, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: 1.5, color: VIOLET, marginBottom: 6 }}>VISUALIZATION · THE MENTAL PICTURE</div>
          <div style={{ fontSize: 13, color: "#b8bdb8", lineHeight: 1.65 }}>{c.visualization}</div>
        </div>
      )}
      {c.failure && (
        <div style={{ background: PANEL2, border: `1px solid ${ROSE}33`, borderLeft: `3px solid ${ROSE}`, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: 1.5, color: ROSE, marginBottom: 6 }}>WHEN DOES IT FAIL?</div>
          <div style={{ fontSize: 13, color: "#b8bdb8", lineHeight: 1.65 }}>{c.failure}</div>
        </div>
      )}
      {cs && (
        <div style={{ background: PANEL2, border: `1px solid ${GREEN}33`, borderLeft: `3px solid ${GREEN}`, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: 1.5, color: GREEN, marginBottom: 6 }}>CASE STUDY · {(cs.title || "").toUpperCase()}</div>
          <div style={{ fontSize: 13, color: "#b8bdb8", lineHeight: 1.65 }}>{cs.body}</div>
        </div>
      )}
      {rw && (
        <div style={{ background: PANEL2, border: `1px solid ${CYAN}33`, borderLeft: `3px solid ${CYAN}`, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: 1.5, color: CYAN, marginBottom: 6 }}>REAL-WORLD</div>
          {rw.map((x, i) => (
            <div key={i} style={{ fontSize: 13, color: "#b8bdb8", lineHeight: 1.6, display: "flex", gap: 8, marginBottom: 4 }}>
              <span style={{ color: CYAN }}>·</span><span>{x}</span>
            </div>
          ))}
        </div>
      )}
      {hasInterview && (
        <div style={{ background: PANEL2, border: `1px solid ${AMBER}33`, borderLeft: `3px solid ${AMBER}`, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: 1.5, color: AMBER, marginBottom: 8 }}>INTERVIEW ANSWERS · 30s / 2min / 5min</div>
          {[["30s", iv.s30], ["2min", iv.m2], ["5min", iv.m5]].map(([k, v]) =>
            v ? (
              <div key={k} style={{ marginBottom: 9 }}>
                <span style={{ ...MONO, fontSize: 11, color: AMBER, fontWeight: 700 }}>{k} — </span>
                <span style={{ fontSize: 13, color: "#b8bdb8", lineHeight: 1.6 }}>{v}</span>
              </div>
            ) : null
          )}
        </div>
      )}
      {hasSharpen ? (
        <div style={{ background: PANEL2, border: `1px solid ${VIOLET}33`, borderLeft: `3px solid ${VIOLET}`, borderRadius: 8, padding: "11px 13px" }}>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: 1.5, color: VIOLET, marginBottom: 6 }}>SHARPEN MY THINKING · no answers — reason it out</div>
          {c.sharpen.map((q, i) => (
            <div key={i} style={{ fontSize: 13, color: "#b8bdb8", lineHeight: 1.6, display: "flex", gap: 8, marginBottom: 5 }}>
              <span style={{ color: VIOLET }}>?</span>
              <span>{q}</span>
            </div>
          ))}
        </div>
      ) : null}
      {missing.length > 0 && (
        <div style={{ ...MONO, fontSize: 11, color: "#69746e", border: `1px dashed #39435a`, borderRadius: 8, padding: "8px 11px" }}>
          to-expand · required sections not yet written: {missing.join(", ")}
        </div>
      )}
    </>
  );
}

function TheoryModule({ goTo, chap, setChap, done, setDone }) {
  const [track, setTrack] = useState("all");
  const [query, setQuery] = useState("");
  if (chap === null || chap === undefined) {
    const trackChapters = TRACKS[track].chapters;
    const visible = CHAPTERS.filter((c) =>
      trackChapters.includes(c.n) &&
      `${c.title} ${c.tag} ${c.why || ""}`.toLowerCase().includes(query.trim().toLowerCase())
    );
    const doneCount = trackChapters.filter((n) => done[n]).length;
    const pct = Math.round((doneCount / trackChapters.length) * 100);
    const interviewReady = trackChapters.filter((n) => chapterStatus(CHAPTERS[n]).label === "interview-ready").length;
    const labCount = trackChapters.filter((n) => CHAPTERS[n].blocks.some((b) => b.k === "lab")).length;
    return (
      <Section title="Your Applied ML Roadmap" why="choose a target role, find weak spots, and practice the chapters that move your interview readiness.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          {[
            ["track progress", `${doneCount}/${trackChapters.length}`, GREEN],
            ["interview-ready", `${interviewReady}/${trackChapters.length}`, BLUE],
            ["hands-on labs", `${labCount}`, VIOLET],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: PANEL2, border: `1px solid ${LINE}`, borderRadius: 10, padding: "11px 10px" }}>
              <div style={{ ...MONO, color, fontSize: 18, fontWeight: 800 }}>{value}</div>
              <div style={{ ...MONO, color: DIM, fontSize: 9.5, marginTop: 3, textTransform: "uppercase", letterSpacing: .7 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {Object.entries(TRACKS).map(([id, item]) => (
            <button key={id} onClick={() => setTrack(id)} style={{
              ...MONO, fontSize: 11, borderRadius: 999, padding: "7px 10px", cursor: "pointer",
              background: track === id ? BLUE : PANEL2, color: track === id ? "#0D1412" : DIM,
              border: `1px solid ${track === id ? BLUE : LINE}`, fontWeight: track === id ? 700 : 500,
            }}>{item.label}</button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chapters, concepts, or interview topics..."
          style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1px solid ${LINE}`, background: "#0D1412", color: INK, fontSize: 13, outlineColor: BLUE }}
        />
        <div style={{ background: PANEL2, border: `1px solid ${LINE}`, borderRadius: 10, padding: "11px 13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
            <span style={{ ...MONO, fontSize: 12, color: DIM }}>
              {TRACKS[track].label} · <span style={{ color: GREEN }}>{doneCount}</span>/{trackChapters.length} chapters
              <span style={{ color: "#8C968F" }}> · saved across sessions</span>
            </span>
            {doneCount > 0 && (
              <button
                onClick={() => { if (typeof window !== "undefined" && confirm("Reset all chapter progress?")) setDone({}); }}
                style={{ ...MONO, fontSize: 10.5, color: ROSE, background: "transparent", border: `1px solid ${ROSE}55`, borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}
              >
                reset
              </button>
            )}
          </div>
          <div style={{ height: 7, background: "#1b2824", borderRadius: 4, overflow: "hidden", border: `1px solid ${LINE}` }}>
            <div style={{ width: `${pct}%`, height: "100%", background: GREEN, transition: "width .3s" }} />
          </div>
        </div>
        {visible.map((c) => {
          const i = c.n;
          const status = chapterStatus(c);
          return (
          <button
            key={i}
            onClick={() => setChap(i)}
            style={{
              display: "flex", alignItems: "center", gap: 12, textAlign: "left", width: "100%",
              background: done[i] ? GREEN + "0e" : PANEL2, border: `1px solid ${done[i] ? GREEN + "55" : LINE}`,
              borderRadius: 10, padding: "12px 13px", cursor: "pointer",
            }}
          >
            <span style={{ ...MONO, fontSize: 15, color: done[i] ? GREEN : "#8C968F", width: 26, flexShrink: 0, fontWeight: 700 }}>
              {done[i] ? "✓" : String(c.n).padStart(2, "0")}
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: INK }}>{c.title}</span>
              <span style={{ display: "block", fontSize: 11.5, color: DIM, marginTop: 2 }}>{c.tag}</span>
            </span>
            <span style={{ ...MONO, fontSize: 9, color: status.color, border: `1px solid ${status.color}55`, borderRadius: 5, padding: "2px 5px", flexShrink: 0 }}>{status.label}</span>
            <span style={{ color: "#8C968F" }}>›</span>
          </button>
          );
        })}
        {visible.length === 0 && <div style={{ color: DIM, fontSize: 13, textAlign: "center", padding: 18 }}>No chapters match that search.</div>}
      </Section>
    );
  }
  const c = CHAPTERS[chap];
  return (
    <Section title={`${String(c.n).padStart(2, "0")} · ${c.title}`} why={c.tag}>
      <button
        onClick={() => setChap(null)}
        style={{ ...MONO, fontSize: 11.5, color: DIM, background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
      >
        ← contents
      </button>
      {c.blocks.map((b, i) => (
        <Bk key={i} b={b} goTo={goTo} />
      ))}
      <SchemaSections c={c} />
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        {chap > 0 && (
          <button onClick={() => setChap(chap - 1)}
            style={{ ...MONO, fontSize: 13, padding: "10px 14px", borderRadius: 9, cursor: "pointer", background: "transparent", color: DIM, border: `1px solid #394640`, flex: 1 }}>
            ← prev
          </button>
        )}
        <button
          onClick={() => { setDone({ ...done, [chap]: true }); setChap(chap + 1 < CHAPTERS.length ? chap + 1 : null); }}
          style={{ ...MONO, fontSize: 13, padding: "10px 14px", borderRadius: 9, cursor: "pointer", background: GREEN, color: "#0D1412", border: "none", fontWeight: 700, flex: 2 }}
        >
          {chap + 1 < CHAPTERS.length ? "done — next chapter →" : "done — back to contents"}
        </button>
      </div>
    </Section>
  );
}

// ---------------- OPEN-ENDED INTERVIEW PRACTICE ----------------

const PRACTICE_PROMPTS = CHAPTERS.flatMap((c) =>
  (c.sharpen || []).map((q) => ({
    chapter: c.n,
    title: c.title,
    question: q,
    coaching: c.interview?.m2 || c.failure || c.interview?.s30,
  }))
);

function PracticeModule({ goTo, setChap }) {
  const [track, setTrack] = useState("general");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const pool = PRACTICE_PROMPTS.filter((p) => TRACKS[track].chapters.includes(p.chapter));
  const prompt = pool[index % pool.length];
  const next = () => {
    setIndex((i) => (i + 1) % pool.length);
    setAnswer("");
    setRevealed(false);
  };
  const changeTrack = (id) => {
    setTrack(id);
    setIndex(0);
    setAnswer("");
    setRevealed(false);
  };
  return (
    <Section title="Open-Ended Interview Practice" why="multiple choice tests recognition; this mode makes you produce, structure, and defend an answer before seeing coaching.">
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {Object.entries(TRACKS).filter(([id]) => id !== "all").map(([id, item]) => (
          <button key={id} onClick={() => changeTrack(id)} style={{
            ...MONO, fontSize: 11, borderRadius: 999, padding: "7px 10px", cursor: "pointer",
            background: track === id ? VIOLET : PANEL2, color: track === id ? "#0D1412" : DIM,
            border: `1px solid ${track === id ? VIOLET : LINE}`,
          }}>{item.label}</button>
        ))}
      </div>
      <div style={{ background: PANEL2, border: `1px solid ${VIOLET}44`, borderLeft: `4px solid ${VIOLET}`, borderRadius: 10, padding: "14px 15px" }}>
        <div style={{ ...MONO, color: VIOLET, fontSize: 10, letterSpacing: 1, marginBottom: 7 }}>
          PROMPT {index % pool.length + 1}/{pool.length} · {prompt.title.toUpperCase()}
        </div>
        <div style={{ color: INK, fontSize: 16, lineHeight: 1.55, fontWeight: 650 }}>{prompt.question}</div>
      </div>
      <div style={{ ...MONO, fontSize: 10.5, color: DIM }}>Aim for: direct answer → mechanism → trade-off or failure mode → real example.</div>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Write the answer you would say aloud. No options, no hints."
        rows={8}
        style={{ width: "100%", resize: "vertical", padding: 12, borderRadius: 10, border: `1px solid ${LINE}`, background: "#0D1412", color: INK, fontSize: 13.5, lineHeight: 1.6, outlineColor: VIOLET, fontFamily: "inherit" }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setRevealed(true)} disabled={!answer.trim()} style={{
          ...MONO, flex: 2, minWidth: 180, fontSize: 12, padding: "10px 12px", borderRadius: 9,
          border: "none", cursor: answer.trim() ? "pointer" : "not-allowed", background: answer.trim() ? VIOLET : "#394640", color: "#0D1412", fontWeight: 700,
        }}>reveal coaching after my attempt</button>
        <button onClick={next} style={{ ...MONO, flex: 1, minWidth: 120, fontSize: 12, padding: "10px 12px", borderRadius: 9, border: `1px solid ${LINE}`, cursor: "pointer", background: PANEL2, color: DIM }}>skip / next →</button>
      </div>
      {revealed && (
        <div style={{ background: "#142421", border: `1px solid ${BLUE}44`, borderLeft: `4px solid ${BLUE}`, borderRadius: 10, padding: "13px 14px" }}>
          <div style={{ ...MONO, color: BLUE, fontSize: 10, letterSpacing: 1, marginBottom: 7 }}>COACHING GUIDE · compare structure, not wording</div>
          <div style={{ color: "#b8bdb8", fontSize: 13.5, lineHeight: 1.65 }}>{prompt.coaching}</div>
          <button onClick={() => { setChap(prompt.chapter); goTo("learn"); }} style={{ ...MONO, marginTop: 10, fontSize: 11, color: BLUE, background: "transparent", border: `1px solid ${BLUE}55`, borderRadius: 7, padding: "6px 9px", cursor: "pointer" }}>
            review chapter →
          </button>
        </div>
      )}
    </Section>
  );
}

// ---------------- APP ----------------

const TABS = [
  { id: "learn", label: "📖 learn", C: TheoryModule },
  { id: "sig", label: "σ sigmoid", C: SigmoidModule },
  { id: "sum", label: "Σ  E[·]", C: SumModule },
  { id: "soft", label: "softmax", C: SoftmaxModule },
  { id: "attn", label: "attention", C: AttentionModule },
  { id: "gd", label: "∇ descent", C: GDModule },
  { id: "gauss", label: "𝒩 gaussian", C: GaussModule },
  { id: "film", label: "FiLM", C: FilmModule },
  { id: "loglik", label: "log-lik", C: LogLikModule },
  { id: "kl", label: "KL", C: KLModule },
  { id: "lnorm", label: "layernorm", C: LayerNormModule },
  { id: "mha", label: "multi-head", C: MultiHeadModule },
  { id: "roc", label: "ROC·AUC", C: ROCModule },
  { id: "calib", label: "calib·PR", C: CalibModule },
  { id: "biasvar", label: "bias-var", C: BiasVarModule },
  { id: "practice", label: "practice", C: PracticeModule },
  { id: "quiz", label: "⚡ quiz", C: QuizModule },
];

export default function App() {
  const [tab, setTab] = useState("learn");
  const [chap, setChap] = useState(null);
  const [done, setDone] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState(null);

  // reload progress from storage (called on mount and whenever auth changes)
  const reload = React.useCallback(async () => {
    try {
      const r = await storage.get("mil:done");
      if (r && r.value) setDone(JSON.parse(r.value));
    } catch (e) { /* no key yet */ }
    setLoaded(true);
  }, []);

  // load saved progress once on mount
  useEffect(() => { reload(); }, [reload]);

  // watch sign-in state; on sign-in, pull this account's cloud progress
  useEffect(() => {
    if (!auth.enabled) return;
    const off = auth.onChange((u) => {
      setUser(u);
      if (u) reload(); // signed in on this device -> sync down
    });
    return off;
  }, [reload]);

  // persist progress whenever it changes (after initial load)
  useEffect(() => {
    if (!loaded) return;
    try {
      if (storage)
        storage.set("mil:done", JSON.stringify(done));
    } catch (e) { /* storage unavailable */ }
  }, [done, loaded]);
  const Active = TABS.find((t) => t.id === tab).C;
  return (
    <div style={{ background: BG, minHeight: "100vh", color: INK, fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "22px 14px 44px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ ...MONO, fontSize: 11, letterSpacing: 3, color: "#8C968F", textTransform: "uppercase" }}>
            intuition → practice → interview readiness
          </div>
          <div style={{ ...MATH, fontSize: 30, fontWeight: 700, fontStyle: "italic", color: INK, marginTop: 2 }}>
            Math Intuition Lab
          </div>
          <div style={{ fontSize: 13, color: DIM, marginTop: 5, lineHeight: 1.55 }}>
            Choose a role track, build intuition with interactive chapters, then prove you can explain it in open-ended practice.
          </div>
          {auth.enabled && (
            <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              {user ? (
                <>
                  <span style={{ ...MONO, fontSize: 11, color: GREEN }}>
                    ● synced{user.email ? " · " + user.email : ""}
                  </span>
                  <button
                    onClick={() => auth.signOutUser()}
                    style={{ ...MONO, fontSize: 10.5, color: DIM, background: "transparent", border: `1px solid #394640`, borderRadius: 6, padding: "3px 9px", cursor: "pointer" }}
                  >
                    sign out
                  </button>
                </>
              ) : (
                <>
                  <span style={{ ...MONO, fontSize: 11, color: "#8C968F" }}>○ local only — sign in to sync across devices</span>
                  <button
                    onClick={() => auth.signIn()}
                    style={{ ...MONO, fontSize: 11, color: "#0D1412", background: CYAN, border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontWeight: 700 }}
                  >
                    Sign in with Google
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", paddingBottom: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                ...MONO, fontSize: 12.5, padding: "8px 13px", borderRadius: 999, whiteSpace: "nowrap",
                cursor: "pointer", flexShrink: 0,
                background: tab === t.id ? (t.id === "quiz" ? AMBER : t.id === "practice" ? VIOLET : t.id === "learn" ? CYAN : INK) : PANEL,
                color: tab === t.id ? "#0D1412" : t.id === "quiz" ? AMBER : t.id === "practice" ? VIOLET : t.id === "learn" ? CYAN : DIM,
                border: `1px solid ${tab === t.id ? (t.id === "quiz" ? AMBER : t.id === "practice" ? VIOLET : t.id === "learn" ? CYAN : INK) : LINE}`,
                fontWeight: tab === t.id ? 700 : 400,
                transition: "all .15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Active key={tab} goTo={setTab} chap={chap} setChap={setChap} done={done} setDone={setDone} />
        <div style={{ ...MONO, fontSize: 11.5, color: "#8C968F", textAlign: "center", marginTop: 6, lineHeight: 1.8 }}>
          Every Σ is a for-loop. Every ∇ is a slope. Every σ(·) is a squash. Every E[·] is a weighted average.
        </div>
      </div>
    </div>
  );
}

