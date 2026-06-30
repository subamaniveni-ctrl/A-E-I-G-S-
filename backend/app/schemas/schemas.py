from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None

# User schemas
class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Note schemas
class NoteCreate(BaseModel):
    title: str
    filename: str
    extracted_text: str

class NoteOut(BaseModel):
    id: int
    user_id: int
    title: str
    filename: str
    extracted_text: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Topic schemas
class TopicCreate(BaseModel):
    name: str
    description: Optional[str] = None
    note_id: Optional[int] = None

class TopicOut(BaseModel):
    id: int
    user_id: int
    note_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# StudySession schemas
class StudySessionCreate(BaseModel):
    topic_name: str
    duration_seconds: int

class StudySessionOut(BaseModel):
    id: int
    user_id: int
    topic_name: str
    duration_seconds: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

# QuizResult schemas
class QuizResultCreate(BaseModel):
    topic_name: str
    score: int
    total_questions: int
    details: Optional[str] = None  # JSON string containing questions, correct answers, and user selections

class QuizResultOut(BaseModel):
    id: int
    user_id: int
    topic_name: str
    score: int
    total_questions: int
    details: Optional[str] = None
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

# Chat schemas
class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    actions: Optional[List[Dict[str, str]]] = None # Actions like [{"type": "quiz", "topic": "DBMS"}, {"type": "tts", "text": "..."}]
