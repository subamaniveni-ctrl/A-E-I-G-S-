# A.E.G.I.S API Contract

## Authentication
- `POST /api/auth/register`: `{username, password}` -> `{id, username, created_at}`
- `POST /api/auth/login-form`: form-data `{username, password}` -> `{access_token, token_type}`

## Chat & LLM
- `POST /api/chat`: `{message, session_id}` -> `{response, session_id, actions}`
- `WS /api/chat/ws/{session_id}?token={token}`: Realtime streaming LLM socket. 
  - Send: `{message: "hi"}`
  - Receive events: `{"type": "chunk", "content": "hello"}`

## Notes Management
- `POST /api/notes/upload`: multipart `file` -> Note schema (with extracted text).
- `GET /api/notes`: Lists all notes.
- `DELETE /api/notes/{id}`: Removes note.

## Quiz Engine
- `POST /api/quiz/generate`: `{topic, note_ids, num_questions}` -> JSON array of `{id, type, question, options, correct_answer}`
- `POST /api/quiz/submit`: `{topic_name, answers: [{id, type, question, user_answer, correct_answer}]}` -> `{result_id, score, percentage, answers}`

## Progress Tracker
- `GET /api/progress`: -> `{streak, total_study_minutes, subject_mastery: [...], weak_topics: [...], timeline: [...]}`

## Speech
- `POST /api/speech/stt`: multipart audio `file` -> `{"transcript": "..."}`
- `POST /api/speech/tts`: `{text}` -> Streams `audio/wav` file download.
