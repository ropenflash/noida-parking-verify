"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  assistantName,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  assistantName: string;
}) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="assistant-message" className="sr-only">
        Message {assistantName}
      </label>
      <Textarea
        id="assistant-message"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={3}
        placeholder={`Message ${assistantName}…`}
        className="min-h-20 resize-none border-white/10 bg-white/5 text-zinc-100 placeholder:text-zinc-500"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">Enter to send · Shift+Enter for a new line</p>
        <button
          type="submit"
          disabled={disabled || value.trim().length === 0}
          className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 focus-visible:ring-4 focus-visible:ring-cyan-300/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </form>
  );
}
