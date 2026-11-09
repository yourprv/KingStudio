import type { GeneratedFile } from "@/lib/types";

export type TemplateContext = {
  prompt: string;
  title: string;
  brand: string;
  person: string;
};

const f = (path: string, language: string, content: string): GeneratedFile => ({
  path,
  language,
  content: content.trimStart(),
});

export function cleanPrompt(prompt: string) {
  return prompt
    .replace(/^(please\s+)?(can you\s+)?(build|create|make|generate|design|write|code)\s+(me\s+)?/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleFromPrompt(prompt: string) {
  const cleaned = cleanPrompt(prompt);
  if (!cleaned) return "Untitled project";
  const words = cleaned.split(" ").slice(0, 7).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function personFromPrompt(prompt: string) {
  const match = prompt.match(/(?:for|by|about)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
  return match?.[1] ?? "";
}

export function brandFromPrompt(prompt: string) {
  const map: Array<[RegExp, string]> = [
    [/hotel|resort|inn|lodge|hospitality/, "The Grand Hotel"],
    [/coffee|cafe|espresso/, "Ember & Oak"],
    [/bakery|bread|pastry/, "Crumb Studio"],
    [/saas|startup|analytics|platform|ai/, "Clearline"],
    [/fitness|gym|workout/, "Kinetic"],
    [/photo|portfolio/, "Field Notes"],
    [/travel|tour/, "Wayfare"],
    [/finance|invest|bank/, "Ledger"],
  ];
  for (const [re, name] of map) if (re.test(prompt.toLowerCase())) return name;
  return "";
}

/* ------------------------------------------------------------------ */
/* Portfolio                                                          */
/* ------------------------------------------------------------------ */

export function portfolioFiles(ctx: TemplateContext): GeneratedFile[] {
  const person = ctx.person || ctx.brand || "Avery Lane";
  const role = /developer|engineer|programmer/i.test(ctx.prompt)
    ? "Software engineer"
    : /photo/i.test(ctx.prompt)
      ? "Photographer"
      : /design/i.test(ctx.prompt)
        ? "Product designer"
        : "Designer & builder";
  return [
    f(
      "index.html",
      "html",
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${person} — ${role}</title>
  <meta name="description" content="Portfolio of ${person}, ${role.toLowerCase()} building calm, useful digital products." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="site-header">
    <a class="mark" href="#top">${person
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)}</a>
    <nav class="nav">
      <a href="#work">Work</a>
      <a href="#about">About</a>
      <a href="#contact">Contact</a>
    </nav>
    <a class="status" href="#contact"><span class="dot"></span>Open for work</a>
  </header>

  <main id="top">
    <section class="hero reveal">
      <p class="eyebrow">${role} · Available worldwide</p>
      <h1>${person.split(" ")[0]}<br /><em>${person.split(" ").slice(1).join(" ") || "Lane"}</em></h1>
      <p class="lede">
        I design and build interfaces that feel quiet, deliberate and fast.
        Currently crafting product experiences for small teams with large ideas.
      </p>
      <div class="hero-actions">
        <a class="btn" href="#work">Selected work</a>
        <a class="btn ghost" href="mailto:hello@example.com">Get in touch</a>
      </div>
    </section>

    <section id="work" class="work">
      <div class="section-head">
        <span>01 — Selected work</span>
        <span class="muted">2023 – 2026</span>
      </div>
      <a class="project reveal" href="#contact">
        <span class="project-index">01</span>
        <span class="project-name">Aperture</span>
        <span class="project-desc">Design system for a photography archive</span>
        <span class="project-year">2026</span>
      </a>
      <a class="project reveal" href="#contact">
        <span class="project-index">02</span>
        <span class="project-name">Halcyon</span>
        <span class="project-desc">Booking flow for a boutique residency</span>
        <span class="project-year">2025</span>
      </a>
      <a class="project reveal" href="#contact">
        <span class="project-index">03</span>
        <span class="project-name">Paper Trail</span>
        <span class="project-desc">Reading app for long-form essays</span>
        <span class="project-year">2024</span>
      </a>
    </section>

    <section id="about" class="about reveal">
      <h2>About</h2>
      <div class="about-body">
        <p>
          I work at the intersection of interface design and front-end engineering.
          My practice is simple: understand the problem, remove what is unnecessary,
          then make the remaining parts feel inevitable.
        </p>
        <ul class="skills">
          <li>Product design</li>
          <li>Front-end development</li>
          <li>Design systems</li>
          <li>Motion & prototyping</li>
        </ul>
      </div>
    </section>

    <section id="contact" class="contact reveal">
      <p class="eyebrow">02 — Contact</p>
      <h2>Let's build something<br /><em>worth keeping.</em></h2>
      <a class="mail" href="mailto:hello@example.com">hello@example.com</a>
      <div class="socials">
        <a href="#">Instagram</a>
        <a href="#">LinkedIn</a>
        <a href="#">GitHub</a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <span>© <span id="year">2026</span> ${person}</span>
    <span class="muted">Designed in the browser</span>
  </footer>
  <script src="script.js"></script>
</body>
</html>`,
    ),
    f(
      "styles.css",
      "css",
      `:root {
  --paper: #f4efe4;
  --paper-deep: #ebe4d5;
  --ink: #17140f;
  --ink-soft: #5d564a;
  --line: rgba(23, 20, 15, 0.14);
  --accent: #8a5a34;
  --radius: 18px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  background: var(--paper);
  color: var(--ink);
  font-family: "Instrument Sans", -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; text-decoration: none; }

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px clamp(20px, 5vw, 64px);
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  background: rgba(244, 239, 228, 0.86);
  backdrop-filter: blur(12px);
  z-index: 10;
}

.mark {
  font-family: "Instrument Serif", Georgia, serif;
  font-size: 22px;
  letter-spacing: 0.04em;
  border: 1px solid var(--line);
  border-radius: 50%;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
}

.nav { display: flex; gap: clamp(16px, 3vw, 36px); font-size: 14px; }
.nav a { color: var(--ink-soft); transition: color 0.2s ease; }
.nav a:hover { color: var(--ink); }

.status { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.12em; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: #4d7c4a; box-shadow: 0 0 0 4px rgba(77, 124, 74, 0.14); }

main { padding: 0 clamp(20px, 5vw, 64px); }

.hero { padding: clamp(64px, 12vh, 148px) 0 clamp(56px, 10vh, 112px); max-width: 1080px; }
.eyebrow { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); margin-bottom: 28px; }

.hero h1 {
  font-size: clamp(64px, 14vw, 176px);
  line-height: 0.86;
  letter-spacing: -0.04em;
  font-weight: 400;
  margin-bottom: 36px;
}

.hero h1 em, .contact h2 em {
  font-family: "Instrument Serif", Georgia, serif;
  font-style: italic;
  color: var(--accent);
}

.lede { max-width: 46ch; font-size: clamp(16px, 1.4vw, 19px); color: var(--ink-soft); }

.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 40px; }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--ink);
  color: var(--paper);
  padding: 14px 24px;
  border-radius: 999px;
  font-size: 14px;
  transition: transform 0.2s ease, background 0.2s ease;
}
.btn:hover { transform: translateY(-2px); background: #2a241b; }
.btn.ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); }
.btn.ghost:hover { background: var(--paper-deep); }

.section-head {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--line);
  padding: 20px 0;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.muted { color: var(--ink-soft); }

.project {
  display: grid;
  grid-template-columns: 48px 1.1fr 1.6fr auto;
  align-items: baseline;
  gap: 20px;
  padding: 30px 8px;
  border-bottom: 1px solid var(--line);
  transition: padding 0.25s ease, background 0.25s ease;
}
.project:hover { padding-left: 20px; background: var(--paper-deep); }
.project-index { font-size: 12px; color: var(--accent); letter-spacing: 0.1em; }
.project-name { font-family: "Instrument Serif", Georgia, serif; font-size: clamp(24px, 3vw, 38px); }
.project-desc { color: var(--ink-soft); font-size: 14px; }
.project-year { font-size: 12px; color: var(--ink-soft); }

.about { display: grid; grid-template-columns: 1fr 2fr; gap: 40px; padding: clamp(56px, 9vh, 112px) 0; border-top: 1px solid var(--line); }
.about h2 { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 34px; }
.about-body p { max-width: 58ch; color: var(--ink-soft); font-size: 17px; }
.skills { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 28px; list-style: none; }
.skills li { border: 1px solid var(--line); border-radius: 999px; padding: 8px 16px; font-size: 13px; width: fit-content; }

.contact { padding: clamp(56px, 10vh, 128px) 0; border-top: 1px solid var(--line); }
.contact h2 { font-size: clamp(40px, 7vw, 84px); line-height: 0.94; letter-spacing: -0.03em; font-weight: 400; margin-bottom: 36px; }
.mail { font-size: clamp(18px, 2.4vw, 28px); border-bottom: 1px solid var(--accent); padding-bottom: 4px; color: var(--accent); }
.socials { display: flex; gap: 22px; margin-top: 44px; font-size: 13px; color: var(--ink-soft); }
.socials a:hover { color: var(--ink); }

.site-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 28px clamp(20px, 5vw, 64px);
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--ink-soft);
}

