"use client";

import type { AssistantState, HealthResponse, LlmProviderId } from "@/types/assistant";

export function AssistantSettings({
  developerMode,
  onDeveloperModeChange,
  state,
  provider,
  health,
  latencyMs,
}: {
  developerMode: boolean;
  onDeveloperModeChange: (enabled: boolean) => void;
  state: AssistantState;
  provider: LlmProviderId | null;
  health: HealthResponse | null;
  latencyMs: number | null;
}) {
  const model = health?.ollama.model;
  const active = provider ?? health?.activeProvider ?? "none";

  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/5 p-4"
      aria-labelledby="assistant-settings-heading"
    >
      <h2 id="assistant-settings-heading" className="text-sm font-medium text-zinc-200">
        Settings
      </h2>
      <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 text-sm text-zinc-300">
        Developer mode
        <input
          type="checkbox"
          checked={developerMode}
          onChange={(event) => onDeveloperModeChange(event.target.checked)}
          className="size-4 accent-cyan-300 focus-visible:ring-2 focus-visible:ring-cyan-300"
        />
      </label>
      {developerMode ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 font-mono text-xs text-zinc-400">
          <dt>Provider</dt>
          <dd className="text-zinc-200">{active}</dd>
          <dt>Model</dt>
          <dd className="truncate text-zinc-200">{model || "—"}</dd>
          <dt>State</dt>
          <dd className="text-zinc-200">{state}</dd>
          <dt>Latency</dt>
          <dd className="text-zinc-200">
            {latencyMs == null ? "—" : `${(latencyMs / 1000).toFixed(2)}s`}
          </dd>
        </dl>
      ) : null}
    </section>
  );
}
