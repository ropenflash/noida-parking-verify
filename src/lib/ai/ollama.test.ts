import { describe, expect, it, vi } from "vitest";
import { getAssistantConfig } from "@/lib/config";
import { OllamaProvider, isChatCapableOllamaModel, modelNameMatches } from "@/lib/ai/ollama";

const baseConfig = getAssistantConfig({
  LLM_PROVIDER: "ollama",
  OLLAMA_BASE_URL: "http://ollama.test",
  OLLAMA_MODEL: "",
  OPENAI_API_KEY: "",
  OPENAI_MODEL: "",
  NEXT_PUBLIC_ASSISTANT_NAME: "Assistant",
});

describe("Ollama model discovery", () => {
  it("does not treat embedding-only models as chat-capable", () => {
    expect(
      isChatCapableOllamaModel({
        name: "nomic-embed-text:latest",
        capabilities: ["embedding"],
        details: { family: "nomic-bert" },
      }),
    ).toBe(false);
  });

  it("matches configured model names with or without :latest", () => {
    expect(modelNameMatches("llama3.2:1b", "llama3.2:1b")).toBe(true);
    expect(modelNameMatches("llama3.2:latest", "llama3.2")).toBe(true);
  });

  it("uses the first chat-capable model when none is configured", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      expect(url).toBe("http://ollama.test/api/tags");
      return Response.json({
        models: [
          { name: "nomic-embed-text:latest", capabilities: ["embedding"] },
          { name: "llama3.2:1b", capabilities: ["completion"] },
        ],
      });
    });
    const provider = new OllamaProvider(baseConfig, fetchImpl);
    const health = await provider.health();
    expect(health.available).toBe(true);
    expect(health.model).toBe("llama3.2:1b");
  });

  it("is unavailable when the configured model does not exist", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        models: [{ name: "llama3.2:1b", capabilities: ["completion"] }],
      }),
    );
    const provider = new OllamaProvider(
      { ...baseConfig, ollamaModel: "missing-model" },
      fetchImpl,
    );
    const health = await provider.health();
    expect(health.available).toBe(false);
  });

  it("sends chat requests to Ollama and returns the assistant message", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/tags")) {
        return Response.json({
          models: [{ name: "llama3.2:1b", capabilities: ["completion"] }],
        });
      }
      expect(url).toBe("http://ollama.test/api/chat");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body)) as {
        model: string;
        stream: boolean;
      };
      expect(body.model).toBe("llama3.2:1b");
      expect(body.stream).toBe(false);
      return Response.json({
        message: { role: "assistant", content: "Hello! How can I help?" },
      });
    });
    const provider = new OllamaProvider(baseConfig, fetchImpl);
    const result = await provider.chat([{ role: "user", content: "Hello" }]);
    expect(result.provider).toBe("ollama");
    expect(result.message.content).toBe("Hello! How can I help?");
  });
});
