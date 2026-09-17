# Assistant notes

The product README is [README.md](./README.md). This file tracks architecture that is intentionally not built yet.

## Home Assistant

Not implemented. Future tools will be explicitly registered (lights, AC, TV). No arbitrary shell, filesystem, or env access.

## Speech providers

Milestone 2 is push-to-talk via `PushToTalkActivation`. Later:

- `WakeWordActivation` (“Hey Assistant”) without changing the agent core
- `SpeechToTextProvider` (browser, then Whisper/OpenAI)
- `TextToSpeechProvider` (browser, then cloud/local)

## Persistence

Conversation is in-memory for now. SQLite or similar comes with the memory milestone. PostgreSQL/pgvector are later.
