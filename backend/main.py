
from io import BytesIO

import librosa
import noisereduce as nr
import numpy as np
import soundfile as sf

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI(title="VoxAssist Audio Cleaning API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "VoxAssist audio cleaning API is running"}


@app.post("/clean-audio")
async def clean_audio(file: UploadFile = File(...)):
    allowed_types = {
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
        "audio/mpeg",
        "audio/mp3",
        "audio/mp4",
        "audio/webm",
        "audio/ogg",
        "audio/flac",
        "application/octet-stream",
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail="Unsupported audio format. Try WAV, MP3, M4A, or WebM.",
        )

    raw_audio = await file.read()

    if not raw_audio:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    if len(raw_audio) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Maximum file size is 25 MB.")

    try:
        audio, sample_rate = librosa.load(
            BytesIO(raw_audio),
            sr=None,
            mono=True,
        )

        if len(audio) == 0:
            raise ValueError("No audio samples found.")

        if len(audio) / sample_rate > 300:
            raise HTTPException(
                status_code=413,
                detail="Audio must be 5 minutes or shorter.",
            )

        # Reduce relatively constant background noise.
        cleaned_audio = nr.reduce_noise(
            y=audio,
            sr=sample_rate,
            stationary=True,
            prop_decrease=0.8,
        )

        output = BytesIO()
        sf.write(output, cleaned_audio, sample_rate, format="WAV")
        output.seek(0)

        return StreamingResponse(
            output,
            media_type="audio/wav",
            headers={
                "Content-Disposition": 'attachment; filename="cleaned_audio.wav"'
            },
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not process this audio file. "
                "Try converting it to WAV first."
            ),
        ) from exc
