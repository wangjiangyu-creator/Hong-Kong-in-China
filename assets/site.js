(function () {
  let data = window.siteData || { themes: [], sources: [], events: [], comparisons: [] };
  const base = document.body.getAttribute("data-base") || "";

  function hrefFor(url) {
    if (!url) return "#";
    if (/^https?:\/\//.test(url) || url.startsWith("mailto:") || url.startsWith("#")) {
      return url;
    }
    return base + url;
  }

  function sourceHref(url) {
    if (/^https?:\/\//.test(url)) return url;
    return base + url;
  }

  function html(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderThemeCards() {
    document.querySelectorAll("[data-theme-cards]").forEach((container) => {
      container.innerHTML = data.themes
        .map((theme, index) => {
          const questions = theme.questions
            .slice(0, 2)
            .map((question) => `<li>${html(question)}</li>`)
            .join("");
          const tags = theme.capabilities
            .slice(0, 3)
            .map((tag) => `<span class="tag">${html(tag)}</span>`)
            .join("");
          return `
            <article class="theme-card">
              <div class="meta">主题 ${index + 1}</div>
              <h3>${html(theme.title)}</h3>
              <p>${html(theme.summary)}</p>
              <ul>${questions}</ul>
              <div class="tag-row">${tags}</div>
              <p class="link-row"><a href="${hrefFor(theme.url)}">进入主题页</a></p>
            </article>
          `;
        })
        .join("");
    });
  }

  function sourceCard(source) {
    const tags = (source.tags || []).map((tag) => `<span class="tag">${html(tag)}</span>`).join("");
    return `
      <article class="source-card" data-source-type="${html(source.type)}">
        <div class="type">${html(source.type)}</div>
        <h3>${html(source.title)}</h3>
        <div class="publisher">${html(source.publisher)} · ${html(source.date)}</div>
        <p>${html(source.note)}</p>
        <div class="tag-row">${tags}</div>
        <a href="${sourceHref(source.url)}" target="_blank" rel="noopener">查看来源</a>
      </article>
    `;
  }

  function sourceText(source) {
    return [
      source.type,
      source.title,
      source.date,
      source.publisher,
      source.note,
      (source.tags || []).join(" "),
      (source.usedFor || []).join(" "),
    ].join(" ").toLowerCase();
  }

  function filterSources(type, query) {
    const normalized = String(query || "").trim().toLowerCase();
    return data.sources.filter((source) => {
      const typeMatch = type === "全部" || source.type === type;
      const queryMatch = !normalized || sourceText(source).includes(normalized);
      return typeMatch && queryMatch;
    });
  }

  function renderSources() {
    document.querySelectorAll("[data-source-list]").forEach((container) => {
      const themeId = container.getAttribute("data-theme-id");
      const type = container.getAttribute("data-source-type");
      let sources = data.sources;
      if (themeId) {
        sources = sources.filter((source) => (source.usedFor || []).includes(themeId));
      }
      if (type) {
        sources = sources.filter((source) => source.type === type);
      }
      container.innerHTML = sources.map(sourceCard).join("");
    });
  }

  function renderFilters() {
    const filters = document.querySelector("[data-source-filters]");
    const list = document.querySelector("[data-source-list='all']");
    if (!filters || !list) return;
    const types = ["全部"].concat(Array.from(new Set(data.sources.map((source) => source.type))));
    const search = document.querySelector("[data-source-search]");
    const resultCount = document.querySelector("[data-source-result-count]");
    let selected = "全部";

    function updateList() {
      const sources = filterSources(selected, search ? search.value : "");
      list.innerHTML = sources.map(sourceCard).join("");
      if (resultCount) {
        resultCount.textContent = `显示 ${sources.length} / ${data.sources.length} 条资料`;
      }
    }

    filters.innerHTML = types
      .map((type) => `<button class="filter-button" type="button" aria-pressed="${type === "全部"}" data-filter="${html(type)}">${html(type)}</button>`)
      .join("");

    filters.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-filter]");
      if (!button) return;
      filters.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", "false"));
      button.setAttribute("aria-pressed", "true");
      selected = button.getAttribute("data-filter");
      updateList();
    });

    if (search) {
      search.addEventListener("input", updateList);
    }

    updateList();
  }

  function renderTimeline() {
    document.querySelectorAll("[data-timeline]").forEach((container) => {
      container.innerHTML = data.events
        .map((event) => `
          <article class="timeline-item">
            <div class="timeline-date">${html(event.date)}</div>
            <div class="timeline-content">
              <h3>${html(event.title)}</h3>
              <p><strong>${html(event.type)}</strong> · ${html(event.summary)}</p>
            </div>
          </article>
        `)
        .join("");
    });
  }

  function renderComparisonTable() {
    document.querySelectorAll("[data-comparison-table]").forEach((container) => {
      const rows = data.comparisons
        .map((item) => `
          <tr>
            <td>${html(item.place)}</td>
            <td>${html(item.legalSystem)}</td>
            <td>${html(item.capitalFlow)}</td>
            <td>${html(item.customsStatus)}</td>
            <td>${html(item.internationalTrust)}</td>
            <td>${html(item.industrialCapacity)}</td>
            <td>${html(item.strategicRole)}</td>
          </tr>
        `)
        .join("");
      container.innerHTML = `
        <div class="compare-table-wrap">
          <table class="compare-table">
            <thead>
              <tr>
                <th>平台</th>
                <th>法律制度</th>
                <th>资本流动</th>
                <th>关税地位</th>
                <th>国际信任</th>
                <th>产业能力</th>
                <th>国家战略功能</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    });
  }

  function renderSourceCounts() {
    document.querySelectorAll("[data-source-count]").forEach((node) => {
      const type = node.getAttribute("data-source-count");
      const count = data.sources.filter((source) => source.type === type).length;
      node.textContent = count;
    });
    document.querySelectorAll("[data-source-total]").forEach((node) => {
      const rounded = Math.floor(data.sources.length / 10) * 10;
      node.textContent = `${rounded}+`;
    });
  }

  function renderLibraryStats() {
    const stats = {
      total: data.sources.length,
      english: data.sources.filter((source) => (source.tags || []).includes("英文资料")).length,
      chinese: data.sources.filter((source) => !(source.tags || []).includes("英文资料")).length,
      journal: data.sources.filter((source) => (source.tags || []).includes("学术期刊")).length,
      policy: data.sources.filter((source) => source.type === "政策报告").length,
    };
    document.querySelectorAll("[data-library-stat]").forEach((node) => {
      const key = node.getAttribute("data-library-stat");
      node.textContent = stats[key] || 0;
    });
  }

  function setYear() {
    document.querySelectorAll("[data-year]").forEach((node) => {
      node.textContent = new Date().getFullYear();
    });
  }

  function init() {
    data = window.siteData || data;
    renderThemeCards();
    renderSources();
    renderFilters();
    renderTimeline();
    renderComparisonTable();
    renderSourceCounts();
    renderLibraryStats();
    setYear();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const ready = window.siteDataReady;
    if (ready && typeof ready.then === "function") {
      ready.then(init).catch((error) => {
        console.error(error);
        init();
      });
    } else {
      init();
    }
  });
})();