.reveal { opacity: 0; transform: translateY(22px); transition: opacity 0.7s ease, transform 0.7s ease; }
.reveal.visible { opacity: 1; transform: none; }

@media (max-width: 720px) {
  .nav { display: none; }
  .project { grid-template-columns: 32px 1fr auto; }
  .project-desc { display: none; }
  .about { grid-template-columns: 1fr; }
  .contact h2 br { display: none; }
}`,
    ),
    f(
      "script.js",
      "javascript",
      `// Reveal on scroll
const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealItems.forEach((item, index) => {
    item.style.transitionDelay = Math.min(index * 70, 320) + "ms";
    observer.observe(item);
  });
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

// Footer year
const year = new Date().getFullYear();
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(year);

// Tiny hover tilt on project rows
document.querySelectorAll(".project").forEach((row) => {
  row.addEventListener("mousemove", (event) => {
    const rect = row.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    row.style.transform = "translateX(" + x * 6 + "px)";
  });
  row.addEventListener("mouseleave", () => {
    row.style.transform = "";
  });
});`,
    ),
    f(
      "README.md",
      "markdown",
      `# ${person} — Portfolio

A single-page editorial portfolio built with plain HTML, CSS and JavaScript.

## Files

- \`index.html\` — page structure and content
- \`styles.css\` — warm editorial design system
- \`script.js\` — scroll reveals, footer year, micro-interactions

## Run it

Open \`index.html\` in any browser, or serve the folder:

\`\`\`bash
npx serve .
\`\`\`

## Customise

Change the colours in \`:root\` inside \`styles.css\`. Replace the project rows in
\`index.html\` with your own work.`,
    ),
  ];
}

/* ------------------------------------------------------------------ */
/* SaaS landing page                                                  */
/* ------------------------------------------------------------------ */

