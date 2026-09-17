import { describe, expect, it } from "vitest";
import { getHealthStatus } from "@/lib/ai/health";
import { getAssistantConfig } from "@/lib/config";

describe("getHealthStatus", () => {
  it("does not include secrets when OpenAI is configured", async () => {
    const health = await getHealthStatus(
      getAssistantConfig({
        LLM_PROVIDER: "openai",
        OPENAI_API_KEY: "sk-secret-should-not-leak",
        OPENAI_MODEL: "gpt-4o-mini",
        OLLAMA_BASE_URL: "http://127.0.0.1:9",
        OLLAMA_MODEL: "",
      }),
    );

    expect(health.openai.configured).toBe(true);
    expect(health.activeProvider).toBe("openai");
    expect(JSON.stringify(health)).not.toContain("sk-secret-should-not-leak");
  });
});
