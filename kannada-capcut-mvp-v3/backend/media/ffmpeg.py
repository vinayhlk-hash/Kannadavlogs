import subprocess
from pathlib import Path

def render_clip(source: Path, output: Path, start=0, end=None, speed=1.0, volume=1.0):
    cmd = ["ffmpeg", "-y", "-i", str(source)]
    if start > 0: cmd += ["-ss", str(start)]
    if end is not None and end > start: cmd += ["-to", str(end)]
    speed = max(0.5, min(float(speed), 2.0))
    volume = max(0.0, min(float(volume), 3.0))
    vf, af = [], [f"volume={volume}"]
    if speed != 1.0:
        vf.append(f"setpts={1/speed}*PTS")
        af.append(f"atempo={speed}")
    if vf: cmd += ["-vf", ",".join(vf)]
    if af: cmd += ["-af", ",".join(af)]
    cmd += ["-c:v","libx264","-preset","veryfast","-c:a","aac","-movflags","+faststart",str(output)]
    subprocess.run(cmd, check=True, capture_output=True, text=True)

def render_slideshow(images, output, durations, width=1080, height=1920, fps=30):
    """Create a vertical photo video with gentle zoom/pan (Ken Burns) and crossfade-free cuts."""
    if len(images) != len(durations):
        raise ValueError("Image/duration mismatch")
    inputs = []
    filters = []
    for i, (img, dur) in enumerate(zip(images, durations)):
        d = max(0.5, min(float(dur), 30.0))
        inputs += ["-loop","1","-t",str(d),"-i",str(img)]
        # Fit image to canvas and add a very subtle zoom.
        frames = max(1, int(d * fps))
        filters.append(
            f"[{i}:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,"
            f"zoompan=z='min(zoom+0.0008,1.08)':d={frames}:s={width}x{height}:fps={fps},"
            f"setsar=1[v{i}]"
        )
    concat = "".join(f"[v{i}]" for i in range(len(images)))
    filter_complex = ";".join(filters) + f";{concat}concat=n={len(images)}:v=1:a=0[outv]"
    cmd = ["ffmpeg","-y",*inputs,"-filter_complex",filter_complex,
           "-map","[outv]","-c:v","libx264","-pix_fmt","yuv420p",
           "-preset","veryfast","-movflags","+faststart",str(output)]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
