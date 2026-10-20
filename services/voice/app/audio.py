import asyncio
import tempfile
from pathlib import Path


async def convert_to_wav(data: bytes, suffix: str = ".input") -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / f"source{suffix}"
        dst = Path(tmp) / "output.wav"
        src.write_bytes(data)

        proc = await asyncio.create_subprocess_exec(
            "ffmpeg",
            "-y",
            "-i",
            str(src),
            "-ar",
            "16000",
            "-ac",
            "1",
            "-f",
            "wav",
            str(dst),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg falhou ao converter o audio: {stderr.decode(errors='ignore').strip()}")

        return dst.read_bytes()
