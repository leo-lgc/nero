const I18N = {
  pt: {
    brand_tagline: "Radar de sinais urgentes",
    nav_feed: "Feed",
    nav_methodology: "Metodologia",
    hero_eyebrow: "Transparência",
    hero_title: "Como o Nero decide o que importa.",
    hero_subtitle: "Versão v1: simples, objetiva e ajustável.",
    section_sources: "Fontes",
    sources_text: "Reddit (`hot`, `rising`, `new` em subreddits de IA) e GitHub (repositórios em alta e atividade recente).",
    section_score: "Score",
    score_text_a: "Cada sinal recebe notas 0-100 em `recência`, `tração` e `aceleração`. Depois calcula `urgency_score`, `relevance_score` e `final_score`.",
    score_text_b: "Fórmula atual: `final = 0.6 * urgency + 0.4 * relevance`.",
    section_balance: "Balanceamento",
    balance_text: "Se uma fonte domina excessivamente o topo, Nero aplica ajuste leve para manter diversidade entre Reddit e GitHub.",
    section_dedup: "Deduplicação",
    dedup_text: "Links canonicamente iguais são agrupados. Para GitHub, diferentes links do mesmo repositório contam como o mesmo sinal.",
    section_bands: "Faixas",
    bands_text: "`crítico` (80-100), `quente` (60-79), `observação` (0-59). O feed principal prioriza sinais acima de 40."
  },
  en: {
    brand_tagline: "Urgent signals radar",
    nav_feed: "Feed",
    nav_methodology: "Methodology",
    hero_eyebrow: "Transparency",
    hero_title: "How Nero decides what matters.",
    hero_subtitle: "v1: simple, objective, and adjustable.",
    section_sources: "Sources",
    sources_text: "Reddit (`hot`, `rising`, `new` in AI-focused subreddits) and GitHub (repositories in rise and recent activity).",
    section_score: "Score",
    score_text_a: "Each signal gets 0-100 scores in `recency`, `traction`, and `acceleration`, then computes `urgency_score`, `relevance_score`, and `final_score`.",
    score_text_b: "Current formula: `final = 0.6 * urgency + 0.4 * relevance`.",
    section_balance: "Balancing",
    balance_text: "If one source dominates the top too much, Nero applies a light adjustment to keep diversity between Reddit and GitHub.",
    section_dedup: "Deduplication",
    dedup_text: "Canonically equal links are grouped. For GitHub, different links from the same repository count as one signal.",
    section_bands: "Bands",
    bands_text: "`critical` (80-100), `hot` (60-79), `watch` (0-59). Main feed prioritizes signals above 40."
  }
};

let currentLang = window.NeroPrefs?.getLang ? window.NeroPrefs.getLang() : "pt";

applyTranslations();

window.addEventListener("nero:langchange", (event) => {
  currentLang = event.detail.lang;
  applyTranslations();
});

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    node.textContent = I18N[currentLang]?.[key] || I18N.pt[key] || key;
  });
}
