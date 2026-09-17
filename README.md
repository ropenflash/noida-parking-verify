# Assistant

A personal AI assistant web app. Talk with text today. Use **Talk** to turn on the browser microphone (push-to-talk). Speech-to-text is the next milestone.

Open [http://localhost:3000](http://localhost:3000).

---

## Architecture

```text
Browser  →  Next.js /api/chat  →  LLMProvider
                                      │
                         Ollama (preferred) or OpenAI fallback
```

The browser never calls OpenAI or Ollama directly. API keys stay on the server.

Microphone access uses `navigator.mediaDevices.getUserMedia({ audio: true })` only after an explicit **Talk** click. **Stop** releases the tracks. There is no always-listening wake word.

---

## Requirements

- Node.js 20+
- Optional local [Ollama](https://ollama.com) with a **chat** model
- Optional `OPENAI_API_KEY` for cloud fallback
- Chrome (or another Chromium browser) for the most reliable microphone permission flow
- HTTPS in production; `localhost` is fine for development

---

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

---

## Environment variables

```env
LLM_PROVIDER=auto
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=
OPENAI_API_KEY=
OPENAI_MODEL=
NEXT_PUBLIC_ASSISTANT_NAME=Assistant
```

`LLM_PROVIDER` may be `auto`, `ollama`, or `openai`.

- `auto`: use Ollama when a chat-capable model is available, otherwise OpenAI
- `ollama`: never fall back
- `openai`: OpenAI only

Never prefix secrets with `NEXT_PUBLIC_`.

On Vercel, Ollama on `localhost` is not available, so configure `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) in the project environment.

---

## Ollama

```bash
ollama pull llama3.2
ollama list
```

Embedding-only models such as `nomic-embed-text` are ignored. Leave `OLLAMA_MODEL` empty to pick the first chat-capable installed model.

---

## Voice (Milestone 2)

1. Click **Talk**.
2. The browser asks for microphone permission.
3. The UI shows **Listening** and **Microphone active**.
4. Click **Stop** to release the microphone.

Speech is not transcribed yet. You can still type messages.

---

## Debug mode

Settings → Developer mode shows provider, model, state, and request latency. Secrets are never shown.

---

## Tests

```bash
npm test
```

Covers provider selection, Ollama fallback, OpenAI (mocked), orchestration, chat validation, health (no secrets), state transitions including `IDLE → LISTENING → IDLE`, and push-to-talk error mapping.

---

## Troubleshooting

**I couldn't connect to the AI service.**  
Install a chat model in Ollama, or set `OPENAI_API_KEY`. On Vercel, Ollama is not used unless you point `OLLAMA_BASE_URL` at a reachable host.

**Microphone permission was denied.**  
Allow the mic in the browser site settings, or keep typing.

**This browser cannot access the microphone.**  
Use a current Chrome/Edge build over HTTPS or localhost.

---

## Roadmap

| Milestone | Status |
| --- | --- |
| 1 Text chat + Ollama/OpenAI | Done |
| 2 Browser microphone (push-to-talk) | Done |
| 3 Speech-to-text | Next |
| 4 Text-to-speech | Planned |
| 5 Full spoken conversation | Planned |
| 6 Voice UX / interruption | Planned |
| 7 Tools (calculator, time, weather, search) | Planned |
| 8 Conversation memory | Planned |
| 9 Home Assistant boundary | Planned |
