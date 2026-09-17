import { z } from "zod";
import type { ChatMessage } from "@/types/assistant";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().trim().min(1).max(8000),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(40),
});

export function parseChatRequest(body: unknown): ChatMessage[] {
  const parsed = chatRequestSchema.parse(body);
  return parsed.messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}
