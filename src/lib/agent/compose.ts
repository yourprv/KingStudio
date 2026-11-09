import type { GeneratedFile, WorkspaceFile } from "@/lib/types";
import {
  dashboardFiles,
  genericWebFiles,
  hotelLandingFiles,
  landingFiles,
  portfolioFiles,
  taskAppFiles,
  brandFromPrompt,
  type TemplateContext,
} from "./templates-web";
import { nodeApiFiles, pythonFiles } from "./templates-code";
import { calculatorFiles } from "./templates-calculator";

export type Stack = "html" | "python" | "node";

const ACCENTS: Record<string, string> = {
  blue: "#3b6cf6",
  navy: "#1e3a8a",
  green: "#3f8f5f",
  emerald: "#14966b",
  purple: "#7c5cff",
  violet: "#7c5cff",
  pink: "#e0568a",
  red: "#d0453b",
  orange: "#e2823c",
  amber: "#d99a2b",
  teal: "#0f9d8f",
  gold: "#b8892f",
};

export function detectStack(prompt: string): Stack {
  const p = prompt.toLowerCase();
  if (/\b(python|\.py|cli|script|pandas|flask|django)\b/.test(p)) return "python";
  if (/\b(node|express|api|backend|server|rest|endpoint|routes)\b/.test(p) && !/portfolio|landing/.test(p))
    return "node";
  return "html";
}

