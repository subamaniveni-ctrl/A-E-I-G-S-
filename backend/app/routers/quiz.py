from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.models import Note, QuizResult, User, Topic
from app.routers.auth import get_current_user
from ai.llm_client import LLMClient
from automation.session_tracker import SessionTracker

router = APIRouter(
    prefix="/api/quiz",
    tags=["Quizzes"]
)

llm = LLMClient()

# Request schemas for Quiz
class QuizGenerateRequest(BaseModel):
    topic: str
    note_ids: Optional[List[int]] = None
    num_questions: Optional[int] = 5

class AnswerSubmission(BaseModel):
    id: int
    type: str
    question: str
    user_answer: str
    correct_answer: str

class QuizSubmitRequest(BaseModel):
    topic_name: str
    answers: List[AnswerSubmission]

class QuizResultResponse(BaseModel):
    id: int
    topic_name: str
    score: int
    total_questions: int
    percentage: float
    timestamp: str

@router.post("/generate", response_model=List[Dict[str, Any]])
def generate_quiz(
    payload: QuizGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves note texts by IDs or topic name, queries the LLM
    to generate quiz questions, and returns a list of questions.
    """
    notes_text = ""
    
    if payload.note_ids:
        # Load specific notes
        notes = db.query(Note).filter(
            Note.id.in_(payload.note_ids),
            Note.user_id == current_user.id
        ).all()
        notes_text = "\n\n".join([n.extracted_text for n in notes])
    else:
        # Try matching notes by topic name
        notes = db.query(Note).filter(
            Note.user_id == current_user.id,
            Note.title.ilike(f"%{payload.topic}%")
        ).all()
        if notes:
            notes_text = "\n\n".join([n.extracted_text for n in notes])
        else:
            # Fall back to checking all notes
            all_notes = db.query(Note).filter(Note.user_id == current_user.id).all()
            if all_notes:
                notes_text = "\n\n".join([n.extracted_text for n in all_notes])
                
    if not notes_text:
        # If no notes exist in the DB, LLM client will fall back to general database knowledge
        notes_text = f"General concepts regarding {payload.topic} in computer science."

    # Call LLM client to generate quiz questions
    questions = llm.generate_quiz(notes_text, payload.topic, payload.num_questions or 5)
    return questions

@router.post("/submit", response_model=Dict[str, Any])
def submit_quiz(
    payload: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates answers submitted by the user, scores MCQ answers,
    logs the result into the database, and updates study statistics.
    """
    score = 0
    total = len(payload.answers)
    
    if total == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit an empty quiz."
        )
        
    evaluated_answers = []
    
    for ans in payload.answers:
        user_ans_clean = ans.user_answer.strip().lower()
        correct_ans_clean = ans.correct_answer.strip().lower()
        
        is_correct = False
        if ans.type == "mcq":
            # Direct string match for multiple choice
            is_correct = user_ans_clean == correct_ans_clean
        else:
            # Short answer: check if key terms match, or fallback to length check for test purposes
            # Simple keyword overlaps (more than 3 characters match or similarity)
            words_correct = set([w for w in correct_ans_clean.split() if len(w) > 3])
            words_user = set([w for w in user_ans_clean.split() if len(w) > 3])
            overlap = words_correct.intersection(words_user)
            # If at least 30% of key words match, count as correct for fallback/grading
            if len(words_correct) > 0 and (len(overlap) / len(words_correct)) >= 0.3:
                is_correct = True
            elif user_ans_clean and len(user_ans_clean) > 5 and user_ans_clean in correct_ans_clean:
                is_correct = True
            else:
                is_correct = user_ans_clean == correct_ans_clean
                
        if is_correct:
            score += 1
            
        evaluated_answers.append({
            "id": ans.id,
            "question": ans.question,
            "user_answer": ans.user_answer,
            "correct_answer": ans.correct_answer,
            "is_correct": is_correct
        })
        
    # Serialize details
    import json
    details_str = json.dumps(evaluated_answers)
    
    db_result = QuizResult(
        user_id=current_user.id,
        topic_name=payload.topic_name,
        score=score,
        total_questions=total,
        details=details_str
    )
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    
    # Auto-log a study session for taking the quiz
    SessionTracker.log_session(
        user_id=current_user.id,
        topic_name=payload.topic_name,
        duration_seconds=300, # Assume 5 mins spent on quiz
        db=db
    )
    
    return {
        "result_id": db_result.id,
        "score": score,
        "total_questions": total,
        "percentage": (score / total) * 100 if total > 0 else 0,
        "answers": evaluated_answers
    }

@router.get("/history", response_model=List[Dict[str, Any]])
def get_quiz_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves past quiz result records for the logged-in student."""
    results = db.query(QuizResult).filter(
        QuizResult.user_id == current_user.id
    ).order_by(QuizResult.timestamp.desc()).all()
    
    out = []
    for r in results:
        out.append({
            "id": r.id,
            "topic_name": r.topic_name,
            "score": r.score,
            "total_questions": r.total_questions,
            "percentage": (r.score / r.total_questions) * 100 if r.total_questions > 0 else 0,
            "timestamp": r.timestamp.isoformat()
        })
    return out
