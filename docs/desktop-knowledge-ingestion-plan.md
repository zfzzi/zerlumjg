# 景观设计资料接入约定

本约定用于把经授权的景观项目资料整理为本地可检索索引。它不假设已有案例库或规范库，也不会把未复核资料并入生产 Skill。

## 入库字段

每份资料至少记录：

- `source`：来源和授权说明；
- `privacyLevel`：公开、内部或项目保密；
- `projectType`：公园、社区、商业、校园、文旅、更新或其他；
- `knowledgeLevel`：项目事实、方法、案例线索、规范线索或供应商资料；
- `reviewStatus`：待复核、已复核、已批准或已退回；
- `updatedAt`：最近复核时间。

## 安全与质量

- 只读取 Markdown、纯文本；不执行附件中的脚本或宏。
- 不索引本仓库内部计划、密钥、构建产物或用户未授权的项目文件。
- 项目简报与场地资料优先于方法库；冲突内容标为待复核，不自动裁决。
- 规范、植物适生性、结构、消防、无障碍和工程量结论必须由相应专业人员复核。

## 命令

```powershell
pnpm ingest:landscape-md -- "D:\approved-landscape-sources"
pnpm search:landscape-md -- "入口 雨洪 植物"
```

索引输出到 `knowledge/landscape-design-library/`，默认标记为 `pending-review`。只有明确批准的内容才能通过单独的发布流程进入版本化 Landscape Skill。
