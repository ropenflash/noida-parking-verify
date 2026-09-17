"use client";

import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/types/assistant";

export function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
      data-role={message.role}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-cyan-400/15 text-cyan-50 ring-1 ring-cyan-300/20"
            : message.error
              ? "bg-red-500/10 text-red-100 ring-1 ring-red-400/30"
              : "bg-white/5 text-zinc-100 ring-1 ring-white/10",
        )}
      >
        <p className="mb-1 text-[11px] tracking-wide text-zinc-400 uppercase">
          {isUser ? "You" : "Assistant"}
        </p>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
