import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const configuredSourceRoot =
  process.env.ZERLUM_DESKTOP_LIBRARY ?? "C:\\Users\\43490\\Desktop\\新建文件夹";
const sourceRoot = resolveSourceRoot(configuredSourceRoot);
const outputRoot = join(repoRoot, "knowledge", "desktop-lighting-library");

const collectionRules = [
  {
    prefix: "01_设计理论基础",
    collection: "lighting-theory",
    platformViews: ["knowledge", "agent"],
    agentRoutes: ["lighting-foundation"],
    privacyLevel: "internal",
    trust: "internal-knowledge",
  },
  {
    prefix: "02_光源技术",
    collection: "light-sources",
    platformViews: ["knowledge", "fixture"],
    agentRoutes: ["fixture-compliance", "lighting-foundation"],
    privacyLevel: "internal",
    trust: "internal-knowledge",
  },
  {
    prefix: "03_灯具系统",
    collection: "fixture-systems",
    platformViews: ["knowledge", "fixture", "quote"],
    agentRoutes: ["fixture-compliance"],
    privacyLevel: "internal",
    trust: "internal-knowledge",
  },
  {
    prefix: "04_照明设计方法",
    collection: "design-methods",
    platformViews: ["text", "knowledge", "database"],
    agentRoutes: [
      "scheme-case-research",
      "indoor-lighting",
      "outdoor-landscape-lighting",
      "road-tunnel-lighting",
    ],
    privacyLevel: "internal",
    trust: "internal-knowledge",
  },
  {
    prefix: "05_设计手法与技巧",
    collection: "design-techniques",
    platformViews: ["canvas", "video", "text", "knowledge"],
    agentRoutes: ["lighting-visualization", "scheme-case-research"],
    privacyLevel: "internal",
    trust: "internal-knowledge",
  },
  {
    prefix: "06_标准与规范",
    collection: "standards-audit",
    platformViews: ["knowledge", "agent"],
    agentRoutes: ["lighting-foundation"],
    privacyLevel: "internal",
    trust: "requires-version-audit",
    needsAudit: true,
  },
  {
    prefix: "07_计算与工具",
    collection: "calculation-tools",
    platformViews: ["knowledge", "agent"],
    agentRoutes: ["lighting-foundation"],
    privacyLevel: "internal",
    trust: "internal-knowledge",
    futureAgent: "lighting-calculation",
  },
  {
    prefix: "08_产品资料库",
    collection: "product-library",
    platformViews: ["fixture", "quote", "knowledge"],
    agentRoutes: ["fixture-compliance"],
    privacyLevel: "internal",
    trust: "requires-product-audit",
  },
  {
    prefix: "09_项目实践",
    collection: "project-cases",
    platformViews: ["database", "text", "canvas", "hub"],
    agentRoutes: ["scheme-case-research", "lighting-visualization"],
    privacyLevel: "private",
    trust: "private-internal-case",
  },
];

export const currentNationalStandards = [
  {
    currentCode: "GB/T 50034-2024",
    title: "建筑照明设计标准",
    supersededPatterns: [/GB\s*50034-2013/i, /GB50034-2013/i],
  },
  {
    currentCode: "GB 17945-2024",
    title: "消防应急照明和疏散指示系统",
    supersededPatterns: [/GB\s*17945-2010/i],
  },
  {
    currentCode: "GB/T 7000.1-2023",
    title: "灯具 第1部分：一般要求与试验",
    supersededPatterns: [
      /GB(?:\/T)?\s*7000\.1-(?:2007|2015|2016|2020|2021)/i,
      /旧版\s*GB(?:\/T)?\s*7000\.1/i,
    ],
  },
  {
    currentCode: "GB/T 19510.1-2023",
    title: "光源控制装置 第1部分：一般要求和安全要求",
    supersededPatterns: [
      /GB(?:\/T)?\s*19510\.1-2009/i,
      /旧版\s*GB(?:\/T)?\s*19510\.1/i,
    ],
  },
  {
    currentCode: "GB/T 31831-2025",
    title: "LED室内照明应用技术要求",
    supersededPatterns: [/GB\/T\s*31831-2015/i, /GBT\s*31831-2015/i],
  },
  {
    currentCode: "GB/T 31832-2025",
    title: "LED城市道路照明应用技术要求",
    supersededPatterns: [/GB\/T\s*31832-2015/i, /GBT\s*31832-2015/i],
  },
  {
    currentCode: "GB 37478-2025",
    title: "道路和隧道照明用LED灯具能效限定值及能效等级",
    supersededPatterns: [/GB\s*37478-2019/i],
  },
];

export function resolveSourceRoot(configuredRoot = configuredSourceRoot) {
  return existsSync(configuredRoot) ? configuredRoot : join(repoRoot, "docs");
}

export function findSupersededNationalStandard(relativePath, content) {
  const haystack = `${relativePath}\n${content}`;
  return (
    currentNationalStandards.find((standard) =>
      standard.supersededPatterns.some((pattern) => pattern.test(haystack)),
    ) ?? null
  );
}

