import { describe, expect, it, vi } from "vitest";
import { getAssistantConfig } from "@/lib/config";
import { OpenAIProvider } from "@/lib/ai/openai";
import { ProviderError } from "@/lib/ai/errors";

describe("OpenAIProvider", () => {
  it("reports configured=false when no API key is present", async () => {
    const provider = new OpenAIProvider(
      getAssistantConfig({
        OPENAI_API_KEY: "",
        OPENAI_MODEL: "gpt-4o-mini",
      }),
    );
    const health = await provider.health();
    expect(health.configured).toBe(false);
    expect(health.available).toBe(false);
  });

  it("never exposes the API key in health results", async () => {
    const provider = new OpenAIProvider(
      getAssistantConfig({
        OPENAI_API_KEY: "sk-secret-value",
        OPENAI_MODEL: "gpt-4o-mini",
      }),
    );
    const health = await provider.health();
    expect(JSON.stringify(health)).not.toContain("sk-secret-value");
    expect(health.configured).toBe(true);
  });

  it("calls the OpenAI chat completions API through the injected client", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: "Hello! How can I help?" } }],
    }));
    const provider = new OpenAIProvider(
      getAssistantConfig({
        OPENAI_API_KEY: "sk-test",
        OPENAI_MODEL: "gpt-4o-mini",
      }),
      () => ({ chat: { completions: { create } } }),
    );

    const result = await provider.chat([{ role: "user", content: "Hello" }]);

    expect(create).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello" }],
    });
    expect(result.provider).toBe("openai");
    expect(result.message.content).toBe("Hello! How can I help?");
  });

  it("fails closed when OpenAI is not configured", async () => {
    const provider = new OpenAIProvider(
      getAssistantConfig({ OPENAI_API_KEY: "" }),
      () => {
        throw new Error("client should not be created");
      },
    );
    await expect(
      provider.chat([{ role: "user", content: "Hello" }]),
    ).rejects.toBeInstanceOf(ProviderError);
  });
});
