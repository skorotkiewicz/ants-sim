# Do not press play

A 3-minute vector music video with audio-reactive characters and timed lyrics.

## Render

Run all rendering, previews, storyboard checks, and frame extraction on `ai@ml` only. Download the finished output for local viewing. Do not render locally.

Keep `video/` and `video2/` beside each other. This renderer reuses drawing helpers and audio analysis from `../video/video.py`.

Requires Python 3, Pycairo, NumPy, Pillow, FFmpeg, ffprobe, and DejaVu Sans fonts. Rendering runs offline. Whisper is not a render dependency.

```sh
cd video2
bash video.sh --check                  # Validate cues and draw storyboard.jpg
bash video.sh                          # Render do-not-press-play.mp4 at 1080p/30fps
bash video.sh --preview --start 60      # Render a 12-second preview
```

Existing outputs are protected. Choose another `--output` path or explicitly pass `--force` to replace one.

## Timing

`lyrics.cues.json` contains 111 captions and their scene assignments. Timings combine local Whisper base.en recognition, alignment against the supplied lyrics, and corrections using the recognized word onsets. The timeline follows the recorded arrangement rather than every stage direction in the lyric sheet. Distorted or whispered passages with uncertain timing are marked `estimated`.

Full-length renders copy the source AAC audio without re-encoding. Preview clips re-encode the selected audio interval for accurate seeking.
