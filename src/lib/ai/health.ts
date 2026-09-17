import { createProviders } from "@/lib/ai/create-provider";
import { getAssistantConfig } from "@/lib/config";
import type { HealthResponse } from "@/types/assistant";

export async function getHealthStatus(
  config = getAssistantConfig(),
): Promise<HealthResponse> {
  const { ollama, openai, active } = createProviders(config);
  const [ollamaHealth, openaiHealth] = await Promise.all([
    ollama.health(),
    openai.health(),
  ]);

  let activeProvider: HealthResponse["activeProvider"] = "none";
  try {
    const selected = await active.selectActive(true);
    activeProvider = selected.name === "openai" ? "openai" : "ollama";
  } catch {
    activeProvider = "none";
  }

  return {
    ollama: {
      available: ollamaHealth.available,
      ...(ollamaHealth.model ? { model: ollamaHealth.model } : {}),
    },
    openai: {
      configured: Boolean(openaiHealth.configured),
    },
    activeProvider,
  };
}
