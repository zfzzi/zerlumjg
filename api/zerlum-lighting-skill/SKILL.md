---
name: zerlum-lighting-design
description: Zerlum lighting design guidance for architectural facade, interior, landscape, cultural tourism night tour, and project typology strategy. Use when backend models need to generate lighting design dialogue,方案 text, image prompts, or video prompts while preserving user intent and avoiding repetitive templates.
---

# Zerlum Lighting Design Skill

This skill controls lighting-design thinking for Zerlum backend model calls. It is not a fixed prompt library. It is a layered design guidance system that helps the model make project-specific lighting decisions.

## Core Rule

用户意图、参考图和项目资料优先。Skill 只能提供设计判断框架、约束、工具箱和质量标准，不能替代用户明确要求。

Do not force every project into a single style. Do not default every image to blue-hour exterior night rendering. First identify the scene and project type, then select the smallest relevant set of references.

## Four Layers

1. Context Trigger: backend or model first identifies project category, space type, design task, reference image content, and user intent.
2. Universal Design Thinking: always use `references/00-universal-design-thinking.md` to frame analysis, narrative, layers, comfort, and output discipline.
3. Domain Constraints and Inspiration: load the relevant domain reference:
   - Facade: `references/01-domain-facade-lighting.md`
   - Interior: `references/02-domain-interior-lighting.md`
   - Landscape: `references/03-domain-landscape-lighting.md`
   - Cultural tourism night tour: `references/04-domain-cultural-tourism-night-tour.md`
4. Typology Playbook: when a specific project type is recognized, load its playbook. The first small-version playbook is `references/05-typology-hotel-lobby.md`.

Always include:
- `references/06-output-quality-rubric.md`
- `references/07-variation-variables.md`

## Selection Discipline

Use only what is relevant to the user's current task. A hotel lobby should not inherit facade skyline rules unless the user asks for exterior architecture. A facade image should not inherit indoor downlight logic unless the reference clearly includes interior scenes.

## Output Discipline

If the user asks for a prompt, output a usable prompt, not a long design report. If the user asks for方案 or design explanation, output structured lighting reasoning. If the user asks for critique, prioritize issues, causes, and targeted changes.

Do not expose internal file names or Skill structure to the user.
