import requests
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.routers.auth import get_current_user
from app.models.models import User
from ai.llm_client import LLMClient

router = APIRouter(
    prefix="/api/ollama",
    tags=["Ollama"]
)

# Global memory storage for background model pulling status
pull_status = {
    "is_pulling": False,
    "current_model": None,
    "error": None,
    "success": False
}

class OllamaSettingsUpdate(BaseModel):
    base_url: str
    model: str
    system_prompt_override: Optional[str] = ""

class PullModelPayload(BaseModel):
    model: str

def bg_pull_model(model_name: str, base_url: str):
    global pull_status
    try:
        response = requests.post(
            f"{base_url}/api/pull", 
            json={"name": model_name, "stream": False}, 
            timeout=900
        )
        if response.status_code == 200:
            pull_status["success"] = True
            pull_status["error"] = None
            # Update the model automatically once successfully pulled
            LLMClient.model = model_name
        else:
            pull_status["error"] = f"Failed with status code {response.status_code}"
            pull_status["success"] = False
    except Exception as e:
        pull_status["error"] = str(e)
        pull_status["success"] = False
    finally:
        pull_status["is_pulling"] = False

@router.get("/status")
def get_status(current_user: User = Depends(get_current_user)):
    """
    Checks connection to local Ollama, fetches pulled tags/models,
    and returns current active client settings.
    """
    base_url = LLMClient.base_url
    model = LLMClient.model
    prompt_override = LLMClient.system_prompt_override

    connected = False
    available_models = []
    error_msg = None

    try:
        resp = requests.get(f"{base_url}/api/tags", timeout=3)
        if resp.status_code == 200:
            connected = True
            data = resp.json()
            models_list = data.get("models", [])
            # Extract just names, e.g. "llama3:latest" -> "llama3"
            available_models = [m.get("name") for m in models_list]
    except Exception as e:
        error_msg = str(e)

    return {
        "connected": connected,
        "base_url": base_url,
        "model": model,
        "system_prompt_override": prompt_override,
        "available_models": available_models,
        "connection_error": error_msg,
        "pull_status": pull_status
    }

@router.post("/settings")
def update_settings(payload: OllamaSettingsUpdate, current_user: User = Depends(get_current_user)):
    """
    Updates the active Ollama configuration for the study assistant.
    """
    LLMClient.base_url = payload.base_url.rstrip("/")
    LLMClient.model = payload.model
    LLMClient.system_prompt_override = payload.system_prompt_override
    
    return {
        "message": "Ollama settings updated successfully.",
        "base_url": LLMClient.base_url,
        "model": LLMClient.model,
        "system_prompt_override": LLMClient.system_prompt_override
    }

@router.post("/pull")
def pull_model(
    payload: PullModelPayload, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Triggers a background task to pull a model from Ollama library.
    """
    global pull_status
    if pull_status["is_pulling"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A model pull is already in progress."
        )

    pull_status["is_pulling"] = True
    pull_status["current_model"] = payload.model
    pull_status["error"] = None
    pull_status["success"] = False

    background_tasks.add_task(bg_pull_model, payload.model, LLMClient.base_url)

    return {"message": f"Started pulling model '{payload.model}' in background."}
