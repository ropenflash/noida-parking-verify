import type { ChatMessage, LlmProviderId } from "@/types/assistant";

export type LLMChatResult = {
  message: {
    role: "assistant";
    content: string;
  };
  provider: LlmProviderId;
  model: string;
  latencyMs: number;
};

export type ProviderHealth = {
  available: boolean;
  configured?: boolean;
  model?: string;
  error?: string;
};

/**
 * The agent depends only on this interface.
 * Provider-specific clients stay behind OllamaProvider / OpenAIProvider.
 */
export interface LLMProvider {
  readonly name: LlmProviderId | "auto";
  chat(messages: ChatMessage[]): Promise<LLMChatResult>;
  health(): Promise<ProviderHealth>;
}

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;
