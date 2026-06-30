import os
import json
import requests
from typing import List, Dict, Any, Generator, Union

class LLMClient:
    def __init__(self):
        # Configurable via environment variables
        self.base_url = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
        self.model = os.getenv("OLLAMA_MODEL", "llama3")
        
        # Load prompt templates
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.prompts_dir = os.path.join(current_dir, "prompts")
        
        self.prompts = {}
        for prompt_name in ["summary", "quiz", "explain"]:
            path = os.path.join(self.prompts_dir, f"{prompt_name}.txt")
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    self.prompts[prompt_name] = f.read()
            else:
                self.prompts[prompt_name] = ""

    def _check_connection(self) -> bool:
        """Checks if Ollama service is reachable."""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=2)
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False

    def chat(self, messages: List[Dict[str, str]], system_prompt: str = None, stream: bool = False) -> Union[str, Generator[str, None, None]]:
        """
        Sends chat history to Ollama.
        If stream=True, returns a generator that yields text chunks.
        """
        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages.extend(messages)

        payload = {
            "model": self.model,
            "messages": payload_messages,
            "stream": stream
        }

        if not self._check_connection():
            # Graceful Fallback if Ollama is offline
            mock_resp = "Aegis: [Ollama is offline. Serving mock response] I'd be happy to help you study! Please make sure your local Ollama instance is running (`ollama run llama3`). What would you like to prepare today?"
            if stream:
                def mock_stream():
                    for word in mock_resp.split(" "):
                        yield word + " "
                return mock_stream()
            return mock_resp

        try:
            if stream:
                response = requests.post(f"{self.base_url}/api/chat", json=payload, stream=True, timeout=30)
                response.raise_for_status()
                
                def response_generator():
                    for line in response.iter_lines():
                        if line:
                            data = json.loads(line.decode("utf-8"))
                            chunk = data.get("message", {}).get("content", "")
                            yield chunk
                return response_generator()
            else:
                response = requests.post(f"{self.base_url}/api/chat", json=payload, timeout=30)
                response.raise_for_status()
                return response.json().get("message", {}).get("content", "")
        except Exception as e:
            error_msg = f"\n[Aegis error interacting with Ollama: {str(e)}]"
            if stream:
                def error_stream():
                    yield error_msg
                return error_stream()
            return error_msg

    def summarize(self, notes: str, topic: str) -> str:
        """Generates a summary of the provided notes for a topic."""
        prompt_tmpl = self.prompts.get("summary", "Summarize this: {notes}")
        prompt = prompt_tmpl.format(topic=topic, notes=notes)
        
        messages = [{"role": "user", "content": prompt}]
        system = "You are Aegis, a helpful and academic AI study companion."
        
        # We run chat synchronously for summary creation
        return self.chat(messages, system_prompt=system, stream=False)

    def explain(self, notes: str, topic: str, query: str) -> str:
        """Explains a specific question/focus about the notes suitable for TTS."""
        prompt_tmpl = self.prompts.get("explain", "Explain {topic}: {notes} focusing on {query}")
        prompt = prompt_tmpl.format(topic=topic, notes=notes, query=query)
        
        messages = [{"role": "user", "content": prompt}]
        system = "You are Aegis, explaining concepts clearly for text-to-speech."
        return self.chat(messages, system_prompt=system, stream=False)

    def generate_quiz(self, notes: str, topic: str, num_questions: int = 5) -> List[Dict[str, Any]]:
        """
        Generates a quiz from the notes.
        Cleans LLM response and parses it to JSON. Fallback to mock quiz if parsing fails or Ollama is offline.
        """
        prompt_tmpl = self.prompts.get("quiz")
        if not prompt_tmpl:
            prompt_tmpl = "Generate a {num_questions} question quiz in JSON format from these notes: {notes}"
            
        prompt = prompt_tmpl.format(topic=topic, notes=notes, num_questions=num_questions)
        
        # If Ollama is offline, return a seed quiz
        if not self._check_connection():
            return self._get_fallback_quiz(topic)

        try:
            messages = [{"role": "user", "content": prompt}]
            # We enforce JSON mode in Ollama if the model supports it, but standard parsing is safer
            payload = {
                "model": self.model,
                "messages": messages,
                "stream": False,
                "format": "json" # Ollama JSON mode
            }
            response = requests.post(f"{self.base_url}/api/chat", json=payload, timeout=45)
            response.raise_for_status()
            raw_content = response.json().get("message", {}).get("content", "").strip()
            
            # Clean possible markdown wrapping
            if raw_content.startswith("```"):
                lines = raw_content.splitlines()
                # Remove opening codeblock
                if lines[0].startswith("```"):
                    lines = lines[1:]
                # Remove closing codeblock
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                raw_content = "\n".join(lines).strip()
                
            return json.loads(raw_content)
        except Exception as e:
            print(f"Ollama quiz generation failed: {e}. Serving fallback quiz.")
            return self._get_fallback_quiz(topic)

    def _get_fallback_quiz(self, topic: str) -> List[Dict[str, Any]]:
        """Generates dynamic dummy questions for testing if Ollama is not working."""
        return [
            {
                "id": 1,
                "type": "mcq",
                "question": f"Which of the following is a primary characteristic of {topic}?",
                "options": [
                    "Data redundancy reduction",
                    "Infinite storage capability",
                    "Hardware independent scaling",
                    "Sequential instruction pipelines"
                ],
                "correct_answer": "Data redundancy reduction"
            },
            {
                "id": 2,
                "type": "mcq",
                "question": f"In the context of {topic}, what is the main goal of normalization?",
                "options": [
                    "Minimize insertion, update, and deletion anomalies",
                    "Maximize disk space usage",
                    "Increase table duplication",
                    "Decrypt public communication keys"
                ],
                "correct_answer": "Minimize insertion, update, and deletion anomalies"
            },
            {
                "id": 3,
                "type": "short",
                "question": f"Briefly explain the role of a primary key in {topic}.",
                "options": [],
                "correct_answer": "A primary key uniquely identifies each record in a database table, preventing duplicate data and facilitating relationships."
            },
            {
                "id": 4,
                "type": "mcq",
                "question": "Which normal form deals with multi-valued dependencies?",
                "options": [
                    "1st Normal Form (1NF)",
                    "2nd Normal Form (2NF)",
                    "3rd Normal Form (3NF)",
                    "4th Normal Form (4NF)"
                ],
                "correct_answer": "4th Normal Form (4NF)"
            },
            {
                "id": 5,
                "type": "short",
                "question": f"What is transactional atomicity in {topic} systems?",
                "options": [],
                "correct_answer": "Atomicity ensures that all operations within a work unit/transaction are completed successfully; otherwise, the transaction is completely aborted."
            }
        ]
