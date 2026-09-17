"use client";

import { cn } from "@/lib/utils";
import type { AssistantState } from "@/types/assistant";

const STATE_LABEL: Record<AssistantState, string> = {
  IDLE: "Assistant idle",
  LISTENING: "Assistant listening",
  TRANSCRIBING: "Assistant transcribing",
  THINKING: "Assistant thinking",
  EXECUTING_TOOL: "Assistant working",
  SPEAKING: "Assistant speaking",
  ERROR: "Assistant error",
};

export function AssistantOrb({
  state,
  onActivate,
}: {
  state: AssistantState;
  onActivate?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label={STATE_LABEL[state]}
      className={cn(
        "assistant-orb relative grid size-44 place-items-center rounded-full md:size-56",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60",
      )}
      data-state={state}
    >
      <span className="assistant-orb-glow" aria-hidden="true" />
      <span className="assistant-orb-core" aria-hidden="true" />
      <span className="assistant-orb-ring" aria-hidden="true" />
    </button>
  );
}
