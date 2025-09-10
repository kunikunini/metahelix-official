#!/usr/bin/env python3
"""
Generate favicon.ico by embedding an existing PNG into an ICO container.
Reads PNG width/height from IHDR and writes a single-entry ICO with PNG data.

Usage: python3 tools/gen_favicon_from_png.py image/meta-core_logo.png favicon.ico
"""
import struct
import sys
from pathlib import Path

def read_png_dims(png_bytes: bytes):
    # PNG signature is 8 bytes
    sig = b"\x89PNG\r\n\x1a\n"
    if not png_bytes.startswith(sig):
        raise ValueError("Input is not a PNG file")
    # Next chunk should be IHDR: 4 bytes length, 4 bytes type, 13 bytes data
    # Offset after signature
    off = 8
    if len(png_bytes) < off + 25:
        raise ValueError("PNG too small")
    length = struct.unpack(">I", png_bytes[off:off+4])[0]
    ctype = png_bytes[off+4:off+8]
    if ctype != b"IHDR" or length != 13:
        raise ValueError("PNG missing IHDR in expected position")
    data = png_bytes[off+8:off+8+13]
    width = struct.unpack(">I", data[0:4])[0]
    height = struct.unpack(">I", data[4:8])[0]
    return width, height

def make_ico_from_png(png_bytes: bytes) -> bytes:
    width, height = read_png_dims(png_bytes)
    # ICO header: reserved(0), type(1=icon), count(1)
    header = struct.pack("<HHH", 0, 1, 1)
    # Directory entry
    bwidth = 0 if width >= 256 else width
    bheight = 0 if height >= 256 else height
    bcolor = 0  # no palette
    breserved = 0
    planes = 0
    bitcount = 32
    size = len(png_bytes)
    offset = 6 + 16  # header + one entry
    entry = struct.pack(
        "<BBBBHHII",
        bwidth,
        bheight,
        bcolor,
        breserved,
        planes,
        bitcount,
        size,
        offset,
    )
    return header + entry + png_bytes

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 tools/gen_favicon_from_png.py <input.png> <output.ico>")
        sys.exit(2)
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    data = src.read_bytes()
    ico = make_ico_from_png(data)
    dst.write_bytes(ico)
    print(f"Wrote {dst} ({len(ico)} bytes) from {src}")

if __name__ == "__main__":
    main()

