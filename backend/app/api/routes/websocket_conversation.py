"""WebSocket Real-Time AI Conversation Route.

Provides streaming and low-latency bidirectional conversation turns:
- Voice & text turn processing
- Emergency red flag safety checks
- Instant TTS audio synthesis in selected persona voice (Dr. Aarav / Dr. Priya)
- Interruptible turn management
"""

import base64
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.agents.safety_agent import safety_agent
from app.schemas.models import IntakeState
from app.services.gnani_service import gnani_service
from app.services.intake import process_turn
from app.services.safety_rules import emergency_copy

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/conversation")
async def websocket_conversation(websocket: WebSocket):
    """Bidirectional WebSocket for real-time conversational intake and voice interaction."""
    await websocket.accept()
    logger.info("WebSocket client connected to /api/ws/conversation")

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON format."})
                continue

            action = data.get("action", "turn")

            if action == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            elif action == "transcribe":
                audio_b64 = data.get("audio_base64", "")
                language = data.get("language", "hinglish")
                if not audio_b64:
                    await websocket.send_json({"type": "error", "message": "No audio data received."})
                    continue
                try:
                    audio_bytes = base64.b64decode(audio_b64)
                    result = await gnani_service.transcribe_audio(
                        audio_bytes,
                        filename="ws_audio.wav",
                        content_type="audio/wav",
                        language=language,
                    )
                    await websocket.send_json({
                        "type": "transcript_ready",
                        "transcript": result.get("transcript", ""),
                        "detected_language": result.get("detected_language_code"),
                        "mode": result.get("mode", "demo"),
                        "notice": result.get("notice"),
                    })
                except Exception as exc:
                    logger.error("WebSocket transcription failed: %s", exc)
                    await websocket.send_json({
                        "type": "transcript_error",
                        "message": "Transcription failed. You can type or re-record.",
                    })

            elif action == "turn":
                message = data.get("message", "").strip()
                raw_state = data.get("state") or {}
                gender = data.get("gender", "female")

                try:
                    state = IntakeState(**raw_state)
                except Exception:
                    state = IntakeState()

                if not message:
                    await websocket.send_json({"type": "error", "message": "Message text cannot be empty."})
                    continue

                # 1. Process turn & safety guardrails
                updated_state, assistant_message, citations = process_turn(state, message)
                notice = emergency_copy(updated_state.language) if updated_state.emergency else None

                # 2. Synthesize spoken response in assistant's voice
                audio_b64 = ""
                speech_mode = "demo"
                try:
                    audio_bytes, speech_mode = await gnani_service.synthesize_speech(
                        assistant_message,
                        language=updated_state.language,
                        gender=gender,
                    )
                    audio_b64 = base64.b64encode(audio_bytes).decode("ascii")
                except Exception as exc:
                    logger.warning("WebSocket TTS synthesis failed: %s", exc)

                # 3. Stream turn response back to client
                await websocket.send_json({
                    "type": "turn_response",
                    "assistant_message": assistant_message,
                    "state": updated_state.model_dump(),
                    "emergency": updated_state.emergency,
                    "emergency_flags": updated_state.emergency_flags,
                    "emergency_notice": notice,
                    "audio_base64": audio_b64,
                    "speech_mode": speech_mode,
                    "citations": [c.model_dump() for c in citations],
                })

            else:
                await websocket.send_json({"type": "error", "message": f"Unknown action: {action}"})

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected from /api/ws/conversation")
    except Exception as exc:
        logger.exception("Unexpected error in WebSocket conversation: %s", exc)

