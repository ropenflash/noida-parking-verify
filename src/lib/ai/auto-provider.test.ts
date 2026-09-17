import { describe, expect, it, vi } from "vitest";
import { AutoLLMProvider } from "@/lib/ai/auto-provider";
import { ProviderError } from "@/lib/ai/errors";
import type { LLMChatResult, LLMProvider, ProviderHealth } from "@/lib/ai/provider";
import type { ChatMessage } from "@/types/assistant";

function stubProvider(
  name: "ollama" | "openai",
  health: ProviderHealth,
  chatImpl?: LLMProvider["chat"],
): LLMProvider {
  return {
    name,
    health: vi.fn(async () => health),
    chat:
      chatImpl ??
      vi.fn(async (): Promise<LLMChatResult> => ({
        message: { role: "assistant", content: `hello from ${name}` },
        provider: name,
        model: name === "ollama" ? "local-model" : "gpt-4o-mini",
        latencyMs: 10,
      })),
  };
}

describe("AutoLLMProvider selection", () => {
  const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];

  it("uses Ollama when auto and Ollama is available", async () => {
    const ollama = stubProvider("ollama", { available: true, model: "local-model" });
    const openai = stubProvider("openai", { available: true, configured: true });
    const auto = new AutoLLMProvider(ollama, openai, "auto");

    const result = await auto.chat(messages);

    expect(result.provider).toBe("ollama");
    expect(ollama.chat).toHaveBeenCalledOnce();
    expect(openai.chat).not.toHaveBeenCalled();
  });

  it("falls back to OpenAI when auto and Ollama is unavailable", async () => {
    const ollama = stubProvider("ollama", { available: false });
    const openai = stubProvider("openai", { available: true, configured: true });
    const auto = new AutoLLMProvider(ollama, openai, "auto");

    const result = await auto.chat(messages);

    expect(result.provider).toBe("openai");
    expect(openai.chat).toHaveBeenCalledOnce();
  });

  it("does not fall back when mode is ollama", async () => {
    const ollama = stubProvider("ollama", { available: false });
    const openai = stubProvider("openai", { available: true, configured: true });
    const auto = new AutoLLMProvider(ollama, openai, "ollama");

    await expect(auto.chat(messages)).rejects.toBeInstanceOf(ProviderError);
    expect(openai.chat).not.toHaveBeenCalled();
  });

  it("uses OpenAI only when mode is openai", async () => {
    const ollama = stubProvider("ollama", { available: true, model: "local-model" });
    const openai = stubProvider("openai", { available: true, configured: true });
    const auto = new AutoLLMProvider(ollama, openai, "openai");

    const result = await auto.chat(messages);

    expect(result.provider).toBe("openai");
    expect(ollama.chat).not.toHaveBeenCalled();
    expect(openai.health).toHaveBeenCalledOnce();
  });
});