export function shouldSkipSupersededNationalStandard(relativePath, content) {
  return Boolean(findSupersededNationalStandard(relativePath, content));
}

function shouldSkipInternalKnowledgeFile(relativePath) {
  return relativePath === "superpowers" || relativePath.startsWith("superpowers/");
}

function walkMarkdownFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(fullPath));
      continue;
    }

    if (entry.isFile() && /\.md$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizePath(path) {
  return path.split(sep).join("/");
}

function getRule(relativePath) {
  return (
    collectionRules.find((rule) => relativePath.startsWith(rule.prefix)) ?? {
      collection: "unclassified",
      platformViews: ["knowledge"],
      agentRoutes: ["lighting-foundation"],
      privacyLevel: "internal",
      trust: "needs-review",
    }
  );
}

function extractTitle(content, fallback) {
  const h1 = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return h1 || fallback.replace(/\.md$/i, "");
}

function extractMetadata(content) {
  const metadata = {};
  const quoteLines = content
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith(">"));

  for (const line of quoteLines) {
    const clean = line.replace(/^>\s*/, "").replace(/\*\*/g, "").trim();
    const match = clean.match(/^([^：:]+)[：:]\s*(.+)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim();
    metadata[key] = value;
  }

  return metadata;
}

function extractHeadings(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.match(/^(#{2,4})\s+(.+)$/)?.[2]?.trim())
    .filter(Boolean)
    .slice(0, 40);
}

function cleanSearchText(content) {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+]\([^)]+\)/g, (match) => match.match(/\[([^\]]+)]/)?.[1] ?? " ")
    .replace(/[#>*_`|:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoChunks(content, options = {}) {
  const maxChars = options.maxChars ?? 1200;
  const minChars = options.minChars ?? 260;
  const lines = content.split(/\r?\n/);
  const chunks = [];
  let currentHeading = "";
  let buffer = [];

  function flush() {
    const text = buffer.join("\n").trim();
    buffer = [];
    if (!text) return;

    if (text.length <= maxChars * 1.25) {
      chunks.push({ heading: currentHeading, text });
      return;
    }

    const paragraphs = text.split(/\n{2,}/);
    let part = "";
    for (const paragraph of paragraphs) {
      const next = part ? `${part}\n\n${paragraph}` : paragraph;
      if (next.length > maxChars && part.length >= minChars) {
        chunks.push({ heading: currentHeading, text: part.trim() });
        part = paragraph;
      } else {
        part = next;
      }
    }
    if (part.trim()) chunks.push({ heading: currentHeading, text: part.trim() });
  }

  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading && buffer.join("\n").length >= minChars) {
      flush();
      currentHeading = heading[2].trim();
      buffer.push(line);
      continue;
    }
    if (heading) currentHeading = heading[2].trim();
    buffer.push(line);
  }

  flush();
  return chunks;
}

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function deriveKeywords(relativePath, title, metadata, headings) {
  const folderWords = normalizePath(relativePath)
    .split("/")
    .slice(0, -1)
    .flatMap((part) => part.split(/[_\-.、，\s]+/))
    .filter(Boolean);
  const metadataWords = Object.values(metadata)
    .join(" ")
    .split(/[、，,\s｜|]+/)
    .filter(Boolean);
  const raw = [...folderWords, title, ...metadataWords, ...headings.slice(0, 8)];
  return [...new Set(raw.map((word) => word.trim()).filter(Boolean))].slice(0, 32);
}

