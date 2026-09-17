import type { AssistantState } from "@/types/assistant";

const TRANSITIONS: Record<AssistantState, readonly AssistantState[]> = {
  IDLE: ["LISTENING", "THINKING", "ERROR"],
  LISTENING: ["TRANSCRIBING", "IDLE", "ERROR"],
  TRANSCRIBING: ["THINKING", "IDLE", "ERROR"],
  THINKING: ["EXECUTING_TOOL", "SPEAKING", "IDLE", "ERROR"],
  EXECUTING_TOOL: ["THINKING", "ERROR"],
  SPEAKING: ["IDLE", "LISTENING", "ERROR"],
  ERROR: ["IDLE", "LISTENING", "THINKING"],
};

export function canTransition(
  from: AssistantState,
  to: AssistantState,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transition(
  from: AssistantState,
  to: AssistantState,
): AssistantState {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid assistant transition: ${from} → ${to}`);
  }
  return to;
}

export function statusLabel(state: AssistantState): string {
  switch (state) {
    case "IDLE":
      return "Ready";
    case "LISTENING":
      return "Listening";
    case "TRANSCRIBING":
      return "Transcribing";
    case "THINKING":
      return "Thinking";
    case "EXECUTING_TOOL":
      return "Working";
    case "SPEAKING":
      return "Speaking";
    case "ERROR":
      return "Something went wrong";
  }
}
