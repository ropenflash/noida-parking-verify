"use client";

import { statusLabel } from "@/lib/state/assistant-state";
import type { AssistantState } from "@/types/assistant";

export function AssistantStatus({
  state,
  live = true,
}: {
  state: AssistantState;
  live?: boolean;
}) {
  return (
    <p
      className="text-sm font-medium tracking-[0.18em] text-zinc-300 uppercase"
      aria-live={live ? "polite" : "off"}
      role="status"
    >
      {statusLabel(state)}
    </p>
  );
}
