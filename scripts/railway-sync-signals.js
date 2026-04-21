const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

run("node", ["scripts/fetch-reddit-signals.js"], "Refreshes signals locally");
run("node", ["scripts/publish-signals-to-github.js"], "Publishes data/signals.json to GitHub");

function run(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed with code ${result.status}`);
  }
}
