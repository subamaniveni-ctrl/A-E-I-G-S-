import os
import sys

# Add backend dir to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal, Base, engine
from app.models.models import User, Note, Topic
from app.routers.auth import get_password_hash

def seed_database():
    print("Initializing A.E.G.I.S Database...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Create Demo User
        demo_username = "student"
        user = db.query(User).filter(User.username == demo_username).first()
        if not user:
            user = User(
                username=demo_username,
                hashed_password=get_password_hash("password123")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created demo user '{demo_username}' with password 'password123'")
            
        # Create Sample Note for DBMS
        note_title = "Database Management Systems (DBMS)"
        note = db.query(Note).filter(Note.user_id == user.id, Note.title == note_title).first()
        if not note:
            sample_content = """
Database Management Systems (DBMS)
A Database Management System is a software system that allows users to define, create, maintain, and control access to the database.

Key Concepts:
1. Data Models: Relational, Hierarchical, Network, and Object-Oriented.
2. Normalization: The process of organizing data to reduce redundancy and improve data integrity. Normal Forms include 1NF, 2NF, 3NF, and BCNF.
3. ACID Properties: Atomicity, Consistency, Isolation, Durability. These guarantee that database transactions are processed reliably.
4. SQL (Structured Query Language): Used to communicate with a database. It is the standard language for relational database management systems.
            """
            
            note = Note(
                user_id=user.id,
                title=note_title,
                filename="DBMS_Notes.txt",
                extracted_text=sample_content.strip()
            )
            db.add(note)
            db.commit()
            db.refresh(note)
            print("Inserted sample DBMS Note.")
            
            # Create Topic
            topic = Topic(
                user_id=user.id,
                note_id=note.id,
                name=note_title,
                description="Sample DBMS study material."
            )
            db.add(topic)
            db.commit()
            print("Inserted DBMS Topic.")
            
        print("Database seeded successfully!")
            
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