export function contextFromPrompt(prompt: string): TemplateContext {
  const cleaned = prompt
    .replace(/^(please\s+)?(can you\s+)?(build|create|make|generate|design|write|code)\s+(me\s+)?/i, "")
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const title = cleaned ? cleaned.split(" ").slice(0, 7).join(" ") : "Untitled project";
  const match = prompt.match(/(?:for|by|about)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
  const brandMatch = /\b(named|called)\s+([A-Za-z0-9& ]{2,30})/i.exec(prompt);
  return {
    prompt,
    title: title.charAt(0).toUpperCase() + title.slice(1),
    brand: brandMatch?.[2]?.trim() ?? brandFromPrompt(prompt),
    person: match?.[1] ?? "",
  };
}

export function projectNameFor(prompt: string, stack: Stack): string {
  const ctx = contextFromPrompt(prompt);
  const p = prompt.toLowerCase();
  if (/portfolio|resume|personal website/.test(p))
    return ctx.person ? `${ctx.person.split(" ")[0]}'s portfolio` : "Portfolio site";
  const landingName = /landing page|pricing page|waitlist|product page|marketing site|homepage|saas|startup site/.test(p);
  if (!landingName && /dashboard|admin panel|metrics|analytics overview/.test(p))
    return "Analytics dashboard";
  if (/calculator|calc app|keypad/.test(p)) return "Calculator app";
  if (/todo|task app|checklist/.test(p)) return "Task app";
  if (landingName || /landing|marketing|launch page/.test(p)) return "Landing page";
  if (stack === "python") return "Python CLI tool";
  if (stack === "node") return "Notes REST API";
  return ctx.title;
}

function composeFiles(prompt: string, stack: Stack): { files: GeneratedFile[]; stack: Stack } {
  const ctx = contextFromPrompt(prompt);
  const p = prompt.toLowerCase();

  if (stack === "python") return { files: pythonFiles(ctx), stack };
  if (stack === "node") return { files: nodeApiFiles(ctx), stack };

  if (/\b(hotel|resort|inn|lodge|hospitality)\b/.test(p))
    return { files: hotelLandingFiles(ctx), stack };

  const wantsLanding = /landing page|pricing page|waitlist|product page|marketing site|homepage|saas|startup site/.test(p);
  if (!wantsLanding && /dashboard|admin panel|metrics|analytics overview/.test(p))
    return { files: dashboardFiles(ctx), stack };
  if (/calculator|calc app|keypad/.test(p)) return { files: calculatorFiles(ctx), stack };
  if (/todo|task app|checklist|counter|habit/.test(p))
    return { files: taskAppFiles(ctx), stack };
  if (/portfolio|resume|personal site|personal website|photograph/.test(p))
    return { files: portfolioFiles(ctx), stack };
  if (wantsLanding || /landing|marketing|launch page/.test(p))
    return { files: landingFiles(ctx), stack };
  return { files: genericWebFiles(ctx), stack };
}

function summarize(prompt: string, stack: Stack, files: GeneratedFile[]) {
  const ctx = contextFromPrompt(prompt);
  const label =
    stack === "python"
      ? "A Python CLI project"
      : stack === "node"
        ? "A Node + Express API"
        : "An HTML, CSS and JS site";
  const topic = ctx.title.length > 70 ? `${ctx.title.slice(0, 67)}…` : ctx.title;
  return `${label} for “${topic.toLowerCase()}”, split across ${files.length} file${
    files.length === 1 ? "" : "s"
  }.`;
}

export function planFor(prompt: string, files: GeneratedFile[]) {
  const steps = [
    "Reading the brief and extracting intent",
    "Choosing a stack and folder structure",
    "Drafting the component and file plan",
  ];
  files.slice(0, 4).forEach((file) => steps.push(`Writing ${file.path}`));
  if (files.length > 4) steps.push(`Writing ${files.length - 4} more file(s)`);
  steps.push("Checking for broken references");
  if (/deploy|preview/i.test(prompt)) steps.push("Preparing preview");
  return steps;
}

export function buildReply(prompt: string, files: GeneratedFile[], stack: Stack) {
  const list = files.map((file) => `\`${file.path}\``).join(", ");
  const lead =
    stack === "html"
      ? "I built this as three separate, linked files so you can edit each layer independently."
      : stack === "python"
        ? "I set this up as a runnable Python project with no third-party dependencies."
        : "I scaffolded an Express API with a dedicated routes folder.";
  return `${lead} Created ${files.length} files: ${list}.\n\nOpen the Preview tab to see it running, or click any file to read and edit the code.`;
}

/* ------------------------------------------------------------------ */
/* Follow-up edits                                                    */
/* ------------------------------------------------------------------ */

type EditOutcome = {
  reply: string;
  plan: string[];
  changes: GeneratedFile[];
};

const SECTION_MARKER = (name: string) => `<!-- kite:${name} -->`;

const SECTIONS: Record<string, { title: string; html: string; css: string }> = {
  contact: {
    title: "contact section",
    html: `${SECTION_MARKER("contact")}
  <section class="kite-contact" id="contact">
    <h2>Let's work together</h2>
    <p>Have a project in mind? Send a note and I'll reply within two working days.</p>
    <form class="kite-contact-form" onsubmit="event.preventDefault(); this.querySelector('.kite-status').textContent='Thanks — message captured locally.'; this.reset();">
      <input type="email" placeholder="you@example.com" required aria-label="Email" />
      <button type="submit">Send</button>
      <span class="kite-status" role="status"></span>
    </form>
  </section>
`,
    css: `.kite-contact { padding: 64px clamp(20px, 5vw, 64px); border-top: 1px solid rgba(120, 110, 95, 0.25); }
.kite-contact h2 { font-size: clamp(26px, 4vw, 40px); letter-spacing: -0.03em; margin-bottom: 12px; }
.kite-contact p { max-width: 48ch; opacity: 0.7; margin-bottom: 20px; }
.kite-contact-form { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.kite-contact-form input { flex: 1 1 240px; padding: 12px 16px; border-radius: 999px; border: 1px solid currentColor; background: transparent; color: inherit; font: inherit; }
.kite-contact-form button { padding: 12px 22px; border-radius: 999px; border: 0; background: var(--accent, #8a5a34); color: #fff; font: inherit; cursor: pointer; }
.kite-status { font-size: 12px; opacity: 0.7; }
`,
  },
  testimonials: {
    title: "testimonials",
    html: `${SECTION_MARKER("testimonials")}
  <section class="kite-testimonials">
    <h2>What people say</h2>
    <div class="kite-quotes">
      <blockquote>“Fast, calm and genuinely thoughtful work. The handoff was effortless.”<cite>— Maya O., founder</cite></blockquote>
      <blockquote>“We shipped two weeks early and the details still hold up a year later.”<cite>— Jonas W., product lead</cite></blockquote>
    </div>
  </section>
`,
    css: `.kite-testimonials { padding: 64px clamp(20px, 5vw, 64px); border-top: 1px solid rgba(120, 110, 95, 0.25); }
.kite-testimonials h2 { font-size: clamp(24px, 3.4vw, 36px); letter-spacing: -0.03em; margin-bottom: 24px; }
.kite-quotes { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.kite-quotes blockquote { margin: 0; padding: 22px; border-radius: 16px; border: 1px solid rgba(120, 110, 95, 0.25); font-size: 15px; line-height: 1.6; }
.kite-quotes cite { display: block; margin-top: 14px; font-size: 12px; font-style: normal; opacity: 0.65; }
`,
  },
  faq: {
    title: "FAQ",
    html: `${SECTION_MARKER("faq")}
  <section class="kite-faq">
    <h2>Frequently asked</h2>
    <details open><summary>How do we start?</summary><p>Send a short brief. You'll get a plan and a first version within a week.</p></details>
    <details><summary>What do you need from me?</summary><p>Content, references and one decision-maker for approvals.</p></details>
    <details><summary>Do you work with existing teams?</summary><p>Yes — embedded or alongside, whichever is more useful.</p></details>
  </section>
`,
    css: `.kite-faq { padding: 64px clamp(20px, 5vw, 64px); border-top: 1px solid rgba(120, 110, 95, 0.25); }
.kite-faq h2 { font-size: clamp(24px, 3.4vw, 36px); letter-spacing: -0.03em; margin-bottom: 20px; }
.kite-faq details { border-top: 1px solid rgba(120, 110, 95, 0.25); padding: 16px 0; }
.kite-faq summary { cursor: pointer; font-weight: 500; }
.kite-faq p { opacity: 0.7; margin-top: 8px; max-width: 62ch; }
`,
  },
  pricing: {
    title: "pricing",
    html: `${SECTION_MARKER("pricing")}
  <section class="kite-pricing">
    <h2>Simple pricing</h2>
    <div class="kite-plans">
      <article><h3>Starter</h3><p class="kite-price">$0<span>/mo</span></p><ul><li>1 project</li><li>Community support</li></ul><a href="#contact">Start free</a></article>
      <article class="featured"><h3>Studio</h3><p class="kite-price">$24<span>/mo</span></p><ul><li>Unlimited projects</li><li>Priority support</li><li>Preview deploys</li></ul><a href="#contact">Start trial</a></article>
      <article><h3>Team</h3><p class="kite-price">$89<span>/mo</span></p><ul><li>Everything in Studio</li><li>SSO &amp; audit log</li></ul><a href="#contact">Talk to us</a></article>
    </div>
  </section>
`,
    css: `.kite-pricing { padding: 64px clamp(20px, 5vw, 64px); border-top: 1px solid rgba(120, 110, 95, 0.25); }
.kite-pricing h2 { font-size: clamp(24px, 3.4vw, 36px); letter-spacing: -0.03em; margin-bottom: 24px; }
.kite-plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
.kite-plans article { border: 1px solid rgba(120, 110, 95, 0.28); border-radius: 16px; padding: 22px; }
.kite-plans .featured { outline: 2px solid var(--accent, #8a5a34); outline-offset: -2px; }
.kite-price { font-size: 30px; letter-spacing: -0.03em; margin: 10px 0 14px; }
.kite-price span { font-size: 12px; opacity: 0.6; }
.kite-plans ul { list-style: none; margin: 0 0 18px; padding: 0; display: grid; gap: 8px; font-size: 13px; opacity: 0.75; }
.kite-plans a { display: inline-block; padding: 9px 16px; border-radius: 999px; border: 1px solid currentColor; font-size: 12px; text-decoration: none; }
`,
  },
  gallery: {
    title: "gallery",
    html: `${SECTION_MARKER("gallery")}
  <section class="kite-gallery">
    <h2>Selected frames</h2>
    <div class="kite-grid">
      <div style="--h:220px; background:linear-gradient(140deg,#d9c7ab,#8b6f4e)"></div>
      <div style="--h:180px; background:linear-gradient(140deg,#a8b7a0,#4d5f4a)"></div>
      <div style="--h:260px; background:linear-gradient(140deg,#c9b7c6,#6c5566)"></div>
      <div style="--h:200px; background:linear-gradient(140deg,#b9c4d1,#5b6b7b)"></div>
    </div>
  </section>
`,
    css: `.kite-gallery { padding: 64px clamp(20px, 5vw, 64px); border-top: 1px solid rgba(120, 110, 95, 0.25); }
.kite-gallery h2 { font-size: clamp(24px, 3.4vw, 36px); letter-spacing: -0.03em; margin-bottom: 24px; }
.kite-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.kite-grid div { height: var(--h); border-radius: 14px; }
`,
  },
};

export function composeEdit(files: WorkspaceFile[], prompt: string): EditOutcome {
  const p = prompt.toLowerCase();
  const changes = new Map<string, string>();
  const languages = new Map<string, string>();
  const plan: string[] = ["Re-reading the current file tree", "Locating the files that need to change"];
  const notes: string[] = [];

  const find = (predicate: (path: string) => boolean) =>
    files.find((file) => file.kind === "file" && predicate(file.path.toLowerCase()));

  const html = find((path) => path.endsWith(".html"));
  const css = find((path) => path.endsWith(".css"));
  const readme = find((path) => path.endsWith(".md"));
  const isWeb = Boolean(html && css);

  // --- accent / palette changes -------------------------------------
  const colour = Object.keys(ACCENTS).find((name) => p.includes(name));
  const wantsDark = /\b(dark|darker|midnight|black)\b/.test(p);
  const wantsLight = /\b(light|brighter|lighter|cream|paper)\b/.test(p);

  if (css && (colour || wantsDark || wantsLight)) {
    let next = css.content;
    if (colour) {
      const hex = ACCENTS[colour];
      next = next
        .replace(/--accent:\s*[^;]+;/g, `--accent: ${hex};`)
        .replace(/--lime:\s*[^;]+;/g, `--lime: ${hex};`)
        .replace(/--mint:\s*[^;]+;/g, `--mint: ${hex};`);
      if (next === css.content) next += `\n\n/* accent override */\n:root { --accent: ${hex}; }\n`;
      notes.push(`accent colour set to ${colour}`);
    }
    if (wantsDark) {
      next += `\n\n/* dark theme pass */\nbody { background: #0d0c0a !important; color: #f2ecdf !important; }\n[class] { border-color: rgba(242, 236, 223, 0.16) !important; }\n`;
      notes.push("switched the surface palette to a dark theme");
    } else if (wantsLight) {
      next += `\n\n/* light theme pass */\nbody { background: #f6f1e7 !important; color: #171410 !important; }\n[class] { border-color: rgba(23, 20, 16, 0.14) !important; }\n`;
      notes.push("switched the surface palette to a light theme");
    }
    changes.set(css.path, next);
    languages.set(css.path, css.language);
    plan.push(`Updating ${css.path}`);
  }

  // --- new sections --------------------------------------------------
  if (isWeb && html && css) {
    const requested = (Object.keys(SECTIONS) as Array<keyof typeof SECTIONS>).find((key) =>
      p.includes(key),
    );
    if (requested) {
      const section = SECTIONS[requested];
      let htmlNext = html.content;
      let cssNext = changes.get(css.path) ?? css.content;
      if (!htmlNext.includes(SECTION_MARKER(requested))) {
        const marker = "</main>";
        const block = section.html;
        htmlNext = htmlNext.includes(marker)
          ? htmlNext.replace(marker, `${block}\n</main>`)
          : htmlNext.replace(/<footer[\s\S]*?<\/footer>/i, `${block}\n$&`);
        cssNext += `\n\n/* ${requested} section */\n${section.css}`;
        changes.set(html.path, htmlNext);
        changes.set(css.path, cssNext);
        languages.set(html.path, html.language);
        languages.set(css.path, css.language);
        plan.push(`Adding a ${section.title} to ${html.path}`);
        notes.push(`added a ${section.title}`);
      } else {
        notes.push(`the ${section.title} already exists, so I left it untouched`);
      }
    }
  }

  // --- explicit title / copy change ---------------------------------
  const quoted = prompt.match(/["“]([^"”]{3,60})["”]/);
  if (quoted && html) {
    const text = quoted[1];
    const replaced = html.content.replace(/<title>[\s\S]*?<\/title>/i, `<title>${text}</title>`);
    if (replaced !== html.content) {
      changes.set(html.path, replaced);
      languages.set(html.path, html.language);
      plan.push(`Updating the document title`);
      notes.push(`page title changed to “${text}”`);
    }
  }

  // --- extra files ---------------------------------------------------
  if (/\b(readme|docs|documentation|notes)\b/.test(p)) {
    const existing = readme?.content ?? "";
    const next = `${existing}${existing ? "\n\n" : ""}## Update — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}\n\nRequest: ${prompt}\n`;
    const target = readme?.path ?? "README.md";
    changes.set(target, next);
    languages.set(target, "markdown");
    plan.push(`Updating ${target}`);
    notes.push(`documented the request in ${target}`);
  }

  if (changes.size === 0) {
    const log = `# Change log\n\n- ${new Date().toISOString()} — ${prompt}\n`;
    const existing = files.find((file) => file.path === "CHANGELOG.md");
    changes.set("CHANGELOG.md", (existing?.content ?? "# Change log\n") + `- ${prompt}\n`);
    languages.set("CHANGELOG.md", "markdown");
    plan.push("Logging the request");
    notes.push("logged the request in CHANGELOG.md");
  }

  plan.push("Saving changes to the workspace");

  const summary = notes.length
    ? `Done — I ${notes.join(", ")}.`
    : "I couldn't find a safe automatic change, so I logged the request.";

  return {
    reply: `${summary}\n\n${changes.size} file${changes.size === 1 ? "" : "s"} touched. Open the file list to review the diff, or give me a more specific instruction (file name + change) and I'll go deeper.`,
    plan,
    changes: Array.from(changes.entries()).map(([path, content]) => ({
      path,
      content,
      language: languages.get(path) ?? "plaintext",
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Public entry                                                       */
/* ------------------------------------------------------------------ */

export function composeProject(prompt: string, stack: Stack = detectStack(prompt)) {
  const { files, stack: chosen } = composeFiles(prompt, stack);
  return {
    files,
    stack: chosen,
    name: projectNameFor(prompt, chosen),
    summary: summarize(prompt, chosen, files),
    plan: planFor(prompt, files),
    reply: buildReply(prompt, files, chosen),
  };
}


