const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SUBREDDITS = ["MachineLearning", "LocalLLaMA", "singularity", "OpenAI", "ChatGPT"];
const MODES = ["hot", "rising", "new"];
const REDDIT_LIMIT = 12;
const GITHUB_LIMIT = 30;

const REDDIT_SOURCE_QUALITY = {
  machinelearning: 88,
  localllama: 84,
  singularity: 70,
  openai: 74,
  chatgpt: 66
};

const TOPIC_RULES = [
  { tag: "modelos", re: /model|llm|benchmark|weights|checkpoint|inference|transformer|vlm/i },
  { tag: "agentes", re: /agent|workflow|tool use|autonomous|function calling/i },
  { tag: "open-source", re: /open\s?source|github|repo|release|apache|mit license/i },
  { tag: "ferramentas-dev", re: /sdk|framework|cli|api|library|toolkit|rag/i },
  { tag: "produto", re: /launch|pricing|plan|feature|roadmap|beta/i },
  { tag: "seguranca", re: /safety|security|jailbreak|risk|alignment|guardrail/i },
  { tag: "pesquisa", re: /paper|arxiv|study|research|experiment|dataset/i }
];

main().catch((error) => {
  console.error("Failed to fetch signals:", error);
  process.exitCode = 1;
});

async function main() {
  const [redditSignals, liveGithubSignals] = await Promise.all([fetchRedditSignals(), fetchGithubSignals()]);

  const githubSignals = liveGithubSignals.length > 0 ? liveGithubSignals : loadGithubSignals();
  const githubMode = liveGithubSignals.length > 0 ? "live" : "fallback";

  let mergedSignals = deduplicate([...redditSignals, ...githubSignals]);
  mergedSignals = rebalanceAcrossSources(mergedSignals);

  const outputSignals = mergedSignals
    .sort((a, b) => {
      if (b.final_score !== a.final_score) return b.final_score - a.final_score;
      return new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime();
    })
    .slice(0, 120);

  validateSignals(outputSignals);

  const output = {
    generated_at: new Date().toISOString(),
    version: "signal-v0",
    signals: outputSignals
  };

  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const outputPath = path.join(dataDir, "signals.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  const redditCount = outputSignals.filter((item) => item.source === "reddit").length;
  const githubCount = outputSignals.filter((item) => item.source === "github").length;

  console.log(`Wrote ${outputSignals.length} signals -> ${outputPath}`);
  console.log(`Reddit: ${redditCount}, GitHub: ${githubCount} (${githubMode})`);
}

async function fetchRedditSignals() {
  const listings = [];

  for (const subreddit of SUBREDDITS) {
    for (const mode of MODES) {
      const url = `https://www.reddit.com/r/${subreddit}/${mode}.json?limit=${REDDIT_LIMIT}`;
      const body = await safeFetchJson(url, {
        "User-Agent": "NeroSignalBot/0.3"
      });
      const children = body?.data?.children || [];

      for (const child of children) {
        if (!child?.data) continue;
        listings.push({ post: child.data, mode });
      }
    }
  }

  return listings
    .filter(({ post }) => !post.stickied && post.title)
    .map(({ post, mode }) => toRedditSignal(post, mode));
}

async function fetchGithubSignals() {
  const queries = buildGithubQueries();
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "NeroSignalBot/0.3"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const repos = [];
  for (const query of queries) {
    const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query.q)}&sort=${query.sort}&order=desc&per_page=${GITHUB_LIMIT}`;
    const body = await safeFetchJson(searchUrl, headers);
    const items = Array.isArray(body?.items) ? body.items : [];

    for (const repo of items) {
      repos.push({ repo, subtype: query.subtype });
    }
  }

  return repos
    .filter(({ repo }) => repo && !repo.fork && !repo.archived && repo.html_url)
    .map(({ repo, subtype }) => toGithubSignal(repo, subtype));
}

function buildGithubQueries() {
  const pushedSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return [
    {
      subtype: "trending",
      sort: "stars",
      q: `topic:machine-learning stars:>100 pushed:>=${pushedSince}`
    },
    {
      subtype: "active",
      sort: "updated",
      q: `topic:llm stars:>60 pushed:>=${pushedSince}`
    }
  ];
}

function toRedditSignal(post, mode) {
  const createdAt = new Date((post.created_utc || 0) * 1000).toISOString();
  const capturedAt = new Date().toISOString();
  const canonicalUrl = canonicalizeLink(post.url_overridden_by_dest || post.url || `https://www.reddit.com${post.permalink}`);
  const tags = inferTags(`${post.title} ${(post.selftext || "").slice(0, 320)}`);

  const recency = redditRecency(post);
  const traction = redditTraction(post);
  const acceleration = redditAcceleration(post);
  const quality = redditSourceQuality(post);
  const topic = topicMatch(tags);

  return buildSignal({
    id: `sig_rd_${post.id}`,
    source: "reddit",
    sourceItemId: post.name || `t3_${post.id}`,
    sourceSubtype: mode,
    title: trimText(post.title, 160),
    url: `https://www.reddit.com${post.permalink}`,
    canonicalUrl,
    createdAt,
    capturedAt,
    tags,
    metrics: {
      upvotes: Number(post.ups || 0),
      comments: Number(post.num_comments || 0),
      stars: null,
      forks: null
    },
    whyItMatters: trimText(
      `Discussão em ${post.subreddit} com ${Number(post.ups || 0)} upvotes e ${Number(post.num_comments || 0)} comentários acelerando.`,
      140
    ),
    components: { recency, traction, acceleration, quality, topic }
  });
}

