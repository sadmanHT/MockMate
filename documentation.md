# MockMate Documentation

This document is the working source of truth for the MockMate project. The workspace is currently empty, so this file captures the product brief, architecture decisions, implementation roadmap, and operating assumptions described so far.

## 1. Project Summary

MockMate is an AI-powered interview practice platform focused on making realistic mock interviews accessible at no cost for core usage. The product supports text and voice interviews, resume and job-description tailoring, feedback reports, avatar-based interaction, and optional premium features that cover expensive infrastructure without blocking the core practice flow.

## 2. Product Philosophy

The core principle is that essential interview practice should remain free. Premium features are allowed only for costs that are genuinely expensive to operate, such as ultra-low-latency cloud TTS, advanced analytics, 3D avatars, and API access. The free tier should remain useful on its own and should not be paywalled out of the primary learning experience.

### Free Tier Goals

- Unlimited text-based interviews.
- Voice-based interviews using the user’s microphone.
- Resume and job-description parsing.
- Basic avatar interaction with client-side lip movement.
- Up to 5 saved interview recordings per month.

### Premium Tier Goals

- Ultra-low-latency cloud TTS.
- 3D animated avatar support.
- Unlimited recordings and advanced analytics.
- User-created or coach-created interview scenarios.
- Recruiter or bootcamp API access.

## 3. System Overview

MockMate is designed as a web application with a React-based client, a Python backend, and a set of AI services that can run either on free-tier cloud resources or on self-hosted hardware.

### High-Level Components

- Frontend: Next.js React SPA with WebRTC and audio handling.
- Backend: FastAPI REST and WebSocket services.
- AI layer: speech-to-text, question generation, feedback generation, text-to-speech, and speech analytics.
- Data layer: PostgreSQL, Redis, and object storage.
- Media layer: WebRTC signalling and optional real-time audio transport.

### Reference Architecture

```text
React SPA / Next.js
  -> FastAPI backend
     -> Auth, session orchestration, file handling, analytics, payments
     -> AI processing layer
        -> STT: faster-whisper / browser speech APIs / Transformers.js
        -> LLM: Groq / Ollama / Hugging Face / other fallback
        -> TTS: Piper / Coqui / browser speech / ElevenLabs premium
        -> Audio analytics: filler-word and pacing analysis
  -> PostgreSQL
  -> Redis
  -> Storage
  -> WebRTC / LiveKit
```

## 4. Tech Stack

### Frontend

- Next.js 14 App Router.
- React 18.
- Tailwind CSS.
- Zustand.
- Socket.IO client.
- LiveKit client SDK.
- MediaStream APIs.

### Backend

- FastAPI.
- SQLAlchemy.
- Alembic.
- Celery.
- Redis.
- Pydantic.

### Authentication

- Supabase Auth.
- Email/password.
- Google OAuth.
- GitHub OAuth.

### Database and Storage

- PostgreSQL on Supabase free tier.
- Supabase Storage or MinIO for file storage.
- Redis via Upstash or self-hosted.

### AI and Media

- STT: faster-whisper, browser SpeechRecognition, or Transformers.js Whisper tiny.
- LLM: Groq free tier first, then Ollama or Hugging Face fallbacks.
- TTS: Piper, Coqui TTS, browser speech synthesis, or ElevenLabs for premium.
- Avatar: Rive, Lottie, SVG/CSS face, or browser lip-sync driven by audio analysis.
- Real-time transport: LiveKit or custom aiortc + Redis signalling.

### Infrastructure and Delivery

- Frontend hosting: Vercel.
- Backend hosting: Fly.io, Railway, or Oracle Cloud Always Free.
- GPU or AI compute: Oracle Cloud ARM VM, self-hosted box, Hugging Face Spaces, or other free-tier compute.
- CI/CD: GitHub Actions.
- Payments: Stripe.

## 5. Cost Strategy

The free-tier strategy depends on pushing as much work as possible to the client and using free community compute or free-tier cloud resources for the rest.

### Cost-Saving Rules

- Keep avatar rendering client-side.
- Use client-side speech features when possible.
- Prefer open-source models and self-hosting for AI workloads.
- Cache repeated audio and common prompts.
- Use free-tier APIs only as primary fallbacks, not as the only path.
- Rate-limit free usage fairly so the system remains sustainable.

### Core Free-Tier Infrastructure Assumptions

- Supabase free tier for auth, Postgres, and some storage.
- Oracle Cloud Always Free VM or similar for self-hosted inference and media services.
- Vercel free tier for frontend delivery.
- GitHub Actions free CI for public repositories.

## 6. Core User Flow

The main user flow is an adaptive interview session built around a resume and a job description.

### Standard Flow

1. User signs in.
2. User uploads a resume or pastes text.
3. User pastes a job description.
4. The system extracts relevant profile data.
5. The LLM generates tailored interview questions.
6. The user answers by text or voice.
7. The system evaluates answers in real time or after the session.
8. A feedback report is generated with scores, insights, and suggested improvements.

## 7. Implementation Roadmap

### Phase 0: Environment and Scaffolding

