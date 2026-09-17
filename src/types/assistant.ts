export type AssistantState =
  | "IDLE"
  | "LISTENING"
  | "TRANSCRIBING"
  | "THINKING"
  | "EXECUTING_TOOL"
  | "SPEAKING"
  | "ERROR";

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  error?: boolean;
};

export type LlmProviderId = "ollama" | "openai";

export type LlmProviderMode = "auto" | LlmProviderId;

export type HealthResponse = {
  ollama: {
    available: boolean;
    model?: string;
  };
  openai: {
    configured: boolean;
  };
  activeProvider: LlmProviderId | "none";
};
