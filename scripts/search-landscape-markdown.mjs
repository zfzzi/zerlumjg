import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const indexPath = resolve(repoRoot, "knowledge", "landscape-design-library", "markdown-chunks.jsonl");
const query = process.argv.slice(2).join(" ").trim().toLocaleLowerCase("zh-CN");

if (!query) {
  console.error("Usage: pnpm search:landscape-md -- <keyword>");
  process.exitCode = 1;
} else {
  try {
    const records = (await readFile(indexPath, "utf8"))
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const results = records
      .filter((record) => `${record.title} ${record.relativePath} ${record.text}`.toLocaleLowerCase("zh-CN").includes(query))
      .slice(0, 10);

    for (const result of results) {
      console.log(`${result.title}\n${result.relativePath}\n复核状态：${result.reviewStatus}\n`);
    }

    if (!results.length) console.log("No reviewed landscape sources matched.");
  } catch {
    console.error("Landscape source index not found. Run pnpm ingest:landscape-md first.");
    process.exitCode = 1;
  }
}
