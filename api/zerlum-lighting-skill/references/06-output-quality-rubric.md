# 06 Output Quality Rubric

Use this rubric to check model output before responding.

## Must Pass

- The output respects user intent and reference images.
- The output identifies or implies the correct scene category.
- The output contains design reasoning, not only adjectives.
- The output includes lighting hierarchy: base, focus, atmosphere, or their image-prompt equivalent.
- The output names materials and surfaces when visible.
- The output avoids fixed templates and unrelated domain language.
- The output handles missing information as assumptions, not facts.

## For Image Prompts

The prompt should:
- Preserve original structure, camera angle, perspective, scale, and key material.
- Describe lighting actions clearly.
- Avoid long explanations, headings, citations, or internal rules.
- Include indoor or outdoor language only when the image supports it.
- Avoid adding unrealistic fixtures or changing the design intent unless the user asks.

## For Scheme Text

The方案 should:
- Start from project positioning and concept.
- Explain the visitor or user experience.
- Describe lighting layers and key nodes.
- Mention comfort, glare, maintenance, and operation mode when relevant.
- Keep technical values as guidance only unless actual standards and drawings are provided.

## For Critique

The critique should:
- Prioritize the biggest design issue first.
- Explain cause and effect.
- Give concrete changes.
- Separate aesthetic judgment from technical risk.

## Failure Signals

- Same words appear across unrelated projects.
- Output says high-end, futuristic, warm, dreamy without design actions.
- Output ignores whether the image is indoor or outdoor.
- Output adds blue-hour exterior atmosphere to an indoor scene.
- Output chooses a style before reading project type.
