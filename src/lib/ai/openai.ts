import OpenAI from "openai";
import type { AssistantConfig } from "@/lib/config";
import { ProviderError } from "@/lib/ai/errors";
import type { LLMChatResult, LLMProvider, ProviderHealth } from "@/lib/ai/provider";
import type { ChatMessage } from "@/types/assistant";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export type OpenAIClientLike = {
  chat: {
    completions: {
      create: (options: {
        model: string;
        messages: ChatMessage[];
      }) => Promise<{
        choices: Array<{ message?: { content?: string | null } }>;
      }>;
    };
  };
};

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai" as const;

  constructor(
    private readonly config: AssistantConfig,
    private readonly createClient: () => OpenAIClientLike = () =>
      new OpenAI({ apiKey: config.openaiApiKey }),
  ) {}

  async health(): Promise<ProviderHealth> {
    const configured = Boolean(this.config.openaiApiKey);
    return {
      available: configured,
      configured,
      model: configured ? this.resolveModel() : undefined,
    };
  }

  async chat(messages: ChatMessage[]): Promise<LLMChatResult> {
    const started = Date.now();
    if (!this.config.openaiApiKey) {
      throw new ProviderError("OpenAI is not configured.", "openai");
    }

    const model = this.resolveModel();
    try {
      const client = this.createClient();
      const completion = await client.chat.completions.create({
        model,
        messages,
      });
      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new ProviderError("OpenAI returned an empty response.", "openai");
      }
      return {
        message: { role: "assistant", content },
        provider: "openai",
        model,
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      console.error("[ERROR] Provider request failed", {
        provider: "openai",
      });
      throw new ProviderError("OpenAI chat request failed.", "openai");
    }
  }

  private resolveModel(): string {
    return this.config.openaiModel || DEFAULT_OPENAI_MODEL;
  }
}
