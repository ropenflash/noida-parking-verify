"use client";

import { cn } from "@/lib/utils";
import type { HealthResponse } from "@/types/assistant";

export function ProviderBadge({ health }: { health: HealthResponse | null }) {
  const active = health?.activeProvider;
  const isLocal = active === "ollama";
  const isCloud = active === "openai";
  const label = isLocal ? "Local AI" : isCloud ? "Cloud AI" : "AI offline";

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300"
      aria-label={`Active provider: ${label}`}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          isLocal && "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]",
          isCloud && "bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]",
          !isLocal && !isCloud && "bg-zinc-500",
        )}
        aria-hidden="true"
      />
      {label}
    </div>
  );
}
