const Markdown = (() => {
  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const inline = (value) => {
    let html = escapeHtml(value);
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    return html;
  };

  const render = (markdown) => {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let paragraph = [];
    let listOpen = false;
    let codeOpen = false;
    let codeLines = [];
    let quoteLines = [];

    const flushParagraph = () => {
      if (paragraph.length === 0) {
        return;
      }
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    };

    const flushList = () => {
      if (listOpen) {
        html.push("</ul>");
        listOpen = false;
      }
    };

    const flushQuote = () => {
      if (quoteLines.length === 0) {
        return;
      }
      html.push(`<blockquote>${quoteLines.map((line) => `<p>${inline(line)}</p>`).join("")}</blockquote>`);
      quoteLines = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();

      if (line.startsWith("```")) {
        flushParagraph();
        flushList();
        flushQuote();
        if (codeOpen) {
          html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
          codeLines = [];
          codeOpen = false;
        } else {
          codeOpen = true;
        }
        continue;
      }

      if (codeOpen) {
        codeLines.push(rawLine);
        continue;
      }

      if (line.trim() === "") {
        flushParagraph();
        flushList();
        flushQuote();
        continue;
      }

      const heading = /^(#{1,3})\s+(.+)$/.exec(line);
      if (heading) {
        flushParagraph();
        flushList();
        flushQuote();
        const level = heading[1].length;
        html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        continue;
      }

      const list = /^[-*]\s+(.+)$/.exec(line);
      if (list) {
        flushParagraph();
        flushQuote();
        if (!listOpen) {
          html.push("<ul>");
          listOpen = true;
        }
        html.push(`<li>${inline(list[1])}</li>`);
        continue;
      }

      const quote = /^>\s?(.+)$/.exec(line);
      if (quote) {
        flushParagraph();
        flushList();
        quoteLines.push(quote[1]);
        continue;
      }

      paragraph.push(line.trim());
    }

    flushParagraph();
    flushList();
    flushQuote();

    if (codeOpen) {
      html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    }

    return html.join("\n");
  };

  return { escapeHtml, render };
})();
