import { getHealthStatus } from "@/lib/ai/health";
import { USER_FACING_AI_ERROR } from "@/lib/ai/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await getHealthStatus();
    return Response.json(health);
  } catch (error) {
    console.error("[ERROR] Provider request failed", error);
    return Response.json(
      {
        error: USER_FACING_AI_ERROR,
        ollama: { available: false },
        openai: { configured: false },
        activeProvider: "none",
      },
      { status: 503 },
    );
  }
}
