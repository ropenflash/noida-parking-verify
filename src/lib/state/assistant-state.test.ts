import { describe, expect, it } from "vitest";
import {
  canTransition,
  statusLabel,
  transition,
} from "@/lib/state/assistant-state";

describe("assistant state machine", () => {
  it("allows IDLE → THINKING → IDLE for text chat", () => {
    const thinking = transition("IDLE", "THINKING");
    expect(thinking).toBe("THINKING");
    expect(transition(thinking, "IDLE")).toBe("IDLE");
  });

  it("allows THINKING → ERROR and recovery to IDLE", () => {
    expect(transition("THINKING", "ERROR")).toBe("ERROR");
    expect(transition("ERROR", "IDLE")).toBe("IDLE");
  });

  it("allows IDLE → LISTENING → IDLE for push-to-talk", () => {
    expect(transition("IDLE", "LISTENING")).toBe("LISTENING");
    expect(transition("LISTENING", "IDLE")).toBe("IDLE");
  });

  it("rejects illegal transitions", () => {
    expect(canTransition("IDLE", "SPEAKING")).toBe(false);
    expect(() => transition("IDLE", "SPEAKING")).toThrow(/Invalid assistant transition/);
  });

  it("exposes accessible status labels", () => {
    expect(statusLabel("IDLE")).toBe("Ready");
    expect(statusLabel("THINKING")).toBe("Thinking");
    expect(statusLabel("ERROR")).toBe("Something went wrong");
  });
});
