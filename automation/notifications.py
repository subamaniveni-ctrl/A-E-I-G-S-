import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AegisNotifications")

def send_study_reminder(username: str, topic: str):
    """Mocks sending a study reminder notification/email to the student."""
    logger.info(f"NOTIFICATION SENT: Hey {username}! Don't forget to review your '{topic}' notes today on Aegis to maintain your streak!")
    return True

def send_streak_milestone(username: str, streak_days: int):
    """Mocks sending a celebration message for a study streak milestone."""
    logger.info(f"NOTIFICATION SENT: Awesome job {username}! You've reached a study streak of {streak_days} days! Keep it up!")
    return True
