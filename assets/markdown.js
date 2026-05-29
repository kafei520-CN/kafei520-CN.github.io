const Markdown = (() => {
  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const normalizeMarkdown = (markdown) =>
    String(markdown || "").replace(/```math\s*\n([\s\S]*?)\n```/g, (_, code) => `$$\n${code}\n$$`);

  const sanitizeHtml = (html) => {
    if (typeof window === "undefined" || !window.DOMPurify) {
      return html;
    }

    return window.DOMPurify.sanitize(html, {
      ADD_TAGS: ["details", "figcaption", "figure", "input", "section", "summary"],
      ADD_ATTR: [
        "align",
        "aria-describedby",
        "aria-hidden",
        "aria-label",
        "checked",
        "class",
        "colspan",
        "data-footnote-backref",
        "data-footnote-ref",
        "decoding",
        "disabled",
        "for",
        "height",
        "id",
        "loading",
        "name",
        "rel",
        "reversed",
        "role",
        "rowspan",
        "start",
        "target",
        "title",
        "type",
        "width",
      ],
      ALLOW_DATA_ATTR: true,
      FORBID_TAGS: ["embed", "form", "iframe", "object", "script", "style"],
    });
  };

  const addExternalLinkAttrs = (html) =>
    html.replace(/<a href="(https?:\/\/[^"]*)"(?![^>]*\btarget=)/g, '<a href="$1" target="_blank" rel="noreferrer"');

  const enhanceImages = (html) =>
    html.replace(/<img\b(?![^>]*\bloading=)/g, '<img loading="lazy" decoding="async"');

  const addCodeLanguageLabels = (html) =>
    html.replace(/<pre><code class="language-([^"]+)">/g, (_, language) => {
      const safeLanguage = escapeHtml(language);
      return `<pre data-language="${safeLanguage}"><code class="language-${safeLanguage}">`;
    });

  const fixHorizontalRules = (html) =>
    html.replace(/<p>\s*(?:-{3,}|\*{3,}|_{3,})\s*<\/p>/g, "<hr>\n");

  const addTaskListClasses = (html) =>
    html
      .replace(/<ul>\s*(<li><input[^>]+type="checkbox")/g, '<ul class="contains-task-list">$1')
      .replace(/<li><input([^>]*type="checkbox"[^>]*)>/g, '<li class="task-list-item"><input$1 disabled>');

  const renderHighlight = (code, language) => {
    if (typeof window === "undefined" || !window.hljs) {
      return escapeHtml(code);
    }

    const lang = window.hljs.getLanguage(language) ? language : "plaintext";
    return window.hljs.highlight(code, { language: lang }).value;
  };

  const markedExtension = {
    renderer: {
      code({ text, lang }) {
        const language = String(lang || "").trim().split(/\s+/)[0] || "plaintext";
        return `<pre data-language="${escapeHtml(language)}"><code class="hljs language-${escapeHtml(language)}">${renderHighlight(text, language)}</code></pre>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
        const externalAttrs = /^https?:\/\//i.test(href) ? ' target="_blank" rel="noreferrer"' : "";
        return `<a href="${escapeHtml(href)}"${titleAttr}${externalAttrs}>${text}</a>`;
      },
      image({ href, title, text }) {
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
        return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy" decoding="async">`;
      },
      hr() {
        return "<hr>\n";
      },
    },
  };

  const createEngine = () => {
    if (typeof window === "undefined" || !window.marked?.Marked) {
      return null;
    }

    const { Marked } = window.marked;
    const engine = new Marked({
      async: false,
      breaks: false,
      gfm: true,
      mangle: false,
    });

    if (window.markedGfmHeadingId?.gfmHeadingId) {
      engine.use(window.markedGfmHeadingId.gfmHeadingId());
    }
    if (typeof window.markedFootnote === "function") {
      engine.use(window.markedFootnote());
    }
    if (typeof window.markedAlert === "function") {
      engine.use(window.markedAlert({
        className: "md-callout",
        variants: [
          { type: "note", icon: "", title: "提示" },
          { type: "tip", icon: "", title: "建议" },
          { type: "important", icon: "", title: "重要" },
          { type: "warning", icon: "", title: "注意" },
          { type: "caution", icon: "", title: "警告" },
        ],
      }));
    }
    if (typeof window.markedKatex === "function") {
      engine.use(window.markedKatex({ throwOnError: false, trust: false }));
    }

    engine.use(markedExtension);
    return engine;
  };

  let engine;

  const render = (markdown) => {
    engine ||= createEngine();
    if (!engine) {
      return `<pre><code>${escapeHtml(markdown || "")}</code></pre>`;
    }

    const html = engine.parse(normalizeMarkdown(markdown));
    return sanitizeHtml(addTaskListClasses(fixHorizontalRules(addCodeLanguageLabels(enhanceImages(addExternalLinkAttrs(html))))));
  };

  return { escapeHtml, render };
})();
