# Zerlum Outline 快速生成设计

## 问题与证据

线上 Outline 请求出现 HTTP 413，说明请求体在进入函数前已经过大。当前文本交付会把每份资料的完整 `sourceDataUrl` 放入请求；对于文本文件，还会同时发送 Base64 文件、前端摘录和后端摘录。PDF、Office 等二进制文件的完整 Data URL 虽然占用请求体，却没有进入 Outline 的 Chat Completions 内容。

请求未超限时，Outline 仍使用非流式 Chat Completions：Vercel 会等待 qweapi 返回完整结果，再一次性写给浏览器。此前小型线上合成请求总耗时约 62 秒，期间界面只能显示“正在生成”。

## 目标

1. Outline 请求不再携带无效的完整文件 Data URL。
2. 文本资料只进入提示词一次。
3. 有视觉价值的上传图片仍可被 Outline 读取，但必须压缩、限量。
4. qweapi 的 Outline 输出按 token 流式转发，让大纲逐段出现。
5. 请求仍过大或网络中断时给出明确、可执行的中文提示。

## 请求资料压缩

### 文本与文件元数据

新增 `prepareOutlineMaterialsForRequest`，仅用于 `agentTask: "outline"`：

- 最多保留 12 份资料的名称、大小、类型、上传时间和 MIME 类型；
- 删除所有 `sourceDataUrl`；
- 每份 `sourceText` 最多保留 12,000 个字符；
- 后端继续通过 `buildOutlineMaterialContext` 把这些文本加入提示词；
- 前端 `buildOutlineAgentContext` 只保留资料清单，不再重复嵌入源文本。

页面生成任务继续使用原始资料对象，不受此压缩规则影响。

### 图片资料

Outline 图片由上传图片和方案画布图片合并得到：

- HTTP(S) 图片 URL 最多保留 8 个，URL 本身不会显著扩大请求体；
- Base64 图片最多保留 2 个；
- 每个 Base64 图片压缩到不超过 600,000 字节；
- 无法压缩的 Base64 图片直接跳过，不回退发送原图；
- 图片标签保留资料名称或画布成果名称。

这使单次请求在包含图片时仍明显低于当前会触发 413 的体积。

## 单一资料来源

`buildOutlineAgentContext` 继续组织项目简报、Agent 有效对话、画布成果标签、当前要求和已有大纲，但不再复制上传资料正文。上传文本只由结构化 `materials` 字段进入后端一次，上传图片只由 `images` 字段进入模型一次。

## 流式输出

主 Agent 与 Outline 都使用 OpenAI 兼容流式 Chat Completions；文档页面生成仍保持 Responses 非流式行为。后端直接转发 qweapi SSE，现有前端 SSE 解析器持续更新大纲文本框和会话消息。

总生成时间仍取决于模型，但用户应在完整大纲完成前看到首段内容，不再等待整份结果后一次性出现。

## 请求上限与错误处理

前端在 `fetch` 前计算 UTF-8 JSON 请求大小：

- 超过 3,000,000 字节时不发送，并提示“资料体积过大，请压缩或拆分资料后重试”；
- 服务端返回 413 时使用同一明确提示；
- 浏览器抛出 `Failed to fetch` 时提示“请求未能发送，请压缩或拆分资料；若资料较小，请检查网络”；
- 已有大纲保持不变，不因发送失败而清空。

## 兼容性

- Outline 专用 qweapi 环境变量不变；
- 左侧项目简报、Agent 对话、方案画布成果、已有大纲和文本交付上传资料的范围不变；
- 最终页面生成仍可使用原始资料和画布图片；
- 普通 Zerlum Agent、提示词、图片和视频接口不变。

## 测试与验收

- 红测试证明 Outline 当前会发送 `sourceDataUrl`、重复文本并使用非流式请求。
- 资料测试验证 Data URL 被移除、文本截断、图片压缩限量和请求大小预检。
- 路由测试验证 Outline 请求 `stream: true`，且 SSE 直接转发。
- 错误测试验证 413 和 `Failed to fetch` 转为中文可操作提示。
- 全量测试、TypeScript 构建和 Vercel 函数打包通过。
- 生产合成测试记录请求字节数、首段时间和总完成时间；必须返回 HTTP 200，首段早于完整结束，浏览器控制台无新增错误。