export function landingFiles(ctx: TemplateContext): GeneratedFile[] {
  const brand = ctx.brand || ctx.title || "New Project";
  const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project";
  return [
    f(
      "index.html",
      "html",
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${brand} — Ship agentic workflows</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="glow"></div>
  <header class="nav">
    <div class="brand"><span class="brand-mark">◆</span>${brand}</div>
    <nav class="nav-links">
      <a href="#features">Product</a>
      <a href="#pricing">Pricing</a>
      <a href="#faq">Docs</a>
    </nav>
    <a class="btn small" href="#pricing">Start free</a>
  </header>

  <main>
    <section class="hero">
      <span class="pill"><i></i> v2.0 — agent runtime is live</span>
      <h1>Your team's work,<br /><em>finally autonomous.</em></h1>
      <p class="sub">
        ${brand} turns plain-language briefs into shipped work. Agents plan,
        write, review and deploy — while you keep the final say.
      </p>
      <div class="cta-row">
        <a class="btn" href="#pricing">Start building free</a>
        <a class="btn ghost" href="#features">See how it works</a>
      </div>
      <div class="logos">
        <span>Trusted by teams at</span>
        <div class="logo-row"><b>Vercel</b><b>Linear</b><b>Raycast</b><b>Supabase</b></div>
      </div>
      <div class="panel">
        <div class="panel-bar"><i></i><i></i><i></i><span>${slug} / build workspace</span></div>
        <div class="panel-body">
          <div class="terminal" id="terminal"></div>
          <div class="stats">
            <div><b>12.4k</b><span>runs / month</span></div>
            <div><b>3.2s</b><span>median build</span></div>
            <div><b>99.98%</b><span>uptime</span></div>
          </div>
        </div>
      </div>
    </section>

    <section id="features" class="features">
      <div class="section-label">Capabilities</div>
      <h2>Everything between idea<br />and <em>shipped.</em></h2>
      <div class="grid">
        <article class="card"><span class="icon">◷</span><h3>Realtime planning</h3><p>Agents decompose a brief into a file-level plan before writing a single line.</p></article>
        <article class="card"><span class="icon">⌘</span><h3>Parallel execution</h3><p>Run dozens of sandboxed steps at once with automatic rollback on failure.</p></article>
        <article class="card"><span class="icon">◍</span><h3>Human checkpoints</h3><p>Approve diffs, gate deploys and keep every decision reviewable in one thread.</p></article>
        <article class="card"><span class="icon">✦</span><h3>Memory that compounds</h3><p>Project conventions are learned once, then applied to every future change.</p></article>
        <article class="card"><span class="icon">⬡</span><h3>Any stack</h3><p>Static sites, React apps, Python services — the same runtime handles all of it.</p></article>
        <article class="card"><span class="icon">↗</span><h3>Push-button deploys</h3><p>Preview URLs on every run, production promotes with a single click.</p></article>
      </div>
    </section>

    <section id="pricing" class="pricing">
      <div class="section-label">Pricing</div>
      <h2>Simple plans,<br /><em>no surprises.</em></h2>
      <div class="plans">
        <article class="plan">
          <h3>Starter</h3><p class="price">$0<span>/mo</span></p>
          <ul><li>3 active projects</li><li>150 agent minutes</li><li>Community support</li></ul>
          <a class="btn ghost full" href="#">Get started</a>
        </article>
        <article class="plan featured">
          <span class="badge">Most popular</span>
          <h3>Studio</h3><p class="price">$24<span>/mo</span></p>
          <ul><li>Unlimited projects</li><li>5,000 agent minutes</li><li>Preview deployments</li><li>Priority models</li></ul>
          <a class="btn full" href="#">Start 14-day trial</a>
        </article>
        <article class="plan">
          <h3>Team</h3><p class="price">$89<span>/mo</span></p>
          <ul><li>Everything in Studio</li><li>Shared memory</li><li>SSO &amp; audit log</li></ul>
          <a class="btn ghost full" href="#">Talk to sales</a>
        </article>
      </div>
    </section>

    <section id="faq" class="faq">
      <div class="section-label">FAQ</div>
      <details open><summary>How is ${brand} different from a code assistant?</summary><p>It works at the project level: planning, creating, and maintaining whole file trees instead of answering one file at a time.</p></details>
      <details><summary>Can I use my own models?</summary><p>Yes. Bring any provider key and route individual agents to different models.</p></details>
      <details><summary>Where does my code run?</summary><p>In an isolated sandbox per run, with reproducible environments and full logs.</p></details>
    </section>

    <section class="final-cta">
      <h2>Start with a thought.<br /><em>Ship by lunch.</em></h2>
      <a class="btn" href="#pricing">Create your workspace</a>
    </section>
  </main>

  <footer>
    <div class="brand"><span class="brand-mark">◆</span>${brand}</div>
    <p>© <span id="year"></span> ${brand} Labs. Built autonomously.</p>
  </footer>
  <script src="script.js"></script>
</body>
</html>`,
    ),
    f(
      "styles.css",
      "css",
      `:root {
  --bg: #07070a;
  --panel: #0e0e13;
  --line: rgba(255, 255, 255, 0.09);
  --text: #f2f0ea;
  --muted: #8d8b93;
  --lime: #c9f76f;
  --violet: #8c7bff;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: "DM Sans", -apple-system, sans-serif;
  line-height: 1.6;
  overflow-x: hidden;
}

a { color: inherit; text-decoration: none; }
em { font-family: "Instrument Serif", Georgia, serif; font-style: italic; color: var(--lime); }

.glow {
  position: fixed;
  inset: -20% 10% auto 10%;
  height: 60vh;
  background: radial-gradient(circle at 50% 0%, rgba(140, 123, 255, 0.28), transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.nav {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px clamp(18px, 5vw, 56px);
  border-bottom: 1px solid var(--line);
  background: rgba(7, 7, 10, 0.72);
  backdrop-filter: blur(14px);
}
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: -0.01em; }
.brand-mark { color: var(--lime); }
.nav-links { display: flex; gap: 28px; font-size: 14px; color: var(--muted); }
.nav-links a:hover { color: var(--text); }

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--lime); color: #0a0a0a;
  padding: 13px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(201, 247, 111, 0.22); }
.btn.small { padding: 9px 16px; font-size: 13px; }
.btn.ghost { background: transparent; color: var(--text); border: 1px solid var(--line); }
.btn.ghost:hover { background: rgba(255, 255, 255, 0.05); box-shadow: none; }
.btn.full { width: 100%; margin-top: 22px; }

main { position: relative; z-index: 1; }
.hero { max-width: 1120px; margin: 0 auto; padding: clamp(56px, 11vh, 116px) clamp(18px, 5vw, 32px) 80px; text-align: center; }

.pill {
  display: inline-flex; align-items: center; gap: 9px;
  border: 1px solid var(--line); border-radius: 999px;
  padding: 6px 14px; font-size: 12px; color: var(--muted);
  background: rgba(255, 255, 255, 0.03);
}
.pill i { width: 6px; height: 6px; border-radius: 50%; background: var(--lime); box-shadow: 0 0 10px var(--lime); }

.hero h1 { font-size: clamp(42px, 7.4vw, 88px); line-height: 1.02; letter-spacing: -0.04em; margin: 26px 0 22px; }
.sub { max-width: 58ch; margin: 0 auto; color: var(--muted); font-size: clamp(15px, 1.6vw, 18px); }
.cta-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin: 34px 0 46px; }

.logos { border-top: 1px solid var(--line); padding-top: 26px; margin-bottom: 46px; }
.logos span { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
.logo-row { display: flex; justify-content: center; flex-wrap: wrap; gap: clamp(18px, 5vw, 48px); margin-top: 16px; color: #6d6b75; font-size: 18px; }

.panel { border: 1px solid var(--line); border-radius: 18px; background: linear-gradient(180deg, #101017, #0a0a0e); overflow: hidden; text-align: left; box-shadow: 0 40px 90px rgba(0, 0, 0, 0.6); }
.panel-bar { display: flex; align-items: center; gap: 7px; padding: 12px 16px; border-bottom: 1px solid var(--line); font-size: 12px; color: var(--muted); }
.panel-bar i { width: 9px; height: 9px; border-radius: 50%; background: #2a2a33; }
.panel-bar span { margin-left: 8px; }
.panel-body { display: grid; grid-template-columns: 1.6fr 1fr; }
.terminal { padding: 22px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; line-height: 2; color: #c9c7d1; min-height: 210px; }
.terminal .ok { color: var(--lime); }
.terminal .dim { color: #5d5b66; }
.terminal .caret { display: inline-block; width: 7px; height: 15px; background: var(--lime); vertical-align: -3px; animation: blink 1s steps(2) infinite; }
@keyframes blink { 50% { opacity: 0; } }
.stats { display: grid; gap: 1px; background: var(--line); border-left: 1px solid var(--line); }
.stats div { background: #0b0b10; padding: 18px 20px; }
.stats b { display: block; font-size: 22px; letter-spacing: -0.03em; }
.stats span { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; }

section { padding: clamp(60px, 10vh, 120px) clamp(18px, 5vw, 32px); max-width: 1120px; margin: 0 auto; }
.section-label { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--lime); margin-bottom: 18px; }
section h2 { font-size: clamp(30px, 4.6vw, 52px); line-height: 1.05; letter-spacing: -0.03em; font-weight: 500; margin-bottom: 42px; }

.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px; }
.card { border: 1px solid var(--line); border-radius: 14px; padding: 24px; background: rgba(255, 255, 255, 0.018); transition: border-color 0.2s ease, transform 0.2s ease; }
.card:hover { border-color: rgba(201, 247, 111, 0.4); transform: translateY(-3px); }
.card .icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; background: rgba(201, 247, 111, 0.1); color: var(--lime); margin-bottom: 18px; }
.card h3 { font-size: 16px; margin-bottom: 8px; }
.card p { font-size: 14px; color: var(--muted); }

.plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; align-items: start; }
.plan { border: 1px solid var(--line); border-radius: 16px; padding: 26px; background: #0b0b10; position: relative; }
.plan.featured { border-color: rgba(201, 247, 111, 0.45); background: linear-gradient(180deg, rgba(201, 247, 111, 0.07), #0b0b10 60%); }
.badge { position: absolute; top: -11px; left: 26px; background: var(--lime); color: #0a0a0a; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; }
.plan h3 { font-size: 15px; color: var(--muted); font-weight: 500; }
.price { font-size: 40px; letter-spacing: -0.04em; margin: 10px 0 18px; }
.price span { font-size: 14px; color: var(--muted); }
.plan ul { list-style: none; display: grid; gap: 10px; font-size: 14px; color: var(--muted); }
.plan li::before { content: "✓"; color: var(--lime); margin-right: 9px; }

.faq details { border-top: 1px solid var(--line); padding: 18px 0; }
.faq summary { cursor: pointer; font-size: 15px; font-weight: 500; }
.faq p { color: var(--muted); font-size: 14px; margin-top: 10px; max-width: 70ch; }

.final-cta { text-align: center; border-top: 1px solid var(--line); }
.final-cta h2 { margin-bottom: 30px; }

footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 26px clamp(18px, 5vw, 56px); border-top: 1px solid var(--line); font-size: 12px; color: var(--muted); }

@media (max-width: 760px) {
  .nav-links { display: none; }
  .panel-body { grid-template-columns: 1fr; }
  .stats { grid-template-columns: repeat(3, 1fr); border-left: 0; border-top: 1px solid var(--line); }
  .stats div { padding: 14px; }
  .hero h1 br { display: none; }
}`,
    ),
    f(
      "script.js",
      "javascript",
      `const lines = [
  { text: "$ ${slug} build \\"project files\\"", cls: "" },
  { text: "◇ planning         6 files, 3 sections", cls: "dim" },
  { text: "◇ creating         index.html", cls: "" },
  { text: "◇ creating         styles.css", cls: "" },
  { text: "◇ creating         script.js", cls: "" },
  { text: "✓ built in 3.2s", cls: "ok" },
  { text: "✓ project files ready", cls: "ok" }
];

const terminal = document.getElementById("terminal");
let lineIndex = 0;

function typeLine() {
  if (!terminal || lineIndex >= lines.length) return;
  const current = lines[lineIndex];
  const row = document.createElement("div");
  row.className = current.cls;
  terminal.appendChild(row);

  let charIndex = 0;
  const caret = document.createElement("span");
  caret.className = "caret";
  row.appendChild(caret);

  const timer = setInterval(() => {
    charIndex += 2;
    caret.remove();
    row.textContent = current.text.slice(0, charIndex);
    row.appendChild(caret);
    if (charIndex >= current.text.length) {
      clearInterval(timer);
      row.textContent = current.text;
      lineIndex += 1;
      setTimeout(typeLine, 260);
    }
  }, 16);
}

if (terminal) {
  const startTyping = () => {
    if (terminal.dataset.started) return;
    terminal.dataset.started = "1";
    lineIndex = 0;
    terminal.innerHTML = "";
    typeLine();
  };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) startTyping();
      });
    }, { threshold: 0.3 });
    io.observe(terminal);
  } else {
    startTyping();
  }
}

// Smooth scroll for in-page anchors
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const id = link.getAttribute("href");
    if (!id || id === "#") return;
    const target = document.querySelector(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());`,
    ),
    f(
      "README.md",
      "markdown",
      `# ${brand} — landing page

Three plain files, no build step.

- \`index.html\` — hero, features, pricing, FAQ
- \`styles.css\` — dark theme with lime accents
- \`script.js\` — terminal typing animation, smooth scrolling

Open \`index.html\` or run \`npx serve .\`.`,
    ),
  ];
}

