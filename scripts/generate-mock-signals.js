const fs = require("fs");
const path = require("path");

const now = Date.now();

const signals = [
  {
    id: "sig_001",
    source: "github",
    source_item_id: "openai/new-agents-release",
    source_subtype: "trending",
    title: "Agent framework repo dispara no trending com novo release",
    url: "https://github.com/example/agent-stack/releases/tag/v0.9.0",
    canonical_url: "https://github.com/example/agent-stack",
    created_at: isoMinutesAgo(50),
    captured_at: isoMinutesAgo(24),
    metrics: { upvotes: null, comments: null, stars: 2100, forks: 180 },
    tags: ["agentes", "open-source"],
    summary_1line: "Novo release puxou alta rapida de stars e forks em menos de 2 horas.",
    urgency_score: 84,
    relevance_score: 77,
    final_score: 81,
    priority_band: "critico",
    duplicate_group_id: "dup_repo_agent_stack",
    related_count: 2
  },
  {
    id: "sig_002",
    source: "reddit",
    source_item_id: "t3_ab12xy",
    source_subtype: "rising",
    title: "Bench novo de modelos pequenos sobe rapido no r/MachineLearning",
    url: "https://www.reddit.com/r/MachineLearning/comments/ab12xy/new_small_model_benchmark/",
    canonical_url: "https://www.reddit.com/r/MachineLearning/comments/ab12xy/new_small_model_benchmark/",
    created_at: isoMinutesAgo(90),
    captured_at: isoMinutesAgo(18),
    metrics: { upvotes: 620, comments: 143, stars: null, forks: null },
    tags: ["modelos", "pesquisa"],
    summary_1line: "Post ganhou comentarios tecnicos fortes e discussao de reproducao.",
    urgency_score: 76,
    relevance_score: 73,
    final_score: 75,
    priority_band: "quente",
    duplicate_group_id: "dup_bench_small_models",
    related_count: 1
  },
  {
    id: "sig_003",
    source: "github",
    source_item_id: "org/toolkit",
    source_subtype: "events",
    title: "Toolkit de avaliacao de RAG cresce em stars nas ultimas horas",
    url: "https://github.com/example/rag-eval-toolkit",
    canonical_url: "https://github.com/example/rag-eval-toolkit",
    created_at: isoMinutesAgo(240),
    captured_at: isoMinutesAgo(27),
    metrics: { upvotes: null, comments: null, stars: 980, forks: 120 },
    tags: ["ferramentas-dev", "open-source"],
    summary_1line: "Projeto de avaliacao ganhou tracao apos comparativo publico de frameworks.",
    urgency_score: 65,
    relevance_score: 69,
    final_score: 67,
    priority_band: "quente",
    duplicate_group_id: null,
    related_count: 0
  },
  {
    id: "sig_004",
    source: "reddit",
    source_item_id: "t3_qw34er",
    source_subtype: "hot",
    title: "Thread sobre seguranca de agentes sobe no r/singularity",
    url: "https://www.reddit.com/r/singularity/comments/qw34er/agent_safety_thread/",
    canonical_url: "https://www.reddit.com/r/singularity/comments/qw34er/agent_safety_thread/",
    created_at: isoMinutesAgo(150),
    captured_at: isoMinutesAgo(31),
    metrics: { upvotes: 410, comments: 210, stars: null, forks: null },
    tags: ["seguranca", "agentes"],
    summary_1line: "Debate com sinais de risco pratico e mitigacoes aplicaveis agora.",
    urgency_score: 62,
    relevance_score: 66,
    final_score: 64,
    priority_band: "quente",
    duplicate_group_id: null,
    related_count: 0
  },
  {
    id: "sig_005",
    source: "reddit",
    source_item_id: "t3_low11",
    source_subtype: "new",
    title: "Discussao inicial sobre update menor de API",
    url: "https://www.reddit.com/r/OpenAI/comments/low11/minor_api_update/",
    canonical_url: "https://www.reddit.com/r/OpenAI/comments/low11/minor_api_update/",
    created_at: isoMinutesAgo(320),
    captured_at: isoMinutesAgo(35),
    metrics: { upvotes: 22, comments: 6, stars: null, forks: null },
    tags: ["produto"],
    summary_1line: "Sinal fraco; fica fora do topo principal por score baixo.",
    urgency_score: 28,
    relevance_score: 37,
    final_score: 32,
    priority_band: "observacao",
    duplicate_group_id: null,
    related_count: 0
  }
];

validateSignals(signals);

const output = {
  generated_at: new Date(now).toISOString(),
  version: "signal-v0",
  signals
};

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const outputFile = path.join(dataDir, "signals.json");
fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
console.log(`Mock signals generated at ${outputFile}`);

function isoMinutesAgo(minutes) {
  return new Date(now - minutes * 60 * 1000).toISOString();
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

  items.forEach((signal, index) => {
    requiredKeys.forEach((key) => {
      if (signal[key] === undefined || signal[key] === null || signal[key] === "") {
        throw new Error(`Signal ${index} missing required field: ${key}`);
      }
    });

    if (!allowedSources.has(signal.source)) {
      throw new Error(`Signal ${signal.id} has invalid source: ${signal.source}`);
    }

    if (!allowedBands.has(signal.priority_band)) {
      throw new Error(`Signal ${signal.id} has invalid priority_band: ${signal.priority_band}`);
    }

    ["urgency_score", "relevance_score", "final_score"].forEach((field) => {
      const value = signal[field];
      if (!Number.isInteger(value) || value < 0 || value > 100) {
        throw new Error(`Signal ${signal.id} invalid ${field}: ${value}`);
      }
    });

    if (signal.summary_1line.length > 140) {
      throw new Error(`Signal ${signal.id} summary_1line too long`);
    }

    if (!Array.isArray(signal.tags) || signal.tags.length > 3) {
      throw new Error(`Signal ${signal.id} tags invalid`);
    }
  });
}
