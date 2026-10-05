import os, uuid, shutil
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from media.cleanup import find_filler_ranges
from media.ffmpeg import render_clip, render_slideshow

MEDIA_DIR = Path(os.getenv("MEDIA_DIR", "/data"))
UPLOAD_DIR, RENDER_DIR = MEDIA_DIR/"uploads", MEDIA_DIR/"renders"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RENDER_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="KannadaCut API", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

class RenderRequest(BaseModel):
    filename: str
    start: float = 0
    end: Optional[float] = None
    speed: float = 1.0
    volume: float = 1.0
    remove_fillers: bool = True

class SlideshowRequest(BaseModel):
    filenames: List[str]
    durations: List[float]
    width: int = 1080
    height: int = 1920
    fps: int = 30

class RecapRequest(BaseModel):
    filename: str
    seconds: int = 10

@app.get("/health")
def health():
    return {"ok": True, "service": "kannadacut-api"}

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower() or ".mp4"
    if ext not in {".mp4",".mov",".mkv",".webm",".m4v",".jpg",".jpeg",".png",".webp"}:
        raise HTTPException(400, "Unsupported media format")
    name = uuid.uuid4().hex + ext
    target = UPLOAD_DIR / name
    with target.open("wb") as f:
        while chunk := await file.read(1024*1024):
            f.write(chunk)
    return {"filename": name, "url": f"/media/{name}", "type": "image" if ext in {".jpg",".jpeg",".png",".webp"} else "video"}

@app.get("/media/{filename}")
def media(filename: str):
    p = UPLOAD_DIR / filename
    if not p.exists(): raise HTTPException(404, "Media not found")
    return FileResponse(p)

@app.post("/analyze")
def analyze(req: RenderRequest):
    if not (UPLOAD_DIR / req.filename).exists():
        raise HTTPException(404, "Media not found")
    return {
        "language": "kn",
        "transcript": [],
        "filler_ranges": find_filler_ranges([]) if req.remove_fillers else [],
        "status": "ready_for_asr"
    }

@app.post("/render")
def render(req: RenderRequest):
    source = UPLOAD_DIR / req.filename
    if not source.exists(): raise HTTPException(404, "Media not found")
    output = RENDER_DIR / (uuid.uuid4().hex + ".mp4")
    try:
        render_clip(source, output, req.start, req.end, req.speed, req.volume)
    except Exception as e:
        raise HTTPException(500, f"FFmpeg render failed: {e}")
    return {"filename": output.name, "url": f"/rendered/{output.name}"}

@app.post("/slideshow")
def slideshow(req: SlideshowRequest):
    if not req.filenames or len(req.filenames) != len(req.durations):
        raise HTTPException(400, "filenames and durations must have the same length")
    paths = []
    for name in req.filenames:
        p = UPLOAD_DIR / name
        if not p.exists(): raise HTTPException(404, f"Media not found: {name}")
        if p.suffix.lower() not in {".jpg",".jpeg",".png",".webp"}:
            raise HTTPException(400, "Slideshow accepts image files only")
        paths.append(p)

    output = RENDER_DIR / (uuid.uuid4().hex + ".mp4")
    try:
        render_slideshow(paths, output, req.durations, req.width, req.height, req.fps)
    except Exception as e:
        raise HTTPException(500, f"Slideshow render failed: {e}")
    return {"filename": output.name, "url": f"/rendered/{output.name}"}

@app.post("/recap")
def recap(req: RecapRequest):
    """Create a short opening recap from the beginning of the source.
    Production AI layer will replace this with transcript/scene-based highlight selection.
    """
    source = UPLOAD_DIR / req.filename
    if not source.exists():
        raise HTTPException(404, "Media not found")
    seconds = max(5, min(int(req.seconds), 15))
    output = RENDER_DIR / (uuid.uuid4().hex + "_recap.mp4")
    try:
        # MVP fallback: create a polished short opening clip.
        render_clip(source, output, start=0, end=seconds, speed=1.0, volume=1.0)
    except Exception as e:
        raise HTTPException(500, f"Recap render failed: {e}")
    return {
        "filename": output.name,
        "url": f"/rendered/{output.name}",
        "duration": seconds,
        "mode": "opening-recap-mvp"
    }

@app.get("/rendered/{filename}")
def rendered(filename: str):
    p = RENDER_DIR / filename
    if not p.exists(): raise HTTPException(404, "Rendered file not found")
    return FileResponse(p, media_type="video/mp4", filename=filename)
