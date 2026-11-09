import type { GeneratedFile } from "@/lib/types";
import type { TemplateContext } from "./templates-web";

const f = (path: string, language: string, content: string): GeneratedFile => ({
  path,
  language,
  content: content.trimStart(),
});

export function calculatorFiles(ctx: TemplateContext): GeneratedFile[] {
  const title = ctx.title || "Calculator";
  return [
    f(
      "index.html",
      "html",
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="shell">
    <section class="calculator" role="application" aria-label="Calculator">
      <div class="display">
        <p class="expression" id="expression">&nbsp;</p>
        <p class="result" id="result">0</p>
      </div>

      <div class="keys">
        <button class="key fn" data-action="clear">AC</button>
        <button class="key fn" data-action="sign">+/−</button>
        <button class="key fn" data-action="percent">%</button>
        <button class="key op" data-op="/">÷</button>

        <button class="key" data-num="7">7</button>
        <button class="key" data-num="8">8</button>
        <button class="key" data-num="9">9</button>
        <button class="key op" data-op="*">×</button>

        <button class="key" data-num="4">4</button>
        <button class="key" data-num="5">5</button>
        <button class="key" data-num="6">6</button>
        <button class="key op" data-op="-">−</button>

        <button class="key" data-num="1">1</button>
        <button class="key" data-num="2">2</button>
        <button class="key" data-num="3">3</button>
        <button class="key op" data-op="+">+</button>

        <button class="key zero" data-num="0">0</button>
        <button class="key" data-action="decimal">.</button>
        <button class="key equals" data-action="equals">=</button>
      </div>
    </section>

    <aside class="history">
      <div class="history-head">
        <h2>History</h2>
        <button id="clearHistory" type="button">Clear</button>
      </div>
      <ul id="historyList"></ul>
      <p class="empty" id="historyEmpty">Your calculations will appear here.</p>
      <p class="hint">Tip: use your keyboard — digits, operators, Enter and Backspace.</p>
    </aside>
  </main>
  <script src="script.js"></script>
</body>
</html>`,
    ),
    f(
      "styles.css",
      "css",
      `:root {
  --bg: #12100d;
  --panel: #191612;
  --key: #221e19;
  --key-fn: #2c2721;
  --text: #f4ead7;
  --muted: #8c8272;
  --gold: #d8bd85;
  --line: rgba(244, 234, 215, 0.09);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(circle at 25% 0%, #241f17, transparent 60%), var(--bg);
  color: var(--text);
  font-family: "Space Grotesk", -apple-system, sans-serif;
}

.shell {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(220px, 260px);
  gap: 16px;
  align-items: stretch;
}

.calculator {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 18px;
  box-shadow: 0 40px 90px -50px rgba(0, 0, 0, 0.95);
}

.display { text-align: right; padding: 8px 6px 18px; min-height: 104px; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; }
.expression { color: var(--muted); font-size: 12.5px; min-height: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.result { font-size: 42px; letter-spacing: -0.04em; line-height: 1.1; overflow: hidden; }

.keys { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.key {
  border: 1px solid transparent;
  border-radius: 14px;
  background: var(--key);
  color: var(--text);
  font: inherit;
  font-size: 17px;
  padding: 15px 0;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.16s ease, border-color 0.16s ease;
}
.key:hover { background: #2a251f; border-color: var(--line); }
.key:active { transform: scale(0.97); }
.key.fn { background: var(--key-fn); color: var(--gold); font-size: 14.5px; }
.key.op { color: var(--gold); font-size: 19px; }
.key.equals { background: var(--gold); color: #16130d; font-weight: 600; }
.key.equals:hover { background: #e6cd9a; }
.key.zero { grid-column: span 2; }

.history {
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 18px;
  background: rgba(25, 22, 18, 0.6);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.history-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.history h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.16em; color: var(--muted); font-weight: 500; }
.history-head button { border: 0; background: transparent; color: var(--muted); font-size: 11px; cursor: pointer; }
.history-head button:hover { color: var(--gold); }
.history ul { list-style: none; display: grid; gap: 10px; overflow-y: auto; max-height: 330px; }
.history li { border-bottom: 1px solid var(--line); padding-bottom: 8px; cursor: pointer; }
.history li p:first-child { font-size: 11.5px; color: var(--muted); }
.history li p:last-child { font-size: 16px; letter-spacing: -0.02em; }
.empty { font-size: 12px; color: var(--muted); }
.hint { margin-top: auto; padding-top: 16px; font-size: 10.5px; line-height: 1.6; color: #6f6759; }

@media (max-width: 640px) {
  .shell { grid-template-columns: 1fr; }
  .history { order: 2; }
}`,
    ),
    f(
      "script.js",
      "javascript",
      `const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");
const historyList = document.getElementById("historyList");
const historyEmpty = document.getElementById("historyEmpty");

let current = "0";
let previous = null;
let operator = null;
let justEvaluated = false;
let history = [];

const OPS = { "+": "+", "-": "−", "*": "×", "/": "÷" };

function format(value) {
  if (!Number.isFinite(value)) return "Error";
  const rounded = Math.round(value * 1e10) / 1e10;
  const [whole, decimals] = String(rounded).split(".");
  const grouped = Number(whole).toLocaleString("en-US");
  return decimals ? grouped + "." + decimals : grouped;
}

function render() {
  resultEl.textContent = format(Number(current));
  expressionEl.innerHTML =
    previous !== null && operator
      ? format(Number(previous)) + " " + OPS[operator]
      : "&nbsp;";
}

function inputNumber(digit) {
  if (justEvaluated) {
    current = digit;
    justEvaluated = false;
  } else {
    current = current === "0" ? digit : current + digit;
  }
  if (current.replace("-", "").length > 14) current = current.slice(0, 15);
  render();
}

function inputDecimal() {
  if (justEvaluated) {
    current = "0.";
    justEvaluated = false;
  } else if (!current.includes(".")) {
    current += ".";
  }
  render();
}

function chooseOperator(next) {
  if (previous !== null && operator && !justEvaluated) evaluate(false);
  previous = current;
  operator = next;
  current = "0";
  justEvaluated = false;
  render();
}

function evaluate(log = true) {
  if (previous === null || !operator) return;
  const a = Number(previous);
  const b = Number(current);
  let value = 0;
  if (operator === "+") value = a + b;
  if (operator === "-") value = a - b;
  if (operator === "*") value = a * b;
  if (operator === "/") value = b === 0 ? NaN : a / b;

  const entry = format(a) + " " + OPS[operator] + " " + format(b) + " = " + format(value);
  current = String(value);
  previous = null;
  operator = null;
  justEvaluated = true;

  if (log && Number.isFinite(value)) {
    history.unshift({ expression: entry, value: value });
    history = history.slice(0, 8);
    renderHistory();
  }
  render();
}

function clearAll() {
  current = "0";
  previous = null;
  operator = null;
  justEvaluated = false;
  render();
}

function toggleSign() {
  current = current.startsWith("-") ? current.slice(1) : "-" + current;
  render();
}

function percent() {
  current = String(Number(current) / 100);
  render();
}

function renderHistory() {
  historyList.innerHTML = "";
  history.forEach((item) => {
    const li = document.createElement("li");
    const expression = document.createElement("p");
    expression.textContent = item.expression;
    const value = document.createElement("p");
    value.textContent = format(item.value);
    li.append(expression, value);
    li.addEventListener("click", () => {
      current = String(item.value);
      justEvaluated = true;
      render();
    });
    historyList.appendChild(li);
  });
  historyEmpty.hidden = history.length > 0;
}

document.querySelectorAll(".key").forEach((key) => {
  key.addEventListener("click", () => {
    const num = key.dataset.num;
    const op = key.dataset.op;
    const action = key.dataset.action;
    if (num !== undefined) inputNumber(num);
    else if (op) chooseOperator(op);
    else if (action === "decimal") inputDecimal();
    else if (action === "equals") evaluate(true);
    else if (action === "clear") clearAll();
    else if (action === "sign") toggleSign();
    else if (action === "percent") percent();
  });
});

document.addEventListener("keydown", (event) => {
  const key = event.key;
  if (/^[0-9]$/.test(key)) inputNumber(key);
  else if (["+", "-", "*", "/"].includes(key)) chooseOperator(key);
  else if (key === ".") inputDecimal();
  else if (key === "Enter" || key === "=") {
    event.preventDefault();
    evaluate(true);
  } else if (key === "Backspace") {
    current = current.length > 1 ? current.slice(0, -1) : "0";
    render();
  } else if (key.toLowerCase() === "c") clearAll();
});

document.getElementById("clearHistory").addEventListener("click", () => {
  history = [];
  renderHistory();
});

render();
renderHistory();`,
    ),
    f(
      "README.md",
      "markdown",
      `# ${title}

A keyboard-friendly calculator with a clickable history panel.

- \`index.html\` — display, keypad, history
- \`styles.css\` — warm charcoal theme with gold accents
- \`script.js\` — arithmetic state machine, keyboard input, history

Open \`index.html\` or run \`npx serve .\`.`,
    ),
  ];
}
