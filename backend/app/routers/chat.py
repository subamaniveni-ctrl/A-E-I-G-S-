import json
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.models import Note, User, Topic
from app.schemas.schemas import ChatMessage, ChatResponse
from app.routers.auth import get_current_user, SECRET_KEY, ALGORITHM
from jose import jwt

from ai.llm_client import LLMClient
from ai.memory_store import MemoryStore

router = APIRouter(
    prefix="/api/chat",
    tags=["Chat"]
)

# Active WebSocket connections tracker
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

manager = ConnectionManager()
llm = LLMClient()

def detect_study_intent(message: str, user_id: int, db: Session) -> Optional[Note]:
    """
    Detects if the user wants to study a specific topic or prepare for an exam.
    Returns the matching Note object if found.
    """
    msg_lower = message.lower()
    keywords = ["prepare for", "study", "exam", "quiz on", "test on", "learn about", "notes for", "revisit"]
    
    # Check if any study keywords are in the message
    is_study_intent = any(kw in msg_lower for kw in keywords)
    
    # Fetch all notes for the user to try matching
    notes = db.query(Note).filter(Note.user_id == user_id).all()
    if not notes:
        return None
        
    # If the user directly named a note title, return that first
    for note in notes:
        title_words = [w.strip("?,.!-") for w in note.title.lower().split()]
        # Check if full title or key words of title are mentioned
        if note.title.lower() in msg_lower:
            return note
        # Check if major keyword matches
        for word in title_words:
            if len(word) > 3 and word in msg_lower:
                return note
                
    # If keyword intent was detected but no direct match, return the most recent note
    if is_study_intent:
        return notes[-1]
        
    return None

@router.post("", response_model=ChatResponse)
def post_chat(
    payload: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Standard synchronous chat endpoint.
    Handles message processing, intent detection, and returns the response with metadata actions.
    """
    session_id = payload.session_id or f"session_{current_user.id}"
    message = payload.message
    
    # Get user study profile memory
    memory_context = MemoryStore.get_user_context(current_user.id, db)
    system_prompt = (
        f"You are Aegis, the student's adaptive executive intelligence study companion.\n"
        f"Current student history & context: {memory_context}\n"
        "Encourage deep comprehension, highlight weak areas, and suggest active recall methods."
    )
    
    # Detect study intent
    matching_note = detect_study_intent(message, current_user.id, db)
    if matching_note:
        # Generate summary
        summary = llm.summarize(matching_note.extracted_text, matching_note.title)
        response_text = (
            f"I found your notes for **{matching_note.title}**! Here is an adaptive summary to get us started:\n\n"
            f"{summary}\n\n"
            f"Would you like to generate a study quiz to test your memory, or should we explain parts of this aloud?"
        )
        actions = [
            {"type": "quiz", "topic": matching_note.title, "note_id": str(matching_note.id)},
            {"type": "tts", "text": f"I found your notes for {matching_note.title}. Here is a summary. Would you like to generate a quiz?"}
        ]
        return ChatResponse(response=response_text, session_id=session_id, actions=actions)
        
    # General chat response
    messages = [{"role": "user", "content": message}]
    reply = llm.chat(messages, system_prompt=system_prompt, stream=False)
    
    # If the reply mentions key concepts, offer TTS
    actions = [{"type": "tts", "text": reply[:200]}]
    return ChatResponse(response=reply, session_id=session_id, actions=actions)


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for token-by-token streaming chat.
    Validates token, handles intent detection, and streams LLM output.
    """
    # Authenticate user via JWT query parameter
    current_user_id = None
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            current_user_id = payload.get("id")
        except Exception:
            pass
            
    # Default to user ID 1 if not authenticated (graceful fallback for local development)
    if not current_user_id:
        default_user = db.query(User).first()
        if default_user:
            current_user_id = default_user.id
        else:
            # Create a default user if none exists
            default_user = User(username="aegis_student", hashed_password="hashed_placeholder")
            db.add(default_user)
            db.commit()
            db.refresh(default_user)
            current_user_id = default_user.id
            
    await manager.connect(session_id, websocket)
    
    try:
        while True:
            # Receive user query
            data = await websocket.receive_text()
            try:
                msg_data = json.loads(data)
                user_msg = msg_data.get("message", "").strip()
            except json.JSONDecodeError:
                user_msg = data.strip()
                
            if not user_msg:
                continue
                
            # Get latest user memory context
            memory_context = MemoryStore.get_user_context(current_user_id, db)
            system_prompt = (
                f"You are Aegis, the student's adaptive executive intelligence study companion.\n"
                f"Current student history & context: {memory_context}\n"
                "Encourage deep comprehension, highlight weak areas, and suggest active recall methods."
            )
            
            # Run intent detection
            matching_note = detect_study_intent(user_msg, current_user_id, db)
            if matching_note:
                # 1. Notify client that Aegis is generating a summary
                await websocket.send_json({
                    "type": "status",
                    "content": f"Aegis is generating a summary of {matching_note.title}..."
                })
                
                # 2. Run summarizer sync (Ollama does not stream summarizer prompts here)
                # We offload sync LLM calls to prevent blocking the async event loop
                loop = asyncio.get_event_loop()
                summary = await loop.run_in_executor(
                    None, llm.summarize, matching_note.extracted_text, matching_note.title
                )
                
                response_text = (
                    f"I found your notes for **{matching_note.title}**! Here is an adaptive summary to get us started:\n\n"
                    f"{summary}\n\n"
                    f"Would you like to generate a study quiz to test your memory, or should we explain parts of this aloud?"
                )
                
                # Send summary payload
                await websocket.send_json({
                    "type": "message",
                    "content": response_text,
                    "actions": [
                        {"type": "quiz", "topic": matching_note.title, "note_id": str(matching_note.id)},
                        {"type": "tts", "text": f"I found your notes for {matching_note.title}."}
                    ]
                })
            else:
                # Regular streaming chat
                await websocket.send_json({"type": "start", "content": ""})
                
                messages = [{"role": "user", "content": user_msg}]
                
                # Run Ollama streaming in a helper thread or call the streaming generator
                loop = asyncio.get_event_loop()
                stream_generator = await loop.run_in_executor(
                    None, lambda: llm.chat(messages, system_prompt=system_prompt, stream=True)
                )
                
                full_reply = ""
                for chunk in stream_generator:
                    full_reply += chunk
                    await websocket.send_json({"type": "chunk", "content": chunk})
                    await asyncio.sleep(0.01) # Yield to event loop
                    
                # Complete the stream
                await websocket.send_json({
                    "type": "end",
                    "actions": [{"type": "tts", "text": full_reply[:200]}]
                })
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(session_id)
