import { describe, expect, it } from "vitest";
import { USER_FACING_AI_ERROR } from "@/lib/ai/errors";
import {
  initialAssistantUi,
  reduceAssistantUi,
} from "@/lib/state/assistant-ui";

function msg(
  role: "user" | "assistant",
  content: string,
  extra: { error?: boolean } = {},
) {
  return {
    id: `${role}-${content}`,
    role,
    content,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

describe("assistant UI state", () => {
  it("moves IDLE → THINKING on submit", () => {
    const next = reduceAssistantUi(initialAssistantUi, {
      type: "SUBMIT",
      message: msg("user", "Hello"),
    });
    expect(next.state).toBe("THINKING");
    expect(next.messages).toHaveLength(1);
  });

  it("moves THINKING → IDLE on success", () => {
    const thinking = reduceAssistantUi(initialAssistantUi, {
      type: "SUBMIT",
      message: msg("user", "Hello"),
    });
    const idle = reduceAssistantUi(thinking, {
      type: "SUCCESS",
      message: msg("assistant", "Hello! How can I help?"),
      provider: "ollama",
      latencyMs: 2100,
    });
    expect(idle.state).toBe("IDLE");
    expect(idle.messages.at(-1)?.content).toBe("Hello! How can I help?");
  });

  it("moves THINKING → ERROR on failure", () => {
    const thinking = reduceAssistantUi(initialAssistantUi, {
      type: "SUBMIT",
      message: msg("user", "Hello"),
    });
    const error = reduceAssistantUi(thinking, {
      type: "FAILURE",
      message: msg("assistant", USER_FACING_AI_ERROR, { error: true }),
      latencyMs: 50,
    });
    expect(error.state).toBe("ERROR");
    expect(error.error).toBe(USER_FACING_AI_ERROR);
  });

  it("moves IDLE → LISTENING → IDLE for push-to-talk", () => {
    const listening = reduceAssistantUi(initialAssistantUi, {
      type: "SET_STATE",
      state: "LISTENING",
    });
    expect(listening.state).toBe("LISTENING");
    const idle = reduceAssistantUi(listening, {
      type: "SET_STATE",
      state: "IDLE",
    });
    expect(idle.state).toBe("IDLE");
  });

  it("moves LISTENING → ERROR when the microphone fails", () => {
    const listening = reduceAssistantUi(initialAssistantUi, {
      type: "SET_STATE",
      state: "LISTENING",
    });
    const error = reduceAssistantUi(listening, {
      type: "SET_STATE",
      state: "ERROR",
      error: "Microphone permission was denied. You can still type a message.",
    });
    expect(error.state).toBe("ERROR");
    expect(error.error).toContain("Microphone permission was denied");
  });
});
