import os
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from speech.stt_whisper import SpeechToText
from speech.tts_piper import TextToSpeech
from app.routers.auth import get_current_user
from app.models.models import User

router = APIRouter(
    prefix="/api/speech",
    tags=["Speech"]
)

stt_client = SpeechToText()
tts_client = TextToSpeech()

class TTSRequest(BaseModel):
    text: str

@router.post("/stt", status_code=status.HTTP_200_OK)
async def post_stt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Receives an audio file (webm, wav, etc.) from the mic,
    transcribes it using Whisper/fallback, and returns the transcript.
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty audio file uploaded."
        )
        
    filename = file.filename or "audio.webm"
    try:
        transcript = stt_client.transcribe(file_bytes, filename)
        return {"transcript": transcript}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"STT transcription failed: {str(e)}"
        )

@router.post("/tts")
def post_tts(
    payload: TTSRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Synthesizes the input text into a WAV audio file using Piper/fallback,
    and returns a streamable audio file response.
    """
    if not payload.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text payload cannot be empty."
        )
        
    # Generate audio file path
    temp_dir = tempfile.gettempdir()
    output_filename = f"tts_{current_user.id}.wav"
    output_path = os.path.join(temp_dir, output_filename)
    
    # If the file already exists, remove it
    if os.path.exists(output_path):
        try:
            os.remove(output_path)
        except Exception:
            pass
            
    success = tts_client.synthesize(payload.text, output_path)
    if not success or not os.path.exists(output_path):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Speech synthesis failed."
        )
        
    return FileResponse(
        path=output_path,
        media_type="audio/wav",
        filename="speech.wav"
    )
