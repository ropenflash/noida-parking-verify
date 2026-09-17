import { USER_FACING_AI_ERROR } from "@/lib/ai/errors";
import { canTransition, transition } from "@/lib/state/assistant-state";
import type {
  AssistantState,
  ConversationMessage,
  LlmProviderId,
} from "@/types/assistant";

export type AssistantUiModel = {
  state: AssistantState;
  messages: ConversationMessage[];
  error: string | null;
  provider: LlmProviderId | null;
  latencyMs: number | null;
};

export const initialAssistantUi: AssistantUiModel = {
  state: "IDLE",
  messages: [],
  error: null,
  provider: null,
  latencyMs: null,
};

export type AssistantUiEvent =
  | { type: "SUBMIT"; message: ConversationMessage }
  | {
      type: "SUCCESS";
      message: ConversationMessage;
      provider: LlmProviderId;
      latencyMs: number;
    }
  | {
      type: "FAILURE";
      message: ConversationMessage;
      latencyMs: number;
    }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_STATE"; state: AssistantState; error?: string | null };

export function reduceAssistantUi(
  model: AssistantUiModel,
  event: AssistantUiEvent,
): AssistantUiModel {
  switch (event.type) {
    case "SUBMIT": {
      if (!canTransition(model.state, "THINKING")) {
        return model;
      }
      return {
        ...model,
        state: transition(model.state, "THINKING"),
        messages: [...model.messages, event.message],
        error: null,
      };
    }
    case "SUCCESS":
      return {
        state: "IDLE",
        messages: [...model.messages, event.message],
        error: null,
        provider: event.provider,
        latencyMs: event.latencyMs,
      };
    case "FAILURE":
      return {
        state: "ERROR",
        messages: [...model.messages, event.message],
        error: event.message.content || USER_FACING_AI_ERROR,
        provider: model.provider,
        latencyMs: event.latencyMs,
      };
    case "CLEAR_ERROR":
      return {
        ...model,
        state: model.state === "ERROR" ? "IDLE" : model.state,
        error: null,
      };
    case "SET_STATE": {
      if (model.state === event.state) {
        return {
          ...model,
          error: event.error === undefined ? model.error : event.error,
        };
      }
      if (!canTransition(model.state, event.state)) {
        return model;
      }
      return {
        ...model,
        state: transition(model.state, event.state),
        error:
          event.error === undefined
            ? event.state === "ERROR"
              ? model.error
              : null
            : event.error,
      };
    }
  }
}
