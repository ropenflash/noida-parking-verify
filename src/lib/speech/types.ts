export type VoiceErrorCode =
  | "denied"
  | "unavailable"
  | "unsupported"
  | "insecure"
  | "failed";

export class VoiceError extends Error {
  constructor(readonly code: VoiceErrorCode) {
    super(voiceErrorMessage(code));
    this.name = "VoiceError";
  }
}

export function voiceErrorMessage(code: VoiceErrorCode): string {
  switch (code) {
    case "denied":
      return "Microphone permission was denied. You can still type a message.";
    case "unavailable":
      return "No microphone was found. You can still type a message.";
    case "unsupported":
      return "This browser cannot access the microphone. You can still type a message.";
    case "insecure":
      return "Microphone access needs HTTPS or localhost.";
    case "failed":
      return "I couldn't start the microphone. You can still type a message.";
  }
}

export type GetUserMedia = (
  constraints: MediaStreamConstraints,
) => Promise<MediaStream>;

export type VoiceEnvironment = {
  isSecureContext: boolean;
  getUserMedia?: GetUserMedia;
};

export interface VoiceActivationProvider {
  readonly name: string;
  isSupported(env?: VoiceEnvironment): boolean;
  start(env?: VoiceEnvironment): Promise<MediaStream>;
  stop(): void;
}
