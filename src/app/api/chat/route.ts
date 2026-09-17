import { ZodError } from "zod";
import {
  ChatRequestError,
  runChatTurn,
  USER_FACING_AI_ERROR,
} from "@/lib/agent/chat-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const result = await runChatTurn(body);
    return Response.json(result);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json(
        { error: "Please send a valid message." },
        { status: 400 },
      );
    }
    if (error instanceof ChatRequestError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("[ERROR] Provider request failed", error);
    return Response.json({ error: USER_FACING_AI_ERROR }, { status: 503 });
  }
}