/* ------------------------------------------------------------------ */
/* Task app                                                           */
/* ------------------------------------------------------------------ */

export function hotelLandingFiles(ctx: TemplateContext): GeneratedFile[] {
  const brand = ctx.brand || "The Grand Hotel";
  return [
    f(
      "index.html",
      "html",
      `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="A considered stay, thoughtful rooms, and a warm welcome at ${brand}." />
  <title>${brand} — A stay to remember</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="topbar">
    <a class="brand" href="#home" aria-label="${brand} home"><span class="brand-mark">✳</span>${brand}</a>
    <nav aria-label="Main navigation"><a href="#stay">The stay</a><a href="#rooms">Rooms</a><a href="#experience">Experiences</a></nav>
    <a class="nav-cta" href="#booking">Book your stay</a>
  </header>

  <main id="home">
    <section class="hero">
      <div class="hero-image" role="img" aria-label="Sunlight over a peaceful hotel courtyard"></div>
      <div class="hero-shade"></div>
      <div class="hero-copy">
        <p class="eyebrow">A quieter kind of getaway</p>
        <h1>Stay awhile.<br /><em>Feel somewhere new.</em></h1>
        <p>Thoughtful rooms, slow mornings, and little details that make a place feel like yours.</p>
        <a class="light-button" href="#rooms">Explore the hotel <span>↗</span></a>
      </div>
      <a class="scroll-note" href="#stay">Scroll to discover <span>↓</span></a>
    </section>

    <section class="booking" id="booking" aria-label="Check availability">
      <div><span class="field-label">Arrive</span><input id="checkin" type="date" aria-label="Arrival date" /></div>
      <div><span class="field-label">Depart</span><input id="checkout" type="date" aria-label="Departure date" /></div>
      <div><span class="field-label">Guests</span><select aria-label="Number of guests"><option>2 guests</option><option>1 guest</option><option>3 guests</option><option>4 guests</option></select></div>
      <button id="checkAvailability" type="button">Check availability <span>→</span></button>
    </section>
    <p class="booking-message" id="bookingMessage" role="status" aria-live="polite"></p>

    <section class="intro" id="stay">
      <p class="eyebrow">Welcome to ${brand}</p>
      <h2>Time moves differently<br />when you <em>settle in.</em></h2>
      <p class="intro-copy">Find a little room to breathe. Come for the considered spaces, stay for the welcoming people, local flavours, and unhurried moments in between.</p>
    </section>

    <section class="rooms" id="rooms">
      <div class="section-heading"><div><p class="eyebrow">Make yourself at home</p><h2>Rooms with <em>room to rest.</em></h2></div><a href="#booking">Find your room ↗</a></div>
      <div class="room-grid">
        <article class="room-card room-one"><div><span>01 / The classic</span><h3>A softer landing.</h3><p>Queen bed · Courtyard view · 2 guests</p></div></article>
        <article class="room-card room-two"><div><span>02 / The suite</span><h3>Stay a little longer.</h3><p>King bed · Private terrace · 2 guests</p></div></article>
        <article class="room-card room-three"><div><span>03 / The family room</span><h3>Space for everyone.</h3><p>Two bedrooms · Lounge · 4 guests</p></div></article>
      </div>
    </section>

    <section class="experience" id="experience"><p class="eyebrow">A few good reasons to stay</p><h2>Little things, <em>well considered.</em></h2><div class="experience-grid"><article><span>01</span><h3>Breakfast, slowly</h3><p>Seasonal produce, warm bread, and another cup if you like.</p></article><article><span>02</span><h3>Local by nature</h3><p>Independent shops, quiet walks, and neighbourhood favourites close by.</p></article><article><span>03</span><h3>Room to unwind</h3><p>Soft linens, thoughtful essentials, and space to do absolutely nothing.</p></article></div></section>

    <section class="closing"><p class="eyebrow">Your stay starts here</p><h2>Make a little space<br />for <em>something lovely.</em></h2><a class="dark-button" href="#booking">Check your dates <span>→</span></a></section>
  </main>
  <footer><a class="brand" href="#home"><span class="brand-mark">✳</span>${brand}</a><span>Thoughtful stays, made for slowing down.</span><a href="#booking">Get in touch</a></footer>
  <script src="script.js"></script>
</body>
</html>`,
    ),
    f(
      "styles.css",
      "css",
      `:root { --ink:#25271f; --muted:#74766c; --paper:#f5f3ec; --sage:#d9dfd0; --line:#deded4; --accent:#586b52; }
* { box-sizing:border-box; margin:0; }
html { scroll-behavior:smooth; }
body { background:var(--paper); color:var(--ink); font-family:"DM Sans",sans-serif; line-height:1.6; }
a { color:inherit; text-decoration:none; }
.topbar { height:76px; display:flex; align-items:center; justify-content:space-between; gap:20px; padding:0 clamp(20px,6vw,88px); background:var(--paper); }
.brand { display:flex; align-items:center; gap:10px; font-family:"Playfair Display",serif; font-size:17px; }
.brand-mark { color:var(--accent); font-size:20px; }
nav { display:flex; gap:30px; color:var(--muted); font-size:12px; }
.nav-cta,.dark-button { background:var(--ink); color:#fff; padding:11px 18px; font-size:11px; letter-spacing:.05em; }
.hero { position:relative; min-height:590px; display:flex; align-items:center; overflow:hidden; color:#fff; background:#525b49; }
.hero-image,.hero-shade { position:absolute; inset:0; }
.hero-image { background:linear-gradient(135deg,#85927b,#555e4d 44%,#b1a68f); }
.hero-image::before,.room-card::before { content:""; position:absolute; inset:0; background:radial-gradient(ellipse at 76% 25%,rgba(244,230,190,.62),transparent 22%),linear-gradient(155deg,transparent 40%,rgba(18,27,20,.26) 41% 58%,transparent 59%),linear-gradient(12deg,#626c55 0 35%,#a6a284 36% 45%,#76816d 46%); }
.hero-shade { background:linear-gradient(90deg,rgba(18,25,19,.68),rgba(18,25,19,.16) 75%); }
.hero-copy { position:relative; z-index:1; width:min(700px,90%); margin-left:clamp(24px,10vw,150px); padding:80px 0; }
.eyebrow { color:var(--accent); font-size:9px; letter-spacing:.2em; text-transform:uppercase; }
.hero .eyebrow { color:#e6e7d7; }
h1,h2 { font-family:"Playfair Display",serif; font-weight:400; letter-spacing:-.035em; }
h1 { margin:20px 0; font-size:clamp(44px,7vw,82px); line-height:1.04; }
h1 em,h2 em { color:#bdc5ad; font-weight:400; }
.hero-copy>p:not(.eyebrow) { max-width:420px; color:#e6e6dd; font-size:14px; }
.light-button { display:inline-flex; gap:32px; align-items:center; margin-top:30px; padding:12px 16px; background:#f5f3ec; color:var(--ink); font-size:11px; }
.scroll-note { position:absolute; z-index:1; right:clamp(20px,6vw,84px); bottom:26px; font-size:10px; letter-spacing:.08em; }
.scroll-note span { margin-left:12px; }
.booking { position:relative; z-index:2; display:grid; grid-template-columns:1fr 1fr 1fr auto; max-width:980px; margin:-1px auto 0; padding:24px 28px; background:#fff; box-shadow:0 18px 45px #25271f12; }
.booking>div { padding:0 18px; border-right:1px solid var(--line); }
.booking>div:first-child { padding-left:0; }
.field-label { display:block; color:var(--muted); font-size:9px; letter-spacing:.15em; text-transform:uppercase; }
.booking input,.booking select { width:100%; margin-top:7px; border:0; background:transparent; color:var(--ink); font:inherit; font-size:12px; }
.booking button { border:0; background:var(--accent); color:#fff; padding:0 18px; font:inherit; font-size:11px; cursor:pointer; }
.booking button span { margin-left:16px; }
.booking-message { min-height:20px; margin:8px auto 0; color:var(--accent); text-align:center; font-size:11px; }
.intro { max-width:820px; margin:0 auto; padding:106px 24px 110px; text-align:center; }
.intro h2,.experience h2,.closing h2 { margin:17px 0; font-size:clamp(34px,5vw,55px); line-height:1.12; }
.intro h2 em,.experience h2 em,.closing h2 em { color:var(--accent); }
.intro-copy { max-width:510px; margin:0 auto; color:var(--muted); font-size:13px; }
.rooms,.experience { padding:70px clamp(22px,7vw,100px); background:#ebece4; }
.section-heading { display:flex; justify-content:space-between; align-items:end; gap:20px; margin-bottom:26px; }
.section-heading h2 { margin-top:10px; font-size:clamp(28px,4vw,43px); }
.section-heading h2 em { color:var(--accent); }
.section-heading>a { color:var(--accent); font-size:11px; }
.room-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.room-card { position:relative; display:flex; align-items:end; min-height:330px; overflow:hidden; padding:22px; color:#fff; background:#737b66; }
.room-card::before { opacity:.8; transition:transform .5s; }
.room-card:hover::before { transform:scale(1.04); }
.room-two::before { background:linear-gradient(155deg,transparent 40%,#27332977 41%),radial-gradient(ellipse at 70% 25%,#e4d4b4aa,transparent 20%),linear-gradient(130deg,#7f887a,#4e594d); }
.room-three::before { background:radial-gradient(ellipse at 45% 30%,#e7d4b6aa,transparent 25%),linear-gradient(135deg,#aa9e87,#606a5a 60%); }
.room-card>div { position:relative; z-index:1; }
.room-card span { font-size:9px; letter-spacing:.16em; text-transform:uppercase; }
.room-card h3 { margin:8px 0 3px; font-family:"Playfair Display",serif; font-size:25px; font-weight:400; }
.room-card p { font-size:10px; color:#f0eee6; }
.experience { background:var(--paper); }
.experience h2 { margin:12px 0 28px; font-size:clamp(30px,4vw,44px); }
.experience-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:30px; }
.experience-grid article { padding-top:18px; border-top:1px solid var(--line); }
.experience-grid article>span { color:var(--accent); font-size:10px; }
.experience-grid h3 { margin:14px 0 6px; font-family:"Playfair Display",serif; font-size:19px; font-weight:400; }
.experience-grid p { max-width:260px; color:var(--muted); font-size:12px; }
.closing { padding:100px 20px; text-align:center; background:var(--sage); }
.closing .eyebrow { color:var(--accent); }
.closing h2 { margin:14px 0 26px; }
.dark-button { display:inline-block; }
.dark-button span { margin-left:18px; }
footer { display:flex; justify-content:space-between; align-items:center; gap:18px; padding:26px clamp(20px,6vw,88px); color:var(--muted); font-size:10px; }
@media(max-width:700px) { nav { display:none; } .hero { min-height:520px; } .booking { grid-template-columns:1fr 1fr; gap:18px; margin:0 14px; padding:18px; } .booking>div { border-right:0; padding:0; } .booking button { min-height:42px; } .room-grid,.experience-grid { grid-template-columns:1fr; } .room-card { min-height:280px; } .section-heading { align-items:start; flex-direction:column; } footer { align-items:flex-start; flex-direction:column; } }`,
    ),
    f(
      "script.js",
      "javascript",
      `const arrival = document.querySelector("#checkin");
const departure = document.querySelector("#checkout");
const message = document.querySelector("#bookingMessage");
const today = new Date().toISOString().slice(0, 10);
arrival.min = today;
departure.min = today;

arrival.addEventListener("change", () => {
  departure.min = arrival.value || today;
  if (departure.value && departure.value <= arrival.value) departure.value = "";
});

document.querySelector("#checkAvailability").addEventListener("click", () => {
  if (!arrival.value || !departure.value || departure.value <= arrival.value) {
    message.textContent = "Choose an arrival and departure date to continue.";
    return;
  }
  message.textContent = "Your dates are ready. Connect a booking service to confirm availability.";
});`,
    ),
    f(
      "README.md",
      "markdown",
      `# ${brand}\n\nA responsive hotel landing page with room highlights and a date selector.\n\nOpen index.html in a browser. The date form is a front-end demo; connect a booking service to confirm availability.`,
    ),
  ];
}

