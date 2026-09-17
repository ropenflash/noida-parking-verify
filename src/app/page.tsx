import { AssistantApp } from "@/components/assistant/AssistantApp";

export default function HomePage() {
  const assistantName =
    process.env.NEXT_PUBLIC_ASSISTANT_NAME?.trim() || "Assistant";
  return <AssistantApp assistantName={assistantName} />;
}