- Create a monorepo with backend, frontend, and documentation areas.
- Set up Supabase and auth providers.
- Deploy a hello-world FastAPI app to confirm backend deployment.
- Bootstrap the Next.js app and connect authentication.

### Phase 1: Text Interview Engine

Goal: resume upload, job-description parsing, text chat interview, and structured feedback.

Backend work:

- PDF resume parsing.
- Structured extraction of skills, experience, projects, and education.
- Question generation for technical, behavioral, and resume-gap prompts.
- Interview orchestration over REST or WebSocket.
- Answer scoring and model-answer generation.
- Feedback report generation as HTML or PDF.

Frontend work:

- Resume upload UI.
- Job-description input.
- Interview chat interface.
- Results dashboard with feedback.

### Phase 2: Voice Input and Output

Goal: spoken interviews.

- Capture microphone audio in the browser.
- Add browser-native speech recognition where available.
- Add server-side faster-whisper as an accuracy fallback.
- Add Piper or another TTS service for spoken interviewer replies.
- Support full-response audio generation first, then streaming where practical.

### Phase 3: Avatar and Lip Sync

Goal: a visible interviewer face that reacts to speech.

- Start with a simple SVG or 2D avatar.
- Drive mouth movement from live audio amplitude.
- Optionally add phoneme-based lip sync with rhubarb-lip-sync or similar.
- Keep rendering client-side to avoid server cost.

### Phase 4: Live Feedback During Interviews

Goal: light-touch coaching while the user speaks.

- Track pace and pauses.
- Count filler words.
- Show subtle confidence or pacing indicators.
- Prefer client-side analysis when possible.

### Phase 5: Advanced Interview Modes

Goal: expand beyond general behavioral interviews.

- Coding interview mode with Monaco Editor.
- Test execution via Piston or Judge0.
- Whiteboard/system-design mode with Excalidraw.
- Vision-based design feedback where supported.
- Multi-round interview flows with configurable stages.

### Phase 6: Polish and Release

- Accessibility improvements.
- Internationalisation.
- Open-source release.
- Full README and demo assets.
- Community support setup.

## 8. AI Modules

### Language Model Strategy

Primary choice: Groq free tier for fast, low-cost question generation and answer analysis.

Fallbacks:

- Ollama with a quantised local model.
- Hugging Face inference options.
- Other free-tier hosted model APIs where available.

Implementation notes:

- Prefer structured JSON outputs.
- Keep prompts short and deterministic.
- Use a fallback chain rather than depending on a single provider.

### Speech-to-Text Strategy

Primary options:

- Browser SpeechRecognition for zero server cost.
- Transformers.js Whisper tiny for client-side high quality.
- faster-whisper for server-side fallback.

### Text-to-Speech Strategy

Primary options:

- Piper for self-hosted CPU-friendly TTS.
- Coqui TTS if compute allows.
- Browser speech synthesis as a prototype fallback.
- ElevenLabs for premium ultra-low-latency voice.

### Audio Analytics

- Filler-word counting.
- Pace estimation.
- Pause detection.
- Confidence or hesitation signals.

## 9. Avatar Strategy

The avatar should feel expressive without requiring expensive rendering.

### Low-Cost Options

- SVG face with blinking and mouth animation.
- CSS transforms for simple motion.
- Audio amplitude-driven lip flap.

### Higher-Fidelity Options

- Rive animation with talking and idle states.
- Lottie where suitable.
- Phoneme-based lip sync from browser-side or worker-side preprocessing.

## 10. Data Model Concepts

The exact schema is not implemented yet, but the system will likely need the following core entities.

- User.
- Auth provider identity.
- Resume upload.
- Job description.
- Interview session.
- Session turns or messages.
- Generated questions.
- Answer evaluations.
- Feedback report.
- Audio recordings.
- Subscription or usage entitlement.
- Scenario templates.

## 11. Non-Functional Requirements

- Low or zero monthly operating cost for core usage.
- Responsive and accessible UI.
- Good enough latency for a realistic interview flow.
- Graceful fallbacks when browser APIs or free-tier APIs are unavailable.
- Data privacy and user consent for uploads and recordings.
- Sustainable fair-use limits on free features.

## 12. Premium Boundary

Premium should fund operational costs without undermining the free product.

Allowed premium differentiators:

- Better voice quality.
- More storage and recordings.
- Advanced analytics.
- More polished avatar rendering.
- Additional scenario packs.
- Team and recruiter workflows.

Avoid turning premium into a gate for the core learning loop.

## 13. Open Questions

These decisions should be resolved before implementation starts:

- Whether the backend will be deployed first on Fly.io, Railway, or Oracle Cloud.
- Whether LiveKit is self-hosted or consumed via cloud free tier.
- Which STT path is the default for MVP.
- Which TTS path is the default for MVP.
- Whether user recordings are stored by default or only on explicit opt-in.
- How strict the free-tier usage caps should be.
- Whether to keep the project AGPLv3 or use a different license.

## 14. Immediate Next Steps

1. Turn this document into a repo-backed living spec as actual source files are added.
2. Create the monorepo structure for frontend, backend, and shared documentation.
3. Decide the MVP path for text interviews before voice, avatar, or whiteboard features.
4. Add an architecture diagram and concrete setup instructions once implementation begins.
