"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { USER_FACING_AI_ERROR } from "@/lib/ai/errors";
import {
  initialAssistantUi,
  reduceAssistantUi,
  type AssistantUiEvent,
  type AssistantUiModel,
} from "@/lib/state/assistant-ui";
import { statusLabel } from "@/lib/state/assistant-state";
import type { ConversationMessage, HealthResponse, LlmProviderId } from "@/types/assistant";

function createId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export function useAssistant() {
  const [model, setModel] = useState<AssistantUiModel>(initialAssistantUi);
  const [draft, setDraft] = useState("");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [developerMode, setDeveloperMode] = useState(false);
  const modelRef = useRef(model);
  const inFlight = useRef(false);

  const commit = useCallback((event: AssistantUiEvent) => {
    const next = reduceAssistantUi(modelRef.current, event);
    modelRef.current = next;
    setModel(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadHealth() {
      try {
        const response = await fetch("/api/health");
        if (!response.ok) return;
        const payload = (await response.json()) as HealthResponse;
        if (!cancelled) setHealth(payload);
      } catch (error) {
        console.error("[ERROR] Provider request failed", error);
      }
    }
    void loadHealth();
    const timer = window.setInterval(() => {
      void loadHealth();
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const setAssistantState = useCallback(
    (state: AssistantUiModel["state"], error?: string | null) => {
      commit({ type: "SET_STATE", state, error });
    },
    [commit],
  );

  const sendMessage = useCallback(async (raw: string) => {
    const content = raw.trim();
    if (!content || inFlight.current) return;

    const userMessage: ConversationMessage = {
      id: createId(),
      role: "user",
      content,
      createdAt: nowIso(),
    };
    const nextModel = reduceAssistantUi(modelRef.current, {
      type: "SUBMIT",
      message: userMessage,
    });
    if (nextModel.state !== "THINKING") return;

    inFlight.current = true;
    modelRef.current = nextModel;
    setModel(nextModel);
    setDraft("");

    const started = performance.now();
    const history = nextModel.messages
      .filter((message) => !message.error)
      .map((message) => ({ role: message.role, content: message.content }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const latencyMs = Math.round(performance.now() - started);
      const payload = (await response.json()) as {
        message?: { role?: string; content?: string };
        provider?: LlmProviderId;
        error?: string;
      };

      if (!response.ok || !payload.message?.content) {
        commit({
          type: "FAILURE",
          latencyMs,
          message: {
            id: createId(),
            role: "assistant",
            content: payload.error || USER_FACING_AI_ERROR,
            createdAt: nowIso(),
            error: true,
          },
        });
        return;
      }

      commit({
        type: "SUCCESS",
        provider: payload.provider ?? "ollama",
        latencyMs,
        message: {
          id: createId(),
          role: "assistant",
          content: payload.message.content,
          createdAt: nowIso(),
        },
      });
    } catch (error) {
      console.error("[ERROR] Provider request failed", error);
      commit({
        type: "FAILURE",
        latencyMs: Math.round(performance.now() - started),
        message: {
          id: createId(),
          role: "assistant",
          content: USER_FACING_AI_ERROR,
          createdAt: nowIso(),
          error: true,
        },
      });
    } finally {
      inFlight.current = false;
    }
  }, [commit]);

  return useMemo(
    () => ({
      state: model.state,
      statusText: statusLabel(model.state),
      messages: model.messages,
      error: model.error,
      provider: model.provider,
      latencyMs: model.latencyMs,
      draft,
      setDraft,
      sendMessage,
      setAssistantState,
      health,
      developerMode,
      setDeveloperMode,
    }),
    [model, draft, sendMessage, setAssistantState, health, developerMode],
  );
}
