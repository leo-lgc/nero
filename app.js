const FEED_MIN_SCORE = 40;
const HOT_MIN_SCORE = 85;
const HOT_LIMIT = 6;

const TAG_LABELS = {
  modelos: { pt: "modelos", en: "models" },
  agentes: { pt: "agentes", en: "agents" },
  "open-source": { pt: "open-source", en: "open-source" },
  "ferramentas-dev": { pt: "ferramentas-dev", en: "dev-tools" },
  produto: { pt: "produto", en: "product" },
  seguranca: { pt: "segurança", en: "safety" },
  pesquisa: { pt: "pesquisa", en: "research" }
};

const I18N = {
  pt: {
    brand_tagline: "Radar de sinais urgentes",
    nav_feed: "Feed",
    nav_methodology: "Metodologia",
    hero_eyebrow: "Radar em tempo real",
    hero_title: "O que está pegando fogo em IA.",
    hero_subtitle: "Reddit e GitHub, sem ruído: sinais com recência, tração e aceleração.",
    filter_source: "Fonte",
    filter_all: "Todos",
    search_placeholder: "Buscar no feed",
    topic_all: "Tema: todos",
    sort_urgent: "Mais urgente",
    sort_recent: "Mais recente",
    section_hot: "Pegando fogo agora",
    section_full: "Radar completo",
    open_origin: "Abrir origem",
    meta_signals: "sinais",
    empty_load: "Falha ao carregar sinais. Rode um servidor local e tente de novo.",
    empty_filter: "Nenhum sinal para esse filtro.",
    empty_hot: "Sem sinal crítico no momento.",
    why_it_matters: "Por que importa",
    upvotes: "upvotes",
    comments: "comentários",
    stars: "stars",
    forks: "forks",
    related: "relacionados",
    topic_prefix: "Tema",
    recency_github: "em movimento recente",
    recency_reddit: "em discussão ativa",
    band_critico: "crítico",
    band_quente: "quente",
    band_observacao: "observação",
    time_min: "há {n} min",
    time_hour: "há {n} h",
    time_day: "há {n} d"
  },
  en: {
    brand_tagline: "Urgent signals radar",
    nav_feed: "Feed",
    nav_methodology: "Methodology",
    hero_eyebrow: "Real-time radar",
    hero_title: "What is on fire in AI.",
    hero_subtitle: "Reddit and GitHub, no noise: signals with recency, traction, and acceleration.",
    filter_source: "Source",
    filter_all: "All",
    search_placeholder: "Search feed",
    topic_all: "Topic: all",
    sort_urgent: "Most urgent",
    sort_recent: "Most recent",
    section_hot: "On fire now",
    section_full: "Full radar",
    open_origin: "Open source",
    meta_signals: "signals",
    empty_load: "Failed to load signals. Run a local server and try again.",
    empty_filter: "No signals for this filter.",
    empty_hot: "No critical signal right now.",
    why_it_matters: "Why it matters",
    upvotes: "upvotes",
    comments: "comments",
    stars: "stars",
    forks: "forks",
    related: "related",
    topic_prefix: "Topic",
    recency_github: "in recent motion",
    recency_reddit: "in active discussion",
    band_critico: "critical",
    band_quente: "hot",
    band_observacao: "watch",
    time_min: "{n} min ago",
    time_hour: "{n} h ago",
    time_day: "{n} d ago"
  }
};

const feedEl = document.getElementById("feed");
const hotFeedEl = document.getElementById("hot-feed");
const metaEl = document.getElementById("meta");
const cardTemplate = document.getElementById("signal-card-template");
const filterButtons = Array.from(document.querySelectorAll(".filter-btn"));
const searchInput = document.getElementById("search-input");
const topicFilter = document.getElementById("topic-filter");
const sortMode = document.getElementById("sort-mode");

let allSignals = [];
let currentSourceFilter = "all";
let currentQuery = "";
let currentTopic = "all";
let currentSortMode = "urgent";
let currentLang = getLang();

init();

