# Research: hosted speech-to-text for the web

## Decision

**No — do not build hosted speech-to-text (`SttKey`, `/stt/stream`, `hostedSttEngine`) now.**
Keep the zero-key dictation adapters already shipped across web, desktop and mobile.
No implementation stories are proposed for `thefactory-backend`,
`thefactory-overseer-web` or `thefactory-tools`: the conditional requirement to file
stories applies only to a **yes** outcome.

If hosted browser/desktop speech-to-text is revisited later under the triggers below,
**Deepgram Nova-3 streaming** (`wss://api.deepgram.com/v1/listen`) is the recommended
vendor: **$0.0048/min** monolingual or **$0.0058/min** multilingual on Pay-As-You-Go
(billed per second, $200 signup credit, Smart Formatting included), **200–500 ms**
end-to-end interim transcript latency (150–300 ms server inference), and native
decoding of containerized browser `MediaRecorder` audio without client-side PCM
resampling. Vendor usage cost and latency are both viable; the feature is declined on
reach versus four-repository credential, WebSocket proxy and settings complexity.

## Current dictation state across repositories

Inspected `thefactory-ui` and the registered `thefactory-overseer-web`,
`overseer-local`, `thefactory-overseer-mobile`, `thefactory-backend` and
`thefactory-tools` checkouts on 2026-11-21. Cross-project reads describe those
checkouts as inspected, not a pinned multi-repository release.

The retired §D.2 premise — *"Until then the mic stays hidden on web (no engine →
`isSupported` false)"* — no longer holds:

| Client | Adapter wired today | Mechanism | Credential / cost | Where in-app mic is unavailable or fails |
| --- | --- | --- | --- | --- |
| `thefactory-overseer-web` | `src/ui/speech/webSpeechEngine.ts` in `src/main.tsx` (`SpeechToTextEngineContext`) | Browser `SpeechRecognition ?? webkitSpeechRecognition` (`continuous: true`, `interimResults: true`, auto-restart on silence `onend`) | None / $0 | Firefox (`SpeechRecognition` disabled by default → `isSupported()` false, mic hidden); Chromium builds without Google's speech service such as Brave (`webkitSpeechRecognition` exists → recoverable `network` / `service-not-allowed` error on start) |
| `overseer-local` | `src/renderer/src/core/speech/macOsDictationTrigger.ts` in `src/renderer/src/App.tsx` (`NativeDictationTriggerContext`) | Triggers macOS native dictation (`Fn` double-tap synthesis via main process); OS types directly into focused `<textarea>` | None / $0 | Windows and Linux (`isSupported()` false, mic hidden); macOS when OS Dictation is disabled in System Settings (guided modal in `src/web/compound/chat/ChatInput.tsx`) |
| `thefactory-overseer-mobile` | `src/core/speech/expoSpeechEngine.ts` (`SpeechToTextEngineContext`) | `expo-speech-recognition` (`SFSpeechRecognizer` on iOS, `SpeechRecognizer` on Android) | None / $0 | Devices without speech recognition service or denied mic/speech permission |

In addition, OS-level system dictation — macOS Dictation (`Fn Fn`) and Windows Voice
Typing (`Win + H`) — inserts text directly into `ChatInput`'s `<textarea>` in every
desktop browser, including Firefox and Brave, with no app-specific credential.

Meanwhile, `thefactory-tools/src/video/videoTranscriptHelpers.ts` already runs local
`whisper.cpp` (`whisper-cli`) for offline batch video digests, and neither
`thefactory-tools` (`src/credentials/credentialTypes.ts`) nor `thefactory-backend`
(`src/routes/`) defines any `SttKey` credential or `/stt/*` route today.

## Vendor, cost and latency findings

Vendor pricing and streaming specifications verified from official vendor
documentation on 2026-11-21:

| Vendor & streaming model | Pay-As-You-Go price | Typical streaming latency | Browser audio input | Fit for `SpeechToTextEngine` |
| --- | --- | --- | --- | --- |
| **Deepgram Nova-3** (`wss://api.deepgram.com/v1/listen`, `model=nova-3`) | **$0.0048/min** monolingual ($0.288/hr; Growth $0.0042/min); **$0.0058/min** multilingual ($0.348/hr; Growth $0.0050/min). Per-second billing, no block rounding, Smart Formatting included, $200 free credit; Keyterm Prompting +$0.0013/min | **150–300 ms** transcription; **200–500 ms** total client-side interim latency with 20–100 ms chunks | Native containerized streams (`MediaRecorder` `audio/webm;codecs=opus` in Chromium/Firefox, `audio/mp4` in Safari) — omit `encoding`/`sample_rate` and Deepgram reads container headers automatically | **Best fit.** Emits `is_final: false` interim and `is_final: true` / `speech_final: true` final JSON frames matching `onPartial` / `onFinal`, supports 60+ languages and real-time multilingual switching, and offers EU residency (`api.eu.deepgram.com`) |
| **Deepgram Flux STT** (`model=flux-general-en`) | $0.0065/min English ($0.0078/min multilingual) | 150–300 ms transcription + 100–500 ms integrated `EndOfTurn` | Same as Nova-3 | Built for voice-agent turn-taking rather than text dictation; pricier than Nova-3 without helping `ChatInput` |
| **AssemblyAI Realtime** (`AssemblyAI-STT-3.7-Realtime`) | **$0.0050/min** ($0.30/hr, Keyterms included; `Realtime-Agent` $0.45/hr; single-utterance `Dictation API` $0.62/hr = $0.0103/min) | ~300 ms streaming turn transcripts | Raw PCM (`pcm_s16le` / `pcm_mulaw`) at declared sample rate | Requires browser `AudioContext` + `AudioWorkletNode` PCM16 resampling (~256 kbps upstream at 16 kHz mono vs ~24–32 kbps Opus) |
| **OpenAI Realtime Transcription** (`gpt-4o-mini-transcribe` / `gpt-4o-transcribe`) | ~**$0.003/min** (`mini`) / ~**$0.006/min** (`4o`), token-billed | ~400–800+ ms variable turn/delta latency | Base64-encoded 24 kHz PCM16 JSON frames (`input_audio_buffer.append`) | Requires PCM16 resampling + base64 framing; higher latency variance and occasional LLM hallucination on silence/noise |
| **Local `whisper.cpp`** (`whisper-cli` in `thefactory-tools`) | **$0** (local CPU/GPU) | Batch CLI today (1–3 s chunked if wrapped) | File-based 16 kHz WAV | Suitable for offline video digests, not interactive sub-500 ms browser dictation without a persistent local streaming server |

