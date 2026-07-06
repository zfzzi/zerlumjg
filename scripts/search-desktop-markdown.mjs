import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const chunksPath = join(
  repoRoot,
  "knowledge",
  "desktop-lighting-library",
  "markdown-chunks.jsonl",
);

const query = process.argv.slice(2).join(" ").trim();

if (!query) {
  console.error("Usage: pnpm search:desktop-md <keyword>");
  process.exit(1);
}

if (!existsSync(chunksPath)) {
  console.error("Search index not found. Run: pnpm ingest:desktop-md");
  process.exit(1);
}

const terms = query
  .toLowerCase()
  .split(/\s+/)
  .map((term) => term.trim())
  .filter(Boolean);

const chunks = readFileSync(chunksPath, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

function countOccurrences(text, term) {
  if (!term) return 0;
  let count = 0;
  let index = text.indexOf(term);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(term, index + term.length);
  }
  return count;
}

function scoreChunk(chunk) {
  const title = String(chunk.title ?? "").toLowerCase();
  const heading = String(chunk.heading ?? "").toLowerCase();
  const text = String(chunk.searchText ?? chunk.text ?? "").toLowerCase();
  let score = 0;

  for (const term of terms) {
    score += countOccurrences(title, term) * 8;
    score += countOccurrences(heading, term) * 5;
    score += countOccurrences(text, term);
  }

  return score;
}

const results = chunks
  .map((chunk) => ({ chunk, score: scoreChunk(chunk) }))
  .filter((result) => result.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 10);

if (results.length === 0) {
  console.log(`No matches for: ${query}`);
  process.exit(0);
}

for (const [index, result] of results.entries()) {
  const { chunk, score } = result;
  const snippet = String(chunk.searchText ?? chunk.text ?? "")
    .replace(/\s+/g, " ")
    .slice(0, 180);

  console.log(`${index + 1}. [score ${score}] ${chunk.title}`);
  console.log(`   ${chunk.relativePath}`);
  console.log(`   collection=${chunk.collection} routes=${chunk.agentRoutes.join(",")}`);
  console.log(`   ${snippet}${snippet.length >= 180 ? "..." : ""}`);
  console.log("");
}
