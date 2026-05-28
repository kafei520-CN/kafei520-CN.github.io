const GITHUB_USER = "kafei520-CN";

const byId = (id) => document.getElementById(id);

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(date);
};

async function loadProfile() {
  try {
    const response = await fetch(`https://api.github.com/users/${GITHUB_USER}`);
    if (!response.ok) {
      throw new Error(`GitHub profile status ${response.status}`);
    }
    const profile = await response.json();
    byId("avatar").src = profile.avatar_url;
    byId("profileName").textContent = profile.name || profile.login;
    byId("profileBio").textContent = profile.bio || "专注 Minecraft 模组与工具开发。";
    byId("repoCount").textContent = profile.public_repos ?? "--";
    byId("followers").textContent = profile.followers ?? "--";
  } catch (error) {
    console.warn("读取 GitHub 资料失败", error);
  }
}

async function loadProjects() {
  const container = byId("projectList");
  try {
    const response = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=6`);
    if (!response.ok) {
      throw new Error(`GitHub repos status ${response.status}`);
    }
    const repos = await response.json();
    if (!Array.isArray(repos) || repos.length === 0) {
      container.innerHTML = '<p class="muted">暂无公开仓库。</p>';
      return;
    }

    container.innerHTML = repos
      .map((repo) => {
        const description = repo.description || "暂无简介，点击查看仓库详情。";
        const language = repo.language ? `<span class="tag">${Markdown.escapeHtml(repo.language)}</span>` : "";
        return `
          <a class="project-card" href="${repo.html_url}" target="_blank" rel="noreferrer">
            <h3>${Markdown.escapeHtml(repo.name)}</h3>
            <p>${Markdown.escapeHtml(description)}</p>
            <div class="project-meta">
              ${language}
              <span class="tag">★ ${repo.stargazers_count}</span>
              <span class="tag">更新 ${formatDate(repo.updated_at)}</span>
            </div>
          </a>
        `;
      })
      .join("");
  } catch (error) {
    container.innerHTML = '<p class="muted">仓库读取失败，请稍后刷新。</p>';
    console.warn("读取 GitHub 仓库失败", error);
  }
}

async function fetchPostMarkdown(file) {
  const response = await fetch(`posts/${encodeURIComponent(file)}`);
  if (!response.ok) {
    throw new Error(`Post status ${response.status}`);
  }
  return response.text();
}

async function openPost(post) {
  const reader = byId("postReader");
  reader.hidden = false;
  reader.innerHTML = '<p class="muted">正在加载文章...</p>';
  try {
    const markdown = await fetchPostMarkdown(post.file);
    reader.innerHTML = `
      <p class="eyebrow">${formatDate(post.date)}</p>
      <div class="article-content">
        <h1>${Markdown.escapeHtml(post.title)}</h1>
        ${Markdown.render(markdown)}
      </div>
    `;
    reader.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    reader.innerHTML = '<p class="muted">文章加载失败。</p>';
    console.warn("读取文章失败", error);
  }
}

async function loadPosts() {
  const list = byId("postList");
  try {
    const response = await fetch("posts/index.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Posts index status ${response.status}`);
    }
    const posts = await response.json();
    if (!Array.isArray(posts) || posts.length === 0) {
      list.innerHTML = '<p class="muted">还没有文章，先在本地写一篇 Markdown 吧。</p>';
      return;
    }

    list.innerHTML = "";
    posts
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((post) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "post-item";
        button.innerHTML = `
          <time datetime="${Markdown.escapeHtml(post.date)}">${formatDate(post.date)}</time>
          <span>
            <strong>${Markdown.escapeHtml(post.title)}</strong>
            <p>${Markdown.escapeHtml(post.summary || "")}</p>
          </span>
          <span class="tag">阅读</span>
        `;
        button.addEventListener("click", () => openPost(post));
        list.append(button);
      });
  } catch (error) {
    list.innerHTML = '<p class="muted">文章列表加载失败。</p>';
    console.warn("读取文章列表失败", error);
  }
}

byId("year").textContent = new Date().getFullYear();
loadProfile();
loadProjects();
loadPosts();