async function init() {
  try {
    applyTranslations();
    const response = await fetch("./data/signals.json");
    const payload = await response.json();
    allSignals = Array.isArray(payload.signals) ? payload.signals : [];
    buildTopicOptions(allSignals);
    renderFeed();
    bindUI();
  } catch (error) {
    feedEl.innerHTML = `<p class="empty">${t("empty_load")}</p>`;
    metaEl.textContent = "";
    console.error(error);
  }
}

function bindUI() {
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentSourceFilter = button.dataset.source;
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      renderFeed();
    });
  });

  searchInput.addEventListener("input", () => {
    currentQuery = searchInput.value.trim().toLowerCase();
    renderFeed();
  });

  topicFilter.addEventListener("change", () => {
    currentTopic = topicFilter.value;
    renderFeed();
  });

  sortMode.addEventListener("change", () => {
    currentSortMode = sortMode.value;
    renderFeed();
  });

  window.addEventListener("nero:langchange", (event) => {
    currentLang = event.detail.lang;
    applyTranslations();
    buildTopicOptions(allSignals);
    renderFeed();
  });
}

function renderFeed() {
  const visible = allSignals
    .filter((signal) => signal.final_score >= FEED_MIN_SCORE)
    .filter((signal) => currentSourceFilter === "all" || signal.source === currentSourceFilter)
    .filter((signal) => currentTopic === "all" || (signal.tags || []).includes(currentTopic))
    .filter(matchesQuery)
    .sort(sortSignals);

  metaEl.textContent = `${visible.length} ${t("meta_signals")}`;

  if (visible.length === 0) {
    hotFeedEl.innerHTML = "";
    feedEl.innerHTML = `<p class="empty">${t("empty_filter")}</p>`;
    return;
  }

  const hotSignals = visible.filter((signal) => signal.final_score >= HOT_MIN_SCORE).slice(0, HOT_LIMIT);
  const hotIds = new Set(hotSignals.map((signal) => signal.id));
  const regularSignals = visible.filter((signal) => !hotIds.has(signal.id));

  renderSignalList(hotFeedEl, hotSignals, true);
  renderSignalList(feedEl, regularSignals, false);
}

function renderSignalList(container, signals, isHot) {
  if (!container) return;
  container.innerHTML = "";

  if (signals.length === 0) {
    if (isHot) {
      container.innerHTML = `<p class="empty">${t("empty_hot")}</p>`;
    }
    return;
  }

  signals.forEach((signal) => {
    const card = buildCard(signal, isHot);
    container.appendChild(card);
  });
}

function buildCard(signal, isHot = false) {
  const node = cardTemplate.content.cloneNode(true);
  const cardEl = node.querySelector(".signal-card");
  if (isHot) cardEl.classList.add("hot-card");

  const source = node.querySelector(".source");
  source.innerHTML = sourceIcon(signal.source);
  node.querySelector(".source-name").textContent = signal.source;
  node.querySelector(".time").textContent = relativeTime(signal.captured_at);

  const band = node.querySelector(".band");
  band.textContent = `${bandLabel(signal.priority_band)} ${signal.final_score}`;
  band.classList.add(signal.priority_band);

  const titleLink = node.querySelector(".title-link");
  titleLink.textContent = signal.title;
  titleLink.href = signal.url;

  const summary = node.querySelector(".summary");
  summary.textContent = `${t("why_it_matters")}: ${whyItMatters(signal)}`;

  node.querySelector(".metrics").innerHTML = formatMetrics(signal);
  node.querySelector(".tags").textContent = (signal.tags || []).map((tag) => `#${tagLabel(tag)}`).join(" ");

  const link = node.querySelector(".origin");
  link.href = signal.url;
  link.textContent = t("open_origin");

  return node;
}

function buildTopicOptions(signals) {
  const selected = currentTopic;
  const topics = [...new Set(signals.flatMap((signal) => signal.tags || []))].sort((a, b) => a.localeCompare(b));

  topicFilter.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = t("topic_all");
  topicFilter.appendChild(allOption);

  for (const topic of topics) {
    const option = document.createElement("option");
    option.value = topic;
    option.textContent = `${t("topic_prefix")}: ${tagLabel(topic)}`;
    topicFilter.appendChild(option);
  }

  topicFilter.value = topics.includes(selected) || selected === "all" ? selected : "all";
  currentTopic = topicFilter.value;
}

