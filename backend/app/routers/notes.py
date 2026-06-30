import io
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.models import Note, Topic, User
from app.schemas.schemas import NoteOut
from app.routers.auth import get_current_user

# Try importing PDF libraries
try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

router = APIRouter(
    prefix="/api/notes",
    tags=["Notes"]
)

def extract_text(file_bytes: bytes, filename: str) -> str:
    """Extracts text from PDF or fallback text file."""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == ".pdf":
        text_content = ""
        # Method 1: pdfplumber (preferred)
        if pdfplumber is not None:
            try:
                with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                    for page in pdf.pages:
                        extracted = page.extract_text()
                        if extracted:
                            text_content += extracted + "\n"
                if text_content.strip():
                    return text_content.strip()
            except Exception as e:
                print(f"pdfplumber failed: {e}. Trying PyPDF2...")
        
        # Method 2: PyPDF2 fallback
        if PyPDF2 is not None:
            try:
                reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text_content += extracted + "\n"
                if text_content.strip():
                    return text_content.strip()
            except Exception as e:
                print(f"PyPDF2 failed: {e}")
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract text from the PDF. Make sure it contains digital text (not scanned images) or install pdfplumber/PyPDF2."
        )
    else:
        # Assume it's text/markdown
        try:
            return file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                return file_bytes.decode("latin-1")
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unsupported file format or encoding. Upload PDF, plain text, or Markdown."
                )

@router.post("/upload", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def upload_note(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Uploads a PDF or text file, extracts its text, and saves it in the database."""
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty."
        )
    
    filename = file.filename or "uploaded_note.pdf"
    extracted_text = extract_text(file_bytes, filename)
    
    if not title:
        # Default title is filename without extension
        title = os.path.splitext(filename)[0].replace("_", " ").title()
        
    db_note = Note(
        user_id=current_user.id,
        title=title,
        filename=filename,
        extracted_text=extracted_text
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    
    # Auto-detect or register a Topic for this note
    db_topic = db.query(Topic).filter(
        Topic.user_id == current_user.id,
        Topic.name == title
    ).first()
    
    if not db_topic:
        new_topic = Topic(
            user_id=current_user.id,
            note_id=db_note.id,
            name=title,
            description=f"Generated from note: {title}"
        )
        db.add(new_topic)
        db.commit()
        
    return db_note

@router.get("", response_model=List[NoteOut])
def get_notes(
    topic: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves all notes for the authenticated user, optionally filtered by topic title."""
    query = db.query(Note).filter(Note.user_id == current_user.id)
    if topic:
        query = query.filter(Note.title.ilike(f"%{topic}%"))
    return query.all()

@router.delete("/{note_id}", status_code=status.HTTP_200_OK)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes an uploaded note."""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found."
        )
    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully."}
