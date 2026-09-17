import type { AssistantConfig } from "@/lib/config";
import { ProviderError } from "@/lib/ai/errors";
import type {
  FetchLike,
  LLMChatResult,
  LLMProvider,
  ProviderHealth,
} from "@/lib/ai/provider";
import type { ChatMessage } from "@/types/assistant";

type OllamaMessage = {
  role: string;
  content: string;
};

type OllamaTag = {
  name: string;
  model?: string;
  capabilities?: string[];
  details?: {
    family?: string;
    families?: string[];
  };
};

type OllamaTagsResponse = {
  models?: OllamaTag[];
};

type OllamaChatResponse = {
  message?: OllamaMessage;
  error?: string;
};

const HEALTH_TIMEOUT_MS = 2000;
const CHAT_TIMEOUT_MS = 120_000;

function withTimeout(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

export function isChatCapableOllamaModel(tag: OllamaTag): boolean {
  const capabilities = tag.capabilities ?? [];
  const hasChat =
    capabilities.includes("completion") || capabilities.includes("chat");
  const embeddingOnly =
    capabilities.includes("embedding") && !hasChat;
  if (embeddingOnly) return false;
  if (hasChat) return true;

  const name = (tag.name || tag.model || "").toLowerCase();
  if (name.includes("embed")) return false;
  const families = [
    tag.details?.family,
    ...(tag.details?.families ?? []),
  ]
    .filter(Boolean)
    .map((family) => family!.toLowerCase());
  if (families.some((family) => family.includes("bert") || family.includes("embed"))) {
    return false;
  }
  return name.length > 0;
}

export function modelNameMatches(installed: string, requested: string): boolean {
  const normalize = (value: string) => value.replace(/:latest$/, "");
  return (
    installed === requested ||
    normalize(installed) === normalize(requested) ||
    installed.startsWith(`${requested}:`)
  );
}

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama" as const;

  constructor(
    private readonly config: AssistantConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async health(): Promise<ProviderHealth> {
    try {
      const model = await this.resolveChatModel();
      if (!model) {
        return {
          available: false,
          configured: Boolean(this.config.ollamaModel),
          error: this.config.ollamaModel
            ? "Configured Ollama model was not found or is not chat-capable."
            : "Ollama is running but no chat-capable model is installed.",
        };
      }
      return { available: true, configured: true, model };
    } catch (error) {
      console.error("[ERROR] Ollama health check failed", error);
      return { available: false, configured: Boolean(this.config.ollamaModel) };
    }
  }

  async chat(messages: ChatMessage[]): Promise<LLMChatResult> {
    const started = Date.now();
    const model = await this.resolveChatModel();
    if (!model) {
      throw new ProviderError(
        "Ollama is unavailable or has no chat-capable model.",
        "ollama",
      );
    }

    const response = await this.fetchImpl(`${this.config.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        stream: false,
      }),
      signal: withTimeout(CHAT_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error("[ERROR] Provider request failed", {
        provider: "ollama",
        status: response.status,
      });
      throw new ProviderError("Ollama chat request failed.", "ollama");
    }

    const payload = (await response.json()) as OllamaChatResponse;
    const content = payload.message?.content?.trim();
    if (!content) {
      throw new ProviderError("Ollama returned an empty response.", "ollama");
    }

    return {
      message: { role: "assistant", content },
      provider: "ollama",
      model,
      latencyMs: Date.now() - started,
    };
  }

  async resolveChatModel(): Promise<string | undefined> {
    const tags = await this.listModels();
    const chatModels = tags.filter(isChatCapableOllamaModel);
    const requested = this.config.ollamaModel;

    if (requested) {
      const match = tags.find((tag) =>
        modelNameMatches(tag.name, requested),
      );
      if (!match) return undefined;
      if (!isChatCapableOllamaModel(match)) return undefined;
      return match.name;
    }

    return chatModels[0]?.name;
  }

  private async listModels(): Promise<OllamaTag[]> {
    const response = await this.fetchImpl(`${this.config.ollamaBaseUrl}/api/tags`, {
      method: "GET",
      signal: withTimeout(HEALTH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new ProviderError("Ollama tags request failed.", "ollama");
    }
    const payload = (await response.json()) as OllamaTagsResponse;
    return payload.models ?? [];
  }
}
