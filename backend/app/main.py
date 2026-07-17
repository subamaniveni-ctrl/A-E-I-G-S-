import os
import sys

# Add the project root (one level above backend/) to sys.path
# so that the `ai` and `speech` sibling packages are importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.db import engine, Base
from app.routers import auth, notes, chat, quiz, progress, speech, ollama

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="A.E.G.I.S - AI Study Companion",
    description="Adaptive Executive General Intelligence System Backend API",
    version="1.0.0"
)

# CORS configuration to allow local frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(notes.router)
app.include_router(chat.router)
app.include_router(quiz.router)
app.include_router(progress.router)
app.include_router(speech.router)
app.include_router(ollama.router)

@app.get("/")
def read_root():
    return {"message": "A.E.G.I.S API is running."}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
