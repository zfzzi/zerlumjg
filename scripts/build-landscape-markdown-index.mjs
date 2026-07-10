import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoot = resolve(process.argv[2] || process.env.LANDSCAPE_MARKDOWN_SOURCE || "");
const outputRoot = join(repoRoot, "knowledge", "landscape-design-library");
const supportedExtensions = new Set([".md", ".markdown", ".txt"]);

if (!process.argv[2] && !process.env.LANDSCAPE_MARKDOWN_SOURCE) {
  console.error("Usage: pnpm ingest:landscape-md -- <reviewed-source-folder>");
  process.exitCode = 1;
} else if (sourceRoot === repoRoot || sourceRoot.startsWith(`${repoRoot}\\`)) {
  console.error("Source must be an external reviewed folder, not the application repository.");
  process.exitCode = 1;
} else {
  const entries = [];

  async function collect(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const absolutePath = join(folder, entry.name);

      if (entry.isDirectory()) {
        await collect(absolutePath);
      } else if (entry.isFile() && supportedExtensions.has(extname(entry.name).toLowerCase())) {
        const text = (await readFile(absolutePath, "utf8")).trim();
        if (!text) continue;
        const relativePath = relative(sourceRoot, absolutePath).replaceAll("\\", "/");
        entries.push({
          id: createHash("sha256").update(relativePath).digest("hex").slice(0, 16),
          relativePath,
          title: text.match(/^#\s+(.+)$/m)?.[1]?.trim() || entry.name.replace(/\.[^.]+$/, ""),
          source: "reviewed-external-folder",
          privacyLevel: "internal",
          reviewStatus: "pending-review",
          projectType: "unclassified",
          knowledgeLevel: "reference",
          updatedAt: new Date().toISOString(),
          text,
        });
      }
    }
  }

  await collect(sourceRoot);
  await mkdir(outputRoot, { recursive: true });
  await writeFile(join(outputRoot, "markdown-index.json"), `${JSON.stringify({ version: 1, entries }, null, 2)}\n`);
  await writeFile(join(outputRoot, "markdown-chunks.jsonl"), entries.map((entry) => JSON.stringify(entry)).join("\n"));
  await writeFile(
    join(outputRoot, "markdown-summary.md"),
    `# 景观资料索引摘要\n\n- 已索引：${entries.length} 份\n- 默认状态：待复核\n- 项目事实优先级：项目简报与场地资料高于方法库\n`,
  );
  console.log(`Indexed ${entries.length} reviewed landscape source files.`);
}