export function taskAppFiles(ctx: TemplateContext): GeneratedFile[] {
  const title = "Focus tasks";
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="app">
    <header class="app-header">
      <div>
        <p class="eyebrow">Today</p>
        <h1>${title}</h1>
      </div>
      <div class="ring" aria-label="progress">
        <svg viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" class="ring-track" />
          <circle cx="22" cy="22" r="18" class="ring-fill" id="ringFill" />
        </svg>
        <span id="progressText">0%</span>
      </div>
    </header>

    <form class="add-form" id="addForm">
      <input id="taskInput" type="text" placeholder="What needs to happen?" autocomplete="off" maxlength="120" />
      <button type="submit" aria-label="Add task">+</button>
    </form>

    <div class="toolbar">
      <div class="filters" role="tablist">
        <button class="filter active" data-filter="all">All</button>
        <button class="filter" data-filter="active">Active</button>
        <button class="filter" data-filter="done">Done</button>
      </div>
      <button class="clear" id="clearDone">Clear done</button>
    </div>

    <ul class="task-list" id="taskList"></ul>
    <p class="empty" id="emptyState" hidden>Nothing here yet. Add your first task above.</p>
    <footer class="app-footer"><span id="counter">0 tasks</span><span>Saved in your browser</span></footer>
  </main>
  <script src="app.js"></script>
</body>
</html>`,
    ),
    f(
      "styles.css",
      "css",
      `:root {
  --bg: #f7f7f5;
  --card: #ffffff;
  --ink: #17171a;
  --muted: #7b7b85;
  --line: #e7e7e4;
  --accent: #4f46e5;
  --done: #10b981;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(circle at 15% 0%, #eef0ff, transparent 55%), var(--bg);
  color: var(--ink);
  font-family: "Inter", -apple-system, sans-serif;
}

.app {
  width: min(560px, 100%);
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 28px;
  box-shadow: 0 30px 70px -40px rgba(23, 23, 26, 0.35);
}

.app-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.eyebrow { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
h1 { font-size: 26px; letter-spacing: -0.03em; }

.ring { position: relative; width: 52px; height: 52px; display: grid; place-items: center; }
.ring svg { transform: rotate(-90deg); position: absolute; inset: 0; }
.ring circle { fill: none; stroke-width: 4; }
.ring-track { stroke: var(--line); }
.ring-fill { stroke: var(--accent); stroke-linecap: round; stroke-dasharray: 113; stroke-dashoffset: 113; transition: stroke-dashoffset 0.4s ease; }
.ring span { font-size: 11px; font-weight: 600; color: var(--muted); }

.add-form { display: flex; gap: 8px; margin: 24px 0 18px; }
.add-form input {
  flex: 1; border: 1px solid var(--line); border-radius: 12px;
  padding: 13px 16px; font: inherit; font-size: 14px; background: #fbfbfa;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.add-form input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12); }
.add-form button {
  width: 46px; border: 0; border-radius: 12px; background: var(--accent); color: #fff;
  font-size: 22px; cursor: pointer; transition: transform 0.15s ease;
}
.add-form button:hover { transform: translateY(-1px); }

.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.filters { display: flex; gap: 4px; background: #f4f4f2; padding: 4px; border-radius: 10px; }
.filter { border: 0; background: transparent; font: inherit; font-size: 12px; color: var(--muted); padding: 6px 12px; border-radius: 8px; cursor: pointer; }
.filter.active { background: #fff; color: var(--ink); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); font-weight: 500; }
.clear { border: 0; background: transparent; font: inherit; font-size: 12px; color: var(--muted); cursor: pointer; }
.clear:hover { color: #dc2626; }

.task-list { list-style: none; display: grid; gap: 8px; }
.task {
  display: flex; align-items: center; gap: 12px;
  border: 1px solid var(--line); border-radius: 12px; padding: 13px 14px;
  animation: pop 0.24s ease;
}
@keyframes pop { from { opacity: 0; transform: translateY(6px); } }
.task .check {
  width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid #cfcfd6;
  background: transparent; cursor: pointer; flex: none; display: grid; place-items: center;
  font-size: 11px; color: transparent; transition: all 0.18s ease;
}
.task.done .check { background: var(--done); border-color: var(--done); color: #fff; }
.task span.label { flex: 1; font-size: 14px; word-break: break-word; }
.task.done span.label { color: var(--muted); text-decoration: line-through; }
.task .remove { border: 0; background: transparent; color: #c3c3cb; font-size: 16px; cursor: pointer; line-height: 1; }
.task .remove:hover { color: #dc2626; }

.empty { text-align: center; color: var(--muted); font-size: 13px; padding: 30px 0; }
.app-footer { display: flex; justify-content: space-between; border-top: 1px solid var(--line); margin-top: 20px; padding-top: 16px; font-size: 11px; color: var(--muted); }
`,
    ),
    f(
      "app.js",
      "javascript",
      `const STORAGE_KEY = "focus-tasks-v1";

let tasks = loadTasks();
let filter = "all";

const list = document.getElementById("taskList");
const form = document.getElementById("addForm");
const input = document.getElementById("taskInput");
const empty = document.getElementById("emptyState");
const counter = document.getElementById("counter");
const progressText = document.getElementById("progressText");
const ringFill = document.getElementById("ringFill");

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seed();
  } catch (error) {
    return seed();
  }
}

function seed() {
  return [
    { id: crypto.randomUUID(), label: "Review the launch checklist", done: false },
    { id: crypto.randomUUID(), label: "Send the design handoff", done: true },
    { id: crypto.randomUUID(), label: "Write release notes", done: false }
  ];
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function visibleTasks() {
  if (filter === "active") return tasks.filter((t) => !t.done);
  if (filter === "done") return tasks.filter((t) => t.done);
  return tasks;
}

function render() {
  list.innerHTML = "";
  const items = visibleTasks();

  items.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task" + (task.done ? " done" : "");

    const check = document.createElement("button");
    check.className = "check";
    check.type = "button";
    check.textContent = "✓";
    check.setAttribute("aria-label", task.done ? "Mark incomplete" : "Mark complete");
    check.addEventListener("click", () => toggle(task.id));

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = task.label;

    const remove = document.createElement("button");
    remove.className = "remove";
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Delete task");
    remove.addEventListener("click", () => removeTask(task.id));

    li.append(check, label, remove);
    list.appendChild(li);
  });

  empty.hidden = items.length > 0;
  const finished = tasks.filter((t) => t.done).length;
  const percent = tasks.length ? Math.round((finished / tasks.length) * 100) : 0;
  progressText.textContent = percent + "%";
  ringFill.style.strokeDashoffset = String(113 - (113 * percent) / 100);
  counter.textContent = tasks.length + (tasks.length === 1 ? " task" : " tasks");
}

function addTask(label) {
  const text = label.trim();
  if (!text) return;
  tasks.unshift({ id: crypto.randomUUID(), label: text, done: false });
  save();
  render();
}

function toggle(id) {
  tasks = tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
  save();
  render();
}

function removeTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  save();
  render();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(input.value);
  input.value = "";
  input.focus();
});

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    filter = button.dataset.filter || "all";
    render();
  });
});

