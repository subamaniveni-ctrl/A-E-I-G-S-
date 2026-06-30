from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.models import StudySession, QuizResult, Topic

class MemoryStore:
    @staticmethod
    def get_user_context(user_id: int, db: Session) -> str:
        """
        Gathers user study history, weak areas, and progress from the database
        to construct a personalized memory context for the LLM.
        """
        # Fetch last 5 study sessions
        sessions = db.query(StudySession).filter(
            StudySession.user_id == user_id
        ).order_by(StudySession.timestamp.desc()).limit(5).all()
        
        # Fetch quiz results to identify weak topics (score < 70%)
        quizzes = db.query(QuizResult).filter(
            QuizResult.user_id == user_id
        ).order_by(QuizResult.timestamp.desc()).limit(10).all()
        
        weak_topics = []
        strong_topics = []
        for q in quizzes:
            pct = (q.score / q.total_questions) * 100 if q.total_questions > 0 else 0
            if pct < 70:
                if q.topic_name not in weak_topics:
                    weak_topics.append(q.topic_name)
            else:
                if q.topic_name not in strong_topics:
                    strong_topics.append(q.topic_name)
                    
        # Filter weak topics that were since cleared in later quizzes
        weak_topics = [t for t in weak_topics if t not in strong_topics[:2]]
        
        # Create summary
        context_parts = []
        
        if sessions:
            recent_sessions = ", ".join(list(set([s.topic_name for s in sessions])))
            context_parts.append(f"Student recently studied: {recent_sessions}.")
            
        if weak_topics:
            weak_list = ", ".join(weak_topics[:3])
            context_parts.append(f"Student recently struggled with (scored <70%): {weak_list}. Offer guidance on these if relevant.")
            
        if strong_topics:
            strong_list = ", ".join(strong_topics[:3])
            context_parts.append(f"Student is strong in: {strong_list}.")
            
        if not context_parts:
            return "This is a new student. They have no study sessions or quizzes logged yet. Be welcoming and encourage them to upload notes or start a study session."
            
        return " ".join(context_parts)
