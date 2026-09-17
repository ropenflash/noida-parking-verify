import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/chat/route";
import { GET } from "@/app/api/health/route";

describe("chat API route", () => {
  it("rejects invalid bodies without leaking internals", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: [] }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(response.status).toBe(400);
    const payload = (await response.json()) as { error: string };
    expect(payload.error).toBe("Please send a valid message.");
  });
});

describe("health API route", () => {
  it("returns provider status without secrets", async () => {
    const response = await GET();
    expect(response.ok).toBe(true);
    const payload = (await response.json()) as {
      ollama: { available: boolean };
      openai: { configured: boolean };
      activeProvider: string;
    };
    expect(payload).toHaveProperty("ollama.available");
    expect(payload).toHaveProperty("openai.configured");
    expect(payload).toHaveProperty("activeProvider");
    expect(JSON.stringify(payload)).not.toMatch(/sk-|API_KEY/i);
  });
});