document.getElementById("clearDone").addEventListener("click", () => {
  tasks = tasks.filter((task) => !task.done);
  save();
  render();
});

render();`,
    ),
    f(
      "README.md",
      "markdown",
      `# ${title}

A dependency-free task tracker with filters, progress ring and localStorage persistence.

- \`index.html\` — markup
- \`styles.css\` — light UI, responsive card layout
- \`app.js\` — state, rendering and persistence

Open \`index.html\` in a browser to run it.`,
    ),
  ];
}

/* ------------------------------------------------------------------ */
/* Analytics dashboard                                                */
/* ------------------------------------------------------------------ */

export function dashboardFiles(ctx: TemplateContext): GeneratedFile[] {
  return [
    f(
      "index.html",
      "html",
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pulse — analytics</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <aside class="sidebar">
    <div class="logo"><span>◈</span>Pulse</div>
    <nav>
      <a class="active" href="#">Overview</a>
      <a href="#">Revenue</a>
      <a href="#">Customers</a>
      <a href="#">Reports</a>
      <a href="#">Settings</a>
    </nav>
    <div class="sidebar-foot"><span class="dot"></span>All systems normal</div>
  </aside>

  <main>
    <header class="topbar">
      <div><p class="eyebrow">Workspace</p><h1>Overview</h1></div>
      <div class="topbar-right">
        <select id="rangeSelect" aria-label="Time range">
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
        </select>
        <button class="primary" id="exportBtn">Export</button>
      </div>
    </header>

    <section class="kpis" id="kpis"></section>

    <section class="panels">
      <article class="panel chart-panel">
        <div class="panel-head"><h2>Net revenue</h2><span id="rangeLabel" class="muted">Last 7 days</span></div>
        <div class="chart" id="chart"></div>
        <div class="legend"><span><i class="swatch revenue"></i>Revenue</span><span><i class="swatch target"></i>Target</span></div>
      </article>
      <article class="panel">
        <div class="panel-head"><h2>Traffic sources</h2><span class="muted">Share</span></div>
        <ul class="sources" id="sources"></ul>
      </article>
    </section>

    <section class="panel table-panel">
      <div class="panel-head"><h2>Recent transactions</h2><span class="muted" id="rowCount"></span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Plan</th><th>Status</th><th class="right">Amount</th></tr></thead>
          <tbody id="txBody"></tbody>
        </table>
      </div>
    </section>
  </main>
  <script src="dashboard.js"></script>
</body>
</html>`,
    ),
    f(
      "styles.css",
      "css",
      `:root {
  --bg: #0b0d0c;
  --surface: #111413;
  --surface-2: #161a18;
  --line: rgba(255, 255, 255, 0.08);
  --text: #eef2ee;
  --muted: #8b968e;
  --mint: #7ee2a8;
  --amber: #f2c46b;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  display: grid;
  grid-template-columns: 224px 1fr;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: "Space Grotesk", -apple-system, sans-serif;
}

.sidebar { border-right: 1px solid var(--line); padding: 22px 18px; display: flex; flex-direction: column; }
.logo { display: flex; align-items: center; gap: 9px; font-weight: 600; letter-spacing: -0.02em; padding: 4px 6px 24px; }
.logo span { color: var(--mint); }
.sidebar nav { display: grid; gap: 3px; }
.sidebar nav a { padding: 9px 11px; border-radius: 8px; font-size: 13.5px; color: var(--muted); text-decoration: none; }
.sidebar nav a:hover { background: var(--surface-2); color: var(--text); }
.sidebar nav a.active { background: var(--surface-2); color: var(--text); box-shadow: inset 2px 0 0 var(--mint); }
.sidebar-foot { margin-top: auto; display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--muted); padding: 6px; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 8px var(--mint); }

main { padding: 26px clamp(16px, 3vw, 34px) 40px; max-width: 1240px; }
.topbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
.eyebrow { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
h1 { font-size: 26px; letter-spacing: -0.03em; margin-top: 4px; }
.topbar-right { display: flex; gap: 8px; }
select, button { font: inherit; font-size: 12.5px; }
select { background: var(--surface); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; }
button.primary { background: var(--mint); color: #07120b; border: 0; border-radius: 8px; padding: 8px 14px; font-weight: 600; cursor: pointer; }

.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px; }
.kpi { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; }
.kpi .label { font-size: 11.5px; color: var(--muted); }
.kpi .value { font-size: 25px; letter-spacing: -0.03em; margin: 8px 0 6px; }
.kpi .delta { font-size: 11.5px; color: var(--mint); }
.kpi .delta.down { color: #f08a8a; }

.panels { display: grid; grid-template-columns: 1.7fr 1fr; gap: 12px; margin-bottom: 12px; }
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 18px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.panel-head h2 { font-size: 13.5px; font-weight: 500; }
.muted { color: var(--muted); font-size: 11.5px; }

.chart { display: flex; align-items: flex-end; gap: 6px; height: 186px; }
.bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end; }
.bars { display: flex; align-items: flex-end; gap: 3px; width: 100%; justify-content: center; height: 100%; }
.bar { width: 45%; border-radius: 3px 3px 0 0; background: var(--mint); opacity: 0.88; transition: height 0.4s ease; min-height: 3px; }
.bar.target { background: rgba(126, 226, 168, 0.22); }
.bar-group small { font-size: 10px; color: var(--muted); }
.legend { display: flex; gap: 18px; margin-top: 14px; font-size: 11px; color: var(--muted); }
.swatch { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 6px; background: var(--mint); }
.swatch.target { background: rgba(126, 226, 168, 0.3); }

.sources { list-style: none; display: grid; gap: 16px; }
.sources li .row { display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 7px; }
.sources li .track { height: 5px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
.sources li .fill { height: 100%; border-radius: 999px; background: var(--mint); transition: width 0.5s ease; }
.sources li:nth-child(2) .fill { background: var(--amber); }
.sources li:nth-child(3) .fill { background: #7ba7e2; }
.sources li:nth-child(4) .fill { background: #c39bff; }

.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
th { text-align: left; font-weight: 500; color: var(--muted); padding: 8px 10px; border-bottom: 1px solid var(--line); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
td { padding: 12px 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
th.right, td.right { text-align: right; }
.status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; }
.status::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: var(--mint); }
.status.pending::before { background: var(--amber); }
.status.failed::before { background: #f08a8a; }
.amount { font-variant-numeric: tabular-nums; }

@media (max-width: 900px) {
  body { grid-template-columns: 1fr; }
  .sidebar { flex-direction: row; align-items: center; gap: 16px; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--line); padding: 12px 16px; }
  .logo { padding: 0; }
  .sidebar nav { display: flex; gap: 4px; }
  .sidebar-foot { display: none; }
  .panels { grid-template-columns: 1fr; }
}`,
    ),
    f(
      "dashboard.js",
      "javascript",
      `const KPIS = [
  { label: "Net revenue", value: 48210, prefix: "$", delta: 12.4 },
  { label: "Active customers", value: 1284, delta: 8.1 },
  { label: "Conversion rate", value: 4.8, suffix: "%", delta: -1.2 },
  { label: "Avg. order value", value: 92, prefix: "$", delta: 3.6 }
];

const SOURCES = [
  { name: "Organic search", share: 42 },
  { name: "Direct", share: 27 },
  { name: "Referral", share: 19 },
  { name: "Social", share: 12 }
];

const CUSTOMERS = [
  ["Maya Ortiz", "Studio", "paid", 240],
  ["Jonas Weber", "Starter", "pending", 24],
  ["Priya Nair", "Team", "paid", 890],
  ["Tomás Ruiz", "Studio", "paid", 240],
  ["Ada Chen", "Team", "failed", 890],
  ["Lina Haddad", "Starter", "paid", 24]
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US");

function renderKpis() {
  const el = document.getElementById("kpis");
  el.innerHTML = "";
  KPIS.forEach((kpi) => {
    const card = document.createElement("div");
    card.className = "kpi";

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = kpi.label;

    const value = document.createElement("div");
    value.className = "value";
    value.textContent = (kpi.prefix || "") + number.format(kpi.value) + (kpi.suffix || "");

    const delta = document.createElement("div");
    delta.className = "delta" + (kpi.delta < 0 ? " down" : "");
    delta.textContent = (kpi.delta > 0 ? "↑ " : "↓ ") + Math.abs(kpi.delta) + "% vs last period";

    card.append(label, value, delta);
    el.appendChild(card);
  });
}

function renderChart(days) {
  const chart = document.getElementById("chart");
  chart.innerHTML = "";
  const target = 9000;

  for (let i = days; i > 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i + 1);
    const revenue = Math.round(4200 + Math.sin(i * 0.9) * 1500 + Math.random() * 1800);
    const group = document.createElement("div");
    group.className = "bar-group";

    const bars = document.createElement("div");
    bars.className = "bars";

    const revenueBar = document.createElement("div");
    revenueBar.className = "bar";
    revenueBar.style.height = Math.min(100, (revenue / 10000) * 100) + "%";
    revenueBar.title = money.format(revenue);

    const targetBar = document.createElement("div");
    targetBar.className = "bar target";
    targetBar.style.height = Math.min(100, (target / 10000) * 100) + "%";
    targetBar.title = "Target " + money.format(target);

    bars.append(revenueBar, targetBar);

    const label = document.createElement("small");
    label.textContent = date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);

    group.append(bars, label);
    chart.appendChild(group);
  }
}

function renderSources() {
  const list = document.getElementById("sources");
  list.innerHTML = "";
  SOURCES.forEach((source) => {
    const li = document.createElement("li");
    li.innerHTML =
      '<div class="row"><span>' + source.name + '</span><span>' + source.share + '%</span></div>' +
      '<div class="track"><div class="fill" style="width:' + source.share + '%"></div></div>';
    list.appendChild(li);
  });
}

function renderTable() {
  const body = document.getElementById("txBody");
  body.innerHTML = "";
  CUSTOMERS.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + row[0] + "</td>" +
      "<td>" + row[1] + "</td>" +
      '<td><span class="status ' + row[2] + '">' + row[2] + "</span></td>" +
      '<td class="right amount">' + money.format(row[3]) + "</td>";
    body.appendChild(tr);
  });
  document.getElementById("rowCount").textContent = CUSTOMERS.length + " rows";
}

const rangeSelect = document.getElementById("rangeSelect");
function updateRange() {
  const days = Number(rangeSelect.value);
  document.getElementById("rangeLabel").textContent =
    "Last " + days + " days";
  renderChart(Math.min(days, 30));
}
rangeSelect.addEventListener("change", updateRange);

document.getElementById("exportBtn").addEventListener("click", () => {
  const header = "customer,plan,status,amount\\n";
  const rows = CUSTOMERS.map((row) => row.join(",")).join("\\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "transactions.csv";
  link.click();
  URL.revokeObjectURL(url);
});

renderKpis();
updateRange();
renderSources();
renderTable();`,
    ),
    f(
      "README.md",
      "markdown",
      `# Pulse analytics dashboard

A no-dependency analytics overview.

- \`index.html\` — layout and panels
- \`styles.css\` — dark data-dense theme
- \`dashboard.js\` — KPI cards, animated chart, sources, CSV export

Try the range selector and the export button.`,
    ),
  ];
}

/* ------------------------------------------------------------------ */
/* Generic web page                                                   */
/* ------------------------------------------------------------------ */

export function genericWebFiles(ctx: TemplateContext): GeneratedFile[] {
  const title = ctx.title;
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
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="nav">
    <span class="brand">${ctx.brand || "Studio"}</span>
    <nav><a href="#about">About</a><a href="#features">Features</a><a class="cta" href="#contact">Contact</a></nav>
  </header>
  <main>
    <section class="hero">
      <p class="eyebrow">Introducing</p>
      <h1>${title}</h1>
      <p class="sub">A clean starting point generated for your brief — edit the copy, swap the colours, and make it yours.</p>
      <a class="cta" href="#features">Explore</a>
    </section>
    <section id="features" class="features">
      <article><h2>Thoughtfully structured</h2><p>Semantic HTML, a tiny design system and no build step.</p></article>
      <article><h2>Responsive by default</h2><p>Fluid type and grid layouts that hold up from phone to desktop.</p></article>
      <article><h2>Easy to extend</h2><p>Add sections, pages or a framework whenever you're ready.</p></article>
    </section>
    <section id="about" class="about">
      <h2>About this build</h2>
      <p>Three files were generated: markup, styles and a small script. Everything runs in the browser.</p>
    </section>
    <section id="contact" class="contact"><h2>Get in touch</h2><a href="mailto:hello@example.com">hello@example.com</a></section>
  </main>
  <footer>© <span id="year"></span> ${title}</footer>
  <script src="script.js"></script>
</body>
</html>`,
    ),
    f(
      "styles.css",
      "css",
      `:root { --paper: #f6f2ea; --ink: #1a1813; --muted: #6d6559; --line: #e2dbcd; --accent: #b46a3c; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--paper); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.65; }
a { color: inherit; text-decoration: none; }
.nav { display: flex; align-items: center; justify-content: space-between; padding: 22px clamp(20px, 6vw, 72px); border-bottom: 1px solid var(--line); }
.brand { font-weight: 600; letter-spacing: -0.02em; }
.nav nav { display: flex; align-items: center; gap: 24px; font-size: 14px; color: var(--muted); }
.cta { background: var(--ink); color: var(--paper); padding: 11px 20px; border-radius: 999px; font-size: 13px; display: inline-block; }
.nav .cta { padding: 8px 16px; }
main { padding: 0 clamp(20px, 6vw, 72px); }
.hero { padding: clamp(60px, 13vh, 140px) 0; max-width: 820px; }
.eyebrow { text-transform: uppercase; letter-spacing: 0.18em; font-size: 11px; color: var(--accent); margin-bottom: 20px; }
h1 { font-size: clamp(38px, 7vw, 76px); line-height: 1.02; letter-spacing: -0.04em; margin-bottom: 22px; }
.sub { max-width: 52ch; color: var(--muted); font-size: 17px; margin-bottom: 32px; }
.features { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 18px; padding: 48px 0; border-top: 1px solid var(--line); }
.features article { border: 1px solid var(--line); border-radius: 14px; padding: 22px; background: #fffdf9; }
.features h2 { font-size: 17px; margin-bottom: 8px; }
.features p, .about p { color: var(--muted); font-size: 14.5px; }
.about, .contact { padding: 44px 0; border-top: 1px solid var(--line); }
.about h2, .contact h2 { font-size: 24px; letter-spacing: -0.02em; margin-bottom: 12px; }
.contact a { color: var(--accent); border-bottom: 1px solid var(--accent); }
footer { padding: 24px clamp(20px, 6vw, 72px); border-top: 1px solid var(--line); font-size: 12px; color: var(--muted); }`,
    ),
    f(
      "script.js",
      "javascript",
      `const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth" });
  });
});`,
    ),
    f(
      "README.md",
      "markdown",
      `# ${title}

Generated starter page with plain HTML, CSS and JavaScript.

Open \`index.html\` to view it. Edit \`styles.css\` for the look and \`script.js\` for interactions.`,
    ),
  ];
}
