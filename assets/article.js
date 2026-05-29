const byId = (id) => document.getElementById(id);

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(date);
};

const findPost = (posts, slugOrFile) =>
  posts.find((post) => post.slug === slugOrFile || post.file === slugOrFile);

const readingMinutes = (markdown) => {
  const words = String(markdown || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 300));
};

const buildToc = (root) => {
  const toc = byId("articleToc");
  const headings = Array.from(root.querySelectorAll("h2, h3")).filter((heading) => heading.id);

  if (headings.length === 0) {
    toc.innerHTML = `
      <p class="toc-title">文章结构</p>
      <p class="muted">这篇文章没有二级标题。</p>
    `;
    return;
  }

  toc.innerHTML = `
    <p class="toc-title">文章结构</p>
    <nav class="toc-nav">
      ${headings.map((heading) => `
        <a class="toc-link toc-level-${heading.tagName.toLowerCase()}" href="#${encodeURIComponent(heading.id)}">
          ${Markdown.escapeHtml(heading.textContent.trim())}
        </a>
      `).join("")}
    </nav>
  `;
};

async function loadArticle() {
  const reader = byId("articleReader");
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug") || params.get("post");

  if (!slug) {
    reader.innerHTML = '<p class="muted">缺少文章参数。</p>';
    return;
  }

  try {
    const indexResponse = await fetch("posts/index.json", { cache: "no-cache" });
    if (!indexResponse.ok) {
      throw new Error(`Posts index status ${indexResponse.status}`);
    }

    const posts = await indexResponse.json();
    const post = Array.isArray(posts) ? findPost(posts, slug) : null;
    if (!post) {
      reader.innerHTML = '<p class="muted">没有找到这篇文章。</p>';
      return;
    }

    const articleResponse = await fetch(`posts/${encodeURIComponent(post.file)}`);
    if (!articleResponse.ok) {
      throw new Error(`Post status ${articleResponse.status}`);
    }

    const markdown = await articleResponse.text();
    document.title = `${post.title} | kafei520-CN`;
    reader.innerHTML = `
      <header class="article-head">
        <p class="eyebrow">${formatDate(post.date)}</p>
        <h1>${Markdown.escapeHtml(post.title)}</h1>
        <p>${Markdown.escapeHtml(post.summary || "一篇 Markdown 技术文章。")}</p>
        <div class="article-meta">
          <span>${readingMinutes(markdown)} 分钟阅读</span>
          <span>Markdown</span>
          <span>离线写作</span>
        </div>
      </header>
      <div class="article-content">
        ${Markdown.render(markdown)}
      </div>
    `;
    buildToc(reader.querySelector(".article-content"));
  } catch (error) {
    reader.innerHTML = '<p class="muted">文章加载失败。</p>';
    byId("articleToc").innerHTML = '<p class="toc-title">文章结构</p><p class="muted">目录生成失败。</p>';
    console.warn("读取文章失败", error);
  }
}

byId("year").textContent = new Date().getFullYear();
loadArticle();
