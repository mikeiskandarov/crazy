#!/usr/bin/env python3
"""Keep the largest connected alpha component in segmented person frames."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    for frame in sorted(args.input_dir.glob("*.png")):
        with Image.open(frame).convert("RGBA") as image:
            alpha = np.asarray(image.getchannel("A"))
            labels, count = ndimage.label(alpha > 28)
            if count:
                sizes = np.bincount(labels.ravel())
                sizes[0] = 0
                keep = labels == int(sizes.argmax())
                cleaned = np.where(keep, alpha, 0).astype(np.uint8)
                alpha_image = Image.fromarray(cleaned, mode="L").filter(ImageFilter.GaussianBlur(.55))
                image.putalpha(alpha_image)
            image.save(args.output_dir / frame.name, optimize=True)


if __name__ == "__main__":
    main()
