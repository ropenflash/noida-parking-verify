"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PushToTalkActivation } from "@/lib/speech/push-to-talk";
import { VoiceError } from "@/lib/speech/types";

export function useVoice() {
  const activationRef = useRef(new PushToTalkActivation());
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const activation = activationRef.current;
    setSupported(activation.isSupported());
    return () => {
      activation.stop();
    };
  }, []);

  const start = useCallback(async () => {
    if (active) return { ok: true as const };
    if (pending) return { ok: false as const, error: "" };
    setError(null);
    setPending(true);
    try {
      await activationRef.current.start();
      setActive(true);
      return { ok: true as const };
    } catch (caught) {
      activationRef.current.stop();
      setActive(false);
      const message =
        caught instanceof VoiceError
          ? caught.message
          : new VoiceError("failed").message;
      setError(message);
      console.error("[ERROR] Microphone request failed", caught);
      return { ok: false as const, error: message };
    } finally {
      setPending(false);
    }
  }, [active, pending]);

  const stop = useCallback(() => {
    activationRef.current.stop();
    setActive(false);
  }, []);

  return { active, pending, supported, error, start, stop };
}