function matchesQuery(signal) {
  if (!currentQuery) return true;

  const haystack = [signal.title, signal.summary_1line, ...(signal.tags || []).map((tag) => tagLabel(tag))]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(currentQuery);
}

function sortSignals(a, b) {
  if (currentSortMode === "recent") {
    const byTime = new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime();
    if (byTime !== 0) return byTime;
    return b.final_score - a.final_score;
  }

  if (b.final_score !== a.final_score) return b.final_score - a.final_score;
  return new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime();
}

function whyItMatters(signal) {
  if (signal.summary_1line) return signal.summary_1line;

  if (signal.source === "github") {
    const stars = signal.metrics?.stars ?? 0;
    const forks = signal.metrics?.forks ?? 0;
    return `${stars} ${t("stars")} e ${forks} ${t("forks")} ${t("recency_github")}.`;
  }

  const upvotes = signal.metrics?.upvotes ?? 0;
  const comments = signal.metrics?.comments ?? 0;
  return `${upvotes} ${t("upvotes")} e ${comments} ${t("comments")} ${t("recency_reddit")}.`;
}

function sourceIcon(source) {
  if (source === "github") {
    return '<svg viewBox="0 0 16 16" role="img" aria-label="GitHub" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.64 7.64 0 0 1 8 4.9c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';
  }

  return '<svg viewBox="0 0 24 24" role="img" aria-label="Reddit" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z"/></svg>';
}

function formatMetrics(signal) {
  const metrics = signal.metrics || {};

  if (signal.source === "reddit") {
    const upvotes = metrics.upvotes ?? 0;
    const comments = metrics.comments ?? 0;
    const related = signal.related_count ? ` | +${signal.related_count} ${t("related")}` : "";
    return `${upvotes} ${t("upvotes")} | ${comments} ${t("comments")}${related}`;
  }

  const stars = metrics.stars ?? 0;
  const forks = metrics.forks ?? 0;
  const related = signal.related_count ? `<span class="related">+${signal.related_count} ${t("related")}</span>` : "";

  return `
    <span class="metric-chip" aria-label="${t("stars")}">
      <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path fill="currentColor" d="M8 1.2 9.9 5l4.2.6-3 2.9.7 4.2L8 10.8l-3.8 1.9.7-4.2-3-2.9L6.1 5z" />
      </svg>
      ${stars}
    </span>
    <span class="metric-chip" aria-label="${t("forks")}">
      <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path fill="currentColor" d="M5 2.5a1.5 1.5 0 1 1-1 1.4v6.2a1.5 1.5 0 1 1-1 .2V3.9A1.5 1.5 0 0 1 5 2.5Zm7 0a1.5 1.5 0 0 1 1 2.6v1.3A3.6 3.6 0 0 1 9.4 10H9v.2a1.5 1.5 0 1 1-1 .2V9a1 1 0 0 1 1-1h.4A2.6 2.6 0 0 0 12 5.4V5.1a1.5 1.5 0 1 1 0-2.6Z" />
      </svg>
      ${forks}
    </span>
    ${related}
  `;
}

function relativeTime(isoDate) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return t("time_min", { n: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 48) return t("time_hour", { n: hours });

  const days = Math.floor(hours / 24);
  return t("time_day", { n: days });
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
}

function bandLabel(key) {
  if (key === "critico") return t("band_critico");
  if (key === "quente") return t("band_quente");
  return t("band_observacao");
}

function tagLabel(tag) {
  const labels = TAG_LABELS[tag];
  if (!labels) return tag;
  return labels[currentLang] || labels.pt;
}

function getLang() {
  if (window.NeroPrefs?.getLang) {
    return window.NeroPrefs.getLang();
  }
  return "pt";
}

function t(key, vars) {
  const value = I18N[currentLang]?.[key] || I18N.pt[key] || key;
  if (!vars) return value;
  return Object.keys(vars).reduce((acc, varKey) => acc.replace(`{${varKey}}`, vars[varKey]), value);
}
