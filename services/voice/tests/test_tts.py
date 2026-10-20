import io

import soundfile as sf

from app.config import load_config
from app.tts import TextToSpeech


def test_synthesize_gera_wav_valido():
    tts = TextToSpeech(load_config())

    wav_bytes = tts.synthesize("Ola, isso e um teste.")

    audio, sample_rate = sf.read(io.BytesIO(wav_bytes))
    assert sample_rate > 0
    assert len(audio) > 0
