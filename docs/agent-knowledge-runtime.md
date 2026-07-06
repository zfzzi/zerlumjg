# Zerlum Agent 知识库调用运行说明

更新时间：2026-06-29

## 1. 知识库根目录

平台运行时优先读取：

```txt
E:\zerlum
```

也可以通过环境变量覆盖：

```txt
ZERLUM_KNOWLEDGE_ROOT=E:\zerlum
ZERLUM_ROOT=E:\zerlum
```

如果 `E:\zerlum` 不存在，开发代理会回退读取当前项目目录下的 `agents/` 和 `knowledge/`。

## 2. E:\zerlum 目录结构

```txt
E:\zerlum
├── agents
│   ├── lighting-foundation
│   ├── indoor-lighting
│   ├── outdoor-landscape-lighting
│   ├── road-tunnel-lighting
│   ├── emergency-lighting
│   ├── fixture-compliance
│   ├── scheme-case-research
│   └── lighting-visualization
├── docs
├── scripts
└── knowledge
    ├── indexes
    │   └── desktop-lighting-library
    │       ├── markdown-index.json
    │       ├── markdown-chunks.jsonl
    │       └── markdown-summary.md
    └── sources
        └── desktop-lighting-library
            └── 01-09 分类 Markdown 原文
```

当前只接入 Markdown。PDF、PPT、JPG、DWG、Excel、压缩包和脚本没有进入运行时知识库。

## 3. zerlum agent 板块

前端入口：`src/App.tsx` 中 `handleAgentSubmit`。  
API：`POST /api/zerlum-agent`。  
请求会传：

```json
{
  "view": "agent",
  "message": "用户问题",
  "project": {
    "name": "项目名",
    "type": "项目类型",
    "client": "客户"
  },
  "materials": []
}
```

后端代理会：

1. 读取 `E:\zerlum\agents` 中的基础总纲和相关专项 Agent。
2. 根据用户问题推断路由，例如室内、景观、道路、消防、灯具、案例或效果图。
3. 搜索 `E:\zerlum\knowledge\indexes\desktop-lighting-library\markdown-chunks.jsonl`。
4. 把 Agent 规则、Zerlum 身份说明、知识库片段和项目上下文一起注入语言模型。
5. 要求模型声明自己是 Zerlum 平台中的照明 Agent，知识来自 Zerlum 知识库。

## 4. AI无限画布板块

### 4.1 左侧 Zerlum Visual 对话

前端入口：`src/App.tsx` 中 `submitVisualMessage`。  
API：`POST /api/zerlum-agent`。  
请求会传：

```json
{
  "view": "canvas",
  "message": "用户视觉问题和当前画布节点摘要"
}
```

后端代理会优先加载：

- `lighting-visualization`
- `scheme-case-research`
- `outdoor-landscape-lighting`
- `indoor-lighting`

并优先检索：

- `design-techniques`
- `design-methods`
- `project-cases`
- `visual` 相关知识片段

### 4.2 图片生成节点

前端入口：`src/App.tsx` 中 `generateVisualImage`。  
API：`POST /api/zerlum-image`。

后端会在用户提示词前注入：

- Zerlum Visual 身份
- `lighting-visualization/agent.md`
- 与效果图、文旅夜游、景观、商业、建筑相关的 Zerlum 知识库片段
- “效果图不能作为规范合规证明”的安全约束

## 5. 模型必须知道的身份

代理层会注入以下核心身份规则：

- 你是 Zerlum 平台中的专业照明 Agent，不是通用聊天机器人。
- 你的资料、案例、设计方法和规范提示来自 Zerlum 知识库。
- 回答时优先使用 Zerlum 知识库和已加载的 Agent 规则。
- 知识库没有依据时，要说明需要补充资料或人工复核。
- 涉及中国规范、消防、道路交通、灯具认证、能效或施工图审查时，不能只凭经验给最终合规结论。
- `standards-audit` 中的资料只能作为待审计线索，不能直接作为现行合规依据。

## 6. 现行限制

- 当前检索是本地关键词召回，不是向量检索。
- 当前只检索 Markdown 切片，不检索 PDF/PPT/图片/CAD/Excel。
- `standards-audit` 需要后续做标准版本审计。
- 项目案例默认视为 Zerlum 私有内部资料。

