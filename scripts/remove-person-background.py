#!/usr/bin/env python3
"""Remove backgrounds from extracted host frames with one shared human model."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image
from rembg import new_session, remove


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()

    session = new_session("u2net_human_seg")
    direct_frames = sorted(args.input_dir.glob("*.png"))
    clip_dirs = [args.input_dir] if direct_frames else sorted(
        directory for directory in args.input_dir.iterdir() if directory.is_dir()
    )
    if not clip_dirs:
        raise SystemExit(f"no clip directories in {args.input_dir}")

    for clip_dir in clip_dirs:
        frames = sorted(clip_dir.glob("*.png"))
        if not frames:
            continue
        destination_dir = args.output_dir if clip_dir == args.input_dir else args.output_dir / clip_dir.name
        destination_dir.mkdir(parents=True, exist_ok=True)
        for index, frame in enumerate(frames, start=1):
            with Image.open(frame) as source:
                cutout = remove(
                    source.convert("RGB"),
                    session=session,
                    post_process_mask=True,
                    alpha_matting=False,
                )
                cutout.save(destination_dir / frame.name, optimize=True)
            if index % 12 == 0 or index == len(frames):
                print(f"{clip_dir.name}: {index}/{len(frames)}", flush=True)


if __name__ == "__main__":
    main()
