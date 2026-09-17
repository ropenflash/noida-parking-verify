"use client";

import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export function VoiceButton({
  listening,
  disabled,
  onStart,
  onStop,
}: {
  listening: boolean;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <button
      type="button"
      onClick={listening ? onStop : onStart}
      disabled={disabled && !listening}
      aria-pressed={listening}
      aria-label={listening ? "Stop listening" : "Talk"}
      className={cn(
        "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition",
        "focus-visible:ring-4 focus-visible:outline-none",
        listening
          ? "bg-red-400 text-zinc-950 hover:bg-red-300 focus-visible:ring-red-300/50"
          : "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/16 focus-visible:ring-cyan-300/50",
        "disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      {listening ? (
        <>
          <Square className="size-4 fill-current" aria-hidden="true" />
          Stop
        </>
      ) : (
        <>
          <Mic className="size-5" aria-hidden="true" />
          Talk
        </>
      )}
    </button>
  );
}