function toGithubSignal(repo, subtype) {
  const capturedAt = new Date().toISOString();
  const canonicalUrl = canonicalizeLink(repo.html_url);
  const tags = inferTags(`${repo.full_name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`);

  const recency = githubRecency(repo);
  const traction = githubTraction(repo);
  const acceleration = githubAcceleration(repo);
  const quality = githubSourceQuality(repo);
  const topic = topicMatch(tags);

  return buildSignal({
    id: `sig_gh_${repo.id}_${subtype}`,
    source: "github",
    sourceItemId: String(repo.id),
    sourceSubtype: subtype,
    title: trimText(`${repo.full_name} ganha tração no GitHub`, 160),
    url: repo.html_url,
    canonicalUrl,
    createdAt: new Date(repo.pushed_at || repo.updated_at || Date.now()).toISOString(),
    capturedAt,
    tags,
    metrics: {
      upvotes: null,
      comments: null,
      stars: Number(repo.stargazers_count || 0),
      forks: Number(repo.forks_count || 0)
    },
    whyItMatters: trimText(
      `Repositório com ${Number(repo.stargazers_count || 0)} stars e ${Number(repo.forks_count || 0)} forks em alta recente.`,
      140
    ),
    components: { recency, traction, acceleration, quality, topic }
  });
}

function buildSignal(input) {
  const urgency = clampInt(Math.round(0.55 * input.components.recency + 0.45 * input.components.acceleration), 0, 100);
  const relevance = clampInt(
    Math.round(0.5 * input.components.traction + 0.3 * input.components.quality + 0.2 * input.components.topic),
    0,
    100
  );
  const finalScore = clampInt(Math.round(0.6 * urgency + 0.4 * relevance), 0, 100);

  return {
    id: input.id,
    source: input.source,
    source_item_id: input.sourceItemId,
    source_subtype: input.sourceSubtype,
    title: input.title,
    url: input.url,
    canonical_url: input.canonicalUrl,
    created_at: input.createdAt,
    captured_at: input.capturedAt,
    metrics: input.metrics,
    tags: input.tags,
    summary_1line: input.whyItMatters,
    urgency_score: urgency,
    relevance_score: relevance,
    final_score: finalScore,
    priority_band: toBand(finalScore),
    duplicate_group_id: null,
    related_count: 0,
    score_components: input.components
  };
}

function redditRecency(post) {
  const ageHours = Math.max(0.2, (Date.now() / 1000 - (post.created_utc || 0)) / 3600);
  return clampInt(Math.round(100 * Math.exp(-ageHours / 20)), 0, 100);
}

function redditTraction(post) {
  const ups = Number(post.ups || 0);
  const comments = Number(post.num_comments || 0);
  const raw = ups + comments * 2;
  return clampInt(Math.round((Math.log10(raw + 1) / 4.2) * 100), 0, 100);
}

function redditAcceleration(post) {
  const ups = Number(post.ups || 0);
  const comments = Number(post.num_comments || 0);
  const ageHours = Math.max(0.2, (Date.now() / 1000 - (post.created_utc || 0)) / 3600);
  const velocityRaw = (ups + comments * 2.2) / ageHours;
  return clampInt(Math.round((Math.log10(velocityRaw + 1) / 3.2) * 100), 0, 100);
}

function redditSourceQuality(post) {
  const subreddit = String(post.subreddit || "").toLowerCase();
  return REDDIT_SOURCE_QUALITY[subreddit] || 60;
}

function githubRecency(repo) {
  const ageHours = Math.max(0.2, (Date.now() - new Date(repo.pushed_at || repo.updated_at || Date.now()).getTime()) / 3600000);
  return clampInt(Math.round(100 * Math.exp(-ageHours / 24)), 0, 100);
}

function githubTraction(repo) {
  const stars = Number(repo.stargazers_count || 0);
  const forks = Number(repo.forks_count || 0);
  const raw = stars + forks * 4;
  return clampInt(Math.round((Math.log10(raw + 1) / 5.2) * 100), 0, 100);
}

function githubAcceleration(repo) {
  const stars = Number(repo.stargazers_count || 0);
  const forks = Number(repo.forks_count || 0);
  const repoAgeDays = Math.max(1, (Date.now() - new Date(repo.created_at || Date.now()).getTime()) / 86400000);
  const starsPerDay = stars / repoAgeDays;
  const forkRatio = forks / Math.max(stars + forks, 1);
  const speed = clampInt(Math.round((Math.log10(starsPerDay + 1) / 3) * 100), 0, 100);
  const branch = clampInt(Math.round(forkRatio * 100), 0, 100);
  return clampInt(Math.round(0.75 * speed + 0.25 * branch), 0, 100);
}

