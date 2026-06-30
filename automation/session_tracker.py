from datetime import datetime, date
from sqlalchemy import desc
from sqlalchemy.orm import Session
from app.models.models import StudySession, QuizResult

class SessionTracker:
    @staticmethod
    def log_session(user_id: int, topic_name: str, duration_seconds: int, db: Session) -> StudySession:
        """Logs a new study session in the database."""
        session = StudySession(
            user_id=user_id,
            topic_name=topic_name,
            duration_seconds=duration_seconds,
            timestamp=datetime.utcnow()
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_streak(user_id: int, db: Session) -> int:
        """
        Calculates the user's current study streak in consecutive days.
        A study activity is defined as either a StudySession or a QuizResult.
        """
        # Get dates of all study sessions
        session_dates = db.query(StudySession.timestamp).filter(
            StudySession.user_id == user_id
        ).all()
        
        # Get dates of all quiz submissions
        quiz_dates = db.query(QuizResult.timestamp).filter(
            QuizResult.user_id == user_id
        ).all()
        
        # Combine and parse into unique dates (date objects)
        all_timestamps = [t[0] for t in session_dates] + [t[0] for t in quiz_dates]
        unique_dates = {ts.date() for ts in all_timestamps}
        
        if not unique_dates:
            return 0
            
        today = date.today()
        yesterday = today - date.resolution # 1 day ago
        
        # Streak starts if they studied today or yesterday
        current_check = None
        if today in unique_dates:
            current_check = today
        elif yesterday in unique_dates:
            current_check = yesterday
        else:
            return 0
            
        streak = 0
        while current_check in unique_dates:
            streak += 1
            current_check -= date.resolution
            
        return streak
