import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from .audio import convert_to_wav
from .config import load_config
from .stt import SpeechToText
from .tts import TextToSpeech

audio_lock = asyncio.Lock()


@asynccontextmanager
async def lifespan(app: FastAPI):
    config = load_config()
    app.state.config = config
    app.state.stt = SpeechToText(config)
    app.state.tts = TextToSpeech(config)
    yield


app = FastAPI(title="Vision Mind — Voice", lifespan=lifespan)


class TtsRequest(BaseModel):
    text: str
    voice: str | None = None


@app.post("/stt")
async def stt(file: UploadFile = File(...)) -> dict[str, str]:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="arquivo de audio vazio")

    async with audio_lock:
        try:
            wav_bytes = await convert_to_wav(data)
        except RuntimeError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

        text = await asyncio.to_thread(app.state.stt.transcribe, wav_bytes)

    return {"text": text}


@app.post("/tts")
async def tts(payload: TtsRequest) -> Response:
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="texto vazio")

    async with audio_lock:
        wav_bytes = await asyncio.to_thread(app.state.tts.synthesize, payload.text, payload.voice)

    return Response(content=wav_bytes, media_type="audio/wav")
