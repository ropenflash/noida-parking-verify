import { AgentOrchestrator } from "@/lib/agent/orchestrator";
import { parseChatRequest } from "@/lib/agent/chat-request";
import { createLLMProvider } from "@/lib/ai/create-provider";
import { USER_FACING_AI_ERROR } from "@/lib/ai/errors";
import type { LLMProvider } from "@/lib/ai/provider";
import { getAssistantConfig } from "@/lib/config";
import type { ChatMessage, LlmProviderId } from "@/types/assistant";

export type ChatTurnResponse = {
  message: {
    role: "assistant";
    content: string;
  };
  provider: LlmProviderId;
};

export async function runChatTurn(
  body: unknown,
  provider: LLMProvider = createLLMProvider(),
  assistantName = getAssistantConfig().assistantName,
): Promise<ChatTurnResponse> {
  const messages: ChatMessage[] = parseChatRequest(body);
  if (messages.length === 0) {
    throw new ChatRequestError("Please send a valid message.");
  }
  const orchestrator = new AgentOrchestrator(provider, assistantName);
  const result = await orchestrator.run(messages);
  return {
    message: result.message,
    provider: result.provider,
  };
}

export class ChatRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatRequestError";
  }
}

export { USER_FACING_AI_ERROR };
