# 🎨 OmniStudio Canvas

An all-in-one AI-powered multimedia studio platform, non-linear video/audio timeline studio, PDF document markup suite, and AI speech-to-text platform built with **React**, **Fabric.js**, **Node.js/TypeScript**, **FFmpeg**, **Sharp**, **OpenAI Whisper AI**, and **Paystack**.

---

## 🚀 Features & Capabilities

### 📄 1. Document & Image Portal
* **Document & PDF Editing**: Add/edit text, ink freehand drawing, highlighters, whiteout cover erasers, and stamp overlays (`APPROVED`, `DRAFT`, `CONFIDENTIAL`).
* **Redaction & Security**: Redact sensitive document text regions and flatten PDF annotation layers into static graphics.
* **Image Fine-Tuning**: Fine-tune brightness, blur, contrast, and 1-click **AI Background Removal** via Sharp.
* **Multi-Page PDF Export**: Render and compile multi-page document edits into a downloadable PDF via `jsPDF`.

### 🎬 2. Non-Linear Video & Audio Studio
* **Multi-Track Timeline Editor**: Interactive horizontal clip dragging and edge duration trimming.
* **Audio Waveform Visualizer**: Web Audio API PCM audio peak decoding and synced playhead scrubbing.
* **Canvas Animation to MP4**: Record canvas animation sequences frame-by-frame and render them directly into `.mp4` video files via FFmpeg.
* **Audio + Video Stitching**: Combine video and audio tracks seamlessly.
* **Advanced Video FX**: Green Screen Chroma Keying, speed ramping ($0.5x, 2x$), and color grading.

### 🎙️ 3. AI Whisper Transcriptions & Voiceovers
* **AI Auto-Subtitles**: Transcribe video/audio using Whisper AI and burn styled subtitles directly onto MP4 videos.
* **Interactive Transcript Editor**: Click any word or segment timecode to jump the video playhead position.
* **Subtitle Exports**: Export and download `.SRT` subtitle files.
* **AI Text-To-Speech (TTS)**: Convert text scripts into synthetic voiceover audio tracks via OpenAI TTS (`tts-1`).

### 💳 4. Paystack Payments & Real-Time Sync
* **Paystack SaaS Billing**: $9/month subscription supporting **Ghana Mobile Money (MTN MoMo, Vodafone Cash, AirtelTigo)** & Credit/Debit Cards.
* **Real-time Collaboration**: Socket.io server with live team member cursors, canvas element position sync, and playhead timeline scrubbing.
* **Save/Load Projects**: Export canvas edits as JSON project files or sync with Supabase Cloud.

---

## 🛠️ Quick Start (Local Development)

### Prerequisites
- Node.js v18+
- FFmpeg installed locally (`brew install ffmpeg` or `apt install ffmpeg`)

### 1. Backend Server
```bash
cd server
npm install
npx tsx watch index.ts