export function getZerlumSkillMarkdown(): string;

export function buildZerlumSkillContext(options?: {
  forGeneration?: boolean;
}): string;

export function withZerlumSkillContext(
  prompt: string,
  options?: {
    forGeneration?: boolean;
  },
): string;

export function withZerlumSkillGenerationPrompt(prompt: string): string;
