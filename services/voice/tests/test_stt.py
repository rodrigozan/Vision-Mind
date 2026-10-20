import asyncio

from app.audio import convert_to_wav
from app.config import load_config
from app.stt import SpeechToText
from app.tts import TextToSpeech


def test_transcribe_round_trip_sem_pyav():
    """
    Regressao do bug encontrado na Fase 4: faster-whisper chama
    av.open(..., metadata_errors=...), kwarg que a unica versao do PyAV
    instalavel nesta plataforma (19.x, sem wheel para versoes antigas aqui)
    removeu, quebrando qualquer transcricao com "TypeError: open() got an
    unexpected keyword argument 'metadata_errors'".

    transcribe() evita isso decodificando o WAV com soundfile e passando um
    ndarray ao modelo (faster-whisper so chama decode_audio/av quando o
    input NAO e um ndarray). Este teste gera audio real (via Kokoro),
    passa pelo mesmo convert_to_wav do endpoint /stt, e transcreve.
    """
    config = load_config()
    tts = TextToSpeech(config)
    stt = SpeechToText(config)

    raw_wav = tts.synthesize("Teste de transcricao da fase quatro.")
    wav_16k_mono = asyncio.run(convert_to_wav(raw_wav))

    text = stt.transcribe(wav_16k_mono)

    assert isinstance(text, str)
    assert len(text.strip()) > 0
