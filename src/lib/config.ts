import type { LlmProviderMode } from "@/types/assistant";

export type AssistantConfig = {
  llmProvider: LlmProviderMode;
  ollamaBaseUrl: string;
  ollamaModel: string;
  openaiApiKey: string;
  openaiModel: string;
  assistantName: string;
};

function parseProviderMode(value: string | undefined): LlmProviderMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "ollama" || normalized === "openai" || normalized === "auto") {
    return normalized;
  }
  if (value?.trim()) {
    console.warn(
      `[WARN] Invalid LLM_PROVIDER="${value}". Falling back to auto.`,
    );
  }
  return "auto";
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Server-only. Never import this from client components. */
export function getAssistantConfig(
  env: Record<string, string | undefined> = process.env,
): AssistantConfig {
  return {
    llmProvider: parseProviderMode(env.LLM_PROVIDER),
    ollamaBaseUrl: stripTrailingSlash(
      env.OLLAMA_BASE_URL?.trim() || "http://localhost:11434",
    ),
    ollamaModel: env.OLLAMA_MODEL?.trim() || "",
    openaiApiKey: env.OPENAI_API_KEY?.trim() || "",
    openaiModel: env.OPENAI_MODEL?.trim() || "",
    assistantName:
      env.NEXT_PUBLIC_ASSISTANT_NAME?.trim() || "Assistant",
  };
}
