import io

import soundfile as sf
from kokoro_onnx import Kokoro

from .config import VoiceConfig


class TextToSpeech:
    def __init__(self, config: VoiceConfig):
        self._kokoro = Kokoro(config.kokoro_model_path, config.kokoro_voices_path)
        self._voice = config.kokoro_voice
        self._lang = config.kokoro_lang

    def synthesize(self, text: str, voice: str | None = None) -> bytes:
        samples, sample_rate = self._kokoro.create(
            text,
            voice=voice or self._voice,
            lang=self._lang,
        )
        buffer = io.BytesIO()
        sf.write(buffer, samples, sample_rate, format="WAV")
        return buffer.getvalue()
