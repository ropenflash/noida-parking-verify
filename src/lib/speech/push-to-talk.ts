import {
  VoiceError,
  type VoiceActivationProvider,
  type VoiceEnvironment,
} from "@/lib/speech/types";

function readEnvironment(env?: VoiceEnvironment): VoiceEnvironment {
  if (env) return env;
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { isSecureContext: false };
  }
  return {
    isSecureContext: window.isSecureContext,
    getUserMedia: navigator.mediaDevices?.getUserMedia?.bind(
      navigator.mediaDevices,
    ),
  };
}

/**
 * Explicit push-to-talk. The microphone starts only after a user action
 * and is released on stop. Always-listening wake word is a later provider.
 */
export class PushToTalkActivation implements VoiceActivationProvider {
  readonly name = "push-to-talk";
  private stream: MediaStream | null = null;

  isSupported(env?: VoiceEnvironment): boolean {
    const resolved = readEnvironment(env);
    return Boolean(resolved.isSecureContext && resolved.getUserMedia);
  }

  async start(env?: VoiceEnvironment): Promise<MediaStream> {
    this.stop();
    const resolved = readEnvironment(env);
    if (!resolved.isSecureContext) {
      throw new VoiceError("insecure");
    }
    if (!resolved.getUserMedia) {
      throw new VoiceError("unsupported");
    }

    try {
      this.stream = await resolved.getUserMedia({ audio: true, video: false });
      return this.stream;
    } catch (error) {
      this.stop();
      const name =
        error instanceof DOMException || error instanceof Error
          ? error.name
          : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        throw new VoiceError("denied");
      }
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        throw new VoiceError("unavailable");
      }
      throw new VoiceError("failed");
    }
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => {
      track.stop();
    });
    this.stream = null;
  }
}
