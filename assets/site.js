const GITHUB_USER = "kafei520-CN";
const VISIBLE_PROJECT_LIMIT = 6;
const HIDDEN_REPOSITORIES = new Set([
  // 在这里填仓库名即可隐藏，例如: "old-demo"
  "tcs",
  "kafei520-CN.github.io"
]);

const byId = (id) => document.getElementById(id);

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(date);
};

const getArchiveKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未归档";
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const getArchiveLabel = (key) => {
  if (key === "未归档") {
    return key;
  }
  const [year, month] = key.split("-");
  return `${year} 年 ${Number(month)} 月`;
};

const normalizeSearchText = (value) => String(value || "").trim().toLowerCase();

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
    byId("following").textContent = profile.following ?? "--";
    byId("joinedAt").textContent = profile.created_at ? new Date(profile.created_at).getFullYear() : "--";
  } catch (error) {
    console.warn("读取 GitHub 资料失败", error);
  }
}

async function loadProjects() {
  const container = byId("projectList");
  try {
    const response = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100`);
    if (!response.ok) {
      throw new Error(`GitHub repos status ${response.status}`);
    }
    const repos = await response.json();
    const visibleRepos = Array.isArray(repos)
      ? repos.filter((repo) => !HIDDEN_REPOSITORIES.has(repo.name))
      : [];

    if (visibleRepos.length === 0) {
      container.innerHTML = '<p class="muted">暂无公开仓库。</p>';
      return;
    }

    let expanded = false;

    const renderProjects = () => {
      const shownRepos = expanded ? visibleRepos : visibleRepos.slice(0, VISIBLE_PROJECT_LIMIT);
      const cards = shownRepos
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

      const toggle = visibleRepos.length > VISIBLE_PROJECT_LIMIT
        ? `<button class="project-toggle" type="button" aria-expanded="${expanded}">${expanded ? "收起项目" : `展开全部 ${visibleRepos.length} 个项目`}</button>`
        : "";

      container.innerHTML = `${cards}${toggle}`;

      const toggleButton = container.querySelector(".project-toggle");
      if (toggleButton) {
        toggleButton.addEventListener("click", () => {
          expanded = !expanded;
          renderProjects();
        });
      }
    };

    renderProjects();
  } catch (error) {
    container.innerHTML = '<p class="muted">仓库读取失败，请稍后刷新。</p>';
    console.warn("读取 GitHub 仓库失败", error);
  }
}

async function loadPosts() {
  const list = byId("postList");
  const searchInput = byId("postSearch");
  const archiveList = byId("archiveList");
  const stats = byId("postStats");

  try {
    const response = await fetch("posts/index.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Posts index status ${response.status}`);
    }
    const posts = await response.json();
    if (!Array.isArray(posts) || posts.length === 0) {
      list.innerHTML = '<p class="muted post-empty">还没有文章，先在本地写一篇 Markdown 吧。</p>';
      stats.textContent = "0 篇文章";
      return;
    }

    let activeArchive = "all";
    const sortedPosts = posts
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const archiveCounts = sortedPosts.reduce((counts, post) => {
      const key = getArchiveKey(post.date);
      counts.set(key, (counts.get(key) || 0) + 1);
      return counts;
    }, new Map());

    const renderArchives = () => {
      const archiveButtons = [
        `<button class="archive-button ${activeArchive === "all" ? "is-active" : ""}" type="button" data-archive="all">全部 ${sortedPosts.length}</button>`,
        ...Array.from(archiveCounts.entries()).map(([key, count]) => (
          `<button class="archive-button ${activeArchive === key ? "is-active" : ""}" type="button" data-archive="${Markdown.escapeHtml(key)}">${getArchiveLabel(key)} ${count}</button>`
        )),
      ];

      archiveList.innerHTML = archiveButtons.join("");
      archiveList.querySelectorAll(".archive-button").forEach((button) => {
        button.addEventListener("click", () => {
          activeArchive = button.dataset.archive || "all";
          renderPosts();
        });
      });
    };

    const createPostItem = (post) => `
      <a class="post-item" href="article.html?slug=${encodeURIComponent(post.slug || post.file)}">
        <time datetime="${Markdown.escapeHtml(post.date)}">${formatDate(post.date)}</time>
        <span>
          <strong>${Markdown.escapeHtml(post.title)}</strong>
          <p>${Markdown.escapeHtml(post.summary || "")}</p>
        </span>
        <span class="tag">阅读</span>
      </a>
    `;

    const renderPosts = () => {
      const query = normalizeSearchText(searchInput.value);
      const filteredPosts = sortedPosts.filter((post) => {
        const archiveKey = getArchiveKey(post.date);
        const searchBody = normalizeSearchText(`${post.title} ${post.summary || ""} ${post.date} ${post.slug || ""}`);
        const matchesArchive = activeArchive === "all" || archiveKey === activeArchive;
        const matchesQuery = !query || searchBody.includes(query);
        return matchesArchive && matchesQuery;
      });

      stats.textContent = `共 ${sortedPosts.length} 篇，当前显示 ${filteredPosts.length} 篇`;

      if (filteredPosts.length === 0) {
        list.innerHTML = '<p class="muted post-empty">没有找到匹配的文章。</p>';
        renderArchives();
        return;
      }

      const groupedPosts = filteredPosts.reduce((groups, post) => {
        const key = getArchiveKey(post.date);
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key).push(post);
        return groups;
      }, new Map());

      list.innerHTML = Array.from(groupedPosts.entries())
        .map(([key, groupPosts]) => `
          <div class="archive-group">
            <h3 class="archive-title">${getArchiveLabel(key)}</h3>
            ${groupPosts.map(createPostItem).join("")}
          </div>
        `)
        .join("");
      renderArchives();
    };

    searchInput.addEventListener("input", renderPosts);
    renderPosts();
  } catch (error) {
    list.innerHTML = '<p class="muted post-empty">文章列表加载失败。</p>';
    stats.textContent = "文章读取失败";
    console.warn("读取文章列表失败", error);
  }
}

byId("year").textContent = new Date().getFullYear();
loadProfile();
loadProjects();
loadPosts();
