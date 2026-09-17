import { describe, expect, it, vi } from "vitest";
import { PushToTalkActivation } from "@/lib/speech/push-to-talk";
import { VoiceError } from "@/lib/speech/types";

function fakeStream(): MediaStream {
  const track = { stop: vi.fn() };
  return {
    getTracks: () => [track],
  } as unknown as MediaStream;
}

describe("PushToTalkActivation", () => {
  it("is unsupported without getUserMedia or a secure context", () => {
    const voice = new PushToTalkActivation();
    expect(
      voice.isSupported({ isSecureContext: false, getUserMedia: vi.fn() }),
    ).toBe(false);
    expect(voice.isSupported({ isSecureContext: true })).toBe(false);
  });

  it("requests the microphone only when start() is called", async () => {
    const stream = fakeStream();
    const getUserMedia = vi.fn(async () => stream);
    const voice = new PushToTalkActivation();

    const result = await voice.start({
      isSecureContext: true,
      getUserMedia,
    });

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(result).toBe(stream);
    voice.stop();
    expect(stream.getTracks()[0]?.stop).toHaveBeenCalledOnce();
  });

  it("maps permission denial to a VoiceError", async () => {
    const voice = new PushToTalkActivation();
    const denied = Object.assign(new Error("nope"), { name: "NotAllowedError" });
    await expect(
      voice.start({
        isSecureContext: true,
        getUserMedia: async () => {
          throw denied;
        },
      }),
    ).rejects.toMatchObject({ code: "denied" } satisfies Partial<VoiceError>);
  });

  it("maps a missing device to unavailable", async () => {
    const voice = new PushToTalkActivation();
    const missing = Object.assign(new Error("none"), { name: "NotFoundError" });
    await expect(
      voice.start({
        isSecureContext: true,
        getUserMedia: async () => {
          throw missing;
        },
      }),
    ).rejects.toMatchObject({ code: "unavailable" });
  });
});
