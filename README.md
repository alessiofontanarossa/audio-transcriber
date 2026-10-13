# Audio Transcriber

An elegant web application to transcribe Italian audio files to text using OpenAI's Whisper AI model locally.

## Features
- **Parallel Multi-file Upload**: Drag-and-drop or file picker to transcribe multiple audio files concurrently.
- **Real-Time Progress & Cost**: Individual percentage indicators and automated cost calculations per document.
- **Two Processing Pipelines**:
  - **Full Mode**: Fast, single-call transcription for shorter files (<25MB).
  - **Batched Mode**: Divides audio into 15-minute windows with 10-second overlap; caches completed chunks to disk to protect against interruptions and avoid redundant token consumption.

---

## Local Setup & Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- [FFmpeg](https://ffmpeg.org/) (required by `pydub` for audio chunking: `brew install ffmpeg`)

### 1. Configure Secret API Key
Ensure `backend/.env` contains your OpenAI API key:
```env
OPENAI_API_KEY=sk-...
```

### 2. Python Virtual Environment (`.venv`)
Create and activate the virtual environment, then install dependencies:
```bash
# Create virtual environment
python3 -m venv .venv

# Activate it (on macOS / Linux)
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 3. Run Everything with One Command
From the project root:
```bash
python main.py
```
This automatically starts both the FastAPI backend (`http://localhost:8000`) and Vite React frontend (`http://localhost:5173`).

---

## Output
- Transcribed text files are saved in `backend/output_texts/`.
- Uploaded audio chunks and files are temporarily cached in `backend/uploads/`.
