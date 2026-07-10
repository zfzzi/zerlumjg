export function getZerlumLandscapeSkillMarkdown(): string;

export function buildZerlumLandscapeContext(options?: {
  forGeneration?: boolean;
}): string;

export function withZerlumLandscapeContext(
  prompt: string,
  options?: {
    forGeneration?: boolean;
  },
): string;

export function withZerlumLandscapeGenerationPrompt(prompt: string): string;
