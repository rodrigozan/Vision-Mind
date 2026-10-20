import io

import soundfile as sf
from faster_whisper import WhisperModel

from .config import VoiceConfig


class SpeechToText:
    def __init__(self, config: VoiceConfig):
        self._model = WhisperModel(
            config.whisper_model,
            device="cpu",
            compute_type=config.whisper_compute_type,
        )
        self._language = config.whisper_language

    def transcribe(self, wav_bytes: bytes) -> str:
        # Decodifica o WAV com soundfile em vez de deixar o faster-whisper usar
        # PyAV: a versao do PyAV instalavel neste ambiente (19.x, sem wheel para
        # versoes antigas nesta plataforma) removeu o kwarg que o faster-whisper
        # ainda passa para av.open(), o que quebra em qualquer audio.
        audio, _sample_rate = sf.read(io.BytesIO(wav_bytes), dtype="float32")
        segments, _info = self._model.transcribe(audio, language=self._language)
        return "".join(segment.text for segment in segments).strip()
