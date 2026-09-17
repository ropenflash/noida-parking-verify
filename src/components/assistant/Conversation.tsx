"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "@/components/assistant/MessageBubble";
import type { ConversationMessage } from "@/types/assistant";

export function Conversation({
  messages,
  emptyHint,
}: {
  messages: ConversationMessage[];
  emptyHint: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center">
        <p className="max-w-sm text-sm text-zinc-500 italic">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col gap-3 overflow-y-auto px-1 py-2"
      aria-label="Conversation"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
