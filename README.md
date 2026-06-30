# A.E.G.I.S — Adaptive Executive General Intelligence System

A.E.G.I.S is a local-first, privacy-respecting AI study companion for students. It acts as an intelligent tutor that learns from the student's personal notes, summarizes topics dynamically, generates interactive quizzes, tracks study streaks, and talks aloud using local LLMs and offline speech processing.

## Tech Stack
- **Frontend**: React (Vite), TailwindCSS, Recharts, Lucide Icons
- **Backend**: FastAPI (Python), SQLite, SQLAlchemy
- **LLM Engine**: Ollama (llama3, phi3)
- **Speech (Offline)**: faster-whisper (STT) + Piper/Standard Wave (TTS)

---

## 🛠 Step-by-Step Local Setup

A.E.G.I.S runs entirely on your local machine, keeping your study notes private.

### 1. Set Up the AI Engine (Ollama)
1. Download and install [Ollama](https://ollama.com/).
2. Pull the default language model:
   ```bash
   ollama run llama3
   ```
   *(Keep the Ollama service running in the background).*

### 2. Set Up the Backend
Requires Python 3.10+.
```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed the database with a test user & sample notes
python app/seed.py

# Run the FastAPI server
python -m app.main
```
The backend will run on `http://localhost:8000`.

### 3. Set Up the Frontend
Requires Node.js 18+.
```bash
cd frontend
npm install
npm run dev
```
The dashboard will open at `http://localhost:3000`.

---

## 💡 Usage Guide
- **Login**: Use the seeded account (User: `student`, Pass: `password123`) or create a new one.
- **Upload Notes**: Go to the "My Notes" tab and upload PDF or TXT files.
- **Chat**: Say something like *"Aegis, let's prepare for DBMS"*. Aegis will detect the intent, read your notes, and summarize them!
- **Quizzes**: Follow Aegis's prompts or use the Quizzes tab to test your memory.
- **Voice**: Click the microphone icon to record your voice queries directly. Click "Read Aloud" on Aegis's responses to synthesize speech.

## Offline Speech Modules
The app attempts to load `faster-whisper` and `piper` for speech. If they are not installed (or if you encounter C++ redistributable/CUDA issues on Windows), the app will gracefully fall back to simple mock audio signals and transcripts, ensuring you can still test the UI!

Enjoy studying with Aegis!
