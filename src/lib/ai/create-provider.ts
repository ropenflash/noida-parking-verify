import { AutoLLMProvider } from "@/lib/ai/auto-provider";
import { OllamaProvider } from "@/lib/ai/ollama";
import { OpenAIProvider, type OpenAIClientLike } from "@/lib/ai/openai";
import type { FetchLike, LLMProvider } from "@/lib/ai/provider";
import { getAssistantConfig, type AssistantConfig } from "@/lib/config";

export type ProviderFactoryDeps = {
  fetch?: FetchLike;
  openaiClient?: () => OpenAIClientLike;
};

export function createLLMProvider(
  config: AssistantConfig = getAssistantConfig(),
  deps: ProviderFactoryDeps = {},
): LLMProvider {
  const ollama = new OllamaProvider(config, deps.fetch);
  const openai = deps.openaiClient
    ? new OpenAIProvider(config, deps.openaiClient)
    : new OpenAIProvider(config);
  return new AutoLLMProvider(ollama, openai, config.llmProvider);
}

export function createProviders(
  config: AssistantConfig = getAssistantConfig(),
  deps: ProviderFactoryDeps = {},
) {
  const ollama = new OllamaProvider(config, deps.fetch);
  const openai = deps.openaiClient
    ? new OpenAIProvider(config, deps.openaiClient)
    : new OpenAIProvider(config);
  return {
    ollama,
    openai,
    active: new AutoLLMProvider(ollama, openai, config.llmProvider),
  };
}
