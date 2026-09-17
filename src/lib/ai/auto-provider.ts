import { ProviderError } from "@/lib/ai/errors";
import type { LLMChatResult, LLMProvider, ProviderHealth } from "@/lib/ai/provider";
import type { ChatMessage, LlmProviderMode } from "@/types/assistant";

export class AutoLLMProvider implements LLMProvider {
  readonly name = "auto" as const;

  constructor(
    private readonly ollama: LLMProvider,
    private readonly openai: LLMProvider,
    private readonly mode: LlmProviderMode,
  ) {}

  async chat(messages: ChatMessage[]): Promise<LLMChatResult> {
    const active = await this.selectActive();
    return active.chat(messages);
  }

  async health(): Promise<ProviderHealth> {
    const active = await this.selectActive(true).catch(() => null);
    if (!active) {
      return { available: false, configured: false };
    }
    return active.health();
  }

  async selectActive(quiet = false): Promise<LLMProvider> {
    if (this.mode === "openai") {
      const health = await this.openai.health();
      if (!health.configured) {
        throw new ProviderError("OpenAI is not configured.", "openai");
      }
      return this.openai;
    }

    if (this.mode === "ollama") {
      const health = await this.ollama.health();
      if (!health.available) {
        throw new ProviderError(
          "Ollama unavailable. LLM_PROVIDER=ollama does not fall back.",
          "ollama",
        );
      }
      return this.ollama;
    }

    const ollamaHealth = await this.ollama.health();
    if (ollamaHealth.available) {
      return this.ollama;
    }

    if (!quiet) {
      console.info("Ollama unavailable. Using OpenAI fallback.");
    }
    const openaiHealth = await this.openai.health();
    if (!openaiHealth.configured) {
      throw new ProviderError(
        "Ollama unavailable and OpenAI is not configured.",
        "auto",
      );
    }
    return this.openai;
  }
}
