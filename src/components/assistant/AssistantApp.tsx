"use client";

import { AssistantOrb } from "@/components/assistant/AssistantOrb";
import { AssistantSettings } from "@/components/assistant/AssistantSettings";
import { AssistantStatus } from "@/components/assistant/AssistantStatus";
import { ChatComposer } from "@/components/assistant/ChatComposer";
import { Conversation } from "@/components/assistant/Conversation";
import { ProviderBadge } from "@/components/assistant/ProviderBadge";
import { VoiceButton } from "@/components/assistant/VoiceButton";
import { useAssistant } from "@/hooks/useAssistant";
import { useVoice } from "@/hooks/useVoice";

export function AssistantApp({ assistantName }: { assistantName: string }) {
  const assistant = useAssistant();
  const voice = useVoice();
  const listening = assistant.state === "LISTENING";
  const thinking = assistant.state === "THINKING";
  const busy = thinking || listening;

  function focusComposer() {
    document.getElementById("assistant-message")?.focus();
  }

  async function startTalk() {
    if (thinking || listening || voice.pending) return;
    const result = await voice.start();
    if (result.ok) {
      assistant.setAssistantState("LISTENING");
      return;
    }
    if (result.error) {
      assistant.setAssistantState("ERROR", result.error);
    }
  }

  function stopTalk() {
    voice.stop();
    if (assistant.state === "LISTENING") {
      assistant.setAssistantState("IDLE");
    }
  }

  return (
    <div className="assistant-shell relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.16),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(167,139,250,0.12),transparent_36%)]" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 py-6 md:grid md:grid-cols-[minmax(280px,1fr)_minmax(320px,420px)_minmax(240px,1fr)] md:items-stretch md:gap-8 md:px-8 md:py-8">
        <header className="flex items-start justify-between md:col-span-3">
          <div>
            <p className="text-xs tracking-[0.28em] text-cyan-200/70 uppercase">
              Personal AI
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              {assistantName}
            </h1>
          </div>
          <ProviderBadge health={assistant.health} />
        </header>

        <section
          className="order-2 flex min-h-72 flex-col rounded-3xl border border-white/10 bg-black/20 p-4 md:order-none md:min-h-0"
          aria-label="Conversation history"
        >
          <Conversation
            messages={assistant.messages}
            emptyHint={`“Hey ${assistantName}, what’s the weather?”`}
          />
          {thinking ? (
            <p className="px-2 pb-2 text-sm text-zinc-500" aria-live="polite">
              Thinking…
            </p>
          ) : null}
        </section>

        <section className="order-1 flex flex-col items-center justify-center gap-5 py-4 text-center md:order-none">
          <AssistantOrb
            state={assistant.state}
            onActivate={listening ? stopTalk : focusComposer}
          />
          <AssistantStatus state={assistant.state} />
          {listening ? (
            <p className="text-sm font-medium text-red-200" role="status">
              Microphone active
            </p>
          ) : (
            <p className="max-w-xs text-sm text-zinc-500">
              Type a message, or tap Talk to use your microphone.
            </p>
          )}
          {assistant.error && assistant.state === "ERROR" ? (
            <p className="max-w-sm text-sm text-red-200" role="alert">
              {assistant.error}
            </p>
          ) : null}
          {!voice.supported ? (
            <p className="max-w-sm text-sm text-zinc-500">
              This browser cannot access the microphone. You can still type a
              message.
            </p>
          ) : null}
          <VoiceButton
            listening={listening}
            disabled={thinking || voice.pending || !voice.supported}
            onStart={() => {
              void startTalk();
            }}
            onStop={stopTalk}
          />
        </section>

        <aside className="order-3 flex flex-col justify-between gap-4 md:order-none">
          <AssistantSettings
            developerMode={assistant.developerMode}
            onDeveloperModeChange={assistant.setDeveloperMode}
            state={assistant.state}
            provider={assistant.provider}
            health={assistant.health}
            latencyMs={assistant.latencyMs}
          />
          <ChatComposer
            value={assistant.draft}
            onChange={assistant.setDraft}
            onSubmit={() => {
              void assistant.sendMessage(assistant.draft);
            }}
            disabled={busy}
            assistantName={assistantName}
          />
        </aside>
      </div>
    </div>
  );
}
