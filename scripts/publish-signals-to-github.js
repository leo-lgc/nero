const fs = require("fs");
const path = require("path");

async function main() {
  const token = process.env.GH_PAT || process.env.GITHUB_TOKEN;
  const owner = process.env.GH_OWNER || "leo-lgc";
  const repo = process.env.GH_REPO || "nero";
  const branch = process.env.GH_BRANCH || "main";
  const filePath = "data/signals.json";

  if (!token) {
    throw new Error("Missing GH_PAT (or GITHUB_TOKEN) env var.");
  }

  const absoluteFile = path.join(__dirname, "..", filePath);
  const localContent = fs.readFileSync(absoluteFile, "utf8");

  const endpoint = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "NeroRailwaySync/0.1"
  };

  const current = await fetchJson(`${endpoint}?ref=${encodeURIComponent(branch)}`, {
    method: "GET",
    headers
  });

  const currentContent = Buffer.from(current.content || "", "base64").toString("utf8");
  if (normalize(currentContent) === normalize(localContent)) {
    console.log("No data changes. Skip GitHub commit.");
    return;
  }

  const body = {
    message: "chore: refresh signals data",
    branch,
    sha: current.sha,
    content: Buffer.from(localContent, "utf8").toString("base64")
  };

  await fetchJson(endpoint, {
    method: "PUT",
    headers,
    body: JSON.stringify(body)
  });

  console.log("Published updated signals.json to GitHub.");
}

function normalize(text) {
  return String(text).replace(/\r\n/g, "\n").trim();
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : {};
}

main().catch((error) => {
  console.error("Failed to publish signals:", error.message);
  process.exitCode = 1;
});
