# Zerlum 景观设计知识目录

当前随产品部署并经过版本管理的一方专业知识，位于 `api/zerlum-landscape-skill/`：一个总入口和 11 份景观设计参考文件。本目录用于后续接入经授权、经复核的项目资料或机构知识，不预置虚构案例、规范全文、来源路径或资料数量。

## 资料边界

- 项目简报、场地资料和用户明确要求是项目事实来源。
- Landscape Skill 提供分析与表达方法，不是项目事实、规范合规或植物适生性的证明。
- 外部资料入库前必须记录来源、授权范围、项目类型、知识层级、隐私级别、复核状态和更新时间。
- 未复核内容只能作为线索，并在输出中标为待复核项。

## 本地索引命令

```powershell
pnpm ingest:landscape-md -- "D:\approved-landscape-sources"
pnpm search:landscape-md -- "雨洪 花园"
```

索引产物写入本目录但不提交到仓库。生产环境只打包 `api/zerlum-landscape-skill/` 中已审阅的 Markdown。
