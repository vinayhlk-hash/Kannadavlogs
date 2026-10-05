# KannadaCut MVP

CapCut-inspired Kannada-first AI video editor starter.

## MVP
- Browser video upload and preview
- Trim start/end
- Speed and voice-volume controls
- FFmpeg MP4 export
- AI Recap/Hook control (5/10/15 second opening clip)
- Kannada filler-word detection foundation
- API endpoint ready for Kannada transcription
- Docker Compose setup

## Run
```bash
docker compose up --build
```
Then open http://localhost:3000 and API docs at http://localhost:8000/docs.

This is an original implementation inspired by modern editors; it does not copy CapCut proprietary code, branding, or assets.


## AI Recap roadmap

The MVP now has an `/recap` endpoint and editor control for a short opening recap. The current fallback uses a polished opening segment so the workflow is testable end-to-end. The production upgrade will use Kannada transcription + scene scoring to select the strongest moments from across the video, then place those highlights before the full video.
