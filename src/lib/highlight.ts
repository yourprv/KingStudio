export type Token = { text: string; cls?: string };

type Rule = { cls: string; re: string };

const JS_KEYWORDS =
  "const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|this|typeof|instanceof|in|of|try|catch|finally|throw|async|await|import|from|export|default|delete|void|yield";

const PY_KEYWORDS =
  "def|class|return|if|elif|else|for|while|break|continue|import|from|as|with|try|except|finally|raise|pass|lambda|yield|async|await|global|nonlocal|assert|del|in|is|not|and|or|None|True|False|self";

const rules: Record<string, Rule[]> = {
  html: [
    { cls: "tok-com", re: "<!--[\\s\\S]*?-->" },
    { cls: "tok-tag", re: "<!DOCTYPE[^>]*>|</?[a-zA-Z][\\w:-]*" },
    { cls: "tok-str", re: "\"[^\"]*\"|'[^']*'" },
    { cls: "tok-attr", re: "\\b[a-zA-Z-:@][\\w:.-]*(?==)" },
    { cls: "tok-punc", re: "/?>|=" },
  ],
  css: [
    { cls: "tok-com", re: "/\\*[\\s\\S]*?\\*/" },
    { cls: "tok-str", re: "\"[^\"]*\"|'[^']*'" },
    { cls: "tok-num", re: "#[0-9a-fA-F]{3,8}\\b|\\b\\d+(?:\\.\\d+)?(?:px|rem|em|%|vh|vw|s|ms|deg|fr)?\\b" },
    { cls: "tok-attr", re: "--[\\w-]+|@[\\w-]+" },
    { cls: "tok-key", re: "\\b[a-zA-Z-]+(?=\\s*:)" },
    { cls: "tok-punc", re: "[{}();:,>+~]|\\.|#" },
  ],
  javascript: [
    { cls: "tok-com", re: "//[^\\n]*|/\\*[\\s\\S]*?\\*/" },
    { cls: "tok-str", re: "`(?:\\\\[\\s\\S]|[^`\\\\])*`|\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*'" },
    { cls: "tok-prop", re: "\\b[A-Za-z_$][\\w$]*(?=\\s*:(?!:))" },
    { cls: "tok-num", re: "\\b\\d+(?:\\.\\d+)?\\b" },
    { cls: "tok-key", re: `\\b(?:${JS_KEYWORDS})\\b` },
    { cls: "tok-fn", re: "\\b[A-Za-z_$][\\w$]*(?=\\s*\\()" },
    { cls: "tok-punc", re: "[{}()\\[\\];,.]|=>|[=+\\-*/%<>!&|?]+" },
  ],
  typescript: [],
  python: [
    { cls: "tok-com", re: "#[^\\n]*" },
    {
      cls: "tok-str",
      re: "[rbfu]{0,2}\"\"\"[\\s\\S]*?\"\"\"|[rbfu]{0,2}'''[\\s\\S]*?'''|[rbfu]{0,2}\"(?:\\\\.|[^\"\\\\])*\"|[rbfu]{0,2}'(?:\\\\.|[^'\\\\])*'",
    },
    { cls: "tok-num", re: "\\b\\d+(?:\\.\\d+)?\\b" },
    { cls: "tok-key", re: `\\b(?:${PY_KEYWORDS})\\b` },
    { cls: "tok-fn", re: "\\b[A-Za-z_][\\w]*(?=\\s*\\()" },
    { cls: "tok-attr", re: "@[\\w.]+" },
    { cls: "tok-punc", re: "[{}()\\[\\];,:.]|[=+\\-*/%<>!&|]+" },
  ],
  json: [
    { cls: "tok-prop", re: "\"[^\"]*\"(?=\\s*:)" },
    { cls: "tok-str", re: "\"[^\"]*\"" },
    { cls: "tok-num", re: "\\b\\d+(?:\\.\\d+)?\\b|\\b(?:true|false|null)\\b" },
    { cls: "tok-punc", re: "[{}()\\[\\];,]" },
  ],
  markdown: [
    { cls: "tok-com", re: "^```[\\s\\S]*?^```" },
    { cls: "tok-tag", re: "^#{1,6}[^\\n]*" },
    { cls: "tok-str", re: "`[^`\\n]*`" },
    { cls: "tok-key", re: "\\*\\*[^*\\n]+\\*\\*|\\[[^\\]]*\\]\\([^)]*\\)" },
    { cls: "tok-attr", re: "^[-*+] " },
  ],
  plaintext: [],
};

rules.typescript = rules.javascript;

const cache = new Map<string, RegExp>();

function combinedFor(language: string): RegExp {
  const key = rules[language] ? language : "plaintext";
  const cached = cache.get(key);
  if (cached) return cached;

  const list = rules[key];
  const source = list.length
    ? list.map((rule, index) => `(?<g${index}>${rule.re})`).join("|")
    : "(?<g0>[\\s\\S])";
  const regex = new RegExp(source, "gm");
  cache.set(key, regex);
  return regex;
}

export function highlightLines(code: string, language: string): Token[][] {
  const key = rules[language] ? language : "plaintext";
  const list = rules[key];
  const regex = combinedFor(language);
  regex.lastIndex = 0;

  const tokens: Token[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > last) tokens.push({ text: code.slice(last, match.index) });
    const groups = match.groups ?? {};
    let cls: string | undefined;
    for (let i = 0; i < list.length; i += 1) {
      if (groups[`g${i}`] !== undefined) {
        cls = list[i].cls;
        break;
      }
    }
    tokens.push({ text: match[0], cls });
    last = match.index + match[0].length;
    if (match[0].length === 0) regex.lastIndex += 1;
  }

  if (last < code.length) tokens.push({ text: code.slice(last) });

  const lines: Token[][] = [[]];
  for (const token of tokens) {
    const parts = token.text.split("\n");
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ text: part, cls: token.cls });
    });
  }
  return lines;
}

export function languageLabel(language: string) {
  const map: Record<string, string> = {
    html: "HTML",
    css: "CSS",
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    json: "JSON",
    markdown: "Markdown",
    plaintext: "Text",
    yaml: "YAML",
    sql: "SQL",
    svg: "SVG",
  };
  return map[language] ?? "Text";
}
