import asyncio
import io

import numpy as np
import pytest
import soundfile as sf

from app.audio import convert_to_wav


def _wav_bytes(sample_rate: int, channels: int, seconds: float = 0.5) -> bytes:
    samples = np.zeros((int(sample_rate * seconds), channels), dtype="float32")
    buffer = io.BytesIO()
    sf.write(buffer, samples, sample_rate, format="WAV")
    return buffer.getvalue()


def test_convert_to_wav_normaliza_para_16khz_mono():
    source = _wav_bytes(sample_rate=44100, channels=2)

    result = asyncio.run(convert_to_wav(source))

    audio, sample_rate = sf.read(io.BytesIO(result))
    assert sample_rate == 16000
    assert audio.ndim == 1  # mono


def test_convert_to_wav_falha_com_dados_invalidos():
    with pytest.raises(RuntimeError):
        asyncio.run(convert_to_wav(b"isso nao e audio"))
