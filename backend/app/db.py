import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database SQLite file path inside backend directory
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "aegis.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# Connect args needed for SQLite to run across threads (useful for WebSockets & Async)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency helper to get database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