function githubSourceQuality(repo) {
  const hasAiTopic = Array.isArray(repo.topics) && repo.topics.some((topic) => /ai|llm|machine-learning|ml|transformer/i.test(topic));
  const hasDescription = Boolean(repo.description);
  if (hasAiTopic && hasDescription) return 84;
  if (hasAiTopic) return 78;
  return 68;
}

function topicMatch(tags) {
  return tags.length > 0 ? 84 : 56;
}

function deduplicate(signals) {
  const groups = new Map();

  for (const signal of signals) {
    const dedupKey = getDedupKey(signal);
    if (!groups.has(dedupKey)) groups.set(dedupKey, []);
    groups.get(dedupKey).push(signal);
  }

  const deduped = [];
  for (const [key, items] of groups.entries()) {
    const sorted = [...items].sort((a, b) => b.final_score - a.final_score);
    const winner = { ...sorted[0] };
    if (sorted.length > 1) {
      winner.duplicate_group_id = `dup_${shortHash(key)}`;
      winner.related_count = sorted.length - 1;
    }
    deduped.push(winner);
  }

  return deduped;
}

function getDedupKey(signal) {
  const canonical = signal.canonical_url;
  if (canonical) return canonical;
  return `title:${titleFingerprint(signal.title)}`;
}

function rebalanceAcrossSources(signals) {
  const topWindow = [...signals]
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, 40);

  const counts = topWindow.reduce(
    (acc, item) => {
      acc[item.source] = (acc[item.source] || 0) + 1;
      return acc;
    },
    { reddit: 0, github: 0 }
  );

  const dominantSource = counts.reddit >= counts.github ? "reddit" : "github";
  const minoritySource = dominantSource === "reddit" ? "github" : "reddit";
  const dominantRatio = topWindow.length > 0 ? counts[dominantSource] / topWindow.length : 0;

  if (dominantRatio < 0.62) {
    return signals;
  }

  return signals.map((signal) => {
    const next = { ...signal };
    if (signal.source === dominantSource) {
      next.final_score = clampInt(signal.final_score - 6, 0, 100);
    } else if (signal.source === minoritySource) {
      next.final_score = clampInt(signal.final_score + 4, 0, 100);
    }
    next.priority_band = toBand(next.final_score);
    return next;
  });
}

function loadGithubSignals() {
  const existing = path.join(__dirname, "..", "data", "signals.json");
  if (!fs.existsSync(existing)) return [];

  try {
    const body = JSON.parse(fs.readFileSync(existing, "utf8"));
    const items = Array.isArray(body.signals) ? body.signals : [];
    return items.filter((item) => item.source === "github");
  } catch {
    return [];
  }
}

async function safeFetchJson(url, headers) {
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function inferTags(text) {
  const found = [];
  for (const rule of TOPIC_RULES) {
    if (rule.re.test(text)) found.push(rule.tag);
    if (found.length >= 3) break;
  }
  return found;
}

function canonicalizeLink(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    const params = [...u.searchParams.keys()];
    for (const key of params) {
      if (key.toLowerCase().startsWith("utm_") || key === "ref" || key === "source") {
        u.searchParams.delete(key);
      }
    }
    u.hash = "";

    if (host === "github.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        u.pathname = `/${parts[0]}/${parts[1]}`;
      }
    }

    return u.toString();
  } catch {
    return String(url || "");
  }
}

function titleFingerprint(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 10)
    .join("-");
}

function shortHash(input) {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 8);
}

function trimText(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}...`;
}

function toBand(score) {
  if (score >= 80) return "critico";
  if (score >= 60) return "quente";
  return "observacao";
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function validateSignals(items) {
  const allowedSources = new Set(["reddit", "github"]);
  const allowedBands = new Set(["critico", "quente", "observacao"]);
  const requiredKeys = [
    "id",
    "source",
    "title",
    "url",
    "canonical_url",
    "created_at",
    "captured_at",
    "summary_1line",
    "urgency_score",
    "relevance_score",
    "final_score",
    "priority_band"
  ];

  for (const signal of items) {
    for (const key of requiredKeys) {
      if (signal[key] === undefined || signal[key] === null || signal[key] === "") {
        throw new Error(`Signal missing required field: ${key}`);
      }
    }

    if (!allowedSources.has(signal.source)) {
      throw new Error(`Invalid source: ${signal.source}`);
    }

    if (!allowedBands.has(signal.priority_band)) {
      throw new Error(`Invalid priority_band: ${signal.priority_band}`);
    }

    for (const field of ["urgency_score", "relevance_score", "final_score"]) {
      const value = signal[field];
      if (!Number.isInteger(value) || value < 0 || value > 100) {
        throw new Error(`Invalid ${field}: ${value}`);
      }
    }

    if (!Array.isArray(signal.tags) || signal.tags.length > 3) {
      throw new Error(`Invalid tags for signal: ${signal.id}`);
    }

    if (signal.summary_1line.length > 140) {
      throw new Error(`summary_1line too long for signal: ${signal.id}`);
    }
  }
}