export function buildIndex(options = {}) {
  const effectiveSourceRoot = options.sourceRoot ?? sourceRoot;

  if (!existsSync(effectiveSourceRoot)) {
    throw new Error(`Source root does not exist: ${effectiveSourceRoot}`);
  }

  const files = walkMarkdownFiles(effectiveSourceRoot).sort((a, b) =>
    normalizePath(relative(effectiveSourceRoot, a)).localeCompare(
      normalizePath(relative(effectiveSourceRoot, b)),
      "zh-Hans-CN",
    ),
  );

  const documents = [];
  const chunks = [];
  const collectionCounts = {};
  const excludedSupersededStandards = [];

  for (const filePath of files) {
    const rel = normalizePath(relative(effectiveSourceRoot, filePath));
    if (shouldSkipInternalKnowledgeFile(rel)) continue;

    const stat = statSync(filePath);
    const content = readFileSync(filePath, "utf8");
    const supersededStandard = findSupersededNationalStandard(rel, content);
    if (supersededStandard) {
      excludedSupersededStandards.push({
        relativePath: rel,
        sourcePath: filePath,
        supersededBy: supersededStandard.currentCode,
        title: supersededStandard.title,
      });
      continue;
    }

    const title = extractTitle(content, rel.split("/").at(-1) ?? rel);
    const metadata = extractMetadata(content);
    const headings = extractHeadings(content);
    const rule = getRule(rel);
    const sourceHash = sha256(content);
    const needsAudit = Boolean(rule.needsAudit);
    const standardStatus = needsAudit
      ? "requires-current-version-check"
      : rule.collection.includes("standards")
        ? "needs-review"
        : "not-a-standard-source";
    const keywords = deriveKeywords(rel, title, metadata, headings);
    const docId = `desktop-md-${sha256(rel).slice(0, 12)}`;
    const docChunks = splitIntoChunks(content);

    collectionCounts[rule.collection] = (collectionCounts[rule.collection] ?? 0) + 1;

    documents.push({
      id: docId,
      title,
      sourcePath: filePath,
      relativePath: rel,
      sourceType: "markdown",
      collection: rule.collection,
      platformViews: rule.platformViews,
      agentRoutes: rule.agentRoutes,
      privacyLevel: rule.privacyLevel,
      trust: rule.trust,
      futureAgent: rule.futureAgent,
      knowledgeLevel: metadata["知识等级"] ?? null,
      importance: metadata["重要性"] ?? null,
      relatedModules: metadata["关联模块"] ?? null,
      declaredType: metadata["类型"] ?? null,
      dataSource: metadata["数据来源"] ?? null,
      lineCount: content.split(/\r?\n/).length,
      byteLength: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      hash: sourceHash,
      headings,
      keywords,
      needsAudit,
      standardStatus,
      chunkCount: docChunks.length,
    });

    docChunks.forEach((chunk, index) => {
      const chunkId = `${docId}-chunk-${String(index + 1).padStart(3, "0")}`;
      chunks.push({
        id: chunkId,
        documentId: docId,
        chunkIndex: index,
        title,
        heading: chunk.heading || title,
        relativePath: rel,
        sourcePath: filePath,
        collection: rule.collection,
        platformViews: rule.platformViews,
        agentRoutes: rule.agentRoutes,
        privacyLevel: rule.privacyLevel,
        trust: rule.trust,
        needsAudit,
        standardStatus,
        text: chunk.text,
        searchText: cleanSearchText(`${title}\n${chunk.heading}\n${chunk.text}`),
      });
    });
  }

  return {
    version: "0.1.0",
    generatedAt: new Date().toISOString(),
    sourceRoot: effectiveSourceRoot,
    documentCount: documents.length,
    chunkCount: chunks.length,
    collectionCounts,
    excludedSupersededStandards,
    warning:
      "This index references local private source files. Standards-audit entries are not current compliance sources until verified.",
    documents,
    chunks,
  };
}

function writeIndex(index, targetRoot = outputRoot) {
  mkdirSync(targetRoot, { recursive: true });

  writeFileSync(
    join(targetRoot, "markdown-index.json"),
    `${JSON.stringify(
      {
        version: index.version,
        generatedAt: index.generatedAt,
        sourceRoot: index.sourceRoot,
        documentCount: index.documentCount,
        chunkCount: index.chunkCount,
        collectionCounts: index.collectionCounts,
        excludedSupersededStandards: index.excludedSupersededStandards,
        warning: index.warning,
        documents: index.documents,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  writeFileSync(
    join(targetRoot, "markdown-chunks.jsonl"),
    `${index.chunks.map((chunk) => JSON.stringify(chunk)).join("\n")}\n`,
    "utf8",
  );

  const excludedRows = index.excludedSupersededStandards.map(
    (item) => `| \`${item.relativePath}\` | \`${item.supersededBy}\` | ${item.title} |`,
  );

  writeFileSync(
    join(targetRoot, "markdown-summary.md"),
    [
      "# 桌面照明 Markdown 知识索引",
      "",
      `生成时间：${index.generatedAt}`,
      `来源路径：\`${index.sourceRoot}\``,
      "",
      `- 文档数：${index.documentCount}`,
      `- 检索切片数：${index.chunkCount}`,
      `- 已过滤旧版/重复国标：${index.excludedSupersededStandards.length}`,
      "",
      "## 集合统计",
      "",
      "| 集合 | 文档数 |",
      "| --- | ---: |",
      ...Object.entries(index.collectionCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([collection, count]) => `| ${collection} | ${count} |`),
      ...(excludedRows.length
        ? [
            "",
            "## 已过滤旧版/重复国标",
            "",
            "| 原文件 | 现行标准 | 名称 |",
            "| --- | --- | --- |",
            ...excludedRows,
          ]
        : []),
      "",
      "## 注意",
      "",
      "- 本索引只接入 Markdown，不复制 PDF、PPT、图片、CAD、Excel 或压缩包。",
      "- `standards-audit` 集合必须经过现行标准版本审计后才能作为合规依据。",
      "- `project-cases` 默认按私有内部案例处理。",
      "",
    ].join("\n"),
    "utf8",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = buildIndex();
  writeIndex(index);
  console.log(
    `Indexed ${index.documentCount} markdown files into ${index.chunkCount} chunks.`,
  );
  console.log(
    `Skipped ${index.excludedSupersededStandards.length} superseded national standard files.`,
  );
}
