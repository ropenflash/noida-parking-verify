export const USER_FACING_AI_ERROR =
  "I couldn't connect to the AI service. Please check your configuration.";

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly provider: "ollama" | "openai" | "auto",
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
