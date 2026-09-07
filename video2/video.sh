#!/usr/bin/env bash
# ./video.sh renders the full film; --check draws a storyboard; --preview renders a clip.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
for tool in python3 ffmpeg ffprobe; do
  command -v "$tool" >/dev/null || { printf 'Missing dependency: %s\n' "$tool" >&2; exit 1; }
done
export PYTHONDONTWRITEBYTECODE=1
exec python3 video.py "$@"