**Monthly dollar cost at solo/small-team volume is negligible:** 10 minutes of active
dictation every day (300 min/month) on Deepgram Nova-3 costs **$1.44/month**
monolingual or **$1.74/month** multilingual, and the $200 free tier covers ~575–690
hours. Adding a local/LAN `thefactory-backend` WebSocket hop adds ~5–30 ms (~20–60 ms
for a remote backend), keeping end-to-end partial updates well inside interactive
dictation bounds.

## Why it is not worth building now

1. **Zero-key coverage already handles the mainstream paths.** `webSpeechEngine` now
   ships in `thefactory-overseer-web` for Chrome, Edge and Safari; mobile uses native
   on-device/OS speech recognition; desktop uses macOS native dictation; and macOS and
   Windows system dictation already type directly into `ChatInput` in Firefox and
   Brave.
2. **Narrow incremental reach requires user-managed BYOK setup.** Unlike
   `WebSearchKey` — which powers background agent runs that have no browser API —
   `SttKey` only helps a person who (a) uses a browser/OS pair where neither
   `SpeechRecognition` nor OS dictation is usable (primarily Firefox or Brave on
   Linux), and (b) registers a Deepgram account, mints an API key, and stores it in
   Settings instead of typing or using a system-wide dictation tool.
3. **High four-repository surface and maintenance cost.** Mirroring `WebSearchKey`
   (`src/headless/contexts/WebSearchKeysContext.tsx`,
   `src/web/compound/settings/WebSearchSettings.tsx`,
   `thefactory-backend/src/routes/webSearchKeys.ts`,
   `thefactory-tools/src/credentials/credentialTypes.ts`) plus streaming audio
   requires:
   - `thefactory-tools`: encrypted `SttKey` credential slice, CRUD, redaction,
     secret-reveal audit and tests.
   - `thefactory-backend`: `/api/v1/credentials/stt-keys` CRUD + reveal + broadcast
     event (`sttKeys:updated`) and a `/api/v1/stt/stream` WebSocket route (authenticating
     the browser via `?token=` like `WEB_SOCKET_TOKEN_PARAM` in
     `src/utils/webSocketAuthConstants.ts`, relaying binary audio frames and JSON
     transcripts to `wss://api.deepgram.com/v1/listen` with backpressure, close and
     idle/max-duration guards).
   - `thefactory-ui`: OpenAPI SDK regeneration, `SttKeysContext`, web and native
     Settings UI, `fakeBackendRoutes` fixtures, and provider-level engine switching so
     `SpeechToTextEngineContext` updates once async credential state resolves.
   - `thefactory-overseer-web`: `getUserMedia` + `MediaRecorder` + WebSocket
     `hostedSttEngine`, plus composite fallback to `webSpeechEngine` whenever no
     `SttKey` is configured (otherwise shipping `hostedSttEngine` alone would hide the
     mic and regress Chrome/Safari users who have not added a Deepgram key).

## Boundaries and future trigger

Make no runtime, credential or schema changes now; keep `webSpeechEngine` in
`thefactory-overseer-web` as shipped.

Reopen as **yes** if at least one of these concrete needs arises:

1. **Shared desktop + web gap:** `overseer-local` ships for Windows/Linux users and
   needs the cloud-dictation fallback referenced in
   `src/web/compound/chat/ChatInput.tsx`, letting one Deepgram-backed
   `hostedSttEngine` serve non-macOS desktop and Firefox/Brave web together.
2. **Daily `webSpeechEngine` reliability or multilingual pain:** real Chrome/Safari use
   hits repeated silent session drops or poor mixed-language technical dictation (for
   example Polish + English code terms) that `nova-3` (`language=multi` + `keyterm`)
   solves.
3. **Audio privacy / data-residency requirement:** dictation audio must not be sent to
   browser-vendor speech services (Google/Apple) and must instead target a
   user-controlled Deepgram account (optionally pinned to `wss://api.eu.deepgram.com`).

If reopened, keep `webSpeechEngine` as the unconfigured fallback when no `SttKey` is
stored, and evaluate whether a short-lived Deepgram token grant route on
`thefactory-backend` can replace full `/stt/stream` binary WebSocket proxying when CSP
and network egress permit direct browser connections to `api.deepgram.com`.

## Verification scope

This research adds documentation only (`docs/web-hosted-stt-research.md`) and changes
no runtime, UI or generated code. Project checks (`build`, `typecheck`, `format` and
the `useSpeechToText` unit suite) verify the workspace remains clean; nothing on screen
changes (`visible: false`).
