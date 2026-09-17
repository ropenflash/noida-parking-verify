import { buildSystemPrompt } from "@/lib/agent/prompts";
import type { LLMChatResult, LLMProvider } from "@/lib/ai/provider";
import type { ChatMessage } from "@/types/assistant";

/**
 * Milestone 1 orchestrator: conversation context → LLM → final response.
 * Tool decision/execution is intentionally not implemented yet.
 */
export class AgentOrchestrator {
  constructor(
    private readonly provider: LLMProvider,
    private readonly assistantName: string,
  ) {}

  async run(messages: ChatMessage[]): Promise<LLMChatResult> {
    const conversation = messages.filter(
      (message) => message.role === "user" || message.role === "assistant",
    );
    const payload: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt(this.assistantName) },
      ...conversation,
    ];
    return this.provider.chat(payload);
  }
}
