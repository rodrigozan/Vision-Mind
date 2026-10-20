import os
from dataclasses import dataclass
from pathlib import Path

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


@dataclass(frozen=True)
class VoiceConfig:
    host: str
    port: int
    whisper_model: str
    whisper_compute_type: str
    whisper_language: str
    kokoro_model_path: str
    kokoro_voices_path: str
    kokoro_voice: str
    kokoro_lang: str


def load_config() -> VoiceConfig:
    return VoiceConfig(
        host=os.getenv("VOICE_HOST", "127.0.0.1"),
        port=int(os.getenv("VOICE_PORT", "8001")),
        whisper_model=os.getenv("WHISPER_MODEL", "small"),
        whisper_compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"),
        whisper_language=os.getenv("WHISPER_LANGUAGE", "pt"),
        kokoro_model_path=os.getenv("KOKORO_MODEL_PATH", str(MODELS_DIR / "kokoro-v1.0.int8.onnx")),
        kokoro_voices_path=os.getenv("KOKORO_VOICES_PATH", str(MODELS_DIR / "voices-v1.0.bin")),
        kokoro_voice=os.getenv("KOKORO_VOICE", "pf_dora"),
        kokoro_lang=os.getenv("KOKORO_LANG", "pt-br"),
    )
