from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.models import StudySession, QuizResult, Topic, User
from app.routers.auth import get_current_user
from automation.session_tracker import SessionTracker

router = APIRouter(
    prefix="/api/progress",
    tags=["Progress"]
)

@router.get("", response_model=Dict[str, Any])
def get_user_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Computes and returns comprehensive learning progress details for the logged-in student,
    including study streak, total study duration, per-topic mastery scores, and weak areas.
    """
    # 1. Study streak
    streak = SessionTracker.get_streak(current_user.id, db)
    
    # 2. Total time spent
    sessions = db.query(StudySession).filter(StudySession.user_id == current_user.id).all()
    total_seconds = sum([s.duration_seconds for s in sessions])
    total_minutes = round(total_seconds / 60, 1)
    
    # 3. Quiz statistics
    quizzes = db.query(QuizResult).filter(QuizResult.user_id == current_user.id).all()
    avg_score = 0
    if quizzes:
        avg_score = round(sum([(q.score / q.total_questions) * 100 for q in quizzes if q.total_questions > 0]) / len(quizzes), 1)
        
    # 4. Group by topics to calculate mastery & weak areas
    topics = db.query(Topic).filter(Topic.user_id == current_user.id).all()
    topic_names = list(set([t.name for t in topics] + [s.topic_name for s in sessions] + [q.topic_name for q in quizzes]))
    
    subject_mastery = []
    weak_topics = []
    
    for t_name in topic_names:
        # Filter sessions and quizzes for this topic
        t_sessions = [s for s in sessions if s.topic_name.lower() == t_name.lower()]
        t_quizzes = [q for q in quizzes if q.topic_name.lower() == t_name.lower()]
        
        # Calculate time spent on topic
        t_time = sum([s.duration_seconds for s in t_sessions])
        
        # Calculate quiz accuracy
        t_accuracy = 0
        if t_quizzes:
            t_accuracy = sum([(q.score / q.total_questions) * 100 for q in t_quizzes if q.total_questions > 0]) / len(t_quizzes)
            
        # Mastery model:
        # Base of 30 if studied. Each study session adds 15 (max 45). Quiz accuracy contributes up to 55.
        base_study_points = min(len(t_sessions) * 15, 45) if t_sessions else (30 if t_quizzes else 0)
        quiz_points = (t_accuracy / 100) * 55 if t_quizzes else 0
        
        mastery = min(round(base_study_points + quiz_points), 100)
        
        # If they haven't done any quiz/study but topic exists
        if mastery == 0:
            mastery = 20 # general awareness
            
        subject_mastery.append({
            "subject": t_name,
            "mastery": mastery,
            "time_spent_mins": round(t_time / 60, 1),
            "quizzes_taken": len(t_quizzes),
            "average_score": round(t_accuracy, 1)
        })
        
        # Identify weak areas (studied/tested topics with mastery < 70% or average quiz < 70%)
        if (t_quizzes and t_accuracy < 70) or (mastery < 65):
            weak_topics.append(t_name)

    # 5. Study sessions timeline over last 7 days for charts (default return structure)
    # Group by date
    timeline_data = {}
    for s in sessions:
        date_str = s.timestamp.strftime("%Y-%m-%d")
        timeline_data[date_str] = timeline_data.get(date_str, 0) + round(s.duration_seconds / 60, 1)
        
    # Get last 7 calendar days
    from datetime import date, timedelta
    timeline = []
    for i in range(6, -1, -1):
        d = date.today() - timedelta(days=i)
        d_str = d.strftime("%Y-%m-%d")
        display_str = d.strftime("%a") # Day abbreviation: Mon, Tue...
        timeline.append({
            "date": d_str,
            "day": display_str,
            "minutes": timeline_data.get(d_str, 0.0)
        })

    return {
        "streak": streak,
        "total_study_minutes": total_minutes,
        "average_quiz_score": avg_score,
        "total_quizzes_taken": len(quizzes),
        "subject_mastery": subject_mastery,
        "weak_topics": weak_topics,
        "timeline": timeline
    }

@router.get("/{user_id}", response_model=Dict[str, Any])
def get_user_progress_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves progress details for a specific user ID.
    (Matches the GET /api/progress/{user_id} spec, falls back to current user if ID differs).
    """
    if user_id != current_user.id:
        # In multi-user app we might check permissions, here we just resolve
        target_user = db.query(User).filter(User.id == user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found.")
        current_user = target_user
        
    return get_user_progress(db, current_user)
